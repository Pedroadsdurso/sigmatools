"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Loader2,
  Lock,
  Package,
  ShieldCheck,
  Truck,
  User,
} from "lucide-react";
import { OrderBumpCard } from "@/components/checkout/OrderBumpCard";
import { PixPayment, type PixCharge } from "@/components/checkout/PixPayment";
import { CardProcessing, type CardTx } from "@/components/checkout/CardProcessing";
import { orderBumps, product, shippingOptions } from "@/data/product";
import { formatCep, isCompleteCep, lookupCep } from "@/lib/cep";
import { formatCpf, formatPhone } from "@/lib/cpf";
import { formatBRL } from "@/lib/format";
import { calculateTotals, findCoupon } from "@/lib/pricing";
import { tokenizeCard } from "@/lib/primecash-client";
import { trackCardPending, trackLead, trackPixPending, trackPurchase } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import type { PaymentMethod, Product } from "@/types/product";

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Identificação" },
  { n: 2, label: "Entrega" },
  { n: 3, label: "Pagamento" },
];

interface FormState {
  name: string; email: string; phone: string; cpf: string;
  cep: string; street: string; number: string; complement: string;
  district: string; city: string; state: string;
}

const EMPTY: FormState = {
  name: "", email: "", phone: "", cpf: "",
  cep: "", street: "", number: "", complement: "", district: "", city: "", state: "",
};

