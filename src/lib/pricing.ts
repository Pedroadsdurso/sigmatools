import { coupons, orderBumps, product, shippingOptions } from "@/data/product";
import type { Coupon, PaymentMethod } from "@/types/product";

export interface CartSelection {
  qty: number;
  shippingId: string;
  bumpIds: string[];
  method: PaymentMethod;
  couponCode?: string;
}

/** Busca o cupom pelo codigo, sem diferenciar maiusculas. */
export function findCoupon(code: string | undefined): Coupon | null {
  if (!code) return null;
  const norm = code.trim().toUpperCase();
  return coupons.find((c) => c.code.toUpperCase() === norm) ?? null;
}

export interface CartTotals {
  qty: number;
  subtotalCents: number;
  bumpsCents: number;
  shippingCents: number;
  /** Desconto do Pix. Zero quando o metodo e cartao. */
  discountCents: number;
  /** Desconto do cupom aplicado, se houver. */
  couponCents: number;
  couponLabel: string | null;
  totalCents: number;
  bumps: { id: string; title: string; priceCents: number }[];
  shippingLabel: string;
}

/**
 * Unica fonte de verdade do preco. Importada tanto pelo checkout (para exibir)
 * quanto pela rota de cobranca (para cobrar) — se divergissem, o cliente veria
 * um valor e pagaria outro.
 *
 * Regra: o desconto do Pix incide sobre as mercadorias (produto + bumps) e
 * nunca sobre o frete.
 */
export function calculateTotals(sel: CartSelection): CartTotals {
  const qty = clampQty(sel.qty);

  const shipping =
    shippingOptions.find((s) => s.id === sel.shippingId) ?? shippingOptions[0];

  const chosenBumps = orderBumps.filter((b) => sel.bumpIds.includes(b.id));

  const subtotalCents = product.priceCents * qty;
  const bumpsCents = chosenBumps.reduce((sum, b) => sum + b.priceCents, 0);
  const goodsCents = subtotalCents + bumpsCents;

  const discountCents =
    sel.method === "pix" ? Math.round(goodsCents * product.pixDiscount) : 0;

  // O cupom incide sobre as mercadorias ja liquidas do desconto do Pix, e nunca
  // pode derrubar o total abaixo do frete.
  const coupon = findCoupon(sel.couponCode);
  const afterPix = goodsCents - discountCents;
  const rawCoupon = coupon
    ? coupon.type === "percent"
      ? Math.round(afterPix * coupon.value)
      : coupon.value
    : 0;
  const couponCents = Math.min(rawCoupon, afterPix);

  return {
    qty,
    subtotalCents,
    bumpsCents,
    shippingCents: shipping.priceCents,
    discountCents,
    couponCents,
    couponLabel: coupon ? `${coupon.code} — ${coupon.label}` : null,
    totalCents: afterPix - couponCents + shipping.priceCents,
    bumps: chosenBumps.map((b) => ({
      id: b.id,
      title: b.productName,
      priceCents: b.priceCents,
    })),
    shippingLabel: shipping.label,
  };
}

/** Mantem a quantidade dentro do estoque, mesmo se vier adulterada do cliente. */
export function clampQty(qty: unknown): number {
  const n = Number(qty);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, product.stock);
}

/* ------------------------------------------------------------------ */
/* Parcelamento no cartao                                             */
/* ------------------------------------------------------------------ */

/** Numero maximo de parcelas oferecidas no cartao. */
export const MAX_INSTALLMENTS = 12;

/** Ate esta quantidade de parcelas nao ha juros. */
export const INTEREST_FREE_INSTALLMENTS = 3;

/**
 * Juros TOTAL (fracao sobre o valor a vista) por numero de parcelas.
 * Ate 3x sem juros; de 4x a 12x conforme a tabela combinada com o gateway.
 * Ex.: 0.03 = +3% sobre o total. Fonte unica: usada tanto para EXIBIR quanto
 * para COBRAR — se divergissem, o cliente veria um valor e pagaria outro.
 */
export const INSTALLMENT_INTEREST: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0.03,
  5: 0.04,
  6: 0.05,
  7: 0.06,
  8: 0.07,
  9: 0.08,
  10: 0.09,
  11: 0.1,
  12: 0.12,
};

/** Normaliza o numero de parcelas para o intervalo valido (1..MAX). */
export function clampInstallments(n: unknown): number {
  const v = Math.trunc(Number(n) || 1);
  return Math.min(Math.max(1, v), MAX_INSTALLMENTS);
}

/** Total a cobrar no cartao para N parcelas, ja com o juros aplicado. */
export function installmentTotalCents(baseTotalCents: number, installments: number): number {
  const n = clampInstallments(installments);
  const interest = INSTALLMENT_INTEREST[n] ?? 0;
  return Math.round(baseTotalCents * (1 + interest));
}

/** Valor de cada parcela (total com juros / N), arredondado. */
export function installmentAmountCents(baseTotalCents: number, installments: number): number {
  const n = clampInstallments(installments);
  return Math.round(installmentTotalCents(baseTotalCents, n) / n);
}

export const isPaymentMethod = (v: unknown): v is PaymentMethod =>
  v === "pix" || v === "card";
