import { NextResponse } from "next/server";
import {
  createCardTransaction,
  PrimeCashConfigError,
  PrimeCashError,
  type PrimeItem,
} from "@/lib/primecash";
import { sendOrderOnce } from "@/lib/magnus";
import { encodeAttribution, sendSaleOnce, type IngestAttribution } from "@/lib/traffik-ingest";
import { isValidCpf, onlyDigits } from "@/lib/cpf";
import { orderBumps, product, shippingOptions } from "@/data/product";
import {
  calculateTotals,
  clampInstallments,
  clampQty,
  findCoupon,
  installmentTotalCents,
} from "@/lib/pricing";
import { buildFunnelSession, writeFunnelSession } from "@/lib/funnel-session";

export const runtime = "nodejs";
/** Cobranca nunca pode ser pre-renderizada nem cacheada. */
export const dynamic = "force-dynamic";

/** Origem publica do site, usada no postbackUrl. Mesma regra da rota Pix. */
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

/**
 * Pais do comprador inferido pela borda da hospedagem. Netlify expoe
 * `x-nf-geo` (JSON com country.code); Vercel expoe `x-vercel-ip-country`.
 * Retorna o ISO-2 (ex.: "BR") ou undefined.
 */
function clientCountry(request: Request): string | undefined {
  const vercel = request.headers.get("x-vercel-ip-country");
  if (vercel) return vercel.toUpperCase();
  const nf = request.headers.get("x-nf-geo");
  if (nf) {
    try {
      const geo = JSON.parse(nf) as { country?: { code?: string } };
      if (geo.country?.code) return geo.country.code.toUpperCase();
    } catch {
      // header ausente/malformado: pais fica indefinido, sem quebrar a venda.
    }
  }
  return request.headers.get("cf-ipcountry")?.toUpperCase() || undefined;
}

interface Body {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  cardHash?: string;
  installments?: number;
  qty?: number;
  shippingId?: string;
  bumpIds?: string[];
  couponCode?: string;
  /** Sinais de atribuicao capturados no navegador (Traffik/Meta). */
  attribution?: {
    clickId?: string;
    fbc?: string;
    fbp?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  };
  address?: Record<string, string>;
}

