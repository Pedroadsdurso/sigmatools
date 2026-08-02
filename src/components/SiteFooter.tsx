import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/icons";
import { paymentBrands, store } from "@/data/product";
import type { Product } from "@/types/product";

export function SiteFooter({ product }: { product: Product }) {
  return (
    <footer className="mt-8 border-t-4 border-brand bg-[#0a0a0a] text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/images/sgt-logo.webp"
            alt="SGT Tools"
            width={124}
            height={147}
            className="h-12 w-auto"
          />
          <div className="flex gap-3">
            <Link href="#" aria-label="Instagram" className="transition-colors hover:text-brand">
              <InstagramIcon className="size-5" />
            </Link>
            <Link href="#" aria-label="Facebook" className="transition-colors hover:text-brand">
              <FacebookIcon className="size-5" />
            </Link>
          </div>
        </div>

        <div className="grid gap-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-2 text-xs text-white">NAVEGAÇÃO</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/" className="transition-colors hover:text-brand">
                  Início
                </Link>
              </li>
              <li>
                <Link href="#" className="transition-colors hover:text-brand">
                  Produtos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-xs text-white">ATENDIMENTO</h3>
            <Link
              href={store.whatsappUrl}
              className="block transition-colors hover:text-brand"
            >
              <span className="block text-xs">WHATSAPP</span>
              <span className="block font-bold text-white">{store.whatsapp}</span>
            </Link>
            {store.hours.map((h) => (
              <p key={h} className="text-xs">
                {h}
              </p>
            ))}
          </div>

          <div>
            <h3 className="mb-2 text-xs text-white">INSTITUCIONAL</h3>
            <ul className="space-y-1">
              {["Trocas e devoluções", "Política de privacidade", "Termos de uso"].map(
                (t) => (
                  <li key={t}>
                    <Link href="#" className="transition-colors hover:text-brand">
                      {t}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-xs text-white">SEGURANÇA</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Image src="/images/trust/ssl.webp" alt="SSL Certificado" width={80} height={38} className="h-8 w-auto rounded bg-white p-1" />
              <Image src="/images/trust/norton.webp" alt="Norton by Symantec" width={1600} height={617} className="h-8 w-auto rounded bg-white p-1" />
              <Image src="/images/trust/google-safe.webp" alt="Google Site Seguro" width={110} height={40} className="h-8 w-auto rounded bg-white p-1" />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] tracking-wide">PAGAMENTO</span>
            {paymentBrands.map((b) => (
              <Image
                key={b.alt}
                src={b.src}
                alt={b.alt}
                width={39}
                height={26}
                className="h-6 w-auto rounded bg-white p-0.5"
              />
            ))}
          </div>
          <span className="flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-[10px]">
            <Lock className="size-3" aria-hidden />
            SECURE SSL
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-1 border-t border-white/10 pt-4 text-[11px] sm:flex-row sm:justify-between">
          <span>© 2026 {store.name}</span>
          <span>{product.name}</span>
        </div>

        <p className="mt-3 text-center text-[10px] leading-relaxed text-zinc-500">
          {store.legal}
        </p>
      </div>
    </footer>
  );
}
