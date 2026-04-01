/**
 * main.js
 * Punto de entrada del visualizer.
 * Orquesta controles, estado global, y conecta los módulos.
 */

import { loadIframe, loadScreenshot, loadImageFile } from "./source.js";
import { exportImage } from "./export.js";

// ─── Helpers DOM ────────────────────────────────────────

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ─── Estado global ──────────────────────────────────────

let currentStyle = "windows";
let loadedImage = null;   // HTMLImageElement o null
let loadedNavicon = null; // HTMLImageElement o null (favicon del sitio)
let currentMode = "empty"; // "empty" | "iframe" | "screenshot" | "image"
let currentW = 1440;
let currentH = 900;
let currentMult = 1;
let currentFormat = "webp"; // "png" | "webp"
let currentQuality = 0.85;
let captureStream = null;  // MediaStream de Screen Capture API

// ─── Refs DOM ───────────────────────────────────────────

const frameContainer = $("#frame-container");
const frameBody = $("#frame-body");
const frameImg = $("#frame-img");
const frameIframe = $("#frame-iframe");
const frameEmpty = $("#frame-empty");
const frameUrl = $("#frame-url");
const urlInput = $("#url-input");
const frameNavicon = $("#frame-navicon");
const downloadBtn = $("#download-btn");
const downloadHint = $("#download-hint");
const shadowToggle = $("#shadow-toggle");
const dimW = $("#dim-w");
const dimH = $("#dim-h");
const dropZone = $("#drop-zone");
const fileInput = $("#file-input");
const fileNameEl = $("#file-name");

// ─── Estilos ────────────────────────────────────────────

$$(".style-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".style-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentStyle = btn.dataset.style;
    frameContainer.dataset.style = currentStyle;
    frameUrl.textContent = urlInput.value.replace(/^https?:\/\//, "") || "";
    applyShadow();
  });
});

// ─── Tabs fuente (URL / imagen) ─────────────────────────

$$(".source-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".source-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const source = tab.dataset.source;
    $("#source-url").hidden = source !== "url";
    $("#source-image").hidden = source !== "image";
  });
});

// ─── Helpers de modo ────────────────────────────────────

function showIframe() {
  frameIframe.hidden = false;
  frameImg.hidden = true;
  frameEmpty.hidden = true;
  frameBody.classList.remove("scrollable");
  currentMode = "iframe";
}

function showScreenshot() {
  frameIframe.hidden = true;
  frameIframe.src = "";
  frameImg.hidden = false;
  frameEmpty.hidden = true;
  frameBody.classList.add("scrollable");
  currentMode = "screenshot";
}

function showImage() {
  frameIframe.hidden = true;
  frameIframe.src = "";
  frameImg.hidden = false;
  frameEmpty.hidden = true;
  frameBody.classList.remove("scrollable");
  currentMode = "image";
}

// ─── Carga de URL (iframe + fallback screenshot) ────────

$("#load-url-btn").addEventListener("click", handleLoadURL);
urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleLoadURL(); });
urlInput.addEventListener("input", () => {
  frameUrl.textContent = urlInput.value.replace(/^https?:\/\//, "");
});

async function handleLoadURL() {
  let url = urlInput.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  urlInput.value = url;

  // Preparar UI
  loadedImage = null;
  frameUrl.textContent = url.replace(/^https?:\/\//, "");
  downloadBtn.disabled = true;
  downloadHint.textContent = "cargando...";
  downloadHint.hidden = false;

  // Cargar favicon del sitio
  loadNavicon(url);
  applyDimensions();

  // 1. Intentar iframe
  showIframe();
  const iframeOk = await loadIframe(frameIframe, url);

  if (iframeOk) {
    // Iframe funciona — pedir Screen Capture para poder capturar hovers
    downloadBtn.disabled = false;
    if (!captureStream) {
      downloadHint.textContent = "activa compartir pestaña para capturar hovers";
      downloadHint.hidden = false;
      await initScreenCapture();
    }
    downloadHint.textContent = captureStream ? "navega, haz hover y descarga" : "navega y descarga (sin hovers)";
    downloadHint.hidden = false;
    applyShadow();
    return;
  }

  // 2. Fallback: screenshot full-page (scrollable)
  downloadHint.textContent = "iframe bloqueado, capturando screenshot...";
  showScreenshot();

  const { image, canExport, error } = await loadScreenshot(url, currentW, currentH, true);

  if (image) {
    frameImg.src = image.src;
    if (canExport) {
      loadedImage = image;
      downloadBtn.disabled = false;
      downloadHint.textContent = "haz scroll para elegir zona";
      downloadHint.hidden = false;
    } else {
      downloadHint.textContent = "usa ⌘⇧4 para capturar el frame";
    }
  } else {
    downloadHint.textContent = error ? `error: ${error}` : "error al capturar — prueba otra URL";
  }

  applyShadow();
}

// ─── Subida de imagen ───────────────────────────────────

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith("image/")) handleImageFile(file);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleImageFile(fileInput.files[0]);
});

