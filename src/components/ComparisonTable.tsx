import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

export function ComparisonTable({ product }: { product: Product }) {
  return (
    <section className="mt-3 rounded-lg bg-card p-4 shadow-card lg:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-base">
        <Trophy className="size-4 shrink-0 text-brand" aria-hidden />
        SGT Snow Foam vs. lavagem tradicional
      </h2>

      {/* Sem min-width: as tres colunas cabem em 390px deixando o texto quebrar.
          table-fixed impede que uma celula longa ("Alto — risca a pintura")
          estique a coluna e empurre a tabela para fora da tela. */}
      <table className="w-full table-fixed text-[11px] sm:text-sm">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[33%]" />
          <col className="w-[33%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-[10px] sm:text-xs">
            <th className="py-2 pr-1.5 text-left align-bottom">ITEM</th>
            <th className="px-1 py-2 text-center align-bottom break-words">
              {product.sku}
            </th>
            <th className="px-1 py-2 text-center align-bottom break-words">
              BALDE / ESPONJA
            </th>
          </tr>
        </thead>
        <tbody>
          {product.comparison.map((row, i) => (
            <tr
              key={row.item}
              className={cn(
                "border-b border-border/60",
                i % 2 === 1 && "bg-secondary/50",
              )}
            >
              <td className="py-2.5 pr-1.5 align-top font-semibold text-muted-foreground break-words hyphens-auto">
                {row.item}
              </td>
              <td
                className={cn(
                  "px-1 py-2.5 text-center align-top font-black break-words hyphens-auto",
                  row.highlight ? "text-success" : "text-foreground",
                )}
              >
                {row.sigma}
              </td>
              <td className="px-1 py-2.5 text-center align-top font-semibold text-muted-foreground break-words hyphens-auto">
                {row.traditional}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
