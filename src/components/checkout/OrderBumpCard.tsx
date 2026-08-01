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
        "rounded-lg border-2 border-dashed p-3 transition-colors",
        checked ? "border-success bg-success/5" : "border-success/50 bg-success/[0.03]",
      )}
    >
      <p className="text-sm font-black">
        <span aria-hidden>🎁 </span>
        {bump.headline}
      </p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {bump.description}
      </p>

      <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-card p-2">
        <Image
          src={bump.image}
          alt={bump.productName}
          width={96}
          height={96}
          className="size-12 shrink-0 rounded object-contain"
        />
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold leading-snug">{bump.productName}</p>
          <p className="text-sm">
            <span className="text-muted-foreground line-through">
              {formatBRL(bump.listPriceCents)}
            </span>{" "}
            <strong className="font-black text-success">
              {formatBRL(bump.priceCents)}
            </strong>
          </p>
        </div>
      </div>

      <label
        htmlFor={inputId}
        className={cn(
          "mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-4 accent-[oklch(0.65_0.19_145)]"
        />
        {bump.cta}
      </label>
    </div>
  );
}
