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

/**
 * Sinais extras de atribuicao/enriquecimento (Meta CAPI + relatorio).
 *
 * Todos opcionais: quando ausentes, a ferramenta ainda atribui a venda pelo
 * e-mail. Enviados em snake_case, o mesmo vocabulario do endpoint de ingestao.
 */
export interface IngestAttribution {
  /** Id de clique da Traffik. */
  clickId?: string;
  /** Telefone do comprador (so digitos). */
  phone?: string;
  /** CPF do comprador (so digitos). */
  document?: string;
  /** IP do comprador (capturado no servidor). */
  ip?: string;
  /** Pais do comprador (ISO-2, ex.: "BR"), inferido do IP pela hospedagem. */
  country?: string;
  /** Cookie _fbc do Meta pixel. */
  fbc?: string;
  /** Cookie _fbp do Meta pixel. */
  fbp?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export interface IngestSale extends IngestAttribution {
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
}

/**
 * Serializa os sinais de atribuicao para o campo `metadata` da PrimeCash
 * (formato chave=valor;chave=valor). So o caminho SINCRONO da cobranca conhece
 * utm/fbc/fbp/ip; o postback assincrono nao os recebe, entao guardamos aqui
 * para recuperar depois. Valores sao URL-encoded para nao colidir com ; e =.
 */
export function encodeAttribution(a: IngestAttribution): string {
  const pairs: [string, string | undefined][] = [
    ["click_id", a.clickId],
    ["ip", a.ip],
    ["country", a.country],
    ["fbc", a.fbc],
    ["fbp", a.fbp],
    ["utm_source", a.utmSource],
    ["utm_medium", a.utmMedium],
    ["utm_campaign", a.utmCampaign],
    ["utm_content", a.utmContent],
    ["utm_term", a.utmTerm],
  ];
  return pairs
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join(";");
}

/** Le de volta os sinais serializados em encodeAttribution (do metadata). */
export function decodeAttribution(metadata?: string): IngestAttribution {
  const out: IngestAttribution = {};
  if (!metadata) return out;
  const get = (key: string): string | undefined => {
    for (const part of metadata.split(";")) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      if (part.slice(0, eq).trim() !== key) continue;
      try {
        return decodeURIComponent(part.slice(eq + 1));
      } catch {
        return part.slice(eq + 1);
      }
    }
    return undefined;
  };
  out.clickId = get("click_id");
  out.ip = get("ip");
  out.country = get("country");
  out.fbc = get("fbc");
  out.fbp = get("fbp");
  out.utmSource = get("utm_source");
  out.utmMedium = get("utm_medium");
  out.utmCampaign = get("utm_campaign");
  out.utmContent = get("utm_content");
  out.utmTerm = get("utm_term");
  return out;
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
  // Enriquecimento: so vai o que existe, sempre em snake_case.
  if (sale.clickId) body.click_id = sale.clickId;
  if (sale.phone) body.phone = sale.phone;
  if (sale.document) body.document = sale.document;
  if (sale.ip) body.ip = sale.ip;
  if (sale.country) body.country = sale.country;
  if (sale.fbc) body.fbc = sale.fbc;
  if (sale.fbp) body.fbp = sale.fbp;
  if (sale.utmSource) body.utm_source = sale.utmSource;
  if (sale.utmMedium) body.utm_medium = sale.utmMedium;
  if (sale.utmCampaign) body.utm_campaign = sale.utmCampaign;
  if (sale.utmContent) body.utm_content = sale.utmContent;
  if (sale.utmTerm) body.utm_term = sale.utmTerm;

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
