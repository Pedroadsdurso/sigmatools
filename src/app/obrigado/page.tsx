import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, Package, ShieldCheck, Truck } from "lucide-react";
import { PurchaseTracker } from "@/components/checkout/PurchaseTracker";
import { getTransaction } from "@/lib/onyxpag";
import { getCardTransaction } from "@/lib/primecash";
import { formatBRL } from "@/lib/format";
import { store } from "@/data/product";

export const metadata: Metadata = {
  title: "Pedido confirmado — SGT Tools Oficial",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ tx?: string; m?: string }>;
}) {
  const { tx, m } = await searchParams;
  const isCard = m === "card";

  // O status vem da API, nunca da URL: sem isso bastaria abrir /obrigado?tx=x
  // para ver uma confirmacao de pagamento que nunca aconteceu.
  // Cartao -> PrimeCash; Pix -> OnyxPag (dois gateways independentes).
  let paid = false;
  let amountCents: number | null = null;

  if (isCard) {
    // Ids da PrimeCash sao numericos e curtos (ex.: "282").
    if (tx && /^[\w-]{1,64}$/.test(tx)) {
      try {
        const t = await getCardTransaction(tx);
        paid = t.status === "paid";
        amountCents = t.amount; // PrimeCash ja retorna em centavos.
      } catch {
        // Falha de consulta cai na tela neutra abaixo.
      }
    }
  } else if (tx && /^[\w-]{6,64}$/.test(tx)) {
    try {
      const t = await getTransaction(tx);
      paid = t.status === "pago";
      amountCents = Math.round(t.amount * 100);
    } catch {
      // Falha de consulta cai na tela neutra abaixo.
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
              COMPRA
              <br />
              CONFIRMADA
            </span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {paid && tx && amountCents !== null && (
          <PurchaseTracker
            transactionId={tx}
            amountCents={amountCents}
            method={isCard ? "cartao" : "pix"}
          />
        )}

        <div className="rounded-lg bg-card p-6 text-center shadow-card sm:p-8">
          <span
            className={
              paid
                ? "mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/15"
                : "mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand/15"
            }
          >
            {paid ? (
              <ShieldCheck className="size-8 text-success" aria-hidden />
            ) : (
              <Clock className="size-8 text-brand" aria-hidden />
            )}
          </span>

          {paid ? (
            <>
              <h1 className="text-xl sm:text-2xl">Pagamento confirmado!</h1>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-muted-foreground">
                {isCard ? "Recebemos seu pagamento no cartão" : "Recebemos seu Pix"}
                {amountCents !== null && (
                  <>
                    {" "}
                    de{" "}
                    <strong className="text-success">{formatBRL(amountCents)}</strong>
                  </>
                )}
                . Seu pedido já entrou na fila de separação.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl sm:text-2xl">
                {isCard ? "Estamos processando seu pagamento" : "Estamos aguardando seu Pix"}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-muted-foreground">
                Assim que o pagamento for {isCard ? "autorizado" : "compensado"}, você recebe a
                confirmação por e-mail. Isso costuma levar menos de um minuto.
              </p>
            </>
          )}

          {tx && (
            <p className="mt-4 inline-block rounded-md bg-secondary px-3 py-1.5 font-mono text-xs text-muted-foreground">
              Pedido {tx}
            </p>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-card p-6 shadow-card">
          <h2 className="mb-4 text-base">Próximos passos</h2>
          <ol className="space-y-4">
            {[
              {
                Icon: Mail,
                title: "Confirmação por e-mail",
                text: "Enviamos os dados do pedido para o e-mail informado no checkout.",
              },
              {
                Icon: Package,
                title: "Separação e postagem",
                text: "Seu pedido é postado em até 1 dia útil após a confirmação.",
              },
              {
                Icon: Truck,
                title: "Entrega",
                text: "Você recebe o código de rastreio assim que o pacote for despachado.",
              },
            ].map(({ Icon, title, text }, i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-xs font-black text-success">
                  {i + 1}
                </span>
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-black">
                    <Icon className="size-4 text-success" aria-hidden />
                    {title}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-muted-foreground">
                    {text}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4 rounded-lg bg-card p-6 text-center shadow-card">
          <p className="text-sm font-semibold text-muted-foreground">
            Dúvidas sobre o pedido? Fale com a gente no WhatsApp.
          </p>
          <a
            href={store.whatsappUrl}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-md bg-success px-6 text-sm font-black text-success-foreground"
          >
            {store.whatsapp}
          </a>
          <p className="mt-4 text-xs text-muted-foreground">
            {store.hours.join(" · ")}
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Voltar para a loja
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          {store.name} · CNPJ {store.cnpj}
        </p>
      </footer>
    </div>
  );
}
