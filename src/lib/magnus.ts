/**
 * Client da Magnus Frete — EXCLUSIVAMENTE server-side.
 *
 * Faz parte do pos-venda: quando um pagamento e APROVADO, envia o pedido para
 * a Magnus, que gera o codigo de rastreio e passa a atualizar o lead sobre o
 * status do envio. Aqui so entra pagamento via CARTAO (PrimeCash) — o Pix ja
 * tem o proprio pos-venda.
 *
 * A API nao e idempotente: cada POST cria um novo pedido e consome 1 credito.
 * Por isso o envio passa por uma guarda de deduplicacao por id de transacao
 * (`sendOrderOnce`), evitando pedido duplicado quando o webhook reenvia o
 * mesmo evento ou quando webhook e resposta sincrona coincidem.
 *
 * Docs: painel Magnus Frete -> Integracoes -> API Externa.
 */

const MAGNUS_ENDPOINT =
  process.env.MAGNUS_FRETE_ENDPOINT ??
  "https://wzxfbejykayahnfdkdbl.supabase.co/functions/v1/api-external";

/**
 * Token da loja na Magnus. Enviado como query param (?token=...). Prefira
 * definir MAGNUS_FRETE_TOKEN no ambiente; o fallback mantem a loja funcionando
 * caso a variavel ainda nao tenha sido configurada.
 */
const MAGNUS_TOKEN =
  process.env.MAGNUS_FRETE_TOKEN ?? "cf8ae05f844f3c9c9fd03caf9d81dd1853ac";

export interface MagnusCustomer {
  name: string;
  email: string;
  document?: string;
  phone?: string;
}

export interface MagnusAddress {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  complement?: string;
}

export interface MagnusItem {
  name: string;
  quantity?: number;
  /** Preco unitario em REAIS (ex.: 49.90). */
  price?: number;
}

export interface MagnusOrder {
  customer: MagnusCustomer;
  address?: MagnusAddress;
  items: MagnusItem[];
  /** Valor total em REAIS. Se omitido, a Magnus calcula. */
  total?: number;
}

export interface MagnusResult {
  success: boolean;
  pedido_id?: string;
  envio_id?: string;
  codigo_rastreio?: string;
  error?: string;
}

/**
 * Guarda de deduplicacao em memoria.
 *
 * Em ambiente serverless nao e garantida entre instancias, mas cobre o caso
 * mais comum (reenvio do mesmo evento na mesma instancia) sem exigir banco.
 * O ideal futuro e persistir o `pedido_id` retornado ligado a transacao.
 */
const enviados = new Set<string>();

/** Envia o pedido para a Magnus. Lanca em falha de rede/HTTP. */
export async function sendOrder(order: MagnusOrder): Promise<MagnusResult> {
  const url = `${MAGNUS_ENDPOINT}?token=${encodeURIComponent(MAGNUS_TOKEN)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
    cache: "no-store",
  });

  const text = await res.text();
  let body: MagnusResult;
  try {
    body = text ? (JSON.parse(text) as MagnusResult) : { success: res.ok };
  } catch {
    body = { success: res.ok, error: text };
  }

  if (!res.ok) {
    throw new Error(`Magnus recusou o pedido (HTTP ${res.status}): ${body.error ?? text}`);
  }

  return body;
}

/**
 * Envia o pedido no maximo uma vez por chave (id da transacao aprovada).
 * Nunca lanca: o pos-venda nao pode derrubar a confirmacao de pagamento — em
 * caso de erro apenas registra no log para reprocessamento manual.
 */
export async function sendOrderOnce(key: string, order: MagnusOrder): Promise<void> {
  if (enviados.has(key)) return;
  enviados.add(key);

  try {
    const result = await sendOrder(order);
    console.log("[magnus] pedido enviado", {
      tx: key,
      pedido_id: result.pedido_id,
      codigo_rastreio: result.codigo_rastreio,
    });
  } catch (err) {
    // Libera a chave para permitir uma nova tentativa num proximo postback.
    enviados.delete(key);
    console.error("[magnus] falha ao enviar pedido", { tx: key, erro: (err as Error).message });
  }
}
