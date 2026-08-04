import { NextResponse } from "next/server";
import { buildFunnelSession, writeFunnelSession } from "@/lib/funnel-session";
import { FUNNEL_ENTRY_SLUG } from "@/data/funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Atalho de DESENVOLVIMENTO para percorrer o funil sem pagar de verdade.
 *
 * Grava uma sessao do funil com um comprador ficticio e joga na primeira
 * oferta. Serve para revisar layout, textos e navegacao — a cobranca em si
 * continua dependendo do gateway.
 *
 * Fechada em producao: `next build` define NODE_ENV=production, entao no site
 * publicado esta rota responde 404 e nao existe caminho para forjar sessao.
 *
 * Uso:  /api/funnel/preview?m=card   (ou ?m=pix)
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const m = new URL(request.url).searchParams.get("m");
  const method = m === "card" ? "card" : "pix";

  await writeFunnelSession(
    buildFunnelSession({
      tx: `preview-${method}-${Date.now()}`,
      method,
      name: "Ana Souza",
      email: "ana.souza@exemplo.com",
      cpf: "52998224725",
      phone: "11988887777",
      address: {
        cep: "01001000",
        street: "Praça da Sé",
        number: "10",
        complement: "",
        district: "Sé",
        city: "São Paulo",
        state: "SP",
      },
    }),
  );

  return NextResponse.redirect(new URL(`/oferta/${FUNNEL_ENTRY_SLUG}`, request.url));
}