/** Aceita so string curta e limpa nos campos de atribuicao vindos do cliente. */
function clean(v: unknown, max = 256): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().slice(0, max);
  return s || undefined;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const cpf = onlyDigits(body.cpf ?? "");
  const phone = onlyDigits(body.phone ?? "");
  const cardHash = typeof body.cardHash === "string" ? body.cardHash.trim() : "";

  const errors: Record<string, string> = {};
  if (name.length < 3 || !name.includes(" ")) errors.name = "Informe o nome completo.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) errors.email = "E-mail invalido.";
  if (!isValidCpf(cpf)) errors.cpf = "CPF invalido.";
  if (phone.length < 10 || phone.length > 11) errors.phone = "Telefone invalido.";
  if (!cardHash) errors._ = "Nao foi possivel processar os dados do cartao. Tente novamente.";

  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "Dados invalidos.", fields: errors }, { status: 422 });
  }

  // Parcelas dentro do limite (1..12); o cliente nunca define o total.
  const installments = clampInstallments(body.installments);

  const shippingId = shippingOptions.some((s) => s.id === body.shippingId)
    ? body.shippingId!
    : shippingOptions[0].id;

  const bumpIds = Array.isArray(body.bumpIds)
    ? body.bumpIds.filter((id) => orderBumps.some((b) => b.id === id))
    : [];

  const couponCode = findCoupon(body.couponCode)?.code;

  // method: "card" -> sem o desconto do Pix. Preco sempre calculado no servidor.
  const totals = calculateTotals({
    qty: clampQty(body.qty),
    shippingId,
    bumpIds,
    method: "card",
    couponCode,
  });

  const items: PrimeItem[] = [
    { title: product.name, unitPrice: product.priceCents, quantity: totals.qty, tangible: true },
    ...totals.bumps.map((b) => ({
      title: b.title,
      unitPrice: b.priceCents,
      quantity: 1,
      tangible: true,
    })),
  ];

  if (totals.shippingCents > 0) {
    items.push({
      title: `Frete ${totals.shippingLabel}`,
      unitPrice: totals.shippingCents,
      quantity: 1,
      tangible: false,
    });
  }

  // Juros do parcelamento (ate 3x sem juros; 4x a 12x conforme a tabela). O
  // valor cobrado e sempre recalculado no servidor a partir do total a vista —
  // o cliente so escolhe o numero de parcelas, nunca o montante. A diferenca
  // entra como item para a soma dos itens bater com o valor da transacao.
  const chargeCents = installmentTotalCents(totals.totalCents, installments);
  const interestCents = chargeCents - totals.totalCents;
  if (interestCents > 0) {
    items.push({
      title: `Juros do parcelamento (${installments}x)`,
      unitPrice: interestCents,
      quantity: 1,
      tangible: false,
    });
  }

  const addr = body.address ?? {};
  const siteUrl = publicOrigin(request);

  // Atribuicao consolidada: o que veio do navegador (Traffik/Meta) + o que so o
  // servidor conhece (telefone, CPF, IP, pais). Guardada no metadata para o
  // webhook assincrono conseguir reportar a mesma venda com os mesmos sinais.
  const attr: IngestAttribution = {
    clickId: clean(body.attribution?.clickId, 128),
    fbc: clean(body.attribution?.fbc),
    fbp: clean(body.attribution?.fbp),
    utmSource: clean(body.attribution?.utmSource),
    utmMedium: clean(body.attribution?.utmMedium),
    utmCampaign: clean(body.attribution?.utmCampaign),
    utmContent: clean(body.attribution?.utmContent),
    utmTerm: clean(body.attribution?.utmTerm),
    phone,
    document: cpf,
    ip: clientIp(request),
    country: clientCountry(request),
  };
  const attrMeta = encodeAttribution(attr);

  try {
    const tx = await createCardTransaction({
      amountCents: chargeCents,
      cardHash,
      installments,
      customer: { name, email, documentNumber: cpf, documentType: "cpf", phone },
      items,
      shipping: {
        street: addr.street,
        streetNumber: addr.number,
        complement: addr.complement,
        zipCode: onlyDigits(addr.cep ?? ""),
        neighborhood: addr.district,
        city: addr.city,
        state: addr.state,
      },
      postbackUrl: `${siteUrl}/api/checkout/card/webhook?token=${process.env.PRIMECASH_WEBHOOK_SECRET ?? ""}`,
      metadata: `produto=${product.sku};qtd=${totals.qty};bumps=${bumpIds.join(",") || "none"}${attrMeta ? `;${attrMeta}` : ""}`,
      ip: attr.ip,
    });

    // Aprovacao sincrona (comum no cartao): dispara a Magnus imediatamente.
    // O webhook cobre o caso assincrono; sendOrderOnce evita duplicidade.
    if (tx.status === "paid") {
      await sendOrderOnce(tx.id, {
        customer: { name, email, document: cpf, phone },
        address: {
          street: addr.street,
          number: addr.number,
          neighborhood: addr.district,
          city: addr.city,
          state: addr.state,
          zipcode: onlyDigits(addr.cep ?? ""),
          complement: addr.complement,
        },
        items: items.map((i) => ({
          name: i.title,
          quantity: i.quantity,
          price: Number((i.unitPrice / 100).toFixed(2)),
        })),
        total: Number((chargeCents / 100).toFixed(2)),
      });

      // Rastreamento: reporta a venda no cartao para a ferramenta propria
      // (o Pix ja e nativo). Idempotente com o webhook via sendSaleOnce.
      await sendSaleOnce({
        transactionId: tx.id,
        status: "approved",
        value: Number((chargeCents / 100).toFixed(2)),
        currency: "BRL",
        product: product.name,
        paymentMethod: "credit_card",
        email,
        name,
        ...attr,
      });
    }

    // Sessao do funil pos-compra: com ela o upsell cobra em um clique, sem o
    // cliente redigitar nada. Nao guarda cartao — o numero fica no navegador e
    // e re-tokenizado a cada oferta (src/lib/card-vault.ts).
    await writeFunnelSession(
      buildFunnelSession({
        tx: tx.id,
        method: "card",
        name,
        email,
        cpf,
        phone,
        address: {
          cep: onlyDigits(addr.cep ?? ""),
          street: addr.street,
          number: addr.number,
          complement: addr.complement,
          district: addr.district,
          city: addr.city,
          state: addr.state,
        },
        attr: attrMeta || undefined,
      }),
    );

    return NextResponse.json({
      id: tx.id,
      status: tx.status,
      amountCents: chargeCents,
      refusedReason: tx.refusedReason ?? null,
    });
  } catch (err) {
    if (err instanceof PrimeCashConfigError) {
      console.error("[primecash] CONFIGURACAO AUSENTE:", err.message);
      return NextResponse.json(
        {
          error:
            "Gateway de cartao nao configurado no servidor. Defina SECRET_TOKEN_PRIME_CASH nas variaveis de ambiente da hospedagem.",
          missing: err.missing,
        },
        { status: 503 },
      );
    }
    if (err instanceof PrimeCashError) {
      console.error("[primecash] falha ao criar transacao:", err.message, err.body);

      const raw =
        typeof err.body === "object" && err.body !== null && "message" in err.body
          ? String((err.body as { message: unknown }).message)
          : "";

      // Falha de credencial NAO e recusa de cartao. Vem por dois caminhos:
      // o status HTTP da propria PrimeCash (401/403) ou, o que acontece na
      // pratica, um "Unauthorized" de um subsistema dela ANINHADO no corpo de
      // uma resposta com outro status. Tratar isso como recusa faria toda
      // venda morrer com "pagamento nao aprovado": o cliente trocaria de
      // cartao para sempre e ninguem olharia a configuracao, que e a causa.
      const falhaDeCredencial =
        err.status === 401 ||
        err.status === 403 ||
        /unauthorized|credenciais\s+inv/i.test(raw);

      if (falhaDeCredencial) {
        console.error("[primecash] CREDENCIAL RECUSADA pelo gateway:", raw || err.message);
        return NextResponse.json(
          {
            error:
              "Não foi possível processar o cartão agora. Pague pelo Pix — é aprovado na hora.",
          },
          { status: 503 },
        );
      }

      // 402: recusa da operadora/dados do cartao — a mensagem ajuda o cliente.
      // Mas so repassamos texto curto e legivel: a PrimeCash as vezes devolve
      // um JSON inteiro em `message`, e isso ia cru para a tela do comprador.
      const legivel = raw && !raw.trimStart().startsWith("{") && raw.length <= 160;
      if (raw && !legivel) console.error("[primecash] recusa com corpo nao legivel:", raw);

      return NextResponse.json(
        {
          error: legivel
            ? raw
            : "Pagamento nao aprovado. Verifique os dados do cartao ou tente outro.",
        },
        { status: 402 },
      );
    }
    throw err;
  }
}
