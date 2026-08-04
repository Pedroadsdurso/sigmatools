import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },

  images: {
    // AVIF economiza mais que WebP nas fotos das avaliacoes; o navegador
    // escolhe o primeiro formato que suporta e cai para WebP nos antigos.
    formats: ["image/avif", "image/webp"],
    // Larguras que a pagina realmente usa. A lista padrao do Next gera 8
    // variantes por imagem, a maioria nunca requisitada.
    deviceSizes: [390, 640, 828, 1080, 1440],
    imageSizes: [48, 64, 96, 128, 256],
    // Os assets sao versionados junto do deploy e so mudam em build novo.
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  // Importa so o icone usado de cada pacote, em vez da biblioteca inteira.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // O header do Next revela a versao do framework sem nenhum ganho.
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Os arquivos de public/images tem nome ESTAVEL: trocar a foto de um
        // produto reescreve o mesmo caminho. Com `immutable` o navegador de
        // quem ja visitou continuaria mostrando a foto antiga por ate um ano,
        // sem chance de revalidar — foi exatamente o que aconteceu ao trocar
        // as fotos das ofertas do funil.
        //
        // Um dia de cache duro cobre a navegacao real (a sessao inteira sai do
        // cache), e o stale-while-revalidate mantem a resposta instantanea
        // enquanto a versao nova baixa em segundo plano. Trocar uma foto passa
        // a valer para todo mundo em ate 24h.
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
