/**
 * export.js
 * Exportación de imagen con frame: dibuja en canvas y descarga como PNG o WebP.
 */

import { roundRect } from "./canvas-utils.js";
import { getFrameConfig } from "./frame-configs.js";
import { drawFrame } from "./canvas-draw.js";
import { canvasToBlob, downloadBlob } from "./convert.js";

const canvas = document.getElementById("export-canvas");
const ctx = canvas.getContext("2d");

/**
 * Exporta la imagen con el frame aplicado.
 * @param {HTMLImageElement} image — imagen cargada (microlink o subida)
 * @param {string} style — estilo actual ("macos", "glass", etc.)
 * @param {number} mult — multiplicador de resolución (1, 2, 3)
 * @param {boolean} shadow — si aplicar sombra macOS
 * @param {string} urlText — texto a mostrar en la barra URL
 * @param {"png"|"webp"} format — formato de exportación
 * @param {number} quality — calidad WebP (0.0 - 1.0)
 */
export async function exportImage(image, style, mult, shadow, urlText, format, quality, navicon) {
  if (!image) return;

  const scale = mult;
  const imgW = image.naturalWidth;
  const imgH = image.naturalHeight;

  const cfg = getFrameConfig(style, imgW, imgH);
  const useShadow = shadow && style !== "neu";

  const shadowPad = useShadow ? 80 * scale : 0;
  const extraOffset = cfg.boxShadow ? 6 * scale : 0;

  const totalW = cfg.totalW * scale + shadowPad * 2 + extraOffset;
  const totalH = cfg.totalH * scale + shadowPad * 2 + extraOffset;

  canvas.width = totalW;
  canvas.height = totalH;
  ctx.clearRect(0, 0, totalW, totalH);
  ctx.scale(scale, scale);

  const ox = shadowPad / scale;
  const oy = shadowPad / scale;

  // Sombra tipo macOS (difusa, grande)
  if (useShadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 70;
    ctx.shadowOffsetX = 0;
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

  // Convertir y descargar
  const { blob, ext } = await canvasToBlob(canvas, format, quality);
  downloadBlob(blob, `frame-${style}-${mult}x.${ext}`);
}
