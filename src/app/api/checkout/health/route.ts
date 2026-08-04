import { NextResponse } from "next/server";
import { credentialsStatus } from "@/lib/onyxpag";
import { credentialsStatus as cardCredentialsStatus } from "@/lib/primecash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostico do checkout em producao.
 *
 * Abra /api/checkout/health no site hospedado para saber se o servidor tem as
 * credenciais e qual origem ele vai mandar em source_url. Nao devolve nenhum
 * valor de chave — so se existe ou nao.
 */
export async function GET(request: Request) {
  const creds = credentialsStatus();
  const cardCreds = cardCredentialsStatus();
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  const origemEfetiva =
    configured && !/localhost|127\.0\.0\.1/.test(configured)
      ? configured.replace(/\/$/, "")
      : host
        ? `${proto}://${host}`
        : new URL(request.url).origin;

  const problemas: string[] = [];
  if (!creds.ok) {
    problemas.push(
      `Faltam as variaveis ${creds.missing.join(" e ")} no ambiente da hospedagem. O Pix nao sera gerado ate elas existirem.`,
    );
  }
  if (configured && /localhost|127\.0\.0\.1/.test(configured)) {
    problemas.push(
      "NEXT_PUBLIC_SITE_URL aponta para localhost. A OnyxPag recusa source_url local — use o dominio publico.",
    );
  }
  if (!process.env.ONYXPAG_WEBHOOK_SECRET) {
    problemas.push(
      "ONYXPAG_WEBHOOK_SECRET ausente: a rota de webhook vai recusar todo postback.",
    );
  }
  // A chave PUBLICA vive no browser e faz a tokenizacao do cartao. Ela e
  // independente da secreta: da para ter a secreta certa (cobranca autentica)
  // e a publica errada (nenhum cartao chega a virar hash). Sem checar aqui, a
  // falha aparece so como um 401 dentro do checkout do cliente.
  const chavePublicaEnv = process.env.NEXT_PUBLIC_PRIMECASH_PUBLIC_KEY?.trim();
  if (!chavePublicaEnv) {
    problemas.push(
      "NEXT_PUBLIC_PRIMECASH_PUBLIC_KEY ausente: o checkout esta usando a chave publica embutida no codigo do template, que e de OUTRA conta. A tokenizacao do cartao vai falhar com 'Credenciais invalidas'. Pegue a chave publica no painel da sua PrimeCash.",
    );
  }

  if (!cardCreds.ok) {
    problemas.push(
      `Faltam as variaveis ${cardCreds.missing.join(" e ")} no ambiente. O pagamento no cartao (PrimeCash) nao sera processado ate elas existirem.`,
    );
  }
  if (!process.env.PRIMECASH_WEBHOOK_SECRET) {
    problemas.push(
      "PRIMECASH_WEBHOOK_SECRET ausente: o postback do cartao e aceito so com base na releitura do status (recomendado configurar).",
    );
  }

  // O cookie do funil guarda nome, e-mail, CPF e endereco do comprador. Sem
  // chave propria ele e cifrado com o valor de desenvolvimento que esta no
  // repositorio publico — qualquer um poderia forjar uma sessao e ler/alterar
  // dados de pedido. Por isso entra como problema, e nao como aviso.
  const funnelSecret = process.env.FUNNEL_SESSION_SECRET;
  const funnelHerdado =
    process.env.PRIMECASH_WEBHOOK_SECRET ??
    process.env.ONYXPAG_WEBHOOK_SECRET ??
    process.env.SECRET_TOKEN_PRIME_CASH;

  if (!funnelSecret || funnelSecret.length < 16) {
    if (funnelHerdado && funnelHerdado.length >= 16) {
      problemas.push(
        "FUNNEL_SESSION_SECRET ausente: a sessao do funil esta reaproveitando outro segredo do ambiente. Funciona, mas defina uma chave propria.",
      );
    } else {
      problemas.push(
        "FUNNEL_SESSION_SECRET ausente e sem segredo para herdar: o cookie do funil esta sendo cifrado com a chave de desenvolvimento que esta no repositorio. Defina a variavel AGORA.",
      );
    }
  }

  return NextResponse.json(
    {
      ok: problemas.length === 0,
      pix: {
        credenciais: creds.ok ? "configuradas" : "AUSENTES",
        faltando: creds.missing,
        apiUrl: process.env.ONYXPAG_API_URL ?? "https://api.onyxpag.com",
        webhookSecret: process.env.ONYXPAG_WEBHOOK_SECRET ? "configurado" : "AUSENTE",
      },
      cartao: {
        credenciais: cardCreds.ok ? "configuradas" : "AUSENTES",
        faltando: cardCreds.missing,
        apiUrl: process.env.PRIMECASH_API_URL ?? "https://api.primecashbrasil.com/v1",
        webhookSecret: process.env.PRIMECASH_WEBHOOK_SECRET ? "configurado" : "AUSENTE",
        chavePublica: chavePublicaEnv
          ? "configurada (da sua conta)"
          : "AUSENTE — usando a chave embutida no template, de outra conta",
      },
      funil: {
        chaveDaSessao: funnelSecret && funnelSecret.length >= 16
          ? "configurada"
          : funnelHerdado && funnelHerdado.length >= 16
            ? "HERDADA de outro segredo"
            : "AUSENTE (usando chave de desenvolvimento)",
      },
      origemEfetiva,
      problemas,
    },
    { status: problemas.length === 0 ? 200 : 503 },
  );
}
