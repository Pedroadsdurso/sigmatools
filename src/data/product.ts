import type { Coupon, OrderBump, Product, ShippingOption } from "@/types/product";

/**
 * ⚠️ MODO TESTE — TROQUE PARA `false` ANTES DE VENDER DE VERDADE.
 *
 * Com `true` o produto sai por R$ 5,00 (R$ 4,75 no Pix), para validar o fluxo
 * completo de pagamento gastando pouco. O preco vale para a loja INTEIRA e
 * tambem para a cobranca gerada na OnyxPag, porque lib/pricing.ts calcula o
 * total a partir daqui — nao existe um preco de vitrine e outro de cobranca.
 *
 * Um unico lugar para reverter: esta constante.
 */
export const MODO_TESTE = true;

/**
 * Cartao de credito ligado/desligado — INTERRUPTOR UNICO da loja.
 *
 * Desligado em 04/08/2026: a PrimeCash informou que o processamento de cartao
 * esta desativado na conta, e toda tentativa voltava com "Credenciais
 * invalidas" da adquirencia deles. Deixar a opcao visivel custava a venda
 * inteira — o cliente tentava, falhava e ia embora em vez de pagar no Pix.
 *
 * Com `false`, some tudo que promete cartao: a forma de pagamento no checkout,
 * o parcelamento anunciado na vitrine, as bandeiras no rodape e a resposta do
 * FAQ. As rotas de cobranca tambem recusam, para o caso de alguem chamar a API
 * direto. O Pix (OnyxPag) nao e afetado em nada.
 *
 * Para reativar quando a PrimeCash liberar: troque para `true`.
 */
export const CARTAO_HABILITADO = false;

const PRECO = {
  real: { listCents: 19790, priceCents: 9770 },
  teste: { listCents: 990, priceCents: 500 },
} as const;

const precoAtivo = MODO_TESTE ? PRECO.teste : PRECO.real;

/**
 * Conteudo extraido do sigmatools.site em 31/07/2026.
 * Precos em centavos para evitar erro de ponto flutuante no calculo do Pix.
 */
