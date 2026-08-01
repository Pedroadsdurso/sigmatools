import { ChevronDown, HelpCircle } from "lucide-react";
import type { Product } from "@/types/product";

export function Faq({ product }: { product: Product }) {
  return (
    <section className="mt-3 rounded-lg bg-card p-4 shadow-card lg:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-base">
        <HelpCircle className="size-4 text-brand" aria-hidden />
        Perguntas frequentes
      </h2>

      {/* O original usa <details>/<summary> nativo — mantido para preservar o
          comportamento sem JavaScript. */}
      <div className="divide-y divide-border border-y border-border">
        {product.faq.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 py-3 text-sm font-semibold">
              {item.question}
              <ChevronDown
                className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="pb-3 text-sm font-semibold text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
