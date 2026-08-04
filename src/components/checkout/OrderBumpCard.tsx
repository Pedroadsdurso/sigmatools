"use client";

import Image from "next/image";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderBump } from "@/types/product";

interface OrderBumpCardProps {
  bump: OrderBump;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  disabled?: boolean;
}

export function OrderBumpCard({ bump, checked, onToggle, disabled }: OrderBumpCardProps) {
  const inputId = `bump-${bump.id}`;

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed p-2.5 transition-colors sm:p-3",
        checked ? "border-success bg-success/5" : "border-success/50 bg-success/[0.03]",
      )}
    >
      <p className="text-[13px] font-black leading-snug text-balance sm:text-sm">
        <span aria-hidden>🎁 </span>
        {bump.headline}
      </p>
      <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
        {bump.description}
      </p>

      <div className="mt-2.5 flex items-center gap-2.5 rounded-md border border-border bg-card p-2 sm:mt-3 sm:gap-3">
        <Image
          src={bump.image}
          alt={bump.productName}
          width={96}
          height={96}
          sizes="(max-width: 640px) 48px, 56px"
          className="size-12 shrink-0 rounded object-contain sm:size-14"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug break-words hyphens-auto sm:text-sm">
            {bump.productName}
          </p>
          {/* flex-wrap: em telas de 320px os dois precos nao cabem lado a lado
              e o "de/por" quebrava dentro da propria palavra. */}
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-sm">
            <span className="text-xs text-muted-foreground line-through sm:text-sm">
              {formatBRL(bump.listPriceCents)}
            </span>
            <strong className="font-black text-success">{formatBRL(bump.priceCents)}</strong>
          </p>
        </div>
      </div>

      <label
        htmlFor={inputId}
        className={cn(
          // min-h-11: alvo de toque confortavel no celular mesmo quando o
          // texto do CTA cabe em uma linha so.
          "mt-2 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2 text-[13px] font-semibold leading-snug sm:px-3 sm:text-sm",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-4 shrink-0 accent-[oklch(0.65_0.19_145)]"
        />
        <span className="min-w-0">{bump.cta}</span>
      </label>
    </div>
  );
}
