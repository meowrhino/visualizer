/**
 * export.js — Canvas export: draws browser frame + content image.
 * Returns a blob instead of downloading directly.
 */

import { roundRect } from "./canvas-utils.js";
import { getFrameConfig } from "./frame-configs.js";
import { drawFrame } from "./canvas-draw.js";
import { canvasToBlob } from "./convert.js";

const canvas = document.getElementById("export-canvas");
const ctx = canvas.getContext("2d");

/**
 * Render image with browser frame and return blob + metadata.
 * @returns {{ blob: Blob, filename: string, url: string }}
 */
export async function exportToBlob(image, style, mult, shadow, urlText, format, quality, navicon, originalName) {
  if (!image) return null;

  const imgW = image.naturalWidth;
  const imgH = image.naturalHeight;

  const cfg = getFrameConfig(style, imgW, imgH);
  const useShadow = shadow && style !== "neu";

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

  drawFrame(ctx, ox, oy, cfg, image, urlText, navicon);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const { blob, ext } = await canvasToBlob(canvas, format, quality);
  const filename = originalName
    ? `${originalName.replace(/\.[^.]+$/, "")}-${style}.${ext}`
    : `frame-${style}-${mult}x.${ext}`;

  // Generate thumbnail URL for preview
  const url = URL.createObjectURL(blob);

  return { blob, filename, url };
}
