// Baixa todos os assets binarios do sigmatools.site para public/.
// Uso: node scripts/download-assets.mjs
// Idempotente: pula arquivos que ja existem com tamanho > 0.

import { writeFile, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ORIGIN = "https://sigmatools.site";
const A = `${ORIGIN}/__l5e/assets-v1`;

/** @type {Array<[string, string]>} pares [url, caminho local relativo a public/] */
const ASSETS = [
  // Identidade
  [`${A}/82b97e26-bade-45d4-85aa-69fbcea8a0b2/sgt-logo.png`, "images/sgt-logo.png"],
  [`${ORIGIN}/favicon.ico`, "seo/favicon.ico"],
  [`${ORIGIN}/icon-192.svg`, "seo/icon-192.svg"],

  // Galeria do produto (p1..p8)
  [`${A}/010b56c2-a1dc-41b4-8939-8925a668d88a/p1.png`, "images/product/p1.png"],
  [`${A}/fe00ee63-e2d2-46f9-b835-f472b10f2c3a/p2.png`, "images/product/p2.png"],
  [`${A}/ab4e1c9e-b163-4cec-be04-10c87992e786/p3.png`, "images/product/p3.png"],
  [`${A}/ad7e0c9b-2a6b-4079-bc79-90f2fee61117/p4.png`, "images/product/p4.png"],
  [`${A}/328b101b-94d9-4150-a963-c639a7d5508c/p5.png`, "images/product/p5.png"],
  [`${A}/c50264f1-d44d-436b-bcf3-34f507428742/p6.png`, "images/product/p6.png"],
  [`${A}/42909267-f581-4ff4-af92-01e22d5895b4/p7.png`, "images/product/p7.png"],
  [`${A}/59293618-3af1-4044-a79c-c4cb2efe80e8/p8.png`, "images/product/p8.png"],

  // Fotos das avaliacoes
  [`${A}/86d6fa7f-f2f0-47a1-898a-a1f7f81ff7a1/review-real-1.jpg`, "images/reviews/review-real-1.jpg"],
  [`${A}/7fa9516e-a8b5-4d7d-9a97-6c3e543419a7/review-real-2.jpg`, "images/reviews/review-real-2.jpg"],
  [`${A}/b6fe3ee8-c66d-4a55-b5b2-12e966b2b3e9/review-real-3.jpg`, "images/reviews/review-real-3.jpg"],
  [`${A}/e4c1a0ee-6bf5-4675-9901-23a32e822cdf/review-real-4.jpg`, "images/reviews/review-real-4.jpg"],
  [`${A}/3685c80b-4fee-4b91-9c61-4bf1ac0a366b/review-real-5.jpg`, "images/reviews/review-real-5.jpg"],
  [`${A}/4427e933-1267-4c72-b16c-a980ff032bb9/review-real-6.jpg`, "images/reviews/review-real-6.jpg"],

  // Selos de confianca
  [`${A}/3af42d34-d254-474c-9942-dc008a54f6b2/ssl.png`, "images/trust/ssl.png"],
  [`${A}/f9b2b4c0-4134-4b37-b458-c4f90fe112da/norton.png`, "images/trust/norton.png"],
  [`${A}/6a4015c2-9f4d-45f2-bcd5-4a39c3e30f3d/google-safe.png`, "images/trust/google-safe.png"],

  // Bandeiras de pagamento
  [`${A}/7b1ed5bf-4805-46b1-9afc-e3973d1cee64/pix.png`, "images/payment/pix.png"],
  [`${A}/4aa75ec1-9032-4f36-91e3-4e8686c1c37e/card-pix.svg`, "images/payment/card-pix.svg"],
  [`${A}/c2b3a22e-a077-4f86-886e-63de7cc1338e/visa.svg`, "images/payment/visa.svg"],
  [`${A}/d1c0f2cf-5f2f-4b09-a5aa-93daf063bd62/mastercard.svg`, "images/payment/mastercard.svg"],
  [`${A}/68e68ab8-222b-4f89-9d95-61d0edfefdcc/elo.svg`, "images/payment/elo.svg"],
  [`${A}/a251bca2-d089-4b46-99ab-a54c20c737aa/american-express.svg`, "images/payment/american-express.svg"],
  [`${A}/82e16849-98b4-4a82-a39b-9fe1261060b4/hipercard.svg`, "images/payment/hipercard.svg"],
  [`${A}/ec9e946f-ce04-4567-be00-9fdcf0bdc167/discover.svg`, "images/payment/discover.svg"],
  [`${A}/09f283a9-0475-411b-8e3e-bd4d844eb826/aura.svg`, "images/payment/aura.svg"],
  [`${A}/81bf8dc9-367b-48a1-890e-adcb6bf6fa19/diners.svg`, "images/payment/diners.svg"],

  // Transportadora exibida nas opcoes de frete
  [`${A}/1f39ade3-a2c5-4659-9198-230d75b53786/correios.png`, "images/shipping/correios.png"],

  // Order bumps do checkout
  [`${A}/43e8b445-1194-4484-991c-60e2b6b5874a/vfloc.webp`, "images/bumps/vfloc.webp"],
  [`${A}/f7a41917-087d-4eba-93db-0eae0b17313b/toalha-pva.png`, "images/bumps/toalha-pva.png"],

  // Video demonstrativo
  [`${A}/0ee4e597-66f4-4fc1-a1e6-b3384fd13480/snow-foam-demo.mp4`, "videos/snow-foam-demo.mp4"],
];

const PUBLIC_DIR = resolve(import.meta.dirname, "..", "public");
const CONCURRENCY = 4;

async function alreadyDownloaded(path) {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

async function download([url, rel]) {
  const dest = resolve(PUBLIC_DIR, rel);
  if (await alreadyDownloaded(dest)) return { rel, status: "skip" };

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);

  await mkdir(dirname(dest), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return { rel, status: "ok", kb: Math.round(buf.length / 1024) };
}

async function main() {
  const results = [];
  const failures = [];

  for (let i = 0; i < ASSETS.length; i += CONCURRENCY) {
    const batch = ASSETS.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(download));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") {
        results.push(r.value);
        const tag = r.value.status === "skip" ? "existe" : `${r.value.kb} KB`;
        console.log(`  ${r.value.rel} (${tag})`);
      } else {
        failures.push({ url: batch[j][0], error: r.reason.message });
        console.error(`  FALHOU ${batch[j][1]}: ${r.reason.message}`);
      }
    });
  }

  const baixados = results.filter((r) => r.status === "ok").length;
  console.log(`\n${baixados} baixados, ${results.length - baixados} ja existiam, ${failures.length} falharam.`);

  // Sai com codigo != 0 para nao mascarar falhas em CI ou em npm scripts encadeados.
  if (failures.length) process.exit(1);
}

main();
