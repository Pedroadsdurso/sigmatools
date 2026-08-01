/**
 * Client da OnyxPag — EXCLUSIVAMENTE server-side.
 *
 * A OnyxPag autentica com Basic base64("<pk>:<sk>"), ou seja, a chave secreta
 * entra em toda chamada. Nao existe caminho seguro no browser: este modulo so
 * pode ser importado por Route Handlers e Server Actions. Nenhuma das env vars
 * usa NEXT_PUBLIC_, entao o bundler nao as expoe ao cliente.
 *
 * Docs: https://doc.onyxpag.com/
 */

const API_URL = process.env.ONYXPAG_API_URL ?? "https://api.onyxpag.com";

export interface PixCustomer {
  name: string;
  email: string;
  /** CPF ou CNPJ, apenas digitos. */
  document: string;
  phone?: string;
}

export interface PixItem {
  title: string;
  /** Em CENTAVOS — atencao: difere de `amount`, que vai em reais. */
  unitPrice: number;
  quantity: number;
  tangible: boolean;
}

export interface CreatePixInput {
  /** Em CENTAVOS. Convertido para reais antes de enviar. */
  amountCents: number;
  description: string;
  customer: PixCustomer;
  items: PixItem[];
  /** URL da pagina de checkout que originou a cobranca. Obrigatorio pela API. */
  sourceUrl: string;
  postbackUrl?: string;
  metadata?: Record<string, string>;
}

export interface PixCharge {
  id: string;
  status: OnyxStatus;
  amount: number;
  pixCode: string;
  /** PNG em base64, sem o prefixo data:. */
  pixQrCode: string;
  expiresAt: string | null;
}

export type OnyxStatus = "pendente" | "pago" | "reembolsado" | "cancelado";

export class OnyxPagError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "OnyxPagError";
  }
}

function authHeader(): string {
  const pk = process.env.ONYXPAG_PUBLIC_KEY;
  const sk = process.env.ONYXPAG_SECRET_KEY;

  if (!pk || !sk) {
    throw new OnyxPagError(
      "ONYXPAG_PUBLIC_KEY e ONYXPAG_SECRET_KEY precisam estar definidas no ambiente.",
      500,
    );
  }
  return `Basic ${Buffer.from(`${pk}:${sk}`).toString("base64")}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    // Cobrancas e status nunca podem vir de cache.
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const detail =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new OnyxPagError(`OnyxPag recusou a requisicao: ${detail}`, res.status, body);
  }

  return body as T;
}

interface OnyxEnvelope<T> {
  success: boolean;
  data: T;
}

interface OnyxTransaction {
  id: string;
  status: OnyxStatus;
  amount: number;
  pix_code?: string;
  pix_qr_code?: string;
  expires_at?: string;
}

/** Cria uma cobranca Pix e devolve o codigo copia-e-cola + QR. */
export async function createPixCharge(input: CreatePixInput): Promise<PixCharge> {
  const payload = {
    // A API espera reais aqui (ex.: 85.41), mesmo com items[].unitPrice em centavos.
    amount: Number((input.amountCents / 100).toFixed(2)),
    payment_method: "pix" as const,
    description: input.description,
    customer: input.customer,
    items: input.items,
    source_url: input.sourceUrl,
    ...(input.postbackUrl ? { postbackUrl: input.postbackUrl } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };

  const res = await request<OnyxEnvelope<OnyxTransaction>>("", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const tx = res.data;
  if (!tx?.pix_code) {
    throw new OnyxPagError("OnyxPag respondeu sem o codigo Pix.", 502, res);
  }

  return {
    id: tx.id,
    status: tx.status,
    amount: tx.amount,
    pixCode: tx.pix_code,
    pixQrCode: tx.pix_qr_code ?? "",
    expiresAt: tx.expires_at ?? null,
  };
}

/**
 * Consulta o status atual de uma transacao.
 * Usada tanto pelo polling do checkout quanto para validar webhooks — como a
 * OnyxPag nao assina o postback, o payload recebido nunca e tratado como
 * fonte da verdade; o status vem sempre desta chamada.
 */
export async function getTransaction(id: string): Promise<{ id: string; status: OnyxStatus; amount: number }> {
  const res = await request<OnyxEnvelope<OnyxTransaction>>(
    `/transactions/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
  return { id: res.data.id, status: res.data.status, amount: res.data.amount };
}
