import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { paymentBrands, product, store } from "@/data/product";

export const metadata: Metadata = {
  title: "Checkout Seguro — SGT Tools Oficial",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ qty?: string }>;
}) {
  const { qty } = await searchParams;
  const parsed = Number(qty);
  const initialQty =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= product.stock ? parsed : 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-brand bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/images/sgt-logo.png"
              alt="SGT Tools"
              width={124}
              height={147}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-black leading-tight text-[#d7f205]">
            <ShieldCheck className="size-5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">
              PAGAMENTO
              <br />
              100% SEGURO
            </span>
          </span>
        </div>
      </header>

      <main>
        <CheckoutFlow product={product} initialQty={initialQty} />
      </main>

      <footer className="border-t border-border py-8">
        <p className="text-center text-xs font-bold">Formas de pagamento</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {paymentBrands.map((b) => (
            <Image
              key={b.alt}
              src={b.src}
              alt={b.alt}
              width={39}
              height={26}
              className="h-8 w-auto rounded border border-border bg-white p-1"
            />
          ))}
        </div>

        <div className="mt-6 space-y-1 text-center text-xs text-muted-foreground">
          <p className="font-black text-foreground">{store.name}!</p>
          <p>CNPJ: {store.cnpj}</p>
          <p>Email: {store.email}</p>
          <p className="pt-1">
            {["Termos de uso", "Trocas e devoluções", "Política de Privacidade"].map(
              (t, i) => (
                <span key={t}>
                  {i > 0 && " | "}
                  <Link href="#" className="hover:text-brand">
                    {t}
                  </Link>
                </span>
              ),
            )}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-[11px] font-black">
          <span className="flex items-center gap-2">
            <Image
              src="/images/trust/ssl.png"
              alt=""
              width={80}
              height={38}
              className="h-6 w-auto"
            />
            <span>
              SEGURO
              <br />
              <span className="font-semibold text-muted-foreground">
                CERTIFICADO SSL
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            <Lock className="size-5" aria-hidden />
            <span>
              PAGAMENTOS
              <br />
              <span className="font-semibold text-muted-foreground">SEGUROS</span>
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
