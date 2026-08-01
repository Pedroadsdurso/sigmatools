"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/tracking";

/**
 * Dispara o Purchase na pagina de obrigado, uma unica vez por transacao.
 *
 * A guarda em sessionStorage importa: o event_id da Traffik e deterministico
 * so dentro de uma janela de 10s, entao um F5 na tela de confirmacao passados
 * alguns segundos geraria um id NOVO — e a Meta contaria a mesma venda duas
 * vezes, inflando o ROAS da campanha.
 */
export function PurchaseTracker({
  transactionId,
  amountCents,
}: {
  transactionId: string;
  amountCents: number;
}) {
  useEffect(() => {
    const key = `purchase:${transactionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Sem sessionStorage (aba anonima restrita) seguimos e disparamos:
      // perder a venda no relatorio e pior que o risco de uma duplicata.
    }
    trackPurchase(amountCents, transactionId);
  }, [transactionId, amountCents]);

  return null;
}
