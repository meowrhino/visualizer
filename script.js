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
const downloadHint = $("#download-hint");
const dimW = $("#dim-w");
const dimH = $("#dim-h");
const canvas = $("#export-canvas");
const ctx = canvas.getContext("2d");

let currentStyle = "macos";
let currentSource = "url";
let loadedImage = null;
let currentW = 1440;
let currentH = 900;
let currentMult = 1;
let isIframeMode = false;

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
  frameUrl.textContent = urlInput.value.replace(/^https?:\/\//, "") || "";
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

    $("#source-url").hidden = currentSource !== "url";
    $("#source-image").hidden = currentSource !== "image";
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

  // Build thum.io screenshot URL
  const thumbUrl = `https://image.thum.io/get/viewportWidth/${currentW}/crop/${currentH}/width/${currentW}/png/${url}`;

  loadedImage = null;
  isIframeMode = false;
  frameIframe.hidden = true;
  frameEmpty.hidden = true;
  frameImg.hidden = false;

  // Show loading state
  frameUrl.textContent = url.replace(/^https?:\/\//, "");
  downloadBtn.disabled = true;
  downloadHint.textContent = "capturando...";
  downloadHint.hidden = false;

  // Load screenshot as image
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    loadedImage = img;
    frameImg.src = img.src;
    downloadBtn.disabled = false;
    downloadHint.hidden = true;
    applyDimensions();
    applyShadow();
  };
  img.onerror = () => {
    // CORS failed or image failed — try without crossOrigin for display only
    const img2 = new Image();
    img2.onload = () => {
      loadedImage = null; // can't use in canvas
      frameImg.src = img2.src;
      downloadBtn.disabled = true;
      downloadHint.textContent = "usa ⌘⇧4 para capturar el frame";
      downloadHint.hidden = false;
      applyDimensions();
      applyShadow();
    };
    img2.onerror = () => {
      downloadHint.textContent = "error al capturar — prueba otra URL";
      downloadHint.hidden = false;
    };
    img2.src = thumbUrl;
  };
  img.src = thumbUrl;

  applyDimensions();
  applyShadow();
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
      isIframeMode = false;
      frameImg.src = e.target.result;
      frameImg.hidden = false;
      frameIframe.hidden = true;
      frameEmpty.hidden = true;

      frameUrl.textContent = file.name;
      fileName.textContent = file.name;

      downloadBtn.disabled = false;
      downloadHint.hidden = true;
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
  if (currentStyle === "neu") {
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
  const maxPreviewW = Math.min(900, window.innerWidth - 80);
  const scale = Math.min(1, maxPreviewW / currentW);
  const displayW = Math.round(currentW * scale);
  const displayH = Math.round(currentH * scale);

  frameBody.style.width = displayW + "px";
  frameBody.style.height = displayH + "px";

  if (!frameIframe.hidden) {
    frameIframe.style.width = currentW + "px";
    frameIframe.style.height = currentH + "px";
    frameIframe.style.transform = `scale(${scale})`;
    frameIframe.style.transformOrigin = "top left";
  }
}

applyDimensions();

// =============================================
//  Multiplier
// =============================================

$$(".mult-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".mult-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMult = parseInt(btn.dataset.mult);
  });
});

// =============================================
//  URL input → live update bar text
// =============================================

