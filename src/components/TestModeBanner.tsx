import { AlertTriangle } from "lucide-react";
import { MODO_TESTE } from "@/data/product";

/**
 * Faixa de aviso enquanto o modo teste esta ligado.
 *
 * Existe para evitar o erro caro: esquecer MODO_TESTE = true no ar e vender o
 * produto por R$ 5,00. Some sozinha quando a constante volta para false.
 */
export function TestModeBanner() {
  if (!MODO_TESTE) return null;

  return (
    <div className="sticky top-0 z-50 bg-danger px-3 py-1.5 text-center text-[11px] font-black text-white">
      <span className="inline-flex items-center gap-1.5">
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
        MODO TESTE — preços reduzidos. Desative MODO_TESTE em src/data/product.ts
        antes de vender.
      </span>
    </div>
  );
}
