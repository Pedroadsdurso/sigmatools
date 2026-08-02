export interface ProductImage {
  src: string;
  alt: string;
}

export interface SpecRow {
  label: string;
  value: string;
}

export interface Highlight {
  title: string;
  description: string;
}

export interface ComparisonRow {
  item: string;
  sigma: string;
  traditional: string;
  /** Destaca a coluna SIGMA em verde, como no original. */
  highlight?: boolean;
}

export interface Review {
  text: string;
  author: string;
  role: string;
  photo: string;
  photoAlt: string;
  stars: number;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ShippingOption {
  id: "free" | "sedex";
  label: string;
  /** Ex.: "3 a 7 dias úteis" — a transportadora vem do logo ao lado. */
  eta: string;
  /** Em centavos. 0 = gratis. */
  priceCents: number;
  carrierLogo: string;
  carrierName: string;
}

export interface Coupon {
  code: string;
  /** "percent" incide sobre as mercadorias; "fixed" abate um valor em centavos. */
  type: "percent" | "fixed";
  /** 0.10 para 10%, ou centavos quando type = "fixed". */
  value: number;
  label: string;
}

export interface OrderBump {
  id: string;
  /** Chamada em destaque, ex.: "Adicione o Vonixx V-FLOC 500ml" */
  headline: string;
  description: string;
  productName: string;
  image: string;
  listPriceCents: number;
  priceCents: number;
  /** Texto do botao de aceite, diferente por bump no original. */
  cta: string;
}

export type PaymentMethod = "pix" | "card";

export interface Product {
  id: string;
  name: string;
  tagline: string;
  sku: string;
  brand: string;
  seller: string;
  rating: number;
  ratingCount: number;
  /** Preco cheio riscado, em centavos. */
  listPriceCents: number;
  /** Preco de venda, em centavos. */
  priceCents: number;
  /** Desconto adicional do Pix, em fracao (0.05 = 5%). */
  pixDiscount: number;
  installments: number;
  stock: number;
  viewers: number;
  images: ProductImage[];
  video: { src: string; caption: string };
  descriptionParagraphs: string[];
  highlights: Highlight[];
  specs: SpecRow[];
  boxContents: string[];
  comparison: ComparisonRow[];
  reviews: Review[];
  faq: FaqItem[];
}
