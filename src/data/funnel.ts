import { MODO_TESTE } from "@/data/product";
import type { FunnelOffer } from "@/types/funnel";

/**
 * Funil pos-compra (upsell / downsell one-click).
 *
 * O lead entra aqui SO depois de o pagamento do produto principal ser
 * confirmado — quem manda para ca sao a tela do Pix e a do cartao, e a pagina
 * da oferta reconfirma o status no gateway antes de renderizar.
 *
 * Percurso desenhado:
 *
 *   pagou o Snow Foam
 *        │
 *        ▼
 *   [up1] Pack 3 Shampoos V-FLOC ── aceitou ──┐
 *        │ recusou                            │
 *        ▼                                    │
 *   [down1] Kit Luva + V-FLOC + brinde ───────┤ (aceitando ou nao)
 *                                             ▼
 *                                   [up2] Kit 3 em 1 Limpa Vidros
 *                                             │ recusou
 *                                             ▼
 *                                   [down2] Escova macia p/ rodas
 *                                             │
 *                                             ▼
 *                                        /obrigado
 *
 * Os precos ficam SO aqui: a rota de cobranca busca a oferta pelo id e cobra
 * este valor. O navegador manda apenas o id, nunca um montante.
 */

/**
 * Preco real x preco de teste, na mesma logica de src/data/product.ts.
 *
 * Nenhuma oferta desce de R$ 5,00 no modo teste: gateway costuma ter valor
 * minimo por transacao, e uma cobranca de R$ 1,00 recusada por isso pareceria
 * bug do funil quando o problema seria so o piso do adquirente.
 */
const preco = (real: number, teste: number) => (MODO_TESTE ? teste : real);

