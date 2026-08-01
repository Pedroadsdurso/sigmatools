import Image from "next/image";
import Link from "next/link";
import { MapPin, Menu, Search, ShoppingCart } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-brand text-brand-foreground shadow-md">
      <div className="mx-auto max-w-6xl px-3 py-2 lg:px-6 lg:py-0">
        {/* Linha 1: menu, logo, CEP e carrinho. No desktop a busca entra nesta
            mesma linha; no mobile ela desce para a linha 2. */}
        <div className="flex items-center gap-2 lg:h-[68px] lg:gap-3 lg:pt-3 lg:pb-2">
          <button
            type="button"
            aria-label="Abrir menu"
            className="-ml-1 shrink-0 p-1 lg:hidden"
          >
            <Menu className="size-6" aria-hidden />
          </button>

          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/images/sgt-logo.webp"
              alt="SGT Tools"
              width={124}
              height={147}
              className="h-8 w-auto lg:h-9"
              priority
            />
          </Link>

          <button
            type="button"
            className="flex min-w-0 shrink items-center gap-1.5 text-left text-[11px] leading-tight"
          >
            <MapPin className="size-4 shrink-0 lg:size-5" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate opacity-90">Enviar para:</span>
              <span className="block truncate font-bold">Informe o CEP</span>
            </span>
          </button>

          <form
            className="ml-auto hidden w-full max-w-[560px] items-center lg:flex"
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
            className="ml-auto shrink-0 p-1 lg:ml-1 lg:p-1.5"
          >
            <ShoppingCart className="size-6" aria-hidden />
          </button>
        </div>

        {/* Linha 2 (so mobile): busca em largura total, com botao escuro. */}
        <form className="mt-2 flex items-center lg:hidden" role="search">
          <label htmlFor="site-search-mobile" className="sr-only">
            Buscar produtos
          </label>
          <input
            id="site-search-mobile"
            type="search"
            placeholder="Busque por produtos, marcas ou categorias..."
            className="h-10 w-full min-w-0 rounded-l-md bg-white px-3 text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="flex h-10 w-12 shrink-0 items-center justify-center rounded-r-md bg-[#0a0a0a] text-white"
          >
            <Search className="size-4" aria-hidden />
          </button>
        </form>
      </div>
    </header>
  );
}