export const product: Product = {
  id: "snow-foam-sgt-9939",
  name: "Canhão de Espuma à Gravidade SIGMA 10930",
  tagline: "Espuma densa com controle e estilo profissional.",
  sku: "SIGMA-10930",
  brand: "SGT TOOLS",
  seller: "SGT Tools Oficial",
  rating: 4.9,
  ratingCount: 2847,
  listPriceCents: precoAtivo.listCents,
  priceCents: precoAtivo.priceCents,
  pixDiscount: 0.05,
  installments: 12,
  stock: 7,
  viewers: 20,

  images: [
    { src: "/images/product/p1.webp", alt: "Canhão de Espuma à Gravidade SIGMA 10930" },
    { src: "/images/product/p8.webp", alt: "SIGMA 10930 — embalagem" },
    { src: "/images/product/p2.webp", alt: "SIGMA 10930 — vista lateral" },
    { src: "/images/product/p3.webp", alt: "SIGMA 10930 — reservatório superior" },
    { src: "/images/product/p4.webp", alt: "SIGMA 10930 — conexão 1/4″" },
    { src: "/images/product/p5.webp", alt: "SIGMA 10930 — giclê extra" },
    { src: "/images/product/p6.webp", alt: "SIGMA 10930 — detalhe do filtro" },
    { src: "/images/product/p7.webp", alt: "SIGMA 10930 — conjunto completo" },
  ],

  video: {
    src: "/videos/snow-foam-demo.mp4",
    caption: "Espuma densa, cobertura total e acabamento profissional em segundos.",
  },

  descriptionParagraphs: [
    "O Canhão de Espuma à Gravidade SIGMA 10930 é o canhão de espuma da SGT Tools projetado para lavagem automotiva com lavadoras de alta pressão. Design novo com reservatório superior por gravidade, ultraleve e prático.",
    "Adicione o shampoo automotivo direto no canhão, sem diluição — processo mais rápido, eficiente e conveniente para lavar carros, motos e utilitários.",
  ],

  highlights: [
    {
      title: "Sem diluição",
      description: "Adicione o shampoo diretamente no canhão. Processo mais rápido e sem desperdício.",
    },
    {
      title: "Ultraleve — 350g",
      description: "Peso reduzido garante conforto e fácil manuseio, mesmo em lavagens longas.",
    },
    {
      title: "Filtro interno aprimorado",
      description: "Evita danos ao canhão por partículas de espuma ou impurezas na água.",
    },
    {
      title: "Ajuste de concentração e ângulo",
      description: "Regule a espuma e o leque de pulverização pra cobertura total.",
    },
    {
      title: "Conexão rápida 1/4″",
      description: "Compatível com a maioria das lavadoras de alta pressão do mercado.",
    },
    {
      title: "Acompanha giclê 1.3mm extra",
      description: "Troca fácil pra ajustar a densidade da espuma conforme o shampoo.",
    },
  ],

  specs: [
    { label: "Marca", value: "SGT Tools" },
    { label: "Modelo", value: "SIGMA-10930" },
    { label: "Código de barras", value: "7908276684319" },
    { label: "Peso", value: "~350 g" },
    { label: "Conexão", value: "1/4″ macho" },
    { label: "Giclê incluso", value: "1.3 mm (extra)" },
    { label: "Aplicação", value: "Lavadora alta pressão" },
    { label: "Garantia", value: "12 meses" },
  ],

  boxContents: [
    "1x Canhão de Espuma à Gravidade SIGMA 10930",
    "1x Giclê 1.3 mm extra",
    "1x Conector para rosca 1/4″ macho (extra)",
    "1x Manual de Instruções",
  ],

  comparison: [
    { item: "Tempo (carro médio)", sigma: "10 min", traditional: "40 min+", highlight: true },
    { item: "Contato manual", sigma: "Zero (pré-lavagem)", traditional: "Alto — risca a pintura", highlight: true },
    { item: "Cobertura da espuma", sigma: "Uniforme, densa", traditional: "Irregular" },
    { item: "Economia de shampoo", sigma: "Até 40% mais", traditional: "Padrão", highlight: true },
    { item: "Risco de swirls", sigma: "Mínimo", traditional: "Alto", highlight: true },
  ],

  reviews: [
    {
      text: "Espuma densa e uniforme. Melhor investimento pra pré-lavagem do carro.",
      author: "Rafael M.",
      role: "Detalhador",
      photo: "/images/reviews/review-real-1.webp",
      photoAlt: "Foto enviada por Rafael M.",
      stars: 5,
    },
    {
      text: "Muito leve, uso com uma mão. Chegou lacrado, produto original SGT.",
      author: "Camila S.",
      role: "Cliente verificada",
      photo: "/images/reviews/review-real-2.webp",
      photoAlt: "Foto enviada por Camila S.",
      stars: 5,
    },
    {
      text: "Uso todo dia no serviço. O filtro interno segura sujeira e o giclê extra é ótimo.",
      author: "Marcos T.",
      role: "Lava-jato",
      photo: "/images/reviews/review-real-3.webp",
      photoAlt: "Foto enviada por Marcos T.",
      stars: 5,
    },
    {
      text: "Chegou rápido e bem embalado. Encaixou perfeito na minha lavadora.",
      author: "Juliana P.",
      role: "Cliente verificada",
      photo: "/images/reviews/review-real-4.webp",
      photoAlt: "Foto enviada por Juliana P.",
      stars: 5,
    },
    {
      text: "Superou expectativas. Espuma dura no carro e escorre limpa.",
      author: "Anderson R.",
      role: "Comprador verificado",
      photo: "/images/reviews/review-real-5.webp",
      photoAlt: "Foto enviada por Anderson R.",
      stars: 5,
    },
    {
      text: "Original SGT Tools, veio com giclê extra e conector. Recomendo!",
      author: "Patrícia L.",
      role: "Cliente verificada",
      photo: "/images/reviews/review-real-6.webp",
      photoAlt: "Foto enviada por Patrícia L.",
      stars: 5,
    },
  ],

  faq: [
    {
      question: "Em quanto tempo recebo meu produto?",
      answer:
        "Enviamos em até 1 dia útil após a confirmação do pagamento. A entrega leva de 3 a 7 dias úteis para todo o Brasil, com frete grátis.",
    },
    {
      question: "Serve para minha lavadora?",
      answer:
        "Sim. O SIGMA-10930 usa conexão rápida 1/4″ macho, compatível com a maioria das lavadoras de alta pressão do mercado (WAP, Karcher, Vonder, Electrolux e similares).",
    },
    {
      question: "Preciso diluir o shampoo?",
      answer:
        "Não. Adicione o shampoo automotivo direto no canhão, sem diluição. O sistema de gravidade e o ajuste de concentração cuidam do resto.",
    },
    {
      question: "Tem garantia?",
      answer:
        "Sim, 12 meses de garantia do fabricante contra defeitos, além de 7 dias para arrependimento e 30 dias para troca ou devolução.",
    },
    {
      question: "O pagamento é seguro?",
      answer: CARTAO_HABILITADO
        ? "100%. Checkout com criptografia SSL, aceitamos Pix, cartão em até 3x sem juros (ou até 12x com juros) e boleto."
        : "100%. Checkout com criptografia SSL e pagamento via Pix — aprovação na hora e 5% de desconto no valor final.",
    },
    {
      question: "O que vem na caixa?",
      answer:
        "1 Canhão Canhão de Espuma à Gravidade SIGMA 10930, 1 giclê 1.3mm extra, 1 conector 1/4″ macho extra e o manual.",
    },
  ],
};

