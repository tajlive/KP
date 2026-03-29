/**
 * Generate PNG icons for PWA manifest
 * Uses Node.js canvas API (sharp alternative without native deps)
 */

import { createCanvas } from "canvas";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SIZES = [192, 512];
const BG_COLOR = "#2563eb";
const TEXT_COLOR = "#ffffff";

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Border radius effect (clip)
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.clip();

  // Re-fill background after clip
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Draw "K" text
  const fontSize = Math.floor(size * 0.55);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("K", size / 2, size / 2 + size * 0.02);

  return canvas.toBuffer("image/png");
}

async function main() {
  const publicDir = join(__dirname, "..", "public", "icons");

  for (const size of SIZES) {
    const buffer = generateIcon(size);
    const outputPath = join(publicDir, `icon-${size}.png`);
    writeFileSync(outputPath, buffer);
    console.log(`✓ Generated icon-${size}.png`);
  }

  console.log("Done!");
}

main().catch(console.error);
