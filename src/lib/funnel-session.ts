import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sessao do funil pos-compra — EXCLUSIVAMENTE server-side.
 *
 * Para vender no upsell com UM clique, o servidor precisa lembrar quem e o
 * comprador (nome, e-mail, CPF, telefone, endereco) e qual foi o pedido
 * original. Como o projeto nao tem banco, esse estado viaja num cookie
 * HttpOnly CIFRADO com AES-256-GCM:
 *
 *   - HttpOnly    -> nenhum script da pagina le o conteudo;
 *   - AES-256-GCM -> o valor e ilegivel e, por causa da tag de autenticacao,
 *                    tambem inforjavel: mexer num byte invalida o cookie
 *                    inteiro. Sem isso, quem editasse o cookie poderia trocar
 *                    o e-mail/endereco de entrega de um pedido pago.
 *
 * O QUE NAO ENTRA AQUI: nada de cartao. Numero e CVV nunca chegam ao servidor
 * — para o one-click no cartao o dado fica no navegador e e re-tokenizado a
 * cada cobranca (ver src/lib/card-vault.ts).
 */

const COOKIE = "sgt_funnel";
/** Tempo de vida do funil. Curto de proposito: e uma jornada de minutos. */
const MAX_AGE_S = 2 * 60 * 60;

export interface FunnelAddress {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
}

/** Uma oferta ja paga dentro do funil. */
export interface FunnelExtra {
  id: string;
  name: string;
  priceCents: number;
  txId: string;
}

export interface FunnelSession {
  v: 1;
  /** Id da transacao do produto principal, no gateway correspondente. */
  tx: string;
  /** Gateway/metodo do pedido principal — define o caminho do one-click. */
  method: "pix" | "card";
  name: string;
  email: string;
  cpf: string;
  phone: string;
  address: FunnelAddress;
  /**
   * Sinais de atribuicao ja serializados (encodeAttribution) na compra
   * principal. Ficam aqui para as vendas do funil chegarem na ferramenta de
   * rastreamento ligadas a MESMA campanha, sem depender do que o navegador
   * reenviar depois.
   */
  attr?: string;
  /** Ofertas aceitas e pagas ate agora. */
  extras: FunnelExtra[];
  /** Epoch ms da criacao, para expirar mesmo se o cookie sobreviver. */
  at: number;
}

/**
 * Chave de cifra derivada do ambiente.
 *
 * Prioriza uma variavel dedicada; na falta dela reaproveita um segredo que a
 * loja ja precisa ter configurado. O ultimo recurso e uma chave fixa: mantem o
 * funil funcionando em desenvolvimento, mas registra o aviso — em producao,
 * sem segredo proprio, o cookie e cifrado com um valor que esta no repositorio.
 */
function secret(): string {
  const own =
    process.env.FUNNEL_SESSION_SECRET ??
    process.env.PRIMECASH_WEBHOOK_SECRET ??
    process.env.ONYXPAG_WEBHOOK_SECRET ??
    process.env.SECRET_TOKEN_PRIME_CASH;

  if (own && own.length >= 16) return own;

  console.warn(
    "[funnel] FUNNEL_SESSION_SECRET ausente: a sessao do funil esta usando chave de desenvolvimento. Configure a variavel na hospedagem.",
  );
  return "sgt-funnel-dev-key-troque-em-producao";
}

function key(): Buffer {
  return createHash("sha256").update(secret()).digest();
}

function seal(session: FunnelSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

function open(value: string): FunnelSession | null {
  try {
    const raw = Buffer.from(value, "base64url");
    // 12 (iv) + 16 (tag) + ao menos 1 byte de conteudo.
    if (raw.length < 29) return null;

    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString("utf8");

    const parsed = JSON.parse(json) as FunnelSession;
    if (parsed.v !== 1 || !parsed.tx) return null;
    if (Date.now() - parsed.at > MAX_AGE_S * 1000) return null;
    return parsed;
  } catch {
    // Cookie adulterado, cifrado com outra chave ou de uma versao antiga.
    return null;
  }
}

/** Le a sessao do funil da requisicao atual. */
export async function readFunnelSession(): Promise<FunnelSession | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value ? open(value) : null;
}

/** Grava/atualiza a sessao. So pode ser chamado em Route Handler/Server Action. */
export async function writeFunnelSession(session: FunnelSession): Promise<void> {
  (await cookies()).set(COOKIE, seal(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

/** Encerra o funil (fim da jornada). */
export async function clearFunnelSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Monta a sessao a partir dos dados que o checkout ja validou. */
export function buildFunnelSession(input: {
  tx: string;
  method: "pix" | "card";
  name: string;
  email: string;
  cpf: string;
  phone: string;
  address: FunnelAddress;
  attr?: string;
}): FunnelSession {
  return { v: 1, extras: [], at: Date.now(), ...input };
}
