import { NextResponse } from "next/server";
import { getCardTransaction, PrimeCashError, PENDING_STATUSES } from "@/lib/primecash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Consultado pelo polling da tela de cartao ate a transacao ser aprovada. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // O id da PrimeCash e numerico (ex.: "282"); aceita tambem ids alfanumericos.
  if (!id || !/^[\w-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  try {
    const tx = await getCardTransaction(id);
    return NextResponse.json({
      id: tx.id,
      status: tx.status,
      paid: tx.status === "paid",
      pending: PENDING_STATUSES.includes(tx.status),
      refusedReason: tx.refusedReason ?? null,
    });
  } catch (err) {
    if (err instanceof PrimeCashError) {
      console.error("[primecash] falha ao consultar transacao:", id, err.message);
      return NextResponse.json({ error: "Nao foi possivel consultar o pagamento." }, { status: 502 });
    }
    throw err;
  }
}
