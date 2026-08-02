import { NextResponse } from "next/server";
import {
  createCardTransaction,
  PrimeCashConfigError,
  PrimeCashError,
  type PrimeItem,
} from "@/lib/primecash";
import { sendOrderOnce } from "@/lib/magnus";
import { isValidCpf, onlyDigits } from "@/lib/cpf";
import { orderBumps, product, shippingOptions } from "@/data/product";
import { calculateTotals, clampQty, findCoupon } from "@/lib/pricing";

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
  address?: Record<string, string>;
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

  // Parcelas dentro do limite do produto; o cliente nunca define o total.
  const installments = Math.min(
    Math.max(1, Math.trunc(Number(body.installments) || 1)),
    product.installments,
  );

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

  const addr = body.address ?? {};
  const siteUrl = publicOrigin(request);

  try {
    const tx = await createCardTransaction({
      amountCents: totals.totalCents,
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
      metadata: `produto=${product.sku};qtd=${totals.qty};bumps=${bumpIds.join(",") || "none"}`,
      ip: clientIp(request),
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
        total: Number((totals.totalCents / 100).toFixed(2)),
      });
    }

    return NextResponse.json({
      id: tx.id,
      status: tx.status,
      amountCents: totals.totalCents,
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
      // 402: recusa da operadora/dados do cartao — a mensagem ajuda o cliente.
      const detail =
        typeof err.body === "object" && err.body !== null && "message" in err.body
          ? String((err.body as { message: unknown }).message)
          : "Pagamento nao aprovado. Verifique os dados do cartao ou tente outro.";
      return NextResponse.json({ error: detail }, { status: 402 });
    }
    throw err;
  }
}