export function CheckoutFlow({ product, initialQty }: { product: Product; initialQty: number }) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [qty, setQty] = useState(initialQty);
  const [shippingId, setShippingId] = useState<string>(shippingOptions[0].id);
  const [bumpIds, setBumpIds] = useState<string[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | undefined>();
  const [couponError, setCouponError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Mesmo calculo que a rota de cobranca faz no servidor.
  const totals = calculateTotals({ qty, shippingId, bumpIds, method, couponCode });

  function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;

    if (!findCoupon(code)) {
      setCouponCode(undefined);
      setCouponError("Cupom inválido ou expirado.");
      return;
    }
    setCouponCode(code);
    setCouponError(null);
  }

  const locked = !!charge;

  async function finalize() {
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/checkout/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone, cpf: form.cpf,
          qty, shippingId, bumpIds, couponCode,
          address: {
            cep: form.cep, street: form.street, number: form.number,
            complement: form.complement, district: form.district,
            city: form.city, state: form.state,
          },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors(data.fields ?? { _: data.error ?? "Falha ao gerar o Pix." });
        if (data.fields) setStep(1);
        return;
      }
      const pix = data as PixCharge;
      trackPixPending(pix.amountCents, pix.id);
      setCharge(pix);
    } catch {
      setErrors({ _: "Sem conexão com o servidor. Tente novamente." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-6">
      <ol className="mb-5 flex items-center justify-center gap-1.5 text-xs sm:mb-6 sm:gap-2 sm:text-sm">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-black sm:size-7",
                step > s.n
                  ? "bg-[#d7f205] text-foreground"
                  : step === s.n
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {step > s.n ? <Check className="size-3.5 sm:size-4" aria-hidden /> : s.n}
            </span>
            {/* Abaixo de sm so o step corrente mostra o rotulo — tres rotulos
                nao cabem em 390px sem quebrar a linha. */}
            <span
              className={cn(
                "truncate font-semibold",
                step === s.n ? "inline" : "hidden sm:inline",
                step >= s.n ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 h-px w-4 shrink-0 bg-border sm:mx-2 sm:w-16 lg:w-24" />
            )}
          </li>
        ))}
      </ol>

      {/* Abaixo de lg o resumo vai para cima, para o cliente ver o total antes
          de encarar o formulario. */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="order-2 rounded-lg bg-card p-4 shadow-card sm:p-5 lg:order-1">
          {errors._ && (
            <p className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
              {errors._}
            </p>
          )}

          {step === 1 && (
            <Step1
              form={form}
              set={set}
              errors={errors}
              onNext={() => {
                trackLead();
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <Step2
              form={form}
              set={set}
              setForm={setForm}
              shippingId={shippingId}
              onShipping={setShippingId}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 &&
            (charge ? (
              <PixPayment charge={charge} />
            ) : (
              <Step3
                method={method}
                onMethod={setMethod}
                bumpIds={bumpIds}
                onToggleBump={(id, on) =>
                  setBumpIds((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)))
                }
                totalCents={totals.totalCents}
                submitting={submitting}
                onFinalize={() => void finalize()}
                onBack={() => setStep(2)}
              />
            ))}
        </div>

        <aside className="order-1 h-fit rounded-lg bg-card p-4 shadow-card sm:p-5 lg:order-2 lg:sticky lg:top-4">
          <h2 className="mb-4 flex items-center gap-2 text-base">
            <Package className="size-4" aria-hidden />
            Resumo do pedido
          </h2>

          <div className="flex gap-3">
            <Image
              src={product.images[0].src}
              alt={product.images[0].alt}
              width={64}
              height={64}
              className="size-16 shrink-0 rounded-md border border-border object-contain"
            />
            <div className="text-xs">
              <p className="font-semibold">{product.name}</p>
              <p className="mt-1 text-muted-foreground">{formatBRL(product.priceCents)} / un.</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Quantidade</span>
            <div className="flex items-center rounded-md border border-border">
              <button
                type="button" aria-label="Diminuir" disabled={qty <= 1 || locked}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="size-8 text-base font-bold disabled:opacity-40"
              >
                −
              </button>
              <span className="w-7 text-center font-bold">{qty}</span>
              <button
                type="button" aria-label="Aumentar" disabled={qty >= product.stock || locked}
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="size-8 text-base font-bold disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatBRL(totals.subtotalCents)} />

            {totals.bumps.map((b) => (
              <Row key={b.id} label={`+ ${b.title}`} value={formatBRL(b.priceCents)} small />
            ))}

            <Row
              label={`Frete${totals.shippingCents > 0 ? ` (${totals.shippingLabel})` : ""}`}
              value={totals.shippingCents === 0 ? "GRÁTIS" : formatBRL(totals.shippingCents)}
              valueClass={totals.shippingCents === 0 ? "font-black text-success" : undefined}
            />

            {totals.discountCents > 0 && (
              <Row
                label={`Pagamento no Pix (${Math.round(product.pixDiscount * 100)}% OFF)`}
                value={`−${formatBRL(totals.discountCents)}`}
                labelClass="text-success"
                valueClass="text-success"
              />
            )}

            {totals.couponCents > 0 && (
              <Row
                label={totals.couponLabel ?? "Cupom"}
                value={`−${formatBRL(totals.couponCents)}`}
                labelClass="text-success"
                valueClass="text-success"
              />
            )}
          </dl>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-black">
              {method === "pix" ? "Total no Pix" : "Total"}
            </span>
            <span className="text-lg font-black text-success">
              {formatBRL(totals.totalCents)}
            </span>
          </div>

          <div className="mt-5">
            <p className="mb-1.5 text-sm font-bold">Tem um cupom?</p>
            <div className="flex gap-2">
              <label htmlFor="coupon" className="sr-only">
                Código do cupom
              </label>
              <input
                id="coupon"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCoupon();
                  }
                }}
                disabled={locked}
                placeholder="Código do cupom"
                className="h-10 min-w-0 flex-1 rounded-md border border-border px-3 text-sm outline-none focus:border-brand disabled:opacity-60"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={locked || !couponInput.trim()}
                className="h-10 shrink-0 rounded-md bg-foreground px-4 text-sm font-bold text-background disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
            {couponError && (
              <p className="mt-1.5 text-xs font-semibold text-danger">{couponError}</p>
            )}
            {totals.couponLabel && (
              <p className="mt-1.5 text-xs font-semibold text-success">
                Cupom {totals.couponLabel} aplicado.
              </p>
            )}
          </div>

          <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
            {[
              { Icon: ShieldCheck, t: "Compra 100% segura" },
              { Icon: Truck, t: "Postagem em 1 dia útil" },
              { Icon: BadgeCheck, t: "Garantia de 12 meses" },
            ].map(({ Icon, t }) => (
              <li key={t} className="flex items-center gap-2">
                <Icon className="size-3.5 text-success" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label, value, labelClass, valueClass, small,
}: { label: string; value: string; labelClass?: string; valueClass?: string; small?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", small && "text-xs")}>
      <dt className={cn("min-w-0 truncate text-muted-foreground", labelClass)}>{label}</dt>
      <dd className={cn("shrink-0 font-semibold", valueClass)}>{value}</dd>
    </div>
  );
}

interface StepProps {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: string) => void;
  errors?: Record<string, string>;
}

