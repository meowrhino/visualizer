/**
 * canvas-draw.js
 * Dibuja un browser frame completo en un canvas 2D.
 * Recibe el contexto, posición, config del estilo, imagen y texto URL.
 */

import { roundRect, roundRectPath } from "./canvas-utils.js";

/**
 * Dibuja el frame completo: fondo, barra, dots, URL, botones, imagen y borde.
 */
export function drawFrame(ctx, ox, oy, cfg, img, text, navicon) {
  const { totalW, totalH, barH, radius, barBg, borderColor, borderW } = cfg;
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;

  ctx.save();

  // --- Sombra offset (Neu) ---
  if (cfg.boxShadow) {
    ctx.fillStyle = "#000";
    ctx.fillRect(ox + 5, oy + 5, totalW, totalH);
  }

  // --- Clip esquinas redondeadas ---
  if (radius) {
    roundRectPath(ctx, ox, oy, totalW, totalH, radius);
    ctx.clip();
  }

  // --- Fondo ---
  ctx.fillStyle = cfg.bodyBg || "#fff";
  ctx.fillRect(ox, oy, totalW, totalH);

  // --- Titlebar ---
  const bw = cfg.boxShadow ? borderW : 0;
  const barX = ox + bw;
  const barY = oy + bw;
  const barW = totalW - bw * 2;

  ctx.fillStyle = barBg;
  ctx.fillRect(barX, barY, barW, barH);

  // Línea inferior de la barra
  ctx.fillStyle = borderColor;
  const bbH = cfg.boxShadow ? 2.5 : 1;
  ctx.fillRect(barX, barY + barH - bbH, barW, bbH);

  // --- Dots (circulitos) ---
  if (cfg.dots) {
    drawDots(ctx, cfg, barX, barY, barH);
  }

  // --- Texto URL ---
  if (cfg.showUrl && text) {
    drawUrlText(ctx, cfg, text, barX, barY, barH, barW);
  }

  // --- Navicon (Windows) ---
  if (cfg.closeStyle === "windows" && navicon) {
    const iconSize = 16;
    const iconX = barX + 10;
    const iconY = barY + (barH - iconSize) / 2;
    ctx.drawImage(navicon, iconX, iconY, iconSize, iconSize);
  }

  // --- Botones ventana (Windows) ---
  if (cfg.showClose && cfg.closeStyle === "windows") {
    drawWindowsButtons(ctx, barX, barY, barH, barW, bbH);
  }

  // --- Imagen ---
  const imgX = ox + (cfg.boxShadow ? borderW : 0);
  const imgY = barY + barH;
  ctx.drawImage(img, imgX, imgY, imgW, imgH);

  // --- Borde exterior ---
  drawOuterBorder(ctx, ox, oy, cfg);

  ctx.restore();
}

// ─── Helpers internos ───────────────────────────────────

function drawDots(ctx, cfg, barX, barY, barH) {
  const dotR = (cfg.dotSize || 12) / 2;
  const dotY = barY + barH / 2;
  const dotX0 = barX + 14;
  const colors = cfg.dotColors || ["#ff5f57", "#febc2e", "#28c840"];

  colors.forEach((c, i) => {
    const cx = dotX0 + i * (dotR * 2 + 6);

    // Neu: borde negro en los dots
    if (cfg.neuDots) {
      ctx.beginPath();
      ctx.arc(cx, dotY, dotR + 1, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.globalAlpha = cfg.dotAlpha !== undefined ? cfg.dotAlpha : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawUrlText(ctx, cfg, text, barX, barY, barH, barW) {
  const textY = barY + barH / 2;
  const centerX = barX + barW / 2;

  switch (cfg.urlStyle) {
    case "pill": {
      ctx.font = "12px -apple-system, sans-serif";
      const tw = ctx.measureText(text).width;
      const pw = tw + 24;
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      roundRect(ctx, centerX - pw / 2, textY - 9, pw, 18, 4);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, centerX, textY);
      break;
    }
    case "glass-pill": {
      ctx.font = "12px -apple-system, sans-serif";
      const tw = ctx.measureText(text).width;
      const pw = tw + 28;
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      roundRect(ctx, centerX - pw / 2, textY - 10, pw, 20, 6);
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 0.5;
      roundRectPath(ctx, centerX - pw / 2, textY - 10, pw, 20, 6);
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, centerX, textY);
      break;
    }
    case "win-pill": {
      ctx.font = "11px -apple-system, sans-serif";
      const tw = ctx.measureText(text).width;
      const pw = tw + 28;
      ctx.fillStyle = "#e9e9e9";
      roundRect(ctx, centerX - pw / 2, textY - 10, pw, 20, 10);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, centerX, textY);
      break;
    }
    case "pixel-pill": {
      ctx.font = "11px -apple-system, sans-serif";
      const label = "🔍 " + text;
      const tw = ctx.measureText(label).width;
      const pw = tw + 32;
      ctx.fillStyle = "#f1f3f4";
      roundRect(ctx, centerX - pw / 2, textY - 11, pw, 22, 11);
      ctx.fillStyle = "#555";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, centerX, textY);
      break;
    }
    case "gx": {
      ctx.font = "11px -apple-system, sans-serif";
      const tw = ctx.measureText(text).width;
      const pw = tw + 28;
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      roundRect(ctx, centerX - pw / 2, textY - 10, pw, 20, 4);
      ctx.strokeStyle = "rgba(224,25,58,0.3)";
      ctx.lineWidth = 1;
      roundRectPath(ctx, centerX - pw / 2, textY - 10, pw, 20, 4);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, centerX, textY);
      break;
    }
    case "neu": {
      ctx.font = '12px "SF Mono", "Consolas", monospace';
      const tw = ctx.measureText(text).width;
      const pw = tw + 24;
      ctx.fillStyle = "#fff";
      ctx.fillRect(centerX - pw / 2, textY - 10, pw, 20);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - pw / 2, textY - 10, pw, 20);
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, centerX, textY);
      break;
    }
    case "dia": {
      ctx.font = '13px "Georgia", serif';
      const tw = ctx.measureText(text).width;
      const pw = tw + 36;
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      roundRect(ctx, centerX - pw / 2, textY - 11, pw, 22, 11);
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      roundRectPath(ctx, centerX - pw / 2, textY - 11, pw, 22, 11);
      ctx.stroke();
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, centerX, textY);
      break;
    }
  }
}

function drawWindowsButtons(ctx, barX, barY, barH, barW, bbH) {
  const btnW = 46;
  const startX = barX + barW - btnW * 3;
  const symbols = ["—", "☐", "×"];

  symbols.forEach((sym, i) => {
    ctx.fillStyle = "#f3f3f3";
    ctx.fillRect(startX + btnW * i, barY, btnW, barH - bbH);
    ctx.font = "14px -apple-system, sans-serif";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sym, startX + btnW * i + btnW / 2, barY + barH / 2);
  });
}

function drawOuterBorder(ctx, ox, oy, cfg) {
  const { totalW, totalH, radius, borderColor, borderW } = cfg;

  if (cfg.boxShadow) {
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderW;
    ctx.strokeRect(ox + borderW / 2, oy + borderW / 2, totalW - borderW, totalH - borderW);
  } else if (borderW) {
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
}