/** Modalidades de entrega oferecidas no step 2 do checkout. */
export const shippingOptions: ShippingOption[] = [
  {
    id: "free",
    label: "Frete Grátis",
    eta: "3 a 7 dias úteis ·",
    priceCents: 0,
    carrierLogo: "/images/shipping/correios.webp",
    carrierName: "Correios",
  },
  {
    id: "sedex",
    label: "Sedex",
    eta: "2 a 3 dias úteis ·",
    priceCents: MODO_TESTE ? 190 : 1990,
    carrierLogo: "/images/shipping/correios.webp",
    carrierName: "Correios",
  },
];

/**
 * Cupons aceitos no checkout.
 *
 * Vazio de proposito: o checkout original valida os codigos contra o backend
 * dele, que nao foi migrado. Adicione aqui os codigos reais da loja — a
 * validacao roda no servidor (lib/pricing), entao o cliente nao consegue
 * inventar um desconto pelo devtools.
 *
 * Exemplo:
 *   { code: "SGT10", type: "percent", value: 0.10, label: "10% OFF" },
 */
export const coupons: Coupon[] = [];

/** Ofertas complementares exibidas dentro do painel de pagamento. */
export const orderBumps: OrderBump[] = [
  {
    id: "vfloc",
    headline: "Adicione o Vonixx V-FLOC 500ml",
    description:
      "Shampoo automotivo concentrado pH neutro — diluição até 1:400, espuma densa e altíssimo rendimento. Combina perfeitamente com o Snow Foam SGT.",
    productName: "Vonixx V-FLOC Lava Autos Concentrado 500ml",
    image: "/images/bumps/vfloc.webp",
    listPriceCents: MODO_TESTE ? 290 : 4990,
    priceCents: MODO_TESTE ? 100 : 2990,
    cta: "Sim, quero adicionar!",
  },
  {
    id: "toalha-pva",
    headline: "Adicione a Toalha de Secagem PVA 3D Vonixx",
    description:
      "Toalha PVA 3D 64x43cm — seca o carro inteiro sem marcas d'água em minutos. Super absorvente, dura anos e não risca a pintura.",
    productName: "Toalha de Secagem PVA 3D Vonixx 64x43cm",
    image: "/images/bumps/toalha-pva.webp",
    listPriceCents: MODO_TESTE ? 390 : 5990,
    priceCents: MODO_TESTE ? 200 : 3490,
    cta: "Sim, quero secar sem marcas!",
  },
];

/**
 * Bandeiras exibidas no rodape e no checkout, na ordem do original.
 *
 * Com o cartao desligado sobra so o Pix: exibir Visa/Master ao lado de um
 * checkout que nao aceita cartao e promessa que a pagina seguinte quebra.
 */
export const paymentBrands = (CARTAO_HABILITADO
  ? [
      { src: "/images/payment/card-pix.svg", alt: "Pix" },
      { src: "/images/payment/visa.svg", alt: "Visa" },
      { src: "/images/payment/mastercard.svg", alt: "Mastercard" },
      { src: "/images/payment/elo.svg", alt: "Elo" },
      { src: "/images/payment/american-express.svg", alt: "American Express" },
      { src: "/images/payment/hipercard.svg", alt: "Hipercard" },
      { src: "/images/payment/discover.svg", alt: "Discover" },
      { src: "/images/payment/aura.svg", alt: "Aura" },
      { src: "/images/payment/diners.svg", alt: "Diners" },
    ]
  : [{ src: "/images/payment/card-pix.svg", alt: "Pix" }]) as {
  src: string;
  alt: string;
}[];

export const store = {
  name: "SGT Tools",
  cnpj: "13.031.956/0001-00",
  email: "atendimento@sgtoficial.site",
  whatsapp: "+55 16 99637-8435",
  whatsappUrl: "https://wa.me/5516996378435",
  hours: ["Seg a Sex, 8h às 18h", "Sáb, 9h às 13h"],
  legal:
    "SGT Tools · Ferramentas e equipamentos automotivos · CNPJ 13.031.956/0001-00 · Todos os direitos reservados. Fotos meramente ilustrativas.",
};
