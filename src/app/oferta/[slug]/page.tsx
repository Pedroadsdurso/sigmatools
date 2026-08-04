import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { OfferFlow } from "@/components/funnel/OfferFlow";
import { PurchaseTracker } from "@/components/checkout/PurchaseTracker";
import { findOfferBySlug, FUNNEL_ENTRY_SLUG } from "@/data/funnel";
import { readFunnelSession } from "@/lib/funnel-session";
import { getTransaction } from "@/lib/onyxpag";
import { getCardTransaction } from "@/lib/primecash";
import { store } from "@/data/product";

export const metadata: Metadata = {
  title: "Oferta exclusiva do seu pedido — SGT Tools Oficial",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Uma tela do funil pos-compra.
 *
 * Duas portas antes de mostrar qualquer coisa:
 *   1. existe sessao do funil (cookie cifrado gravado no checkout)?
 *   2. o pedido principal foi REALMENTE pago, conferido no gateway?
 *
 * Sem as duas, /oferta/<slug> vira uma pagina que qualquer um abre para comprar
 * um upsell sem ter comprado o produto — ou pior, para ver dados de pedido.
 */
export default async function OfertaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const offer = findOfferBySlug(slug);
  if (!offer) notFound();

  const session = await readFunnelSession();
  if (!session) redirect("/");

  const isCard = session.method === "card";

  // Status real do pedido principal. Se a consulta falhar (rede/gateway fora),
  // deixamos passar: barrar um cliente que ja pagou por causa de instabilidade
  // custa mais que exibir uma oferta a mais — a cobranca em si continua
  // dependendo do cartao/Pix dele.
  let mainPaid = true;
  let mainAmountCents: number | null = null;
  try {
    if (isCard) {
      const t = await getCardTransaction(session.tx);
      mainPaid = t.status === "paid";
      mainAmountCents = t.amount;
    } else {
      const t = await getTransaction(session.tx);
      mainPaid = t.status === "pago";
      mainAmountCents = Math.round(t.amount * 100);
    }
  } catch {
    // Segue com mainPaid = true (ver comentario acima).
  }

  if (!mainPaid) {
    redirect(`/obrigado?tx=${encodeURIComponent(session.tx)}${isCard ? "&m=card" : ""}`);
  }

  // O Purchase da compra PRINCIPAL dispara aqui, na primeira tela do funil, e
  // nao so em /obrigado: quem abandona no meio do funil nunca chegaria la, e a
  // venda sumiria do relatorio. PurchaseTracker deduplica por transacao.
  const trackMain = slug === FUNNEL_ENTRY_SLUG ? mainAmountCents : null;

  const firstName = session.name.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {trackMain !== null && (
        <PurchaseTracker
          transactionId={session.tx}
          amountCents={trackMain}
          method={isCard ? "cartao" : "pix"}
        />
      )}

      <header className="border-b-2 border-brand bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/images/sgt-logo.webp"
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
              PEDIDO
              <br />
              CONFIRMADO
            </span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-5 sm:px-4 sm:py-8">
        <OfferFlow offer={offer} method={session.method} firstName={firstName} />
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          {store.name} · CNPJ {store.cnpj} · Ambiente seguro e criptografado
        </p>
      </footer>
    </div>
  );
}
