/** Etapa do funil pos-compra (upsell / downsell one-click). */
export type OfferKind = "upsell" | "downsell";

export interface FunnelOffer {
  /** Id curto usado na cobranca. NUNCA e o preco — o preco vem do catalogo. */
  id: string;
  /** Segmento da URL: /oferta/<slug>. */
  slug: string;
  kind: OfferKind;
  /** Posicao na jornada, so para a barra de progresso ("Oferta 1 de 2"). */
  stepLabel: string;
  /** Chamada principal da pagina. */
  headline: string;
  /** Linha de apoio abaixo da headline. */
  subheadline: string;
  /** Nome comercial do produto, usado tambem no item da cobranca. */
  productName: string;
  /** Frase curta que justifica o encaixe com o pedido ja feito. */
  pitch: string;
  bullets: string[];
  image: string;
  imageAlt: string;
  /** Preco cheio riscado, em centavos. */
  listPriceCents: number;
  /** Preco da oferta, em centavos. */
  priceCents: number;
  acceptCta: string;
  declineCta: string;
  /**
   * Para onde ir depois. `null` encerra o funil e leva para /obrigado.
   * Sao SLUGS, resolvidos contra o proprio catalogo — o cliente nunca escolhe
   * o proximo passo pela URL.
   */
  next: { accept: string | null; decline: string | null };
}
