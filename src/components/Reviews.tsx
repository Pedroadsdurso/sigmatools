import Image from "next/image";
import { Star } from "lucide-react";
import type { Product } from "@/types/product";

export function Reviews({ product }: { product: Product }) {
  return (
    <section className="mt-3 rounded-lg bg-card p-4 shadow-card lg:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base">
        <Star className="size-4 fill-brand text-brand" aria-hidden />
        Avaliações
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {product.reviews.map((r) => (
          <article
            key={r.author}
            className="rounded-lg border border-border p-3"
          >
            <div className="mb-1.5 flex gap-0.5" aria-label={`${r.stars} de 5 estrelas`}>
              {Array.from({ length: r.stars }, (_, i) => (
                <Star key={i} className="size-3.5 fill-brand text-brand" aria-hidden />
              ))}
            </div>

            <p className="mb-3 text-sm font-semibold text-muted-foreground">
              {r.text}
            </p>

            <Image
              src={r.photo}
              alt={r.photoAlt}
              width={676}
              height={1200}
              className="mb-3 max-h-[280px] w-full rounded-md object-cover"
              loading="lazy"
            />

            <p className="text-sm font-black">{r.author}</p>
            <p className="text-xs text-muted-foreground">{r.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
