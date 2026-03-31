const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// --- DOM refs ---
const frameContainer = $("#frame-container");
const frameBody = $("#frame-body");
const frameImg = $("#frame-img");
const frameIframe = $("#frame-iframe");
const frameEmpty = $("#frame-empty");
const frameUrl = $("#frame-url");
const urlInput = $("#url-input");
const loadUrlBtn = $("#load-url-btn");
const dropZone = $("#drop-zone");
const fileInput = $("#file-input");
const fileName = $("#file-name");
const shadowToggle = $("#shadow-toggle");
const downloadBtn = $("#download-btn");
const dimW = $("#dim-w");
const dimH = $("#dim-h");
const canvas = $("#export-canvas");
const ctx = canvas.getContext("2d");

let currentStyle = "macos";
let currentSource = "url"; // "url" | "image"
let loadedImage = null;
let currentW = 1440;
let currentH = 900;

// =============================================
//  Style toggles
// =============================================

$$(".style-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".style-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentStyle = btn.dataset.style;
    applyStyle();
  });
});

function applyStyle() {
  frameContainer.dataset.style = currentStyle;
  frameUrl.textContent = urlInput.value || "";
  applyShadow();
}

// =============================================
//  Source tabs (URL / image)
// =============================================

$$(".source-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".source-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentSource = tab.dataset.source;

    const srcUrl = $("#source-url");
    const srcImg = $("#source-image");
    srcUrl.hidden = currentSource !== "url";
    srcImg.hidden = currentSource !== "image";
  });
});

// =============================================
//  URL loading
// =============================================

loadUrlBtn.addEventListener("click", loadURL);
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadURL();
});

function loadURL() {
  let url = urlInput.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  urlInput.value = url;

  // Show iframe, hide image and empty
  loadedImage = null;
  frameImg.hidden = true;
  frameEmpty.hidden = true;
  frameIframe.hidden = false;
  frameIframe.src = url;

  frameUrl.textContent = url.replace(/^https?:\/\//, "");
  applyDimensions();
  applyShadow();

  // Download only works with images
  downloadBtn.disabled = true;
}

// =============================================
//  Image upload (drag & drop + click)
// =============================================

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) loadImage(file);
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) loadImage(fileInput.files[0]);
});

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      frameImg.src = e.target.result;

      // Show image, hide iframe and empty
      frameImg.hidden = false;
      frameIframe.hidden = true;
      frameEmpty.hidden = true;

      frameUrl.textContent = file.name;
      fileName.textContent = file.name;
      downloadBtn.disabled = false;
      applyDimensions();
      applyShadow();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// =============================================
//  Shadow toggle
// =============================================

shadowToggle.addEventListener("change", applyShadow);

function applyShadow() {
  if (currentStyle === "brutalist") {
    frameContainer.classList.remove("with-shadow");
  } else {
    frameContainer.classList.toggle("with-shadow", shadowToggle.checked);
  }
}

// =============================================
//  Dimensions / Ratios
// =============================================

$$(".ratio-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".ratio-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentW = parseInt(btn.dataset.w);
    currentH = parseInt(btn.dataset.h);
    dimW.value = currentW;
    dimH.value = currentH;
    applyDimensions();
  });
});

dimW.addEventListener("change", () => {
  currentW = parseInt(dimW.value) || 1440;
  $$(".ratio-btn").forEach((b) => b.classList.remove("active"));
  applyDimensions();
});

dimH.addEventListener("change", () => {
  currentH = parseInt(dimH.value) || 900;
  $$(".ratio-btn").forEach((b) => b.classList.remove("active"));
  applyDimensions();
});

function applyDimensions() {
  // Scale to fit within preview area (max ~900px wide)
  const maxPreviewW = Math.min(900, window.innerWidth - 80);
  const scale = Math.min(1, maxPreviewW / currentW);
  const displayW = Math.round(currentW * scale);
  const displayH = Math.round(currentH * scale);

  frameBody.style.width = displayW + "px";
  frameBody.style.height = displayH + "px";

  // For iframe, set internal dimensions via transform scaling
  if (!frameIframe.hidden) {
    frameIframe.style.width = currentW + "px";
    frameIframe.style.height = currentH + "px";
    frameIframe.style.transform = `scale(${scale})`;
    frameIframe.style.transformOrigin = "top left";
  }
}

