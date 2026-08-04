/**
 * Client da PrimeCash (Diamante Pay) — EXCLUSIVAMENTE server-side.
 *
 * A PrimeCash autentica com Basic base64("<secret>:x"), ou seja, a chave
 * secreta entra em toda chamada. Nao existe caminho seguro no browser: este
 * modulo so pode ser importado por Route Handlers e Server Actions. A env var
 * usada (SECRET_TOKEN_PRIME_CASH) nao tem prefixo NEXT_PUBLIC_, entao o bundler
 * nao a expoe ao cliente.
 *
 * Este gateway cobre APENAS cartao de credito. O Pix continua na OnyxPag —
 * sao dois gateways independentes.
 *
 * Docs: https://primecashbrasil.readme.io/reference/introducao
 */

const API_URL = process.env.PRIMECASH_API_URL ?? "https://api.primecashbrasil.com/v1";

/**
 * Status possiveis de uma transacao PrimeCash.
 * Valores: processing, authorized, paid, refunded, waiting_payment, refused,
 * chargedback, canceled, in_protest, partially_paid.
 */
export type PrimeStatus =
  | "processing"
  | "authorized"
  | "paid"
  | "refunded"
  | "waiting_payment"
  | "refused"
  | "chargedback"
  | "canceled"
  | "in_protest"
  | "partially_paid";

/** Status que ainda podem virar "paid" — vale continuar consultando. */
export const PENDING_STATUSES: PrimeStatus[] = [
  "processing",
  "authorized",
  "waiting_payment",
];

export interface PrimeCustomer {
  name: string;
  email: string;
  /** CPF/CNPJ apenas digitos. */
  documentNumber: string;
  documentType?: "cpf" | "cnpj";
  /** Formato 1199999999 (DDD + numero, so digitos). */
  phone?: string;
}

export interface PrimeItem {
  title: string;
  /** Em CENTAVOS. */
  unitPrice: number;
  quantity: number;
  tangible: boolean;
}

export interface PrimeShipping {
  street?: string;
  streetNumber?: string;
  complement?: string;
  zipCode?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface CreateCardInput {
  /** Em CENTAVOS. */
  amountCents: number;
  /** Hash do cartao gerado pela lib JS da PrimeCash no front-end (validade 5min). */
  cardHash: string;
  installments: number;
  customer: PrimeCustomer;
  items: PrimeItem[];
  shipping?: PrimeShipping;
  postbackUrl?: string;
  metadata?: string;
  ip?: string;
}

export interface PrimeTransaction {
  id: string;
  status: PrimeStatus;
  amount: number;
  refusedReason?: string | null;
}

export class PrimeCashError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "PrimeCashError";
  }
}

/** Erro de configuracao do ambiente (falta chave), nao do gateway. */
export class PrimeCashConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`Variaveis ausentes no ambiente: ${missing.join(", ")}`);
    this.name = "PrimeCashConfigError";
  }
}

/** Diz se a credencial existe, sem revelar valor nenhum. */
export function credentialsStatus(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.SECRET_TOKEN_PRIME_CASH) missing.push("SECRET_TOKEN_PRIME_CASH");
  return { ok: missing.length === 0, missing };
}

function authHeader(): string {
  const { ok, missing } = credentialsStatus();
  if (!ok) throw new PrimeCashConfigError(missing);

  const secret = process.env.SECRET_TOKEN_PRIME_CASH!;
  // A PrimeCash espera a chave secreta como usuario e "x" como senha.
  return `Basic ${Buffer.from(`${secret}:x`).toString("base64")}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
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
    throw new PrimeCashError(`PrimeCash recusou a requisicao: ${detail}`, res.status, body);
  }

  return body as T;
}

/**
 * A PrimeCash pode responder a transacao no nivel raiz ou dentro de `data`
 * (o postback usa envelope { data }). normaliza os dois formatos.
 */
interface RawTransaction {
  id: number | string;
  status: PrimeStatus;
  amount: number;
  refusedReason?: { code?: string; description?: string } | string | null;
}

function normalize(raw: RawTransaction): PrimeTransaction {
  const reason =
    raw.refusedReason && typeof raw.refusedReason === "object"
      ? (raw.refusedReason.description ?? raw.refusedReason.code ?? null)
      : (raw.refusedReason ?? null);

  return {
    id: String(raw.id),
    status: raw.status,
    amount: raw.amount,
    refusedReason: reason,
  };
}

/** Cria uma transacao no cartao de credito. */
export async function createCardTransaction(input: CreateCardInput): Promise<PrimeTransaction> {
  const payload = {
    amount: input.amountCents,
    paymentMethod: "credit_card" as const,
    installments: input.installments,
    card: { hash: input.cardHash },
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      document: {
        number: input.customer.documentNumber,
        type: input.customer.documentType ?? "cpf",
      },
      ...(input.customer.phone ? { phone: input.customer.phone } : {}),
    },
    items: input.items.map((i) => ({
      title: i.title,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      tangible: i.tangible,
    })),
    // A doc espera shipping = { fee, address: { ... } }, com `country`. Antes
    // os campos iam soltos na raiz de shipping, formato que a API nao le: o
    // endereco de entrega chegava vazio na PrimeCash.
    ...(input.shipping
      ? {
          shipping: {
            fee: 0,
            address: {
              street: input.shipping.street,
              streetNumber: input.shipping.streetNumber,
              complement: input.shipping.complement,
              zipCode: input.shipping.zipCode,
              neighborhood: input.shipping.neighborhood,
              city: input.shipping.city,
              state: input.shipping.state,
              country: "br",
            },
          },
        }
      : {}),
    ...(input.postbackUrl ? { postbackUrl: input.postbackUrl } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.ip ? { ip: input.ip } : {}),
  };

  const raw = await request<RawTransaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalize(raw);
}

/**
 * Consulta o status atual de uma transacao.
 * Usada pelo polling do checkout e para validar o webhook — como o postback
 * pode ser forjado por quem descobrir a URL, o status vem sempre desta chamada.
 */
export async function getCardTransaction(id: string): Promise<PrimeTransaction> {
  const raw = await request<RawTransaction>(
    `/transactions/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
  return normalize(raw);
}
