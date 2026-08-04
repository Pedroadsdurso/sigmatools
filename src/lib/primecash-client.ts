"use client";

/**
 * Ponte client-side para a lib de tokenizacao da PrimeCash.
 *
 * O script (https://api.primecashbrasil.com/v1/js) transforma os dados do
 * cartao em um hash de curta duracao ANTES de qualquer coisa sair do browser.
 * Assim o numero do cartao, CVV etc. nunca passam pelo nosso servidor — so o
 * hash — o que mantem a operacao fora do escopo pesado de PCI.
 */

import { PRIMECASH_JS_URL, PRIMECASH_PUBLIC_KEY } from "@/lib/primecash-public";

interface PrimecashSdk {
  setPublicKey: (key: string) => void;
  setTestMode: (on: boolean) => void;
  encrypt: (card: {
    number: string;
    holderName: string;
    expMonth: number;
    expYear: number;
    cvv: string;
  }) => Promise<string>;
}

declare global {
  interface Window {
    Primecash?: PrimecashSdk;
  }
}

let loader: Promise<PrimecashSdk> | null = null;

/** Injeta o script uma unica vez e resolve quando a SDK estiver disponivel. */
function loadSdk(): Promise<PrimecashSdk> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Tokenizacao so roda no navegador."));
  }
  if (window.Primecash) return Promise.resolve(window.Primecash);
  if (loader) return loader;

  loader = new Promise<PrimecashSdk>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PRIMECASH_JS_URL}"]`,
    );

    const onReady = () => {
      if (window.Primecash) resolve(window.Primecash);
      else reject(new Error("SDK da PrimeCash carregou sem expor window.Primecash."));
    };

    if (existing) {
      if (window.Primecash) resolve(window.Primecash);
      else existing.addEventListener("load", onReady, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = PRIMECASH_JS_URL;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => {
      loader = null;
      reject(new Error("Nao foi possivel carregar o processador de cartao."));
    };
    document.head.appendChild(script);
  });

  return loader;
}

export interface CardInput {
  number: string;
  holderName: string;
  /** "MM/AA". */
  expiry: string;
  cvv: string;
}

/** Gera o hash do cartao. Lanca com mensagem amigavel em caso de falha. */
export async function tokenizeCard(card: CardInput): Promise<string> {
  const sdk = await loadSdk();

  const [mm, yy] = card.expiry.split("/");
  const expMonth = Number(mm);
  const expYear = Number(yy) + 2000;

  if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear) {
    throw new Error("Validade do cartao invalida.");
  }

  sdk.setPublicKey(PRIMECASH_PUBLIC_KEY);
  sdk.setTestMode(false);

  let hash: string;
  try {
    hash = await sdk.encrypt({
      number: card.number.replace(/\s/g, ""),
      holderName: card.holderName.trim(),
      expMonth,
      expYear,
      cvv: card.cvv,
    });
  } catch (err) {
    // A SDK rejeita com o corpo cru da resposta. Sem tratar, o cliente via um
    // JSON no meio do checkout — e "Credenciais invalidas" ainda o levava a
    // achar que o cartao DELE tinha problema, quando a chave errada e nossa.
    const detalhe = err instanceof Error ? err.message : String(err);
    console.error("[primecash] tokenizacao recusada:", detalhe);

    if (/unauthorized|credenciais|401/i.test(detalhe)) {
      throw new Error(
        "Não conseguimos iniciar o pagamento no cartão agora. Pague pelo Pix — é aprovado na hora.",
      );
    }
    throw new Error("Confira os dados do cartão e tente novamente.");
  }

  if (!hash) throw new Error("Falha ao processar o cartao. Confira os dados e tente novamente.");
  return hash;
}
