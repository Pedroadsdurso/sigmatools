import Image from "next/image";
import Link from "next/link";
import { MapPin, Search, ShoppingCart } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-brand text-brand-foreground shadow-md">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-3 px-3 pt-3 pb-2 lg:h-[68px] lg:px-6">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/images/sgt-logo.png"
            alt="SGT Tools"
            width={124}
            height={147}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 text-left text-[11px] leading-tight"
        >
          <MapPin className="size-5" aria-hidden />
          <span>
            <span className="block opacity-90">Enviar para:</span>
            <span className="block font-bold">Informe o CEP</span>
          </span>
        </button>

        {/* O original esconde a busca no mobile — o header vira so logo, CEP e
            carrinho, e o espaco vai para o produto. */}
        <form
          className="relative ml-auto hidden w-full max-w-[560px] items-center sm:flex"
          role="search"
        >
          <label htmlFor="site-search" className="sr-only">
            Buscar produtos
          </label>
          <input
            id="site-search"
            type="search"
            placeholder="Busque por produtos, marcas ou categorias..."
            className="h-10 w-full rounded-l-sm bg-white px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="flex h-10 w-11 shrink-0 items-center justify-center rounded-r-sm bg-white text-muted-foreground hover:text-foreground"
          >
            <Search className="size-4" aria-hidden />
          </button>
        </form>

        <button
          type="button"
          aria-label="Carrinho"
          className="ml-1 shrink-0 p-1.5"
        >
          <ShoppingCart className="size-6" aria-hidden />
        </button>
      </div>
    </header>
  );
}
