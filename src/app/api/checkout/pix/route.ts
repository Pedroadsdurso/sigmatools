import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createPixCharge, OnyxPagError, type PixItem } from "@/lib/onyxpag";
import { isValidCpf, onlyDigits } from "@/lib/cpf";
import { orderBumps, product, shippingOptions } from "@/data/product";
import { calculateTotals, clampQty, findCoupon } from "@/lib/pricing";

export const runtime = "nodejs";
/** Cobranca nunca pode ser pre-renderizada nem cacheada. */
export const dynamic = "force-dynamic";

interface Body {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
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
  const qty = clampQty(body.qty);

  const errors: Record<string, string> = {};
  if (name.length < 3 || !name.includes(" ")) errors.name = "Informe o nome completo.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) errors.email = "E-mail invalido.";
  if (!isValidCpf(cpf)) errors.cpf = "CPF invalido.";
  if (phone.length < 10 || phone.length > 11) errors.phone = "Telefone invalido.";

  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "Dados invalidos.", fields: errors }, { status: 422 });
  }

  // Frete e bumps sao resolvidos contra o catalogo do servidor. Ids desconhecidos
  // sao descartados em vez de aceitos — o cliente nunca define preco.
  const shippingId = shippingOptions.some((s) => s.id === body.shippingId)
    ? body.shippingId!
    : shippingOptions[0].id;

  const bumpIds = Array.isArray(body.bumpIds)
    ? body.bumpIds.filter((id) => orderBumps.some((b) => b.id === id))
    : [];

  // findCoupon resolve o codigo contra o catalogo; um cupom inexistente vira
  // desconto zero em vez de erro, entao o pedido nao trava por isso.
  const couponCode = findCoupon(body.couponCode)?.code;

  const totals = calculateTotals({
    qty,
    shippingId,
    bumpIds,
    method: "pix",
    couponCode,
  });

  // items[].unitPrice vai em CENTAVOS (amount, no client, vai em reais).
  const items: PixItem[] = [
    { title: product.name, unitPrice: product.priceCents, quantity: qty, tangible: true },
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  try {
    const charge = await createPixCharge({
      amountCents: totals.totalCents,
      description: `${product.name} (${qty}x)`,
      customer: { name, email, document: cpf, phone },
      items,
      sourceUrl: `${siteUrl}/checkout`,
      postbackUrl: `${siteUrl}/api/checkout/webhook?token=${process.env.ONYXPAG_WEBHOOK_SECRET ?? ""}`,
      metadata: {
        product_id: product.id,
        sku: product.sku,
        shipping: shippingId,
        bumps: bumpIds.join(",") || "none",
        cep: onlyDigits(body.address?.cep ?? ""),
      },
    });

    // Na pratica a OnyxPag responde com pix_qr_code vazio, so o copia-e-cola.
    // O QR e derivado do proprio codigo, entao gerar aqui e equivalente e evita
    // depender de um campo que a API nem sempre preenche.
    const qrDataUrl = charge.pixQrCode
      ? `data:image/png;base64,${charge.pixQrCode}`
      : await QRCode.toDataURL(charge.pixCode, { width: 440, margin: 1 });

    return NextResponse.json({
      id: charge.id,
      pixCode: charge.pixCode,
      pixQrCode: qrDataUrl,
      amountCents: totals.totalCents,
      expiresAt: charge.expiresAt,
    });
  } catch (err) {
    if (err instanceof OnyxPagError) {
      console.error("[onyxpag] falha ao criar cobranca:", err.message, err.body);
      return NextResponse.json(
        { error: "Nao foi possivel gerar o Pix agora. Tente novamente." },
        { status: 502 },
      );
    }
    throw err;
  }
}
