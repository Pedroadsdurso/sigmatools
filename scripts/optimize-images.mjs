// Converte os assets de public/images para WebP e reduz as dimensoes ao que a
// pagina realmente usa. Os originais PNG/JPG sao apagados depois da conversao.
//
// Uso: node scripts/optimize-images.mjs
//
// Contexto: as fotos das avaliacoes vinham em 1200px e ~1,3 MB cada, mas sao
// exibidas com no maximo 280px de altura. Servir o original custava ~8 MB de
// download so nessa secao.

import { readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve, extname, basename, dirname } from "node:path";
import sharp from "sharp";

const PUBLIC = resolve(import.meta.dirname, "..", "public", "images");

/** Largura maxima por pasta, escolhida pelo tamanho de exibicao x2 (telas retina). */
const RULES = [
  { dir: "product", width: 900, quality: 80 },
  { dir: "reviews", width: 700, quality: 74 },
  { dir: "bumps", width: 240, quality: 80 },
  { dir: "trust", width: 220, quality: 82 },
  { dir: "shipping", width: 200, quality: 85 },
  { dir: "", width: 400, quality: 85 }, // raiz: logo
];

const CONVERTIBLE = new Set([".png", ".jpg", ".jpeg"]);

function ruleFor(relDir) {
  return RULES.find((r) => r.dir === relDir) ?? RULES[RULES.length - 1];
}

async function walk(dir, relDir = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full, entry.name)));
    } else if (CONVERTIBLE.has(extname(entry.name).toLowerCase())) {
      out.push({ full, relDir });
    }
  }
  return out;
}

async function convert({ full, relDir }) {
  const rule = ruleFor(relDir);
  const before = (await stat(full)).size;
  const dest = join(dirname(full), `${basename(full, extname(full))}.webp`);

  const image = sharp(full);
  const meta = await image.metadata();

  const buf = await image
    // withoutEnlargement: nunca aumenta uma imagem que ja e menor que o alvo.
    .resize({ width: Math.min(rule.width, meta.width ?? rule.width), withoutEnlargement: true })
    .webp({ quality: rule.quality, effort: 6 })
    .toBuffer();

  await writeFile(dest, buf);
  await unlink(full);

  return { name: full.split("public")[1], before, after: buf.length };
}

async function main() {
  const files = await walk(PUBLIC);
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const r = await convert(file);
    totalBefore += r.before;
    totalAfter += r.after;
    const pct = Math.round((1 - r.after / r.before) * 100);
    console.log(
      `  ${r.name.padEnd(42)} ${String(Math.round(r.before / 1024)).padStart(5)} KB -> ${String(
        Math.round(r.after / 1024),
      ).padStart(4)} KB  (-${pct}%)`,
    );
  }

  console.log(
    `\n${files.length} imagens: ${(totalBefore / 1024 / 1024).toFixed(1)} MB -> ${(
      totalAfter /
      1024 /
      1024
    ).toFixed(2)} MB (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`,
  );
}

main();
