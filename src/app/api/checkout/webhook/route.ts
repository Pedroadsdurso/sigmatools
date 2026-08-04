import { NextResponse } from "next/server";
import { getTransaction } from "@/lib/onyxpag";
import { decodeAttribution, sendSaleOnce, type IngestAttribution } from "@/lib/traffik-ingest";
import { product } from "@/data/product";
import { findOfferById } from "@/data/funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractAttribution(meta?: Record<string, string> | string): IngestAttribution {
  if (!meta) return {};
  if (typeof meta === "string") return decodeAttribution(meta);
  if (meta._attr) return decodeAttribution(meta._attr);
  return {
    clickId: meta.click_id,
    utmSource: meta.utm_source,
    utmMedium: meta.utm_medium,
    utmCampaign: meta.utm_campaign,
    utmContent: meta.utm_content,
    utmTerm: meta.utm_term,
    fbc: meta.fbc,
    fbp: meta.fbp,
    phone: meta.phone,
    document: meta.document,
    ip: meta.ip,
    country: meta.country,
  };
}

interface OnyxPayload {
  event?: string;
  data?: {
    transaction_id?: string;
    id?: string;
    customer?: {
      name?: string;
      email?: string;
    };
  };
}

/**
 * Recebe o postback da OnyxPag.
 *
 * A documentacao nao define assinatura (HMAC) para o webhook, entao o corpo
 * recebido NAO e tratado como fonte da verdade — qualquer um que descubra a URL
 * poderia postar "transaction.paid". Duas defesas:
 *   1. token secreto na querystring, comparado em tempo constante;
 *   2. o status real e sempre relido da API via getTransaction().
 */
export async function POST(request: Request) {
  const expected = process.env.ONYXPAG_WEBHOOK_SECRET;
  const provided = new URL(request.url).searchParams.get("token") ?? "";

  if (!expected || !timingSafeEqual(provided, expected)) {
    // 404 em vez de 401: nao confirma a existencia da rota para quem sondar.
    return new NextResponse(null, { status: 404 });
  }

  let payload: OnyxPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const transactionId = payload.data?.transaction_id ?? payload.data?.id;
  if (!transactionId) {
    return NextResponse.json({ error: "transaction_id ausente." }, { status: 400 });
  }

  // Fonte da verdade: consulta a propria API, ignorando o status do payload.
  const tx = await getTransaction(transactionId);

  if (tx.status === "pago") {
    console.log("[onyxpag] pagamento confirmado", { id: tx.id, amount: tx.amount });

    const name = tx.customer?.name ?? payload.data?.customer?.name;
    const email = tx.customer?.email ?? payload.data?.customer?.email;

    if (name && email) {
      const attr = extractAttribution(tx.metadata);
      // Cobrancas do funil carregam `funil=<id>` no metadata. Sem isso toda
      // venda de upsell entraria no relatorio com o nome do produto principal.
      const oferta =
        typeof tx.metadata === "object" && tx.metadata !== null
          ? findOfferById(tx.metadata.funil)
          : null;

      await sendSaleOnce({
        transactionId: tx.id,
        status: "approved",
        value: Number(tx.amount.toFixed(2)),
        currency: "BRL",
        product: oferta ? oferta.productName : product.name,
        paymentMethod: "pix",
        email,
        name,
        ...attr,
      });
    } else {
      console.warn("[onyxpag] postback Pix pago sem e-mail/nome do cliente", { id: tx.id });
    }
  }

  // Sempre 200 para a OnyxPag parar de reenviar.
  return NextResponse.json({ received: true });
}

/** Comparacao de tamanho fixo, para nao vazar o segredo por tempo de resposta. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
