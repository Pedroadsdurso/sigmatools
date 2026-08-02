import { NextResponse } from "next/server";
import { getCardTransaction } from "@/lib/primecash";
import { sendOrderOnce, type MagnusItem } from "@/lib/magnus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recebe o postback da PrimeCash para pagamentos no CARTAO.
 *
 * Duas defesas, iguais as do webhook Pix:
 *   1. token secreto na querystring (PRIMECASH_WEBHOOK_SECRET), comparado em
 *      tempo constante. Quando o segredo NAO esta configurado, o postback ainda
 *      e aceito — a validacao real vem do passo 2 — mas fica registrado o aviso.
 *   2. o status real e sempre relido da API (getCardTransaction), nunca do
 *      corpo recebido, que poderia ser forjado.
 *
 * Quando o pagamento e aprovado, o pedido e enviado para a Magnus Frete (pos-
 * venda: rastreio + atualizacoes ao lead). Isto vale SO para cartao — o Pix ja
 * tem o proprio fluxo.
 */
export async function POST(request: Request) {
  const expected = process.env.PRIMECASH_WEBHOOK_SECRET;
  const provided = new URL(request.url).searchParams.get("token") ?? "";

  if (expected) {
    if (!timingSafeEqual(provided, expected)) {
      // 404: nao confirma a existencia da rota para quem sondar.
      return new NextResponse(null, { status: 404 });
    }
  } else {
    console.warn(
      "[primecash] PRIMECASH_WEBHOOK_SECRET ausente: postback aceito apenas com base na releitura do status. Configure o segredo para reforcar.",
    );
  }

  let payload: PrimePostback;
  try {
    payload = (await request.json()) as PrimePostback;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const data = payload.data;
  const transactionId = data?.id;
  if (transactionId === undefined || transactionId === null) {
    return NextResponse.json({ error: "id da transacao ausente." }, { status: 400 });
  }

  // Fonte da verdade: consulta a propria API, ignorando o status do payload.
  const tx = await getCardTransaction(String(transactionId));

  if (tx.status === "paid") {
    const order = buildMagnusOrder(data);
    if (order) {
      await sendOrderOnce(tx.id, order);
    } else {
      console.error("[primecash] postback pago sem dados de cliente/itens", { tx: tx.id });
    }
  }

  // Sempre 200 para a PrimeCash parar de reenviar.
  return NextResponse.json({ received: true });
}

/** Monta o pedido da Magnus a partir dos dados que vieram no postback. */
function buildMagnusOrder(data: PrimeData): Parameters<typeof sendOrderOnce>[1] | null {
  const c = data.customer;
  if (!c?.name || !c?.email) return null;

  const a = c.address;
  const items: MagnusItem[] = (data.items ?? []).map((i) => ({
    name: i.title,
    quantity: i.quantity,
    price: typeof i.unitPrice === "number" ? Number((i.unitPrice / 100).toFixed(2)) : undefined,
  }));

  return {
    customer: {
      name: c.name,
      email: c.email,
      document: c.document?.number,
      phone: c.phone ?? undefined,
    },
    address: a
      ? {
          street: a.street ?? undefined,
          number: a.streetNumber ?? undefined,
          neighborhood: a.neighborhood ?? undefined,
          city: a.city ?? undefined,
          state: a.state ?? undefined,
          zipcode: a.zipCode ?? undefined,
          complement: a.complement ?? undefined,
        }
      : undefined,
    items: items.length ? items : [{ name: "Pedido" }],
    total: typeof data.amount === "number" ? Number((data.amount / 100).toFixed(2)) : undefined,
  };
}

interface PrimePostback {
  type?: string;
  data?: PrimeData;
}

interface PrimeData {
  id?: number | string;
  amount?: number;
  status?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string | null;
    document?: { number?: string; type?: string };
    address?: {
      street?: string;
      streetNumber?: string;
      complement?: string | null;
      zipCode?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    };
  };
  items?: { title: string; unitPrice?: number; quantity?: number; tangible?: boolean }[];
}

/** Comparacao de tamanho fixo, para nao vazar o segredo por tempo de resposta. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
