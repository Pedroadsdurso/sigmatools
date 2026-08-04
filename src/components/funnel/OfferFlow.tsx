"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { offerHref } from "@/data/funnel";
import { CARTAO_HABILITADO } from "@/data/product";
import { cardLast4, cardSnapshot, clearCard, loadCard, parseCard } from "@/lib/card-vault";
import { formatBRL, discountPercent } from "@/lib/format";
import { tokenizeCard } from "@/lib/primecash-client";
import { trackPurchase } from "@/lib/tracking";
import type { FunnelOffer } from "@/types/funnel";

/** Intervalo do polling de status (Pix e cartao em analise). */
const POLL_MS = 3500;

type Phase = "offer" | "charging" | "pix" | "waiting" | "done";

/**
 * O cofre do cartao vive no sessionStorage e so muda por acao desta aba, entao
 * nao ha evento para assinar — a inscricao e vazia de proposito. O que importa
 * do useSyncExternalStore aqui e o snapshot separado para servidor (sempre
 * null) e cliente, que evita ler storage durante o render do servidor.
 */
const subscribeVault = () => () => {};

interface PixData {
  id: string;
  pixCode: string;
  pixQrCode: string;
  amountCents: number;
}

/**
 * Tela de uma oferta do funil pos-compra.
 *
 * "One-click" de verdade no cartao: os dados do comprador ja estao na sessao
 * do servidor e o cartao esta no cofre da aba, entao o clique gera um hash novo
 * e cobra — sem formulario. No Pix nao existe cobranca sem o pagador autorizar
 * no banco, entao o clique gera o QR na hora com os mesmos dados e a tela so
 * avanca quando a OnyxPag confirma.
 */
