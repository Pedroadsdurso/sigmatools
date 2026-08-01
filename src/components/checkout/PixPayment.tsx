"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Copy, Loader2 } from "lucide-react";
import { formatBRL } from "@/lib/format";

export interface PixCharge {
  id: string;
  pixCode: string;
  pixQrCode: string;
  amountCents: number;
  expiresAt: string | null;
}

/** Intervalo do polling de status. */
const POLL_MS = 4000;

export function PixPayment({ charge }: { charge: PixCharge }) {
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (paid) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status/${charge.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data: { paid?: boolean } = await res.json();
        if (!cancelled && data.paid) setPaid(true);
      } catch {
        // Falha de rede no polling e transitoria — a proxima tentativa resolve.
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [charge.id, paid]);

  async function copy() {
    await navigator.clipboard.writeText(charge.pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (paid) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-success/15">
          <Check className="size-8 text-success" aria-hidden />
        </span>
        <h2 className="text-lg">Pagamento confirmado!</h2>
        <p className="mt-2 max-w-sm text-sm font-semibold text-muted-foreground">
          Recebemos seu Pix. Seu pedido será postado em até 1 dia útil e você vai
          receber o código de rastreio por e-mail.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="text-base">Pague com Pix para finalizar</h2>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">
        Escaneie o QR Code ou use o copia e cola. A confirmação é automática.
      </p>

      {charge.pixQrCode ? (
        <Image
          src={charge.pixQrCode}
          alt="QR Code do Pix"
          width={220}
          height={220}
          unoptimized
          className="my-5 rounded-lg border border-border bg-white p-2"
        />
      ) : (
        <div className="my-5 flex size-[220px] items-center justify-center rounded-lg border border-border">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      )}

      <p className="text-2xl font-black text-success">{formatBRL(charge.amountCents)}</p>

      <div className="mt-4 w-full">
        <label htmlFor="pix-code" className="mb-1.5 block text-left text-sm font-bold">
          Pix copia e cola
        </label>
        <div className="flex gap-2">
          <input
            id="pix-code"
            readOnly
            value={charge.pixCode}
            onFocus={(e) => e.currentTarget.select()}
            className="h-11 flex-1 truncate rounded-md border border-border bg-secondary px-3 font-mono text-xs outline-none"
          />
          <button
            type="button"
            onClick={copy}
            className="flex h-11 items-center gap-1.5 rounded-md bg-foreground px-4 text-sm font-bold text-background"
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Aguardando confirmação do pagamento...
      </p>
    </div>
  );
}
