"use client";

import { useState } from "react";
import { Loader2, MapPin, Truck } from "lucide-react";
import { formatCep, isCompleteCep, lookupCep, type Address } from "@/lib/cep";
import { formatBRL } from "@/lib/format";
import { shippingOptions } from "@/data/product";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; address: Address }
  | { kind: "error"; message: string };

/** "Simule o frete" da buy box — consulta o CEP e lista as modalidades. */
export function ShippingCalculator() {
  const [cep, setCep] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function calculate() {
    if (!isCompleteCep(cep)) {
      setState({ kind: "error", message: "Digite um CEP com 8 dígitos." });
      return;
    }
    setState({ kind: "loading" });

    const address = await lookupCep(cep);
    setState(
      address
        ? { kind: "found", address }
        : { kind: "error", message: "CEP não encontrado. Confira o número." },
    );
  }

  return (
    <div className="mt-4">
      <p className="mb-1.5 text-sm font-bold">Simule o frete</p>

      <div className="flex gap-2">
        <label htmlFor="cep-sim" className="sr-only">
          Digite seu CEP
        </label>
        <input
          id="cep-sim"
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void calculate();
            }
          }}
          inputMode="numeric"
          placeholder="Digite seu CEP"
          className="h-10 flex-1 rounded-md border border-border px-3 text-sm outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={() => void calculate()}
          disabled={state.kind === "loading"}
          className="h-10 rounded-md border border-border px-4 text-sm font-bold transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {state.kind === "loading" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            "OK"
          )}
        </button>
      </div>

      {state.kind === "error" && (
        <p className="mt-2 text-xs font-semibold text-danger">{state.message}</p>
      )}

      {state.kind === "found" && (
        <div className="mt-3 space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {[state.address.street, state.address.district]
              .filter(Boolean)
              .join(", ")}{" "}
            — {state.address.city}/{state.address.state}
          </p>

          <ul className="divide-y divide-border rounded-md border border-border">
            {shippingOptions.map((opt) => (
              <li key={opt.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <Truck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  <span className="font-bold">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.eta}</span>
                </span>
                <span
                  className={
                    opt.priceCents === 0
                      ? "ml-auto font-black text-success"
                      : "ml-auto font-bold"
                  }
                >
                  {opt.priceCents === 0 ? "Grátis" : formatBRL(opt.priceCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
