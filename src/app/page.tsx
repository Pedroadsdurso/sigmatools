import { BuyBox } from "@/components/BuyBox";
import { ComparisonTable } from "@/components/ComparisonTable";
import { Faq } from "@/components/Faq";
import { MobileBuyBar } from "@/components/MobileBuyBar";
import { ProductDescription } from "@/components/ProductDescription";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductVideo } from "@/components/ProductVideo";
import { Reviews } from "@/components/Reviews";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { product } from "@/data/product";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-3 pb-6 lg:px-6">
        <div className="overflow-hidden rounded-lg bg-card shadow-card lg:grid lg:grid-cols-2 lg:gap-6 lg:p-4">
          <ProductGallery images={product.images} />
          <BuyBox product={product} />
        </div>

        <ProductDescription product={product} />
        <ProductVideo product={product} />
        <ComparisonTable product={product} />
        <Reviews product={product} />
        <Faq product={product} />
      </main>

      <MobileBuyBar product={product} />
      <SiteFooter product={product} />
    </div>
  );
}
