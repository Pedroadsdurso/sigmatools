/** Formata centavos como "R$ 89,90". */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Formata centavos como "89,90" — sem o simbolo, para o preco grande da buy box. */
export function formatAmount(cents: number): { reais: string; centavos: string } {
  const reais = Math.floor(cents / 100).toLocaleString("pt-BR");
  const centavos = String(cents % 100).padStart(2, "0");
  return { reais, centavos };
}

/** Percentual de desconto arredondado, ex.: 19790 -> 8990 = 55. */
export function discountPercent(listCents: number, priceCents: number): number {
  if (listCents <= 0) return 0;
  return Math.round((1 - priceCents / listCents) * 100);
}

/** Preco final no Pix, ja com o desconto aplicado. */
export function pixPriceCents(priceCents: number, pixDiscount: number): number {
  return Math.round(priceCents * (1 - pixDiscount));
}