urlInput.addEventListener("input", () => {
  frameUrl.textContent = urlInput.value.replace(/^https?:\/\//, "");
});

// =============================================
//  Download PNG
// =============================================

downloadBtn.addEventListener("click", exportPNG);

function exportPNG() {
  if (!loadedImage) return;

  const scale = currentMult;
  const imgW = loadedImage.naturalWidth;
  const imgH = loadedImage.naturalHeight;
  const text = urlInput.value.replace(/^https?:\/\//, "") || "";

  const cfg = getFrameConfig(currentStyle, imgW, imgH);
  const shadow = shadowToggle.checked && currentStyle !== "neu";

  const shadowPad = shadow ? 80 * scale : 0;
  const extraOffset = cfg.boxShadow ? 6 * scale : 0;

  const totalW = cfg.totalW * scale + shadowPad * 2 + extraOffset;
  const totalH = cfg.totalH * scale + shadowPad * 2 + extraOffset;

  canvas.width = totalW;
  canvas.height = totalH;
  ctx.clearRect(0, 0, totalW, totalH);
  ctx.scale(scale, scale);

  const ox = shadowPad / scale;
  const oy = shadowPad / scale;

  // macOS shadow
  if (shadow) {
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

  drawFrame(ctx, ox, oy, cfg, loadedImage, text);

  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset scale

  const link = document.createElement("a");
  link.download = `frame-${currentStyle}-${currentMult}x.png`;
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
    glass: {
      ...base,
      barH: 40, totalW: imgW, totalH: imgH + 40, radius: 14,
      barBg: "rgba(245,245,247,0.85)", borderColor: "rgba(0,0,0,0.1)",
      dotSize: 11, urlStyle: "glass-pill",
    },
    windows: {
      ...base,
      barH: 36, totalW: imgW, totalH: imgH + 36, radius: 8,
      barBg: "#f3f3f3", borderColor: "#e0e0e0",
      dots: false, urlStyle: "win-pill",
      showClose: true, closeStyle: "windows",
    },
    pixel: {
      ...base,
      barH: 42, totalW: imgW, totalH: imgH + 42, radius: 12,
      barBg: "#ffffff", borderColor: "#e0e0e0",
      dots: false, urlStyle: "pixel-pill",
    },
    dots: {
      ...base,
      barH: 32, totalW: imgW, totalH: imgH + 32,
      barBg: "#f0f0f0", borderColor: "#d0d0d0", dotSize: 10,
      showUrl: false,
    },
    gx: {
      ...base,
      barH: 38, totalW: imgW, totalH: imgH + 38, radius: 8,
      barBg: "#111118", borderColor: "rgba(224,25,58,0.5)", bodyBg: "#0d0d12",
      dotSize: 10, urlStyle: "gx",
      dotColors: ["rgba(224,25,58,0.8)", "rgba(224,25,58,0.4)", "rgba(224,25,58,0.2)"],
    },
    neu: {
      barH: 38, totalW: imgW + 5, totalH: imgH + 38 + 5, radius: 4,
      barBg: "#ffe566", borderColor: "#000", borderW: 2.5,
      dots: true, dotSize: 13, showUrl: true, urlStyle: "neu",
      boxShadow: true, neuDots: true,
    },
    dia: {
      ...base,
      barH: 42, totalW: imgW, totalH: imgH + 42, radius: 12,
      barBg: "#ffffff", borderColor: "rgba(0,0,0,0.12)", borderW: 0.5,
      dotSize: 10, dotAlpha: 0, urlStyle: "dia",
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

  // Neu box shadow
  if (cfg.boxShadow) {
    ctx.fillStyle = "#000";
    ctx.fillRect(ox + 5, oy + 5, totalW, totalH);
  }

  // Clip rounded corners
  if (radius) {
    roundRectPath(ctx, ox, oy, totalW, totalH, radius);
    ctx.clip();
  }

  // Background
  ctx.fillStyle = cfg.bodyBg || "#fff";
  ctx.fillRect(ox, oy, totalW, totalH);

  // --- Titlebar ---
  const bw = cfg.boxShadow ? borderW : 0;
  const barX = ox + bw;
  const barY = oy + bw;
  const barW = totalW - bw * 2;

  ctx.fillStyle = barBg;
  ctx.fillRect(barX, barY, barW, barH);

  // Bar bottom border
  ctx.fillStyle = borderColor;
  const bbH = cfg.boxShadow ? 2.5 : 1;
  ctx.fillRect(barX, barY + barH - bbH, barW, bbH);

  // --- Dots ---
  if (cfg.dots) {
    const dotR = (cfg.dotSize || 12) / 2;
    const dotY = barY + barH / 2;
    const dotX0 = barX + 14;
    const colors = cfg.dotColors || ["#ff5f57", "#febc2e", "#28c840"];

    colors.forEach((c, i) => {
      const cx = dotX0 + i * (dotR * 2 + 6);

      // Neu: black border on dots
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

  // --- Close buttons (Windows) ---
  if (cfg.showClose && cfg.closeStyle === "windows") {
    const btnW = 46;
    const btns = 3;
    const startX = barX + barW - btnW * btns;
    // Minimize
    ctx.fillStyle = "#f3f3f3";
    ctx.fillRect(startX, barY, btnW, barH - bbH);
    ctx.font = "14px -apple-system, sans-serif";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("—", startX + btnW / 2, barY + barH / 2);
    // Maximize
    ctx.fillStyle = "#f3f3f3";
    ctx.fillRect(startX + btnW, barY, btnW, barH - bbH);
    ctx.fillStyle = "#666";
    ctx.fillText("☐", startX + btnW + btnW / 2, barY + barH / 2);
    // Close
    ctx.fillStyle = "#f3f3f3";
    ctx.fillRect(startX + btnW * 2, barY, btnW, barH - bbH);
    ctx.fillStyle = "#666";
    ctx.fillText("×", startX + btnW * 2 + btnW / 2, barY + barH / 2);
  }

  // --- Image ---
  const imgX = ox + (cfg.boxShadow ? borderW : 0);
  const imgY = barY + barH;
  ctx.drawImage(img, imgX, imgY, imgW, imgH);

  // --- Outer border ---
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