function Field({
  id, label, value, onChange, error, ...rest
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange">) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-md border px-3 text-sm outline-none focus:border-brand",
          error ? "border-danger" : "border-border",
        )}
        {...rest}
      />
      {error && <p className="mt-1 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

function Step1({ form, set, errors = {}, onNext }: StepProps & { onNext: () => void }) {
  const ready = form.name && form.email && form.phone && form.cpf;
  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-4">
      <h2 className="flex items-center gap-2 text-base">
        <User className="size-4 text-success" aria-hidden />
        Seus dados
      </h2>
      <Field id="name" label="Nome completo" value={form.name} onChange={(v) => set("name", v)} error={errors.name} autoComplete="name" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label="E-mail" type="email" value={form.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" required />
        <Field id="phone" label="Telefone / WhatsApp" value={form.phone} onChange={(v) => set("phone", formatPhone(v))} error={errors.phone} placeholder="(11) 99999-9999" inputMode="tel" required />
      </div>
      <Field id="cpf" label="CPF" value={form.cpf} onChange={(v) => set("cpf", formatCpf(v))} error={errors.cpf} placeholder="000.000.000-00" inputMode="numeric" required />
      <button
        type="submit" disabled={!ready}
        className="h-12 w-full rounded-md bg-[#d7f205] text-sm font-black tracking-wide text-foreground transition-opacity disabled:opacity-50"
      >
        CONTINUAR PARA ENTREGA
      </button>
    </form>
  );
}

function Step2({
  form, set, setForm, shippingId, onShipping, onBack, onNext,
}: StepProps & {
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  shippingId: string;
  onShipping: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [looking, setLooking] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Autopreenche o endereco assim que o CEP fica completo, como no original.
  useEffect(() => {
    if (!isCompleteCep(form.cep)) return;

    const controller = new AbortController();
    setLooking(true);
    setCepError(null);

    lookupCep(form.cep, controller.signal)
      .then((addr) => {
        if (controller.signal.aborted) return;
        if (!addr) {
          setCepError("CEP não encontrado.");
          return;
        }
        setForm((f) => ({
          ...f,
          street: addr.street || f.street,
          district: addr.district || f.district,
          city: addr.city,
          state: addr.state,
        }));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLooking(false);
      });

    return () => controller.abort();
  }, [form.cep, setForm]);

  const ready = form.cep && form.street && form.number && form.city && form.state;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-4">
      <h2 className="flex items-center gap-2 text-base">
        <Truck className="size-4 text-success" aria-hidden />
        Endereço de entrega
      </h2>

      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div>
          <Field
            id="cep" label="CEP" value={form.cep}
            onChange={(v) => set("cep", formatCep(v))}
            error={cepError ?? undefined}
            inputMode="numeric" placeholder="00000-000" required
          />
          {looking && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden /> Buscando...
            </p>
          )}
        </div>
        <Field id="street" label="Rua" value={form.street} onChange={(v) => set("street", v)} autoComplete="address-line1" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="number" label="Número" value={form.number} onChange={(v) => set("number", v)} required />
        <Field id="complement" label="Complemento (opcional)" value={form.complement} onChange={(v) => set("complement", v)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_80px]">
        <Field id="district" label="Bairro" value={form.district} onChange={(v) => set("district", v)} required />
        <Field id="city" label="Cidade" value={form.city} onChange={(v) => set("city", v)} required />
        <Field id="state" label="UF" value={form.state} onChange={(v) => set("state", v.toUpperCase().slice(0, 2))} maxLength={2} required />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Escolha uma forma de entrega:</legend>
        <div className="space-y-2">
          {shippingOptions.map((opt) => {
            const active = opt.id === shippingId;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onShipping(opt.id)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border-2 px-3 py-3 text-left transition-colors",
                  active ? "border-success bg-success/10" : "border-border bg-card hover:border-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-success" : "border-muted-foreground",
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-success" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{opt.label}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {opt.eta}
                    <Image
                      src={opt.carrierLogo}
                      alt={opt.carrierName}
                      width={96}
                      height={29}
                      className="h-3.5 w-auto"
                    />
                  </span>
                </span>
                <span
                  className={cn(
                    "ml-auto shrink-0 text-sm font-black",
                    opt.priceCents === 0 ? "text-success" : "text-foreground",
                  )}
                >
                  {opt.priceCents === 0 ? "Grátis" : formatBRL(opt.priceCents)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="h-12 rounded-md border border-border px-5 text-sm font-bold">
          Voltar
        </button>
        <button
          type="submit" disabled={!ready}
          className="h-12 flex-1 rounded-md bg-[#d7f205] text-sm font-black tracking-wide text-foreground transition-opacity disabled:opacity-50"
        >
          IR PARA O PAGAMENTO →
        </button>
      </div>
    </form>
  );
}

function Step3({
  method, onMethod, bumpIds, onToggleBump, totalCents, submitting, onFinalize, onBack,
}: {
  method: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  bumpIds: string[];
  onToggleBump: (id: string, on: boolean) => void;
  totalCents: number;
  submitting: boolean;
  onFinalize: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-base">
        <ShieldCheck className="size-4 text-success" aria-hidden />
        Pagamento
      </h2>
      <p className="text-xs font-semibold text-muted-foreground">
        Para finalizar seu pedido escolha uma forma de pagamento
      </p>

      {/* Pix — painel expansivel, contem os order bumps e o CTA final. */}
      <div
        className={cn(
          "rounded-lg border-2 transition-colors",
          method === "pix" ? "border-success" : "border-border",
        )}
      >
        <button
          type="button"
          onClick={() => onMethod("pix")}
          aria-pressed={method === "pix"}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <Radio active={method === "pix"} />
          <span className="text-sm font-black">Pix</span>
          <Image
            src="/images/payment/card-pix.svg"
            alt=""
            width={39}
            height={26}
            className="ml-auto h-5 w-auto"
          />
        </button>

        {method === "pix" && (
          <div className="space-y-3 px-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground">
              Ao confirmar, um código Pix será gerado para você realizar o pagamento
              pelo aplicativo do seu banco.
            </p>
            <p className="text-sm font-bold">
              Valor no pix:{" "}
              <span className="font-black text-success">{formatBRL(totalCents)}</span>
            </p>

            {orderBumps.map((bump) => (
              <OrderBumpCard
                key={bump.id}
                bump={bump}
                checked={bumpIds.includes(bump.id)}
                onToggle={(on) => onToggleBump(bump.id, on)}
                disabled={submitting}
              />
            ))}

            <button
              type="button"
              onClick={onFinalize}
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-success text-sm font-black text-success-foreground transition-opacity disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  GERANDO PIX...
                </>
              ) : (
                <>
                  <Lock className="size-4" aria-hidden />
                  FINALIZAR COMPRA
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Cartao de credito */}
      <div
        className={cn(
          "rounded-lg border-2 transition-colors",
          method === "card" ? "border-success" : "border-border",
        )}
      >
        <button
          type="button"
          onClick={() => onMethod("card")}
          aria-pressed={method === "card"}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <Radio active={method === "card"} />
          <span className="text-sm font-black">Cartão de crédito</span>
          <span className="ml-auto flex items-center gap-1">
            {["visa", "mastercard", "elo"].map((b) => (
              <Image
                key={b}
                src={`/images/payment/${b}.svg`}
                alt=""
                width={39}
                height={26}
                className="h-5 w-auto rounded border border-border bg-white p-0.5"
              />
            ))}
          </span>
        </button>

        {method === "card" && <CardForm onSwitchToPix={() => onMethod("pix")} />}
      </div>

      <button type="button" onClick={onBack} className="text-sm font-bold text-muted-foreground hover:text-foreground">
        ← Voltar para entrega
      </button>
    </div>
  );
}

/** Formata 4111111111111111 como 4111 1111 1111 1111. */
const formatCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");

/** Formata 1230 como 12/30. */
const formatExpiry = (v: string) =>
  v.replace(/\D/g, "").slice(0, 4).replace(/(\d{2})(?=\d)/, "$1/");

/**
 * Formulario de cartao.
 *
 * Os campos existem e sao validados, mas a cobranca nao e enviada a lugar
 * nenhum: a integracao ativa cobre apenas Pix. Ao submeter, avisa o cliente e
 * oferece a troca para Pix. Nada e transmitido nem guardado — os dados do
 * cartao ficam so no estado local do componente e somem ao sair da tela.
 */
function CardForm({ onSwitchToPix }: { onSwitchToPix: () => void }) {
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvv: "" });
  const [installments, setInstallments] = useState(1);
  const [down, setDown] = useState(false);

  const complete =
    card.number.replace(/\s/g, "").length >= 13 &&
    card.holder.trim().length > 2 &&
    card.expiry.length === 5 &&
    card.cvv.length >= 3;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDown(true);
      }}
      className="space-y-3 px-4 pb-4"
    >
      <div>
        <label htmlFor="card-number" className="mb-1 block text-sm font-bold">
          Número do cartão
        </label>
        <input
          id="card-number"
          value={card.number}
          onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          className="h-11 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-brand"
        />
      </div>

      <div>
        <label htmlFor="card-holder" className="mb-1 block text-sm font-bold">
          Nome impresso no cartão
        </label>
        <input
          id="card-holder"
          value={card.holder}
          onChange={(e) => setCard((c) => ({ ...c, holder: e.target.value.toUpperCase() }))}
          autoComplete="cc-name"
          placeholder="COMO ESTÁ NO CARTÃO"
          className="h-11 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="card-expiry" className="mb-1 block text-sm font-bold">
            Validade
          </label>
          <input
            id="card-expiry"
            value={card.expiry}
            onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            className="h-11 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="card-cvv" className="mb-1 block text-sm font-bold">
            CVV
          </label>
          <input
            id="card-cvv"
            value={card.cvv}
            onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="000"
            className="h-11 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      <div>
        <label htmlFor="card-installments" className="mb-1 block text-sm font-bold">
          Parcelamento
        </label>
        <select
          id="card-installments"
          value={installments}
          onChange={(e) => setInstallments(Number(e.target.value))}
          className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-brand"
        >
          {Array.from({ length: product.installments }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}x de {formatBRL(Math.round(product.priceCents / n))} sem juros
            </option>
          ))}
        </select>
      </div>

      {down && (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-3">
          <p className="flex items-start gap-2 text-sm font-bold text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Pagamento com cartão temporariamente fora do ar
          </p>
          <p className="mt-1.5 text-xs font-semibold text-muted-foreground">
            Estamos com instabilidade na operadora de cartão. Finalize pelo Pix —
            é aprovado na hora e ainda garante {Math.round(product.pixDiscount * 100)}% de desconto.
          </p>
          <button
            type="button"
            onClick={onSwitchToPix}
            className="mt-3 h-11 w-full rounded-md bg-success text-sm font-black text-success-foreground"
          >
            PAGAR COM PIX
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={!complete}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-success text-sm font-black text-success-foreground transition-opacity disabled:opacity-50"
      >
        <Lock className="size-4" aria-hidden />
        FINALIZAR COMPRA
      </button>
    </form>
  );
}

function Radio({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
        active ? "border-success" : "border-muted-foreground",
      )}
    >
      {active && <span className="size-2 rounded-full bg-success" />}
    </span>
  );
}
