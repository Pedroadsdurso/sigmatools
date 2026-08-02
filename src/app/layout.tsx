import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { TestModeBanner } from "@/components/TestModeBanner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title:
    "Canhão de Espuma à Gravidade SIGMA 10930 — Canhão de Espuma · SGT Tools",
  description:
    "Canhão de Espuma Canhão de Espuma à Gravidade SIGMA 10930: ultraleve 350g, filtro interno, ajuste de concentração, conexão 1/4″. Frete grátis e 3x sem juros.",
  icons: {
    icon: "/seo/favicon.ico",
    apple: "/seo/icon-192.svg",
  },
};

/**
 * O Netlify expoe CONTEXT: "production" | "deploy-preview" | "branch-deploy".
 *
 * Fora de producao os snippets da Traffik nao sao injetados — deploy preview e
 * branch deploy sao ambiente de teste, e o que sai dali sujaria o funil e a
 * atribuicao de campanha com trafego que nao e de cliente.
 *
 * Roda no servidor (sem NEXT_PUBLIC_), entao o valor e resolvido na
 * renderizacao e o script simplesmente nao chega ao HTML do preview.
 */
const rastrear = process.env.CONTEXT === "production";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} h-full`}>
      <head>
        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '27349653094733875');
fbq('track', 'PageView');
`}</Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=27349653094733875&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}

        {/* Traffik — so em producao.
            Servidos de public/js em vez de inline: os snippets trazem crases
            nos comentarios, e crase encerra o template literal do JSX. Como
            arquivo .js eles ficam identicos ao original, sem escape nenhum, e
            atualizar e trocar o arquivo. */}
        {rastrear && (
          <>
            {/* Sinaliza ao lib/tracking.ts que o rastreamento esta ligado. Sem
                isso, num preview sem Traffik o fallback dispararia direto no
                fbq — evento sem par e sem dedup, sujando os dados da Meta. */}
            <Script id="traffik-ativo" strategy="afterInteractive">
              {`window.__traffikAtivo = 1;`}
            </Script>
            <Script id="traffik-utm" src="/js/traffik-utm.js" strategy="afterInteractive" />
            <Script id="traffik-pixel" src="/js/traffik-pixel.js" strategy="afterInteractive" />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <TestModeBanner />
        {children}
      </body>
    </html>
  );
}
