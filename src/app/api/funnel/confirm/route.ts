import { NextResponse } from "next/server";
import { getCardTransaction } from "@/lib/primecash";
import { getTransaction } from "@/lib/onyxpag";
import { sendOrderOnce } from "@/lib/magnus";
import { decodeAttribution, sendSaleOnce } from "@/lib/traffik-ingest";
import { readFunnelSession, writeFunnelSession } from "@/lib/funnel-session";
import { findOfferById, offerHref } from "@/data/funnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirma o pagamento de uma oferta do funil e registra a venda.
 *
 * Ponto unico de chegada das duas cobrancas possiveis — cartao aprovado na
 * hora e Pix/cartao confirmados depois pelo polling. O status NUNCA vem do
 * corpo da requisicao: e sempre relido no gateway, senao bastaria um POST
 * dizendo "paguei" para o item entrar no envio de graca.
 *
 * Efeitos de um pagamento confirmado:
 *   1. a oferta entra em `extras` na sessao (aparece na pagina de obrigado);
 *   2. o item vai para a Magnus, para ser separado e enviado;
 *   3. a venda e reportada a ferramenta de rastreamento com a MESMA atribuicao
 *      da compra principal.
 *
 * Idempotente: reexecutar com o mesmo txId nao duplica nada.
 */

interface Body {
  offerId?: string;
  txId?: string;
  method?: "pix" | "card";
}

export async function POST(request: Request) {
  const session = await readFunnelSession();
  if (!session) {
    return NextResponse.json({ error: "Sessao do pedido expirada." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const offer = findOfferById(body.offerId);
  const txId = typeof body.txId === "string" ? body.txId.trim() : "";

  if (!offer || !txId || !/^[\w-]{1,64}$/.test(txId)) {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  const next = offerHref(offer.next.accept);

  // Ja registrado: responde igual, sem cobrar nada de novo.
  if (session.extras.some((e) => e.txId === txId)) {
    return NextResponse.json({ paid: true, next });
  }

  const method = body.method === "pix" || body.method === "card" ? body.method : session.method;

  let paid = false;
  try {
    if (method === "card") {
      paid = (await getCardTransaction(txId)).status === "paid";
    } else {
      paid = (await getTransaction(txId)).status === "pago";
    }
  } catch (err) {
    console.error("[funil] falha ao reler status da oferta", offer.id, txId, err);
    return NextResponse.json({ error: "Nao foi possivel confirmar o pagamento." }, { status: 502 });
  }

  if (!paid) return NextResponse.json({ paid: false });

  session.extras.push({
    id: offer.id,
    name: offer.productName,
    priceCents: offer.priceCents,
    txId,
  });
  await writeFunnelSession(session);

  // Pos-venda: o item precisa entrar na separacao. A Magnus cria um pedido por
  // POST, entao a oferta chega como um pedido proprio ligado ao mesmo cliente
  // e endereco — junte com o pedido principal no painel antes de despachar.
  await sendOrderOnce(txId, {
    customer: {
      name: session.name,
      email: session.email,
      document: session.cpf,
      phone: session.phone,
    },
    address: {
      street: session.address.street,
      number: session.address.number,
      neighborhood: session.address.district,
      city: session.address.city,
      state: session.address.state,
      zipcode: session.address.cep,
      complement: session.address.complement,
    },
    items: [
      {
        name: offer.productName,
        quantity: 1,
        price: Number((offer.priceCents / 100).toFixed(2)),
      },
    ],
    total: Number((offer.priceCents / 100).toFixed(2)),
  });

  await sendSaleOnce({
    transactionId: txId,
    status: "approved",
    value: Number((offer.priceCents / 100).toFixed(2)),
    currency: "BRL",
    product: offer.productName,
    paymentMethod: method === "card" ? "credit_card" : "pix",
    email: session.email,
    name: session.name,
    phone: session.phone,
    document: session.cpf,
    ...decodeAttribution(session.attr),
  });

  console.log("[funil] oferta paga", { oferta: offer.id, tx: txId, metodo: method });

  return NextResponse.json({ paid: true, next });
}
