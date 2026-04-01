/**
 * export.js — Canvas export: draws browser frame + content image.
 */

import { roundRect } from "./canvas-utils.js";
import { getFrameConfig } from "./frame-configs.js";
import { drawFrame } from "./canvas-draw.js";
import { canvasToBlob, downloadBlob } from "./convert.js";

const canvas = document.getElementById("export-canvas");
const ctx = canvas.getContext("2d");

/**
 * Export image with browser frame.
 * @param {HTMLImageElement} image - Content image
 * @param {string} style - Frame style ("windows", "macos", etc.)
 * @param {number} mult - Resolution multiplier (1, 2, 3)
 * @param {boolean} shadow - Apply drop shadow
 * @param {string} urlText - URL text for the address bar
 * @param {string} format - "png" | "webp"
 * @param {number} quality - WebP quality (0.0 - 1.0)
 * @param {HTMLImageElement|null} navicon - Favicon image for Windows style
 * @param {Object|undefined} crop - Optional crop {sx, sy, sw, sh}
 */
export async function exportImage(image, style, mult, shadow, urlText, format, quality, navicon, crop) {
  if (!image) return;

  // If cropped, use crop dimensions as the "image size" for the frame
  const imgW = crop ? crop.sw : image.naturalWidth;
  const imgH = crop ? crop.sh : image.naturalHeight;

  const cfg = getFrameConfig(style, imgW, imgH);
  const useShadow = shadow && style !== "neu";

  // Shadow padding scales with multiplier
  const shadowPad = useShadow ? 80 * mult : 0;
  const neuOffset = cfg.boxShadow ? 6 * mult : 0;

  const totalW = cfg.totalW * mult + shadowPad * 2 + neuOffset;
  const totalH = cfg.totalH * mult + shadowPad * 2 + neuOffset;

  canvas.width = totalW;
  canvas.height = totalH;
  ctx.clearRect(0, 0, totalW, totalH);
  ctx.scale(mult, mult);

  const ox = shadowPad / mult;
  const oy = shadowPad / mult;

  // Draw macOS-style diffuse shadow
  if (useShadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 70;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = cfg.bodyBg || "#fff";
    if (cfg.radius) {
      roundRect(ctx, ox, oy, cfg.totalW, cfg.totalH, cfg.radius);
    } else {
      ctx.fillRect(ox, oy, cfg.totalW, cfg.totalH);
    }
    ctx.restore();
  }

  drawFrame(ctx, ox, oy, cfg, image, urlText, navicon, crop);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const { blob, ext } = await canvasToBlob(canvas, format, quality);
  downloadBlob(blob, `frame-${style}-${mult}x.${ext}`);
}
