"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types/product";

interface ProductGalleryProps {
  images: ProductImage[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-2">
        <button
          type="button"
          aria-label="Favoritar"
          className="flex size-9 items-center justify-center rounded-full bg-white/90 text-muted-foreground shadow-sm transition-colors hover:text-brand"
        >
          <Heart className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Compartilhar"
          className="flex size-9 items-center justify-center rounded-full bg-white/90 text-muted-foreground shadow-sm transition-colors hover:text-brand"
        >
          <Share2 className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          width={900}
          height={900}
          sizes="(max-width: 1024px) 100vw, 520px"
          className="h-full w-full object-contain"
          priority={active === 0}
        />
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`Ver imagem ${i + 1}`}
            aria-current={i === active}
            className={cn(
              "size-14 shrink-0 overflow-hidden rounded-md border bg-white p-1 transition-colors",
              i === active ? "border-brand" : "border-border hover:border-muted-foreground",
            )}
          >
            <Image
              src={img.src}
              alt=""
              width={112}
              height={112}
              className="h-full w-full object-contain"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
