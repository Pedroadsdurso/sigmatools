import { CheckCircle2, FileText } from "lucide-react";
import type { Product } from "@/types/product";

export function ProductDescription({ product }: { product: Product }) {
  return (
    <section className="mt-3 overflow-hidden rounded-lg bg-card shadow-card">
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-base lg:px-6">
        <FileText className="size-4 text-brand" aria-hidden />
        Descrição do produto
      </h2>

      <div className="px-4 py-4 lg:px-6">
        {product.descriptionParagraphs.map((p) => (
          <p key={p} className="mb-3 text-sm font-semibold text-muted-foreground">
            {p}
          </p>
        ))}

        <h3 className="mt-5 mb-2 text-sm">Destaques do Produto</h3>
        <ul className="space-y-2">
          {product.highlights.map((h) => (
            <li key={h.title} className="flex gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <span className="font-semibold text-muted-foreground">
                <strong className="text-foreground">{h.title}:</strong> {h.description}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm">Especificações Técnicas</h3>
            <table className="w-full text-sm">
              <tbody>
                {product.specs.map((s, i) => (
                  <tr
                    key={s.label}
                    className={i % 2 === 1 ? "bg-secondary/60" : undefined}
                  >
                    <td className="py-1.5 pr-3 font-semibold text-muted-foreground">
                      {s.label}
                    </td>
                    <td className="py-1.5 text-right font-bold">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-sm">Conteúdo da Embalagem</h3>
            <ul className="space-y-1.5">
              {product.boxContents.map((c) => (
                <li key={c} className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span className="font-semibold text-muted-foreground">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
