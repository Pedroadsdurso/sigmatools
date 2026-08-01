"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  ChevronRight,
  Eye,
  Flame,
  Lock,
  RefreshCw,
  ShieldCheck,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ShippingCalculator } from "@/components/ShippingCalculator";
import {
  discountPercent,
  formatAmount,
  formatBRL,
  pixPriceCents,
} from "@/lib/format";
import type { Product } from "@/types/product";

export function BuyBox({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);

  const off = discountPercent(product.listPriceCents, product.priceCents);
  const { reais, centavos } = formatAmount(product.priceCents);
  const pix = pixPriceCents(product.priceCents, product.pixDiscount);
  const installment = Math.round(product.priceCents / product.installments);

  return (
    <div className="flex flex-col px-3 pt-3 lg:px-0 lg:pt-0">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-black">
        <span className="flex items-center gap-1 rounded-sm bg-brand px-1.5 py-0.5 text-brand-foreground">
          <Flame className="size-3" aria-hidden />
          MAIS VENDIDO
        </span>
        <span className="text-brand-dark">1º Lugar em Snow Foam</span>
      </div>

      <h1 className="text-[22px] leading-[27.5px]">{product.name}</h1>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">
        {product.tagline}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-0.5" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="size-3.5 fill-brand text-brand" />
          ))}
        </span>
        <span className="font-bold">{product.rating.toLocaleString("pt-BR")}</span>
        <span className="text-muted-foreground">
          ({product.ratingCount.toLocaleString("pt-BR")})
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          COD. {product.sku} {product.brand}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-success/30 bg-success/5 px-2.5 py-2 text-xs">
        <span className="flex items-center gap-1 font-black text-success">
          <Zap className="size-3.5" aria-hidden />
          ÓTIMA HORA PARA COMPRAR!
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          Termina em: <CountdownTimer />
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1.5">
          <Eye className="size-3.5 text-brand" aria-hidden />
          <span>
            <strong>{product.viewers} pessoas</strong> vendo agora
          </span>
        </span>
        <span className="flex items-center gap-1.5 rounded-md border border-danger/25 bg-danger/5 px-2 py-1.5">
          <Flame className="size-3.5 text-danger" aria-hidden />
          <span>
            <strong>Só {product.stock} unidades</strong> em estoque
          </span>
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground line-through">
          {formatBRL(product.listPriceCents)}
        </span>
        <span className="rounded-sm bg-success px-1.5 py-0.5 text-[11px] font-black text-success-foreground">
          {off}% OFF
        </span>
      </div>

      <div className="flex items-start gap-1">
        <span className="mt-2 text-xl font-bold">R$</span>
        <span className="text-[44px] font-black leading-[1.1]">{reais}</span>
        <span className="mt-2 text-xl font-bold">,{centavos}</span>
      </div>

      <p className="text-sm font-semibold text-muted-foreground">
        ou {product.installments}x de {formatBRL(installment)} sem juros
      </p>

      <div className="mt-2 flex w-fit items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5">
        <Image
          src="/images/payment/card-pix.svg"
          alt=""
          width={39}
          height={26}
          className="h-4 w-auto"
        />
        <span className="text-sm font-black text-success">
          {formatBRL(pix)} no Pix
        </span>
        <span className="rounded-sm bg-success px-1.5 py-0.5 text-[10px] font-black text-success-foreground">
          {Math.round(product.pixDiscount * 100)}% OFF
        </span>
      </div>

      <details className="group mt-3 rounded-md border border-border">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-semibold">
          <Image
            src="/images/payment/pix.png"
            alt=""
            width={258}
            height={167}
            className="h-4 w-auto"
          />
          Mais formas de pagamento
          <ChevronRight className="ml-auto size-4 transition-transform group-open:rotate-90" aria-hidden />
        </summary>
        <ul className="space-y-1 border-t border-border px-3 py-2.5 text-xs text-muted-foreground">
          <li>Pix — {formatBRL(pix)} com {Math.round(product.pixDiscount * 100)}% de desconto</li>
          <li>Cartão de crédito — até {product.installments}x de {formatBRL(installment)} sem juros</li>
          <li>Boleto bancário — {formatBRL(product.priceCents)}</li>
        </ul>
      </details>

      <ShippingCalculator />

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-bold">Quantidade:</span>
        <div className="flex items-center gap-1 rounded-md border border-border">
          <button
            type="button"
            aria-label="Diminuir quantidade"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex size-9 items-center justify-center text-lg font-bold disabled:opacity-40"
            disabled={qty <= 1}
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold">{qty}</span>
          <button
            type="button"
            aria-label="Aumentar quantidade"
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            className="flex size-9 items-center justify-center text-lg font-bold disabled:opacity-40"
            disabled={qty >= product.stock}
          >
            +
          </button>
        </div>
      </div>

      <Link
        href={{ pathname: "/checkout", query: { product: product.id, qty } }}
        className="mt-4 flex h-14 items-center justify-center gap-2 rounded-md bg-success text-base font-black text-success-foreground shadow-sm transition-colors hover:brightness-95"
      >
        <Lock className="size-4" aria-hidden />
        COMPRAR AGORA
      </Link>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        🔒 Compra 100% segura · Entrega para todo o Brasil
      </p>
      <p className="mt-2 border-t border-border pt-2 text-center text-xs text-muted-foreground">
        Vendido e entregue por{" "}
        <strong className="text-foreground">{product.seller}</strong>
      </p>

      <ul className="mt-3 space-y-2 text-sm">
        {[
          { Icon: Truck, text: "Frete grátis para todo o Brasil" },
          { Icon: BadgeCheck, text: "Garantia de 12 meses do fabricante" },
          { Icon: RefreshCw, text: "30 dias para troca ou devolução" },
          { Icon: ShieldCheck, text: "Compra 100% segura" },
        ].map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-2">
            <Icon className="size-4 shrink-0 text-success" aria-hidden />
            <span className="font-semibold text-muted-foreground">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