export function OfferFlow({
  offer,
  method,
  firstName,
}: {
  offer: FunnelOffer;
  method: "pix" | "card";
  firstName: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("offer");
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const rawCard = useSyncExternalStore(subscribeVault, cardSnapshot, () => null);
  const card = useMemo(() => parseCard(rawCard), [rawCard]);
  /** Vira true quando o cartao falha e a tela passa a oferecer o Pix. */
  const [pixFallback, setPixFallback] = useState(false);
  /** Transacao que o polling deve acompanhar (Pix ou cartao em analise). */
  const pollRef = useRef<{ id: string; method: "pix" | "card" } | null>(null);

  const acceptHref = offerHref(offer.next.accept);
  const declineHref = offerHref(offer.next.decline);

  /** Fim da jornada: o cartao guardado na aba nao serve mais para nada. */
  const leaveFunnel = useCallback(
    (href: string) => {
      if (href === "/obrigado") clearCard();
      router.push(href);
    },
    [router],
  );

  /** Confirma no servidor (que rele o status no gateway) e avanca. */
  const confirmAndAdvance = useCallback(
    async (txId: string, payMethod: "pix" | "card"): Promise<boolean> => {
      const res = await fetch("/api/funnel/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id, txId, method: payMethod }),
      });
      const data: { paid?: boolean; next?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.paid) return false;

      // Venda do upsell no relatorio. A guarda por transacao evita contar duas
      // vezes se o polling e a resposta sincrona chegarem juntos.
      try {
        const k = `purchase:${txId}`;
        if (!sessionStorage.getItem(k)) {
          sessionStorage.setItem(k, "1");
          trackPurchase(offer.priceCents, txId, payMethod === "card" ? "cartao" : "pix");
        }
      } catch {
        trackPurchase(offer.priceCents, txId, payMethod === "card" ? "cartao" : "pix");
      }

      setPhase("done");
      leaveFunnel(data.next ?? acceptHref);
      return true;
    },
    [offer.id, offer.priceCents, acceptHref, leaveFunnel],
  );

  /* ---------------- cartao: um clique ---------------- */

  async function payWithCard() {
    const saved = card ?? loadCard();
    if (!saved) {
      // Cofre vazio (aba nova, storage bloqueado): o Pix salva a venda.
      setPixFallback(true);
      setError(
        "Não conseguimos recuperar seu cartão nesta aba. Finalize pelo Pix — leva 10 segundos.",
      );
      return;
    }

    setPhase("charging");
    setError(null);
    try {
      const cardHash = await tokenizeCard(saved);
      const res = await fetch("/api/funnel/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id, method: "card", cardHash }),
      });
      const data: {
        id?: string;
        paid?: boolean;
        status?: string;
        error?: string;
        refusedReason?: string | null;
      } = await res.json().catch(() => ({}));

      if (!res.ok || !data.id) {
        setPhase("offer");
        setPixFallback(true);
        setError(data.error ?? "Não foi possível cobrar seu cartão. Pague esta oferta no Pix.");
        return;
      }

      if (data.paid) {
        if (await confirmAndAdvance(data.id, "card")) return;
      }

      const pending = ["processing", "authorized", "waiting_payment"].includes(data.status ?? "");
      if (pending) {
        setPhase("waiting");
        pollRef.current = { id: data.id, method: "card" };
        return;
      }

      setPhase("offer");
      setPixFallback(true);
      setError(
        data.refusedReason ??
          "Sua operadora não autorizou esta cobrança. Você pode pagar no Pix agora.",
      );
    } catch (err) {
      setPhase("offer");
      setPixFallback(true);
      setError(
        err instanceof Error ? err.message : "Falha ao processar o cartão. Tente pelo Pix.",
      );
    }
  }

  /* ---------------- pix: um clique gera o QR ---------------- */

  async function payWithPix() {
    setPhase("charging");
    setError(null);
    try {
      const res = await fetch("/api/funnel/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id, method: "pix" }),
      });
      const data: PixData & { error?: string } = await res.json().catch(() => ({}));

      if (!res.ok || !data.id || !data.pixCode) {
        setPhase("offer");
        setError(data.error ?? "Não foi possível gerar o Pix agora. Tente novamente.");
        return;
      }

      setPix({
        id: data.id,
        pixCode: data.pixCode,
        pixQrCode: data.pixQrCode,
        amountCents: data.amountCents ?? offer.priceCents,
      });
      setPhase("pix");
      pollRef.current = { id: data.id, method: "pix" };
    } catch {
      setPhase("offer");
      setError("Sem conexão com o servidor. Tente novamente.");
    }
  }

  /* ---------------- polling compartilhado ---------------- */

  useEffect(() => {
    if (phase !== "pix" && phase !== "waiting") return;
    const target = pollRef.current;
    if (!target) return;

    let cancelled = false;
    const url =
      target.method === "card"
        ? `/api/checkout/card/status/${target.id}`
        : `/api/checkout/status/${target.id}`;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data: { paid?: boolean; pending?: boolean; refusedReason?: string | null } =
          await res.json();
        if (cancelled) return;

        if (data.paid) {
          clearInterval(timer);
          await confirmAndAdvance(target.id, target.method);
          return;
        }

        // So o cartao tem "recusado"; um Pix pendente segue pendente.
        if (target.method === "card" && data.pending === false) {
          clearInterval(timer);
          pollRef.current = null;
          setPhase("offer");
          setPixFallback(true);
          setError(
            data.refusedReason ??
              "Sua operadora não autorizou esta cobrança. Você pode pagar no Pix agora.",
          );
        }
      } catch {
        // Falha de rede no polling e transitoria.
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, confirmAndAdvance]);

  async function copyPix() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  /* ---------------- render ---------------- */

  const off = discountPercent(offer.listPriceCents, offer.priceCents);
  const busy = phase === "charging" || phase === "done";
  // Com o cartao desligado a oferta so cobra no Pix, mesmo que a sessao tenha
  // nascido de um pedido pago no cartao antes do desligamento.
  const useCard = CARTAO_HABILITADO && method === "card" && !pixFallback;

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center rounded-lg bg-card p-8 text-center shadow-card">
        <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-success/15">
          <Check className="size-8 text-success" aria-hidden />
        </span>
        <h1 className="text-lg">Adicionado ao seu pedido!</h1>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Só um instante...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Confirmacao do pedido que ele acabou de fazer — e o que da credito
          para a oferta seguinte. */}
      <div className="flex items-start gap-3 rounded-lg border-2 border-success/40 bg-success/5 p-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success">
          <Check className="size-4 text-success-foreground" aria-hidden />
        </span>
        <p className="text-sm font-bold">
          {firstName ? `${firstName}, seu ` : "Seu "}pagamento foi aprovado e o pedido está na
          fila de separação.
          <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
            Não feche esta página: ela é a única chance de adicionar itens ao MESMO envio, sem
            pagar frete de novo.
          </span>
        </p>
      </div>

      <p className="text-center text-xs font-black uppercase tracking-wide text-brand">
        {offer.stepLabel}
      </p>

      <div className="overflow-hidden rounded-lg bg-card shadow-card">
        <div className="border-b border-border bg-[#0a0a0a] px-4 py-3 text-center sm:px-6">
          <h1 className="text-lg leading-tight text-[#d7f205] sm:text-xl">{offer.headline}</h1>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-sm font-semibold text-muted-foreground">{offer.subheadline}</p>

          <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-start">
            <div className="mx-auto w-full max-w-[220px] rounded-lg border border-border bg-white p-3">
              <Image
                src={offer.image}
                alt={offer.imageAlt}
                width={400}
                height={400}
                className="h-auto w-full object-contain"
                priority
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-base leading-snug">{offer.productName}</h2>
              <ul className="mt-3 space-y-1.5">
                {offer.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm font-semibold">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    <span className="min-w-0">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-muted-foreground line-through">
                  {formatBRL(offer.listPriceCents)}
                </span>
                <span className="text-3xl font-black text-success">
                  {formatBRL(offer.priceCents)}
                </span>
                {off > 0 && (
                  <span className="rounded bg-[#d7f205] px-2 py-0.5 text-xs font-black text-foreground">
                    {off}% OFF
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-success">
                <Truck className="size-3.5" aria-hidden />
                Sem frete adicional — vai no mesmo envio
              </p>
            </div>
          </div>

          <p className="mt-5 rounded-md border border-dashed border-success/50 bg-success/[0.04] p-3 text-sm font-bold">
            <Zap className="mr-1.5 inline size-4 text-success" aria-hidden />
            {offer.pitch}
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-3">
              <p className="flex items-start gap-2 text-sm font-bold text-danger">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            </div>
          )}

          {/* ---- Pix gerado: QR + copia e cola + espera ---- */}
          {phase === "pix" && pix ? (
            <div className="mt-5 flex flex-col items-center rounded-lg border-2 border-success p-4 text-center">
              <h3 className="text-base">Pague {formatBRL(pix.amountCents)} para adicionar</h3>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                A confirmação é automática — não precisa avisar ninguém.
              </p>
              {pix.pixQrCode && (
                <Image
                  src={pix.pixQrCode}
                  alt="QR Code do Pix da oferta"
                  width={200}
                  height={200}
                  unoptimized
                  className="my-4 rounded-lg border border-border bg-white p-2"
                />
              )}
              <div className="flex w-full gap-2">
                <label htmlFor="pix-oferta" className="sr-only">
                  Pix copia e cola
                </label>
                <input
                  id="pix-oferta"
                  readOnly
                  value={pix.pixCode}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 min-w-0 flex-1 truncate rounded-md border border-border bg-secondary px-3 font-mono text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={copyPix}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-foreground px-4 text-sm font-bold text-background"
                >
                  {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Aguardando a confirmação do pagamento...
              </p>
            </div>
          ) : phase === "waiting" ? (
            <div className="mt-5 flex flex-col items-center rounded-lg border-2 border-success p-6 text-center">
              <Loader2 className="size-8 animate-spin text-success" aria-hidden />
              <h3 className="mt-3 text-base">Confirmando com a operadora</h3>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Leva alguns segundos. Não feche esta página.
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void (useCard ? payWithCard() : payWithPix())}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-success px-4 text-center text-sm font-black leading-tight text-success-foreground transition-opacity disabled:opacity-60 sm:text-base"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                    PROCESSANDO...
                  </>
                ) : (
                  <>
                    <Lock className="size-5 shrink-0" aria-hidden />
                    {offer.acceptCta}
                  </>
                )}
              </button>

              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-muted-foreground">
                {useCard ? (
                  <>
                    <CreditCard className="size-3.5" aria-hidden />
                    Cobrança em 1x no cartão final {card ? cardLast4(card) : "•••• "} — sem
                    redigitar nada
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Pix gerado na hora com os dados do seu pedido
                  </>
                )}
              </p>
            </>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => leaveFunnel(declineHref)}
            className="mx-auto mt-4 block max-w-full text-center text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
          >
            {offer.declineCta}
          </button>
        </div>
      </div>

      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {[
          { Icon: ShieldCheck, t: "Compra 100% segura" },
          { Icon: Truck, t: "Mesmo envio do seu pedido" },
          { Icon: Lock, t: "Ambiente criptografado" },
        ].map(({ Icon, t }) => (
          <li key={t} className="flex items-center gap-1.5">
            <Icon className="size-3.5 text-success" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
