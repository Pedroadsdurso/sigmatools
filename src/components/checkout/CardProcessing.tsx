"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Lock } from "lucide-react";
import { formatBRL } from "@/lib/format";

/** Intervalo do polling de status do cartao. */
const POLL_MS = 3500;

export interface CardTx {
  id: string;
  amountCents: number;
}

/**
 * Tela de espera para cartao aprovado de forma assincrona (status
 * processing/authorized/waiting_payment). Faz polling ate a PrimeCash
 * confirmar (paid) ou recusar. Quando aprovado, redireciona para /obrigado,
 * onde o pagamento e reconfirmado no servidor antes de contar a venda.
 */
export function CardProcessing({
  tx,
  onRetry,
}: {
  tx: CardTx;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    if (refused) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/card/status/${tx.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data: { paid?: boolean; pending?: boolean; refusedReason?: string | null } =
          await res.json();

        if (cancelled) return;

        if (data.paid) {
          clearInterval(timer);
          router.replace(`/obrigado?tx=${encodeURIComponent(tx.id)}&m=card`);
        } else if (!data.pending) {
          // Nem pago nem pendente => recusado/cancelado.
          clearInterval(timer);
          setRefused(
            data.refusedReason ??
              "Pagamento nao aprovado pela operadora. Tente outro cartao ou pague com Pix.",
          );
        }
      } catch {
        // Falha de rede e transitoria — a proxima tentativa resolve.
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tx.id, refused, router]);

  if (refused) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-5 text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-danger/15">
          <AlertTriangle className="size-6 text-danger" aria-hidden />
        </span>
        <h2 className="text-base text-danger">Pagamento não aprovado</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-muted-foreground">
          {refused}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-11 w-full rounded-md bg-foreground text-sm font-black text-background"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-success/15">
        <Loader2 className="size-8 animate-spin text-success" aria-hidden />
      </span>
      <h2 className="flex items-center gap-2 text-lg">
        <Lock className="size-4" aria-hidden />
        Processando pagamento
      </h2>
      <p className="mt-2 max-w-sm text-sm font-semibold text-muted-foreground">
        Estamos confirmando a autorização do seu cartão de{" "}
        <span className="font-black text-success">{formatBRL(tx.amountCents)}</span>. Isso leva
        alguns segundos — não feche esta página.
      </p>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="size-3.5 text-success" aria-hidden />
        Ambiente seguro e criptografado
      </p>
    </div>
  );
}
