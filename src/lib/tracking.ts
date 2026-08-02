/**
 * Ponte para os pixels instalados no layout (Traffik + Meta).
 *
 * Sempre dispare por aqui, nunca chamando fbq direto: o snippet da Traffik
 * envia o evento ao servidor dela E espelha no pixel nativo da Meta com o
 * MESMO event_id. Chamar fbq por fora criaria um segundo evento sem par, e a
 * Meta contaria os dois — inflando o sinal que otimiza a campanha.
 *
 * O fallback para fbq só existe para o caso de a Traffik não ter carregado
 * (bloqueador, falha de rede). Aí é melhor um evento sem dedup do que nenhum.
 */

interface TraffikPixel {
  track: (event: string, extra?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    traffikPixel?: TraffikPixel;
    fbq?: (...args: unknown[]) => void;
    traffik?: { getData?: () => Record<string, unknown>; data?: Record<string, unknown> };
    /** Definida pelo layout so quando CONTEXT === "production" no Netlify. */
    __traffikAtivo?: number;
  }
}

/** Dados de atribuição capturados pelo script de UTM da Traffik. */
export function attribution(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    return window.traffik?.getData?.() ?? window.traffik?.data ?? {};
  } catch {
    return {};
  }
}

/**
 * click_id da Traffik para atribuir a venda no cartao.
 *
 * O Pix (OnyxPag) e atribuido nativamente pela ferramenta; no cartao a gente
 * precisa mandar esse id junto da venda. A Traffik o guarda no cookie
 * `traffik_track` depois do /api/track/click, e expoe via getData().
 */
export function clickId(): string | undefined {
  const id = attribution().click_id;
  return typeof id === "string" && id ? id : undefined;
}

/**
 * Guarda contra disparo duplicado.
 *
 * Em producao cada evento estava saindo DUAS vezes: o `beforeInteractive` do
 * Next no App Router injeta o script inline no HTML e o reexecuta na
 * hidratacao. O event_id deterministico da Traffik salvava a Meta (ela
 * deduplica por id), mas o servidor da Traffik recebia dois POSTs por acao.
 *
 * A janela curta bloqueia a repeticao acidental sem impedir um disparo
 * legitimo mais tarde — o cliente pode voltar e clicar em comprar de novo.
 */
const JANELA_MS = 5000;
const enviados = new Map<string, number>();

function duplicado(chave: string): boolean {
  const agora = Date.now();
  const anterior = enviados.get(chave);

  for (const [k, t] of enviados) {
    if (agora - t > JANELA_MS) enviados.delete(k);
  }

  if (anterior !== undefined && agora - anterior < JANELA_MS) return true;
  enviados.set(chave, agora);
  return false;
}

function send(event: string, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  // A chave inclui o valor: dois InitiateCheckout com carrinhos diferentes sao
  // acoes distintas e devem passar os dois.
  if (duplicado(`${event}:${extra?.value ?? ""}:${extra?.transacao ?? ""}`)) return;

  // O rastreio de tráfego (utm_*, fbclid, click_id) viaja junto de todo evento,
  // para o relatório da Traffik ligar a venda à campanha que a originou.
  const payload = { ...attribution(), ...extra };

  try {
    if (window.traffikPixel?.track) {
      window.traffikPixel.track(event, payload);
      return;
    }
    // Fallback so vale quando o rastreamento esta ligado e a Traffik nao
    // carregou (bloqueador, falha de rede): ai um evento sem dedup e melhor
    // que nenhum. Num preview, onde a Traffik nem foi injetada, nao dispara.
    if (window.__traffikAtivo && typeof window.fbq === "function") {
      const { value, currency } = extra ?? {};
      window.fbq("track", event, value != null ? { value, currency: currency ?? "BRL" } : {});
    }
  } catch {
    // Rastreamento nunca pode derrubar o checkout.
  }
}

const reais = (cents: number) => Number((cents / 100).toFixed(2));

/** Clique em "COMPRAR AGORA" — o lead está indo para o checkout. */
export function trackInitiateCheckout(totalCents: number, qty: number) {
  send("InitiateCheckout", { value: reais(totalCents), currency: "BRL", quantidade: qty });
}

/** Identificação preenchida (nome, e-mail, telefone, CPF). */
export function trackLead() {
  send("Lead", { etapa: "identificacao" });
}

/** Pix gerado e aguardando pagamento. */
export function trackPixPending(totalCents: number, transactionId: string) {
  send("AddPaymentInfo", {
    value: reais(totalCents),
    currency: "BRL",
    metodo: "pix",
    status: "pendente",
    transacao: transactionId,
  });
}

/** Dados do cartao enviados para cobranca (via PrimeCash). */
export function trackCardPending(totalCents: number, transactionId: string) {
  send("AddPaymentInfo", {
    value: reais(totalCents),
    currency: "BRL",
    metodo: "cartao",
    status: "processando",
    transacao: transactionId,
  });
}

/** Pagamento confirmado — a venda. */
export function trackPurchase(
  totalCents: number,
  transactionId: string,
  metodo: "pix" | "cartao" = "pix",
) {
  send("Purchase", {
    value: reais(totalCents),
    currency: "BRL",
    metodo,
    transacao: transactionId,
  });
}
