"use client";

/**
 * Cofre do cartao para o one-click do funil — SO NO NAVEGADOR.
 *
 * O problema: o hash da PrimeCash e de uso unico e expira em ~5 minutos, entao
 * ele nao serve para cobrar o upsell alguns minutos depois. Para o cliente
 * comprar com um clique, sem redigitar nada, os dados do cartao precisam estar
 * disponiveis na hora de gerar um hash NOVO.
 *
 * A escolha: guardar no `sessionStorage` da aba, e re-tokenizar a cada
 * cobranca. Consequencias, de proposito:
 *
 *   - o numero e o CVV continuam sem NUNCA passar pelo nosso servidor — para o
 *     backend so vai o hash, exatamente como na compra principal;
 *   - o dado morre quando a aba fecha, e e apagado explicitamente no fim do
 *     funil (`clearCard`);
 *   - o escopo e a origem do site: outro dominio nao le, e o cookie da sessao
 *     do funil (HttpOnly) segue inacessivel a scripts.
 *
 * Guardar cartao no servidor exigiria certificacao PCI-DSS; guardar na aba,
 * pelo tempo da jornada, nao muda o nivel de exposicao que a propria tela de
 * checkout ja tem.
 */

const KEY = "sgt_card_v1";

export interface VaultedCard {
  number: string;
  holderName: string;
  /** "MM/AA". */
  expiry: string;
  cvv: string;
}

export function saveCard(card: VaultedCard): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(card));
  } catch {
    // Aba anonima restrita: o funil cai no formulario curto de cartao.
  }
}

/**
 * Valor cru do cofre (string ou null).
 *
 * Existe separado de `loadCard` para servir de snapshot em
 * `useSyncExternalStore`: string e comparavel por valor, entao o React nao
 * entra em loop — o que aconteceria com um objeto novo a cada leitura.
 */
export function cardSnapshot(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseCard(raw: string | null): VaultedCard | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<VaultedCard>;
    if (!c.number || !c.holderName || !c.expiry || !c.cvv) return null;
    return c as VaultedCard;
  } catch {
    return null;
  }
}

export function loadCard(): VaultedCard | null {
  return parseCard(cardSnapshot());
}

export function clearCard(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Sem sessionStorage nao ha o que limpar.
  }
}

/** Ultimos 4 digitos, para a tela confirmar qual cartao sera usado. */
export function cardLast4(card: VaultedCard): string {
  return card.number.replace(/\D/g, "").slice(-4);
}