// Initial dimensions
applyDimensions();

// =============================================
//  URL input → live update bar text
// =============================================

urlInput.addEventListener("input", () => {
  frameUrl.textContent = urlInput.value.replace(/^https?:\/\//, "");
});

// =============================================
//  Download PNG (only with uploaded image)
// =============================================

downloadBtn.addEventListener("click", exportPNG);

function exportPNG() {
  if (!loadedImage) return;

  const imgW = loadedImage.naturalWidth;
  const imgH = loadedImage.naturalHeight;
  const text = urlInput.value.replace(/^https?:\/\//, "") || "";

  const cfg = getFrameConfig(currentStyle, imgW, imgH);
  const shadow = shadowToggle.checked && currentStyle !== "brutalist";

  const shadowPad = shadow ? 80 : 0;
  const extraOffset = cfg.boxShadow ? 6 : 0;

  const totalW = cfg.totalW + shadowPad * 2 + extraOffset;
  const totalH = cfg.totalH + shadowPad * 2 + extraOffset;

  canvas.width = totalW;
  canvas.height = totalH;
  ctx.clearRect(0, 0, totalW, totalH);

  const ox = shadowPad;
  const oy = shadowPad;

  // macOS shadow
  if (shadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 70;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = "#fff";
    if (cfg.radius) {
      roundRect(ctx, ox, oy, cfg.totalW, cfg.totalH, cfg.radius);
    } else {
      ctx.fillRect(ox, oy, cfg.totalW, cfg.totalH);
    }
    ctx.restore();
  }

  drawFrame(ctx, ox, oy, cfg, loadedImage, text);

  const link = document.createElement("a");
  link.download = `frame-${currentStyle}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// =============================================
//  Frame configs for canvas export
// =============================================

function getFrameConfig(style, imgW, imgH) {
  const base = { dots: true, showUrl: true, dotSize: 12, borderW: 1, radius: 8 };

  const configs = {
    macos: {
      ...base,
      barH: 38, totalW: imgW, totalH: imgH + 38,
      barBg: "#e8e8e8", borderColor: "#d0d0d0",
      urlStyle: "pill",
    },
    safari: {
      ...base,
      barH: 36, totalW: imgW, totalH: imgH + 36, radius: 10,
      barBg: "#f6f6f6", borderColor: "#d4d4d4", dotSize: 11,
      urlStyle: "safari-pill",
    },
    arc: {
      ...base,
      barH: 40, totalW: imgW, totalH: imgH + 40, radius: 14,
      barBg: "#f0eeff", borderColor: "#e0ddf5", dotSize: 11,
      urlStyle: "arc-pill",
      dotColors: ["#ff6b7f", "#ffc14d", "#5fd97d"],
    },
    windows: {
      ...base,
      barH: 32, totalW: imgW, totalH: imgH + 32, radius: 0,
      barBg: "#f0f0f0", borderColor: "#ccc",
      dots: false, urlStyle: "left",
      showClose: true, closeStyle: "windows",
    },
    terminal: {
      ...base,
      barH: 38, totalW: imgW, totalH: imgH + 38,
      barBg: "#2d2d2d", borderColor: "#333", bodyBg: "#1e1e1e",
      urlStyle: "terminal",
      dotColors: ["rgba(255,95,87,0.7)", "rgba(254,188,46,0.7)", "rgba(40,200,64,0.7)"],
    },
    pixel: {
      ...base,
      barH: 42, totalW: imgW, totalH: imgH + 42, radius: 12,
      barBg: "#ffffff", borderColor: "#e0e0e0",
      dots: false, urlStyle: "pixel-pill",
    },
    brutalist: {
      barH: 38, totalW: imgW + 8, totalH: imgH + 38 + 7, radius: 0,
      barBg: "#ff8c42", borderColor: "#1a1a1a", borderW: 4,
      dots: false, showUrl: true, urlStyle: "bold",
      showClose: true, closeStyle: "brutalist", boxShadow: true,
    },
    retro: {
      barH: 26, totalW: imgW + 6, totalH: imgH + 26 + 6, radius: 0,
      barBg: "gradient-retro", borderColor: "#000", borderW: 2,
      dots: false, showUrl: true, urlStyle: "retro",
      showClose: true, closeStyle: "retro", retroStyle: true,
    },
    dots: {
      ...base,
      barH: 32, totalW: imgW, totalH: imgH + 32,
      barBg: "#f0f0f0", borderColor: "#d0d0d0", dotSize: 10,
      showUrl: false,
    },
    "dots-name": {
      ...base,
      barH: 38, totalW: imgW, totalH: imgH + 38,
      barBg: "#f0f0f0", borderColor: "#d0d0d0",
      urlStyle: "center",
    },
    flat: {
      barH: 0, totalW: imgW + 16, totalH: imgH + 16, radius: 8,
      barBg: "none", borderColor: "none", borderW: 0,
      dots: false, showUrl: false, padding: 8, flatBg: "#1a1a1a",
    },
    outline: {
      barH: 0, totalW: imgW, totalH: imgH, radius: 10,
      barBg: "none", borderColor: "#1a1a1a", borderW: 2,
      dots: false, showUrl: false,
    },
  };
  return configs[style];
}

// =============================================
//  Canvas drawing
// =============================================

function drawFrame(ctx, ox, oy, cfg, img, text) {
  const { totalW, totalH, barH, radius, barBg, borderColor, borderW } = cfg;
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;

  ctx.save();

  // --- Flat style: just padding + image ---
  if (cfg.flatBg) {
    if (radius) {
      roundRectPath(ctx, ox, oy, totalW, totalH, radius);
      ctx.clip();
    }
    ctx.fillStyle = cfg.flatBg;
    ctx.fillRect(ox, oy, totalW, totalH);
    const p = cfg.padding || 0;
    ctx.drawImage(img, ox + p, oy + p, imgW, imgH);
    ctx.restore();
    return;
  }

  // --- Outline style: just border + image ---
  if (barH === 0 && !cfg.flatBg) {
    if (radius) {
      roundRectPath(ctx, ox, oy, totalW, totalH, radius);
      ctx.clip();
    }
    ctx.drawImage(img, ox, oy, imgW, imgH);
    if (borderW) {
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderW;
      if (radius) {
        roundRectPath(ctx, ox + 1, oy + 1, totalW - 2, totalH - 2, radius);
        ctx.stroke();
      } else {
        ctx.strokeRect(ox, oy, totalW, totalH);
      }
    }
    ctx.restore();
    return;
  }

  // --- Brutalist box shadow ---
  if (cfg.boxShadow) {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(ox + 6, oy + 6, totalW, totalH);
  }

  // --- Retro bevel ---
  if (cfg.retroStyle) {
    // Outer bevel
    ctx.fillStyle = "#dfdfdf";
    ctx.fillRect(ox, oy, totalW, totalH);
    ctx.fillStyle = "#808080";
    ctx.fillRect(ox + 1, oy + 1, totalW - 1, totalH - 1);
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(ox + 2, oy + 2, totalW - 4, totalH - 4);
  }

  // Clip rounded corners
  if (radius) {
    roundRectPath(ctx, ox, oy, totalW, totalH, radius);
    ctx.clip();
  }

  // Background
  ctx.fillStyle = cfg.retroStyle ? "#c0c0c0" : "#fff";
  ctx.fillRect(ox, oy, totalW, totalH);

  // --- Titlebar ---
  const bw = cfg.boxShadow ? borderW : 0;
  const barX = ox + bw;
  const barY = oy + bw;
  const barW = totalW - bw * 2;

  if (cfg.retroStyle) {
    // Retro gradient bar
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, "#000080");
    grad.addColorStop(1, "#1084d0");
    ctx.fillStyle = grad;
    ctx.fillRect(barX + 3, barY + 3, barW - 6, barH);
  } else {
    ctx.fillStyle = barBg;
    ctx.fillRect(barX, barY, barW, barH);
  }

  // Bar bottom border
  if (!cfg.retroStyle) {
    ctx.fillStyle = borderColor;
    const bbH = cfg.boxShadow ? 3 : 1;
    ctx.fillRect(barX, barY + barH - bbH, barW, bbH);
  }

  // --- Dots ---
  if (cfg.dots) {
    const dotR = (cfg.dotSize || 12) / 2;
    const dotY = barY + barH / 2;
    const dotX0 = barX + 14;
    const colors = cfg.dotColors || ["#ff5f57", "#febc2e", "#28c840"];
    colors.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(dotX0 + i * (dotR * 2 + 6), dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    });
  }

  // --- URL text ---
  if (cfg.showUrl && text) {
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
      case "safari-pill": {
        ctx.font = "11px -apple-system, sans-serif";
        const label = "🔒 " + text;
        const tw = ctx.measureText(label).width;
        const pw = tw + 28;
        ctx.fillStyle = "#eaeaea";
        roundRect(ctx, centerX - pw / 2, textY - 10, pw, 20, 6);
        ctx.fillStyle = "#555";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, centerX, textY);
        break;
      }
      case "arc-pill": {
        ctx.font = "500 11px -apple-system, sans-serif";
        const tw = ctx.measureText(text).width;
        const pw = tw + 28;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        roundRect(ctx, centerX - pw / 2, textY - 10, pw, 20, 8);
        ctx.fillStyle = "#6b5ce7";
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
      case "terminal": {
        ctx.font = '11px "SF Mono", "Consolas", monospace';
        ctx.fillStyle = "#8ae08a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, centerX, textY);
        break;
      }
      case "bold": {
        ctx.font = "bold 13px -apple-system, sans-serif";
        ctx.fillStyle = "#1a1a1a";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, barX + 14, textY);
        break;
      }
      case "left": {
        ctx.font = "12px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, barX + 12, textY);
        break;
      }
      case "retro": {
        ctx.font = "bold 11px -apple-system, sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, barX + 8, barY + 3 + barH / 2);
        break;
      }
      default: {
        ctx.font = "600 12px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, centerX, textY);
      }
    }
  }

  // --- Close buttons ---
  if (cfg.showClose) {
    const bbH = cfg.boxShadow ? 3 : 1;

    if (cfg.closeStyle === "brutalist") {
      const closeW = 38;
      const closeX = barX + barW - closeW;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(closeX, barY, 3, barH);
      ctx.fillStyle = "#ffaa70";
      ctx.fillRect(closeX + 3, barY, closeW - 3, barH - bbH);
      ctx.font = "bold 18px -apple-system, sans-serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("×", closeX + closeW / 2 + 1, barY + barH / 2);
    } else if (cfg.closeStyle === "windows") {
      const closeW = 46;
      const closeX = barX + barW - closeW;
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(closeX, barY, closeW, barH);
      ctx.font = "14px -apple-system, sans-serif";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("×", closeX + closeW / 2, barY + barH / 2);
    } else if (cfg.closeStyle === "retro") {
      const s = 16;
      const cx = barX + barW - s - 8;
      const cy = barY + 3 + (barH - s) / 2;
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(cx, cy, s, s);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, s, s);
      // highlight
      ctx.fillStyle = "#fff";
      ctx.fillRect(cx, cy, 1, s);
      ctx.fillRect(cx, cy, s, 1);
      ctx.font = "bold 10px -apple-system, sans-serif";
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("×", cx + s / 2, cy + s / 2);
    }
  }

  // --- Image ---
  if (cfg.retroStyle) {
    const m = 3;
    const imgX = ox + m + 1;
    const imgY = barY + 3 + barH + 1;
    ctx.drawImage(img, imgX, imgY, imgW, imgH);
    // Inset border
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(imgX - 1, imgY - 1, imgW + 2, imgH + 2);
  } else {
    const imgX = ox + (cfg.boxShadow ? borderW : 0);
    const imgY = barY + barH;
    ctx.drawImage(img, imgX, imgY, imgW, imgH);
  }

  // --- Outer border ---
  if (cfg.boxShadow) {
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderW;
    ctx.strokeRect(ox + borderW / 2, oy + borderW / 2, totalW - borderW, totalH - borderW);
  } else if (borderW && !cfg.retroStyle) {
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

// =============================================
//  Canvas helpers
// =============================================

function roundRect(ctx, x, y, w, h, r) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
