import { NextResponse } from "next/server";
import { getTransaction } from "@/lib/onyxpag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  let payload: { event?: string; data?: { transaction_id?: string } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const transactionId = payload.data?.transaction_id;
  if (!transactionId) {
    return NextResponse.json({ error: "transaction_id ausente." }, { status: 400 });
  }

  // Fonte da verdade: consulta a propria API, ignorando o status do payload.
  const tx = await getTransaction(transactionId);

  if (tx.status === "pago") {
    // TODO: registrar o pedido como pago (banco, e-mail de confirmacao, ERP).
    // Precisa ser idempotente: a OnyxPag pode reenviar o mesmo evento.
    console.log("[onyxpag] pagamento confirmado", { id: tx.id, amount: tx.amount });
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