export const funnelOffers: FunnelOffer[] = [
  {
    id: "up1",
    slug: "pack-3-shampoos-vfloc",
    kind: "upsell",
    stepLabel: "Oferta exclusiva 1 de 2",
    headline: "ESPERE! Sua compra foi aprovada — mas falta o shampoo.",
    subheadline:
      "Seu Canhão de Espuma precisa de shampoo concentrado para render espuma densa. Leve 3 frascos com desconto de atacado, agora, sem pagar frete de novo.",
    productName: "Pack 3x Vonixx V-FLOC Lava Autos Concentrado 500ml",
    pitch:
      "Vai junto no MESMO envio do seu canhão. Um clique e pronto — não precisa preencher nada de novo.",
    bullets: [
      "3 frascos de 500ml — rende até 1.200 litros de solução",
      "pH neutro: não remove cera, selante nem vitrificador",
      "Diluição até 1:400 — o mais econômico do mercado",
      "Espuma densa e aderente, feita para canhão de espuma",
    ],
    image: "/images/funnel/pack-3-shampoos-vfloc-v2.webp",
    imageAlt: "Pack com 3 frascos de Vonixx V-FLOC 500ml",
    listPriceCents: preco(14970, 990),
    priceCents: preco(6990, 500),
    acceptCta: "SIM! ADICIONAR AO MEU PEDIDO",
    declineCta: "Não, prefiro comprar depois pagando mais caro",
    next: { accept: "kit-limpa-vidros-3em1", decline: "kit-luva-vfloc" },
  },
  {
    id: "down1",
    slug: "kit-luva-vfloc",
    kind: "downsell",
    stepLabel: "Última chance nesta condição",
    headline: "Tudo bem — que tal levar só 1 frasco, com a luva de brinde?",
    subheadline:
      "Entendi, 3 frascos era muita coisa. Então liberei uma versão menor: 1 shampoo V-FLOC 500ml + luva de microfibra + brinde surpresa.",
    productName: "Kit Luva Microfibra + Shampoo Vonixx V-FLOC 500ml + Brinde",
    pitch:
      "Mesmo envio, mesmo pedido, um clique. É a última vez que esta condição aparece.",
    bullets: [
      "1x Vonixx V-FLOC 500ml — o shampoo certo para o canhão",
      "1x Luva de microfibra chenille — lava sem riscar a pintura",
      "1x Brinde surpresa de detalhamento",
      "Sai por menos que o shampoo avulso no varejo",
    ],
    image: "/images/funnel/kit-luva-vfloc-v2.webp",
    imageAlt: "Kit com luva de microfibra, shampoo V-FLOC e brindes",
    listPriceCents: preco(9990, 990),
    priceCents: preco(5990, 500),
    acceptCta: "SIM! QUERO O KIT COM A LUVA",
    declineCta: "Não, obrigado — seguir sem o kit",
    next: { accept: "kit-limpa-vidros-3em1", decline: "kit-limpa-vidros-3em1" },
  },
  {
    id: "up2",
    slug: "kit-limpa-vidros-3em1",
    kind: "upsell",
    stepLabel: "Oferta exclusiva 2 de 2",
    headline: "Falta o vidro — e é ele que denuncia a lavagem malfeita.",
    subheadline:
      "Carro lavado com vidro manchado parece sujo mesmo limpo. Resolve por R$ 29,90 no mesmo pedido.",
    productName: "Kit 3 em 1 Limpa Vidros com Rodo, Spray e Toalha Microfibra",
    pitch: "Menos de R$ 30 para não estragar o acabamento do resto do carro.",
    bullets: [
      "Rodo com lâmina de silicone — tira a água sem deixar risco",
      "Reservatório spray integrado: molha e seca com uma mão só",
      "Toalha de microfibra removível e lavável",
      "Serve em vidro, espelho, box de banheiro e para-brisa",
    ],
    image: "/images/funnel/kit-limpa-vidros-3em1-v2.webp",
    imageAlt: "Kit 3 em 1 limpa vidros com rodo, spray e toalha de microfibra",
    listPriceCents: preco(5990, 990),
    priceCents: preco(2990, 500),
    acceptCta: "SIM! ADICIONAR POR R$ 29,90",
    declineCta: "Não quero o limpa vidros",
    next: { accept: null, decline: "escova-rodas-vonder" },
  },
  {
    id: "down2",
    slug: "escova-rodas-vonder",
    kind: "downsell",
    stepLabel: "Oferta final",
    headline: "Última: a roda é a primeira coisa que suja de novo.",
    subheadline:
      "Escova macia Vonder de nylon para rodas e pneus. Cerda que entra na raia da roda sem marcar o acabamento.",
    productName: "Escova Macia para Rodas Automotivo Carro/Moto Nylon Vonder",
    pitch: "Depois desta tela seu pedido é fechado e enviado para separação.",
    bullets: [
      "Cerdas de nylon macias — não riscam roda pintada ou diamantada",
      "Cabo ergonômico antiderrapante, firme mesmo molhado",
      "Alcança a raia interna da roda e o vão do pneu",
      "Vonder — 12 meses de garantia",
    ],
    image: "/images/funnel/escova-rodas-vonder-v2.webp",
    imageAlt: "Escova macia Vonder para rodas automotivas",
    listPriceCents: preco(8990, 990),
    priceCents: preco(4990, 500),
    acceptCta: "SIM! QUERO A ESCOVA",
    declineCta: "Não, finalizar meu pedido",
    next: { accept: null, decline: null },
  },
];

/** Primeira tela do funil — para onde o checkout redireciona apos aprovar. */
export const FUNNEL_ENTRY_SLUG = funnelOffers[0].slug;

export function findOfferBySlug(slug: string | undefined): FunnelOffer | null {
  if (!slug) return null;
  return funnelOffers.find((o) => o.slug === slug) ?? null;
}

/** Resolve a oferta pelo id vindo do navegador. Id desconhecido => null. */
export function findOfferById(id: unknown): FunnelOffer | null {
  if (typeof id !== "string") return null;
  return funnelOffers.find((o) => o.id === id) ?? null;
}

/** URL do proximo passo. Slug nulo encerra o funil. */
export function offerHref(slug: string | null): string {
  return slug ? `/oferta/${slug}` : "/obrigado";
}
