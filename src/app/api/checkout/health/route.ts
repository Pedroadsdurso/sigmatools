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
      },
      origemEfetiva,
      problemas,
    },
    { status: problemas.length === 0 ? 200 : 503 },
  );
}
