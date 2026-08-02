import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  createPixCharge,
  OnyxPagConfigError,
  OnyxPagError,
  type PixItem,
} from "@/lib/onyxpag";
import { isValidCpf, onlyDigits } from "@/lib/cpf";
import { orderBumps, product, shippingOptions } from "@/data/product";
import { calculateTotals, clampQty, findCoupon } from "@/lib/pricing";

import { encodeAttribution, type IngestAttribution } from "@/lib/traffik-ingest";

export const runtime = "nodejs";
/** Cobranca nunca pode ser pre-renderizada nem cacheada. */
export const dynamic = "force-dynamic";

/**
 * Origem publica do site, usada em source_url e postbackUrl.
 *
 * A OnyxPag exige um source_url HTTP(S) valido, e recusa a cobranca se receber
 * localhost. Em producao atras de proxy (Vercel e afins) o request.url chega
 * com host interno, por isso a ordem: variavel explicita > cabecalhos do proxy
 * > url da requisicao.
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

function clean(v: unknown, max = 256): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().slice(0, max);
  return s || undefined;
}

interface Body {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  qty?: number;
  shippingId?: string;
  bumpIds?: string[];
  couponCode?: string;
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

  const siteUrl = publicOrigin(request);

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

  // Monta source_url com parametros de UTM se existirem
  const utmParams = new URLSearchParams();
  if (attr.utmSource) utmParams.set("utm_source", attr.utmSource);
  if (attr.utmMedium) utmParams.set("utm_medium", attr.utmMedium);
  if (attr.utmCampaign) utmParams.set("utm_campaign", attr.utmCampaign);
  if (attr.utmContent) utmParams.set("utm_content", attr.utmContent);
  if (attr.utmTerm) utmParams.set("utm_term", attr.utmTerm);
  if (attr.clickId) utmParams.set("click_id", attr.clickId);
  const sourceUrl = utmParams.toString()
    ? `${siteUrl}/checkout?${utmParams.toString()}`
    : `${siteUrl}/checkout`;

  const metadata: Record<string, string> = {
    product_id: product.id,
    sku: product.sku,
    shipping: shippingId,
    bumps: bumpIds.join(",") || "none",
    cep: onlyDigits(body.address?.cep ?? ""),
  };
  if (attr.clickId) metadata.click_id = attr.clickId;
  if (attr.utmSource) metadata.utm_source = attr.utmSource;
  if (attr.utmMedium) metadata.utm_medium = attr.utmMedium;
  if (attr.utmCampaign) metadata.utm_campaign = attr.utmCampaign;
  if (attr.utmContent) metadata.utm_content = attr.utmContent;
  if (attr.utmTerm) metadata.utm_term = attr.utmTerm;
  if (attr.fbc) metadata.fbc = attr.fbc;
  if (attr.fbp) metadata.fbp = attr.fbp;
  if (attrMeta) metadata._attr = attrMeta;

  try {
    const charge = await createPixCharge({
      amountCents: totals.totalCents,
      description: `${product.name} (${qty}x)`,
      customer: { name, email, document: cpf, phone },
      items,
      sourceUrl,
      postbackUrl: `${siteUrl}/api/checkout/webhook?token=${process.env.ONYXPAG_WEBHOOK_SECRET ?? ""}`,
      metadata,
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
    // Falta de credencial e problema de deploy, nao instabilidade do gateway.
    // Distinguir os dois evita o "tente novamente" eterno de producao.
    if (err instanceof OnyxPagConfigError) {
      console.error("[onyxpag] CONFIGURACAO AUSENTE:", err.message);
      return NextResponse.json(
        {
          error:
            "Gateway de pagamento nao configurado no servidor. Defina ONYXPAG_PUBLIC_KEY e ONYXPAG_SECRET_KEY nas variaveis de ambiente da hospedagem.",
          missing: err.missing,
        },
        { status: 503 },
      );
    }
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
