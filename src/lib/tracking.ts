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

function send(event: string, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  // O rastreio de tráfego (utm_*, fbclid, click_id) viaja junto de todo evento,
  // para o relatório da Traffik ligar a venda à campanha que a originou.
  const payload = { ...attribution(), ...extra };

  try {
    if (window.traffikPixel?.track) {
      window.traffikPixel.track(event, payload);
      return;
    }
    if (typeof window.fbq === "function") {
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

/** Pagamento confirmado — a venda. */
export function trackPurchase(totalCents: number, transactionId: string) {
  send("Purchase", {
    value: reais(totalCents),
    currency: "BRL",
    metodo: "pix",
    transacao: transactionId,
  });
}
