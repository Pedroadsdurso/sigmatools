/**
 * Chave PUBLICA (publishable) da PrimeCash.
 *
 * Diferente da chave secreta, esta e feita para viver no browser: e ela que a
 * lib de tokenizacao (https://api.primecashbrasil.com/v1/js) usa para gerar o
 * hash do cartao antes de qualquer dado sensivel sair do dispositivo do
 * cliente. Por isso pode ser embutida com seguranca no bundle client-side.
 *
 * Deixe sobrescrevivel por env (NEXT_PUBLIC_PRIMECASH_PUBLIC_KEY) para trocar
 * a chave sem novo deploy de codigo, com fallback para a chave da loja.
 */
export const PRIMECASH_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PRIMECASH_PUBLIC_KEY ??
  "pk_live_v2NV0tQkZFgovbEYAwiQiDqqpHDK6w0cuC";

/** URL da lib de tokenizacao carregada no front-end. */
export const PRIMECASH_JS_URL = "https://api.primecashbrasil.com/v1/js";
