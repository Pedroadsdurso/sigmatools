import { PlayCircle } from "lucide-react";
import type { Product } from "@/types/product";

export function ProductVideo({ product }: { product: Product }) {
  return (
    <section className="mt-3 overflow-hidden rounded-lg bg-card shadow-card">
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-base lg:px-6">
        <PlayCircle className="size-4 text-brand" aria-hidden />
        Veja o SIGMA 10930 em ação
      </h2>

      <div className="flex flex-col items-center px-4 py-4 lg:px-6">
        {/* O original serve um mp4 com controles nativos, sem autoplay.
            preload="none" + poster: o arquivo tem 5,8 MB e fica bem abaixo da
            dobra. Com "metadata" o navegador ja abria conexao e baixava o
            cabecalho em toda visita, mesmo de quem nunca da play. */}
        <video
          src={product.video.src}
          poster="/images/product/p1.webp"
          controls
          playsInline
          preload="none"
          className="aspect-[9/16] max-h-[560px] w-auto rounded-md bg-black"
        />
        <p className="mt-3 text-center text-sm font-semibold text-muted-foreground">
          {product.video.caption}
        </p>
      </div>
    </section>
  );
}
