/**
 * Ingestao de vendas na ferramenta propria de rastreamento (Traffik) —
 * EXCLUSIVAMENTE server-side.
 *
 * O Pix (OnyxPag) ja e contabilizado nativamente pela ferramenta. A PrimeCash
 * (cartao) nao tem essa integracao, entao AQUI a gente reporta manualmente a
 * venda aprovada no cartao para o endpoint de ingestao, para que ela apareca
 * no mesmo relatorio de vendas/trafego.
 *
 * Autentica com Bearer usando a chave de API da ferramenta (env `key`). A
 * chave nunca pode ir ao browser — por isso este modulo so entra em Route
 * Handlers / Server Actions e a env NAO usa o prefixo NEXT_PUBLIC_.
 *
 * Endpoint e formato:
 *   POST https://342dd-virid.vercel.app/api/webhook/ingest
 *   Authorization: Bearer <key>
 *   { transaction_id, status, value, currency, product, payment_method,
 *     email, name, click_id? }
 */

const INGEST_ENDPOINT =
  process.env.TRAFFIK_INGEST_URL ?? "https://342dd-virid.vercel.app/api/webhook/ingest";

export interface IngestSale {
  transactionId: string;
  /** Status ja no vocabulario da ferramenta (ex.: "approved"). */
  status: string;
  /** Valor em REAIS (ex.: 197.00). */
  value: number;
  currency?: string;
  product: string;
  /** Metodo de pagamento. Para este fluxo, sempre cartao. */
  paymentMethod?: string;
  email: string;
  name: string;
  /** Id de clique da Traffik, para atribuicao. Opcional. */
  clickId?: string;
}

/**
 * Guarda de deduplicacao em memoria por transacao+status.
 *
 * A venda no cartao pode ser reportada por dois caminhos (resposta sincrona da
 * cobranca E postback assincrono). A chave evita contar a mesma venda duas
 * vezes na mesma instancia. Em serverless nao ha garantia entre instancias,
 * mas o caso comum (mesma instancia) fica coberto.
 */
const enviados = new Set<string>();

/** Envia a venda para a ferramenta. Lanca em falha de rede/HTTP. */
export async function sendSale(sale: IngestSale): Promise<void> {
  const key = process.env.key;
  if (!key) {
    console.warn(
      "[traffik] env `key` ausente: a venda no cartao NAO sera reportada a ferramenta de rastreamento.",
    );
    return;
  }

  const body: Record<string, unknown> = {
    transaction_id: sale.transactionId,
    status: sale.status,
    value: sale.value,
    currency: sale.currency ?? "BRL",
    product: sale.product,
    payment_method: sale.paymentMethod ?? "credit_card",
    email: sale.email,
    name: sale.name,
  };
  if (sale.clickId) body.click_id = sale.clickId;

  const res = await fetch(INGEST_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ingest recusou a venda (HTTP ${res.status}): ${text}`);
  }
}

/**
 * Reporta a venda no maximo uma vez por transacao+status. Nunca lanca: o
 * rastreamento nao pode derrubar a confirmacao de pagamento — em caso de erro
 * apenas registra no log.
 */
export async function sendSaleOnce(sale: IngestSale): Promise<void> {
  const dedupeKey = `${sale.transactionId}:${sale.status}`;
  if (enviados.has(dedupeKey)) return;
  enviados.add(dedupeKey);

  try {
    await sendSale(sale);
    console.log("[traffik] venda reportada", {
      tx: sale.transactionId,
      status: sale.status,
      value: sale.value,
      atribuicao: sale.clickId ? "com click_id" : "sem click_id (por e-mail)",
    });
  } catch (err) {
    // Libera para nova tentativa num proximo postback.
    enviados.delete(dedupeKey);
    console.error("[traffik] falha ao reportar venda", {
      tx: sale.transactionId,
      erro: (err as Error).message,
    });
  }
}
