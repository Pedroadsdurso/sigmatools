import { onlyDigits } from "@/lib/cpf";

export interface Address {
  street: string;
  district: string;
  city: string;
  state: string;
}

/** Formata 14010000 como 14010-000. */
export function formatCep(input: string): string {
  const d = onlyDigits(input).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

export const isCompleteCep = (v: string) => onlyDigits(v).length === 8;

/**
 * Consulta o ViaCEP — mesma fonte usada pelo checkout original.
 * Roda no cliente: a API tem CORS aberto e nao exige credenciais.
 * Devolve null quando o CEP nao existe ou a consulta falha.
 */
export async function lookupCep(cep: string, signal?: AbortSignal): Promise<Address | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal });
    if (!res.ok) return null;

    const data: {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    } = await res.json();

    // O ViaCEP responde 200 com { "erro": true } para CEP inexistente.
    if (data.erro) return null;

    return {
      street: data.logradouro ?? "",
      district: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
