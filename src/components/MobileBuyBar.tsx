"use client";

import Link from "next/link";
import { formatBRL, pixPriceCents } from "@/lib/format";
import { trackInitiateCheckout } from "@/lib/tracking";
import type { Product } from "@/types/product";

/** Barra fixa de compra — visivel apenas abaixo de lg, como no original. */
export function MobileBuyBar({ product }: { product: Product }) {
  const pix = pixPriceCents(product.priceCents, product.pixDiscount);

  return (
    <div className="sticky bottom-0 z-40 border-t border-border bg-white shadow-[0_-8px_20px_-8px_rgba(0,0,0,0.15)] lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5">
        <div className="shrink-0 leading-tight">
          <p className="text-[11px] text-muted-foreground line-through">
            {formatBRL(product.listPriceCents)}
          </p>
          <p className="text-lg font-black text-success">{formatBRL(pix)}</p>
          <p className="text-[10px] font-semibold text-muted-foreground">
            no Pix · {Math.round(product.pixDiscount * 100)}% OFF
          </p>
        </div>
        <Link
          href={{ pathname: "/checkout", query: { product: product.id } }}
          onClick={() => trackInitiateCheckout(pix, 1)}
          className="ml-auto flex h-12 flex-1 items-center justify-center rounded-md bg-success text-sm font-black text-success-foreground"
        >
          COMPRAR AGORA
        </Link>
      </div>
    </div>
  );
}
