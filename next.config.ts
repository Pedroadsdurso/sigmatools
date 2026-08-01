import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

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
        // Assets de public/ tem nome estavel, entao o cache longo depende de
        // trocar o arquivo ao atualizar a imagem — o que o build ja faz.
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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
