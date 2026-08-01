import { NextResponse } from "next/server";
import { credentialsStatus } from "@/lib/onyxpag";

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

  return NextResponse.json(
    {
      ok: problemas.length === 0,
      credenciais: creds.ok ? "configuradas" : "AUSENTES",
      faltando: creds.missing,
      apiUrl: process.env.ONYXPAG_API_URL ?? "https://api.onyxpag.com",
      origemEfetiva,
      webhookSecret: process.env.ONYXPAG_WEBHOOK_SECRET ? "configurado" : "AUSENTE",
      problemas,
    },
    { status: problemas.length === 0 ? 200 : 503 },
  );
}
