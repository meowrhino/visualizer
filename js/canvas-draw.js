/**
 * canvas-draw.js
 * Dibuja el browser frame Windows en canvas 2D.
 */

import { roundRect, roundRectPath } from "./canvas-utils.js";

/**
 * Dibuja el frame completo: fondo, barra, título, botones, imagen y borde.
 */
export function drawFrame(ctx, ox, oy, cfg, img, text, navicon) {
  const { totalW, totalH, barH, radius, barBg, borderColor, borderW } = cfg;
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;

  ctx.save();

  // --- Clip esquinas redondeadas ---
  if (radius) {
    roundRectPath(ctx, ox, oy, totalW, totalH, radius);
    ctx.clip();
  }

  // --- Fondo ---
  ctx.fillStyle = cfg.bodyBg || "#fff";
  ctx.fillRect(ox, oy, totalW, totalH);

  // --- Titlebar ---
  const barX = ox;
  const barY = oy;
  const barW = totalW;

  ctx.fillStyle = barBg;
  ctx.fillRect(barX, barY, barW, barH);

  // Línea inferior
  ctx.fillStyle = borderColor;
  ctx.fillRect(barX, barY + barH - 1, barW, 1);

  // --- Título centrado (navicon + text) ---
  const textY = barY + barH / 2;
  const centerX = barX + barW / 2;

  if (text) {
    ctx.font = "20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (navicon) {
      // Navicon + título juntos, centrados
      const tw = ctx.measureText(text).width;
      const iconSize = 20;
      const gap = 8;
      const totalTextW = iconSize + gap + tw;
      const startX = centerX - totalTextW / 2;

      ctx.drawImage(navicon, startX, textY - iconSize / 2, iconSize, iconSize);
      ctx.textAlign = "left";
      ctx.fillText(text, startX + iconSize + gap, textY);
    } else {
      ctx.fillText(text, centerX, textY);
    }
  }

  // --- Botones ventana (minimize, maximize, close) ---
  drawWindowsButtons(ctx, barX, barY, barH, barW);

  // --- Imagen ---
  const imgX = ox;
  const imgY = barY + barH;
  ctx.drawImage(img, imgX, imgY, imgW, imgH);

  // --- Borde exterior ---
  if (borderW) {
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderW;
    if (radius) {
      roundRectPath(ctx, ox + 0.5, oy + 0.5, totalW - 1, totalH - 1, radius);
      ctx.stroke();
    } else {
      ctx.strokeRect(ox, oy, totalW, totalH);
    }
  }

  ctx.restore();
}

// ─── Windows buttons ────────────────────────────────────

function drawWindowsButtons(ctx, barX, barY, barH, barW) {
  const btnW = 54;
  const btnH = barH;
  const startX = barX + barW - btnW * 3;

  // Minimize: —
  ctx.fillStyle = "#666";
  ctx.font = "16px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Minimize
  const minX = startX + btnW * 0 + btnW / 2;
  const minY = barY + btnH / 2;
  ctx.fillStyle = "#aaa";
  ctx.fillRect(minX - 7, minY, 14, 1.5);

  // Maximize (square outline)
  const maxX = startX + btnW * 1 + btnW / 2;
  const maxY = barY + btnH / 2;
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(maxX - 5.5, maxY - 5.5, 11, 11);

  // Close (×)
  const closeX = startX + btnW * 2 + btnW / 2;
  const closeY = barY + btnH / 2;
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(closeX - 5, closeY - 5);
  ctx.lineTo(closeX + 5, closeY + 5);
  ctx.moveTo(closeX + 5, closeY - 5);
  ctx.lineTo(closeX - 5, closeY + 5);
  ctx.stroke();
}