async function handleImageFile(file) {
  const img = await loadImageFile(file);
  loadedImage = img;
  frameImg.src = img.src;
  showImage();
  frameUrl.textContent = file.name;
  fileNameEl.textContent = file.name;
  downloadBtn.disabled = false;
  downloadHint.hidden = true;
  applyDimensions();
  applyShadow();
}

// ─── Navicon (favicon del sitio) ────────────────────────

function loadNavicon(url) {
  try {
    const domain = new URL(url).hostname;
    const faviconUrl = `https://favicone.com/${domain}?s=32`;

    // Preview HTML
    frameNavicon.src = faviconUrl;

    // Canvas export: fetch + blob (favicone.com soporta CORS)
    fetch(faviconUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { loadedNavicon = img; };
        img.onerror = () => { loadedNavicon = null; };
        img.src = blobUrl;
      })
      .catch(() => { loadedNavicon = null; });
  } catch {
    loadedNavicon = null;
    frameNavicon.removeAttribute("src");
  }
}

// ─── Sombra ─────────────────────────────────────────────

shadowToggle.addEventListener("change", applyShadow);

function applyShadow() {
  if (currentStyle === "neu") {
    frameContainer.classList.remove("with-shadow");
  } else {
    frameContainer.classList.toggle("with-shadow", shadowToggle.checked);
  }
}

// ─── Proporciones / Dimensiones ─────────────────────────

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
  const pad = window.innerWidth <= 768 ? 40 : 80;
  const maxPreviewW = Math.min(900, window.innerWidth - pad);
  const scale = Math.min(1, maxPreviewW / currentW);

  // El contenedor visual tiene el tamaño escalado
  frameBody.style.width = Math.round(currentW * scale) + "px";
  frameBody.style.height = Math.round(currentH * scale) + "px";

  // El iframe se renderiza al tamaño real y se escala con CSS transform
  frameIframe.style.width = currentW + "px";
  frameIframe.style.height = currentH + "px";
  frameIframe.style.transform = `scale(${scale})`;
  frameIframe.style.transformOrigin = "top left";
}

window.addEventListener("resize", applyDimensions);

// ─── Multiplicador ──────────────────────────────────────

$$(".mult-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".mult-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMult = parseInt(btn.dataset.mult);
  });
});

// ─── Formato (PNG / WebP) + Calidad ─────────────────────

const qualitySelect = $("#quality-select");

$$(".format-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".format-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFormat = btn.dataset.format;
    qualitySelect.disabled = currentFormat === "png";
  });
});

qualitySelect.addEventListener("change", () => {
  currentQuality = parseFloat(qualitySelect.value);
});

// ─── Screen Capture (captura real con hovers) ───────────

async function initScreenCapture() {
  if (captureStream) return true; // ya activo
  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      preferCurrentTab: true,
    });
    // Si el usuario para de compartir, limpiar
    captureStream.getVideoTracks()[0].onended = () => { captureStream = null; };
    return true;
  } catch {
    captureStream = null;
    return false;
  }
}

