import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createCardTransaction, PrimeCashConfigError, PrimeCashError } from "@/lib/primecash";
import { createPixCharge, OnyxPagConfigError, OnyxPagError } from "@/lib/onyxpag";
import { readFunnelSession } from "@/lib/funnel-session";
import { findOfferById } from "@/data/funnel";
import { CARTAO_HABILITADO, product } from "@/data/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cobranca de UMA oferta do funil pos-compra (upsell/downsell one-click).
 *
 * O navegador manda so o ID da oferta. O valor sai do catalogo em
 * src/data/funnel.ts, e os dados do comprador saem do cookie cifrado gravado
 * quando o pedido principal foi criado — por isso o cliente nao redigita nada
 * e tambem nao consegue escolher o preco.
 *
 * Nao ha frete: o item entra no mesmo envio ja pago.
 *
 * Esta rota apenas CRIA a cobranca. Quem registra a venda (Magnus, ferramenta
 * de rastreamento, extras da sessao) e /api/funnel/confirm, depois de reler o
 * status no gateway — assim o caminho sincrono (cartao aprovado na hora) e o
 * assincrono (Pix, cartao em analise) terminam no mesmo lugar.
 */

function publicOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && !/localhost|127\.0\.0\.1/.test(configured)) {
    return configured.replace(/\/$/, "");
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

function clientIp(request: Request): string | undefined {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() : undefined;
}

interface Body {
  offerId?: string;
  /** Sobrescreve o metodo da compra principal (ex.: cartao recusado -> Pix). */
  method?: "pix" | "card";
  cardHash?: string;
}

export async function POST(request: Request) {
  const session = await readFunnelSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sessao do pedido expirada. Recomece pelo checkout." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const offer = findOfferById(body.offerId);
  if (!offer) {
    return NextResponse.json({ error: "Oferta inexistente." }, { status: 400 });
  }

  // Uma oferta so pode ser cobrada uma vez por sessao.
  if (session.extras.some((e) => e.id === offer.id)) {
    return NextResponse.json(
      { error: "Esta oferta ja foi adicionada ao seu pedido." },
      { status: 409 },
    );
  }

  // Com o cartao desligado, toda oferta e cobrada no Pix — inclusive para uma
  // sessao antiga cujo pedido principal saiu no cartao.
  const escolhido = body.method === "pix" || body.method === "card" ? body.method : session.method;
  const method = CARTAO_HABILITADO ? escolhido : "pix";
  const siteUrl = publicOrigin(request);
  const addr = session.address;

  if (method === "card") {
    const cardHash = typeof body.cardHash === "string" ? body.cardHash.trim() : "";
    if (!cardHash) {
      return NextResponse.json(
        { error: "Nao foi possivel processar os dados do cartao. Tente novamente." },
        { status: 422 },
      );
    }

    try {
      const tx = await createCardTransaction({
        amountCents: offer.priceCents,
        cardHash,
        // Upsell e sempre a vista: valor baixo, e parcelar so adicionaria
        // juros e atrito numa tela que precisa ser de um clique.
        installments: 1,
        customer: {
          name: session.name,
          email: session.email,
          documentNumber: session.cpf,
          documentType: "cpf",
          phone: session.phone,
        },
        items: [
          {
            title: offer.productName,
            unitPrice: offer.priceCents,
            quantity: 1,
            tangible: true,
          },
        ],
        shipping: {
          street: addr.street,
          streetNumber: addr.number,
          complement: addr.complement,
          zipCode: addr.cep,
          neighborhood: addr.district,
          city: addr.city,
          state: addr.state,
        },
        postbackUrl: `${siteUrl}/api/checkout/card/webhook?token=${process.env.PRIMECASH_WEBHOOK_SECRET ?? ""}`,
        metadata: `funil=${offer.id};pedido=${session.tx};produto=${product.sku}${session.attr ? `;${session.attr}` : ""}`,
        ip: clientIp(request),
      });

      return NextResponse.json({
        method: "card",
        id: tx.id,
        status: tx.status,
        paid: tx.status === "paid",
        amountCents: offer.priceCents,
        refusedReason: tx.refusedReason ?? null,
      });
    } catch (err) {
      if (err instanceof PrimeCashConfigError) {
        console.error("[funil/cartao] CONFIGURACAO AUSENTE:", err.message);
        return NextResponse.json(
          { error: "Gateway de cartao nao configurado no servidor.", missing: err.missing },
          { status: 503 },
        );
      }
      if (err instanceof PrimeCashError) {
        console.error("[funil/cartao] falha ao cobrar oferta:", offer.id, err.message, err.body);

        const raw =
          typeof err.body === "object" && err.body !== null && "message" in err.body
            ? String((err.body as { message: unknown }).message)
            : "";

        // Mesma regra da rota principal: credencial recusada (por status ou
        // aninhada no corpo) nao e recusa de cartao, e nada disso vai cru para
        // a tela. Ver comentario extenso em /api/checkout/card.
        if (
          err.status === 401 ||
          err.status === 403 ||
          /unauthorized|credenciais\s+inv/i.test(raw)
        ) {
          console.error("[funil/cartao] CREDENCIAL RECUSADA pelo gateway:", raw || err.message);
          return NextResponse.json(
            { error: "Não foi possível cobrar no cartão agora. Pague esta oferta pelo Pix." },
            { status: 503 },
          );
        }

        const legivel = raw && !raw.trimStart().startsWith("{") && raw.length <= 160;
        return NextResponse.json(
          {
            error: legivel
              ? raw
              : "Pagamento nao aprovado. Tente outro cartao ou pague com Pix.",
          },
          { status: 402 },
        );
      }
      throw err;
    }
  }

  // ----- Pix -----------------------------------------------------------
  try {
    const charge = await createPixCharge({
      amountCents: offer.priceCents,
      description: offer.productName,
      customer: {
        name: session.name,
        email: session.email,
        document: session.cpf,
        phone: session.phone,
      },
      items: [
        {
          title: offer.productName,
          unitPrice: offer.priceCents,
          quantity: 1,
          tangible: true,
        },
      ],
      sourceUrl: `${siteUrl}/oferta/${offer.slug}`,
      postbackUrl: `${siteUrl}/api/checkout/webhook?token=${process.env.ONYXPAG_WEBHOOK_SECRET ?? ""}`,
      metadata: {
        funil: offer.id,
        pedido_principal: session.tx,
        sku: product.sku,
        ...(session.attr ? { _attr: session.attr } : {}),
      },
    });

    const qrDataUrl = charge.pixQrCode
      ? `data:image/png;base64,${charge.pixQrCode}`
      : await QRCode.toDataURL(charge.pixCode, { width: 440, margin: 1 });

    return NextResponse.json({
      method: "pix",
      id: charge.id,
      status: charge.status,
      paid: false,
      amountCents: offer.priceCents,
      pixCode: charge.pixCode,
      pixQrCode: qrDataUrl,
      expiresAt: charge.expiresAt,
    });
  } catch (err) {
    if (err instanceof OnyxPagConfigError) {
      console.error("[funil/pix] CONFIGURACAO AUSENTE:", err.message);
      return NextResponse.json(
        { error: "Gateway de Pix nao configurado no servidor.", missing: err.missing },
        { status: 503 },
      );
    }
    if (err instanceof OnyxPagError) {
      console.error("[funil/pix] falha ao gerar cobranca:", offer.id, err.message, err.body);

      // Credencial do servidor recusada — nao e instabilidade do gateway.
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json(
          { error: "Gateway de Pix recusou as credenciais do servidor." },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: "Nao foi possivel gerar o Pix agora. Tente novamente." },
        { status: 502 },
      );
    }
    throw err;
  }
}
