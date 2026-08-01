import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

export function ComparisonTable({ product }: { product: Product }) {
  return (
    <section className="mt-3 rounded-lg bg-card p-4 shadow-card lg:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-base">
        <Trophy className="size-4 text-brand" aria-hidden />
        SGT Snow Foam vs. lavagem tradicional
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border text-xs">
              <th className="py-2 text-left">ITEM</th>
              <th className="py-2 text-center">{product.sku}</th>
              <th className="py-2 text-center">BALDE / ESPONJA</th>
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
                <td className="py-2.5 pr-3 font-semibold text-muted-foreground">
                  {row.item}
                </td>
                <td
                  className={cn(
                    "py-2.5 text-center font-black",
                    row.highlight ? "text-success" : "text-foreground",
                  )}
                >
                  {row.sigma}
                </td>
                <td className="py-2.5 text-center font-semibold text-muted-foreground">
                  {row.traditional}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
