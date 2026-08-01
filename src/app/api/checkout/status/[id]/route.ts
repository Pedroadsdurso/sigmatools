import { NextResponse } from "next/server";
import { getTransaction, OnyxPagError } from "@/lib/onyxpag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Consultado pelo polling da tela de Pix ate o pagamento cair. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || !/^[\w-]{6,64}$/.test(id)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  try {
    const tx = await getTransaction(id);
    return NextResponse.json({ id: tx.id, status: tx.status, paid: tx.status === "pago" });
  } catch (err) {
    if (err instanceof OnyxPagError) {
      console.error("[onyxpag] falha ao consultar transacao:", id, err.message);
      return NextResponse.json({ error: "Nao foi possivel consultar o pagamento." }, { status: 502 });
    }
    throw err;
  }
}