async function captureScreenFrame() {
  if (!captureStream) return null;
  const track = captureStream.getVideoTracks()[0];
  if (!track || track.readyState !== "live") { captureStream = null; return null; }

  try {
    // Crear video element para extraer frame, con timeout de 3s
    const video = document.createElement("video");
    video.srcObject = captureStream;
    video.muted = true;
    video.playsInline = true;

    await Promise.race([
      video.play(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);

    // Esperar 2 frames para asegurar que el video tiene datos
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    if (!video.videoWidth || !video.videoHeight) {
      video.pause(); video.srcObject = null;
      return null;
    }

    // Capturar frame en canvas
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    video.pause();
    video.srcObject = null;

    // Recortar al área del frame-container
    const dpr = window.devicePixelRatio || 1;
    const rect = frameContainer.getBoundingClientRect();
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    const cropX = Math.round((rect.left + scrollX) * dpr);
    const cropY = Math.round((rect.top + scrollY) * dpr);
    const cropW = Math.round(rect.width * dpr);
    const cropH = Math.round(rect.height * dpr);

    // Canvas final con el crop escalado al multiplicador
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = Math.round(cropW * currentMult / dpr);
    finalCanvas.height = Math.round(cropH * currentMult / dpr);
    const fCtx = finalCanvas.getContext("2d");
    fCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, finalCanvas.width, finalCanvas.height);

    return finalCanvas;
  } catch {
    return null;
  }
}

// ─── Countdown ──────────────────────────────────────────

const frameCountdown = $("#frame-countdown");

function countdown(seconds) {
  return new Promise((resolve) => {
    frameCountdown.classList.add("active");
    frameCountdown.textContent = seconds;
    let remaining = seconds;
    const tick = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(tick);
        frameCountdown.classList.remove("active");
        resolve();
      } else {
        frameCountdown.textContent = remaining;
      }
    }, 1000);
  });
}

// ─── Descarga ───────────────────────────────────────────

downloadBtn.addEventListener("click", async () => {
  downloadBtn.disabled = true;
  const urlText = urlInput.value.replace(/^https?:\/\//, "") || "";

  try {
  if (currentMode === "iframe") {
    // Countdown para posicionar hovers
    await countdown(3);

    downloadHint.textContent = "capturando...";
    downloadHint.hidden = false;

    // Intentar Screen Capture (captura real con hovers)
    if (captureStream) {
      const canvas = await captureScreenFrame();
      if (canvas) {
        const mime = currentFormat === "webp" ? "image/webp" : "image/png";
        const ext = currentFormat === "webp" ? "webp" : "png";
        const quality = currentFormat === "webp" ? currentQuality : undefined;
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `frame-${currentStyle}-${currentMult}x.${ext}`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }, mime, quality);
        downloadHint.hidden = true;
        downloadBtn.disabled = false;
        return;
      }
    }

    // Fallback: Microlink + canvas frame (sin hovers)
    downloadHint.textContent = "capturando via microlink...";
    const { image, error } = await loadScreenshot(urlInput.value, currentW, currentH, false);
    if (image) {
      exportImage(image, currentStyle, currentMult, shadowToggle.checked, urlText, currentFormat, currentQuality, loadedNavicon);
      downloadHint.hidden = true;
    } else {
      downloadHint.textContent = error ? `error: ${error}` : "error al capturar";
    }
  } else if (currentMode === "screenshot" && loadedImage) {
    // Screenshot scrollable: crop zona visible
    const scrollTop = frameBody.scrollTop;
    const visibleH = frameBody.clientHeight;
    const imgDisplayW = frameImg.clientWidth;
    const ratio = loadedImage.naturalWidth / imgDisplayW;

    const crop = {
      sx: 0,
      sy: Math.round(scrollTop * ratio),
      sw: loadedImage.naturalWidth,
      sh: Math.round(visibleH * ratio),
    };

    exportImage(loadedImage, currentStyle, currentMult, shadowToggle.checked, urlText, currentFormat, currentQuality, loadedNavicon, crop);
    downloadHint.hidden = true;
  } else if (loadedImage) {
    // Imagen subida: exportar normal
    exportImage(loadedImage, currentStyle, currentMult, shadowToggle.checked, urlText, currentFormat, currentQuality, loadedNavicon);
    downloadHint.hidden = true;
  }

  } catch (e) {
    downloadHint.textContent = `error: ${e.message || "fallo al capturar"}`;
    downloadHint.hidden = false;
  }

  downloadBtn.disabled = false;
});

// ─── Init ───────────────────────────────────────────────

applyDimensions();
