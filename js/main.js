/**
 * main.js — Punto de entrada del visualizer.
 * Orquesta controles, estado, extensión y descarga.
 */

import { loadIframe, loadScreenshot, loadImageFile } from "./source.js";
import { exportImage } from "./export.js";

// ─── Helpers ────────────────────────────────────────────

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ─── State ──────────────────────────────────────────────

const state = {
  style: "windows",
  mode: "empty",       // "empty" | "iframe" | "screenshot" | "image"
  image: null,         // HTMLImageElement (screenshot/upload)
  navicon: null,       // HTMLImageElement (favicon for canvas export)
  extensionId: null,   // Chrome extension ID
  w: 1440,
  h: 900,
  mult: 1,
  format: "webp",
  quality: 0.85,
};

// ─── DOM refs ───────────────────────────────────────────

const dom = {
  frameContainer: $("#frame-container"),
  frameBody:      $("#frame-body"),
  frameImg:       $("#frame-img"),
  frameIframe:    $("#frame-iframe"),
  frameEmpty:     $("#frame-empty"),
  frameUrl:       $("#frame-url"),
  frameNavicon:   $("#frame-navicon"),
  frameCountdown: $("#frame-countdown"),
  urlInput:       $("#url-input"),
  downloadBtn:    $("#download-btn"),
  downloadHint:   $("#download-hint"),
  shadowToggle:   $("#shadow-toggle"),
  dimW:           $("#dim-w"),
  dimH:           $("#dim-h"),
  dropZone:       $("#drop-zone"),
  fileInput:      $("#file-input"),
  fileNameEl:     $("#file-name"),
  qualitySelect:  $("#quality-select"),
  extStatus:      $("#ext-status"),
};

// ─── Style toggles ──────────────────────────────────────

$$("[data-style]").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$("[data-style]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.style = btn.dataset.style;
    dom.frameContainer.dataset.style = state.style;
    dom.frameUrl.textContent = dom.urlInput.value.replace(/^https?:\/\//, "") || "";
    applyShadow();
  });
});

// ─── Source tabs ────────────────────────────────────────

$$(".source-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".source-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const source = tab.dataset.source;
    $("#source-url").hidden = source !== "url";
    $("#source-image").hidden = source !== "image";
  });
});

// ─── Mode helpers ───────────────────────────────────────

function setMode(mode) {
  state.mode = mode;
  dom.frameEmpty.hidden   = mode !== "empty";
  dom.frameImg.hidden     = mode !== "screenshot" && mode !== "image";
  dom.frameIframe.hidden  = mode !== "iframe";
  dom.frameBody.classList.toggle("scrollable", mode === "screenshot");

  if (mode !== "iframe") {
    dom.frameIframe.src = "";
  }
}

// ─── URL loading ────────────────────────────────────────

$("#load-url-btn").addEventListener("click", handleLoadURL);
dom.urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleLoadURL(); });
dom.urlInput.addEventListener("input", () => {
  dom.frameUrl.textContent = dom.urlInput.value.replace(/^https?:\/\//, "");
});

async function handleLoadURL() {
  let url = dom.urlInput.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  dom.urlInput.value = url;

  // Reset
  state.image = null;
  dom.frameUrl.textContent = url.replace(/^https?:\/\//, "");
  dom.downloadBtn.disabled = true;
  showHint("cargando...");

  loadNavicon(url);
  applyDimensions();

  // 1. Try iframe
  setMode("iframe");
  const iframeOk = await loadIframe(dom.frameIframe, url);

  if (iframeOk) {
    dom.downloadBtn.disabled = false;
    if (!state.extensionId) await detectExtension();
    showHint(state.extensionId
      ? "navega, haz hover y descarga"
      : "sin extensión — descarga via microlink");
    applyShadow();
    return;
  }

  // 2. Fallback: full-page screenshot
  showHint("iframe bloqueado, capturando...");
  setMode("screenshot");

  const { image, canExport, error } = await loadScreenshot(url, state.w, state.h, true);

  if (image && canExport) {
    dom.frameImg.src = image.src;
    state.image = image;
    dom.downloadBtn.disabled = false;
    showHint("haz scroll para elegir zona");
  } else {
    showHint(error ? `error: ${error}` : "error al capturar");
  }

  applyShadow();
}

// ─── Image upload ───────────────────────────────────────

dom.dropZone.addEventListener("click", () => dom.fileInput.click());
dom.dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dom.dropZone.classList.add("dragover"); });
dom.dropZone.addEventListener("dragleave", () => dom.dropZone.classList.remove("dragover"));
dom.dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dom.dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith("image/")) handleImageFile(file);
});
dom.fileInput.addEventListener("change", () => {
  if (dom.fileInput.files[0]) handleImageFile(dom.fileInput.files[0]);
});

async function handleImageFile(file) {
  const img = await loadImageFile(file);
  state.image = img;
  dom.frameImg.src = img.src;
  setMode("image");
  dom.frameUrl.textContent = file.name;
  dom.fileNameEl.textContent = file.name;
  dom.downloadBtn.disabled = false;
  hideHint();
  applyDimensions();
  applyShadow();
}

// ─── Navicon (site favicon) ─────────────────────────────

let naviconBlobUrl = null;

function loadNavicon(url) {
  // Clean up previous blob URL
  if (naviconBlobUrl) { URL.revokeObjectURL(naviconBlobUrl); naviconBlobUrl = null; }

  try {
    const domain = new URL(url).hostname;
    const faviconUrl = `https://favicone.com/${domain}?s=32`;

    dom.frameNavicon.src = faviconUrl;

    // Fetch as blob for canvas export (favicone.com supports CORS)
    fetch(faviconUrl)
      .then((r) => r.blob())
      .then((blob) => {
        naviconBlobUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { state.navicon = img; };
        img.onerror = () => { state.navicon = null; };
        img.src = naviconBlobUrl;
      })
      .catch(() => { state.navicon = null; });
  } catch {
    state.navicon = null;
    dom.frameNavicon.removeAttribute("src");
  }
}

// ─── Shadow ─────────────────────────────────────────────

dom.shadowToggle.addEventListener("change", applyShadow);

function applyShadow() {
  const on = state.style !== "neu" && dom.shadowToggle.checked;
  dom.frameContainer.classList.toggle("with-shadow", on);
}

// ─── Dimensions ─────────────────────────────────────────

$$(".ratio-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".ratio-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.w = parseInt(btn.dataset.w);
    state.h = parseInt(btn.dataset.h);
    dom.dimW.value = state.w;
    dom.dimH.value = state.h;
    applyDimensions();
  });
});

dom.dimW.addEventListener("change", () => {
  state.w = parseInt(dom.dimW.value) || 1440;
  $$(".ratio-btn").forEach((b) => b.classList.remove("active"));
  applyDimensions();
});

dom.dimH.addEventListener("change", () => {
  state.h = parseInt(dom.dimH.value) || 900;
  $$(".ratio-btn").forEach((b) => b.classList.remove("active"));
  applyDimensions();
});

function applyDimensions() {
  const pad = window.innerWidth <= 768 ? 40 : 80;
  const maxW = Math.min(900, window.innerWidth - pad);
  const scale = Math.min(1, maxW / state.w);

  dom.frameBody.style.width  = Math.round(state.w * scale) + "px";
  dom.frameBody.style.height = Math.round(state.h * scale) + "px";

  // Iframe renders at real size, CSS-scaled to fit preview
  dom.frameIframe.style.width  = state.w + "px";
  dom.frameIframe.style.height = state.h + "px";
  dom.frameIframe.style.transform = `scale(${scale})`;
  dom.frameIframe.style.transformOrigin = "top left";
}

window.addEventListener("resize", applyDimensions);

// ─── Multiplier ─────────────────────────────────────────

$$(".mult-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".mult-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.mult = parseInt(btn.dataset.mult);
  });
});

// ─── Format & quality ───────────────────────────────────

$$(".format-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".format-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.format = btn.dataset.format;
    dom.qualitySelect.disabled = state.format === "png";
  });
});

dom.qualitySelect.addEventListener("change", () => {
  state.quality = parseFloat(dom.qualitySelect.value);
});

// ─── Chrome Extension ───────────────────────────────────

async function detectExtension() {
  // Content script injects extension ID into DOM
  const el = document.getElementById("visualizer-ext-id");
  if (el) {
    state.extensionId = el.textContent.trim();
    updateExtBadge(true);
    return true;
  }
  updateExtBadge(false);
  return false;
}

function updateExtBadge(installed) {
  if (dom.extStatus) {
    dom.extStatus.textContent = installed
      ? "extensión activa — capturas con hovers"
      : "sin extensión — capturas via microlink";
  }
}

/**
 * Capture visible tab via extension, crop to iframe, return HTMLImageElement.
 */
function captureViaExtension() {
  if (!state.extensionId || typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000);

    try {
      chrome.runtime.sendMessage(state.extensionId, { action: "captureTab" }, (resp) => {
        clearTimeout(timeout);
        if (!resp?.dataUrl) { resolve(null); return; }

        const fullImg = new Image();
        fullImg.onload = () => {
          // Crop to frameBody area (iframe content only)
          const rect = dom.frameBody.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;

          const canvas = document.createElement("canvas");
          canvas.width = state.w;
          canvas.height = state.h;
          canvas.getContext("2d").drawImage(
            fullImg,
            Math.round(rect.left * dpr), Math.round(rect.top * dpr),
            Math.round(rect.width * dpr), Math.round(rect.height * dpr),
            0, 0, state.w, state.h
          );

          const out = new Image();
          out.onload = () => resolve(out);
          out.onerror = () => resolve(null);
          out.src = canvas.toDataURL();
        };
        fullImg.onerror = () => { clearTimeout(timeout); resolve(null); };
        fullImg.src = resp.dataUrl;
      });
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

// ─── Countdown ──────────────────────────────────────────

function countdown(seconds) {
  return new Promise((resolve) => {
    dom.frameCountdown.classList.add("active");
    dom.frameCountdown.textContent = seconds;
    let remaining = seconds;
    const tick = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(tick);
        dom.frameCountdown.classList.remove("active");
        dom.frameCountdown.textContent = "";
        resolve();
      } else {
        dom.frameCountdown.textContent = remaining;
      }
    }, 1000);
  });
}

// ─── Hint helpers ───────────────────────────────────────

function showHint(text) { dom.downloadHint.textContent = text; dom.downloadHint.hidden = false; }
function hideHint() { dom.downloadHint.hidden = true; }

// ─── Download ───────────────────────────────────────────

dom.downloadBtn.addEventListener("click", async () => {
  dom.downloadBtn.disabled = true;
  const urlText = dom.urlInput.value.replace(/^https?:\/\//, "") || "";

  try {
    if (state.mode === "iframe") {
      await handleIframeDownload(urlText);
    } else if (state.mode === "screenshot" && state.image) {
      handleScrollableDownload(urlText);
    } else if (state.image) {
      doExport(state.image, urlText);
      hideHint();
    }
  } catch (e) {
    showHint(`error: ${e.message || "fallo al capturar"}`);
  }

  dom.downloadBtn.disabled = false;
});

async function handleIframeDownload(urlText) {
  await countdown(3);
  showHint("capturando...");

  let contentImage = null;

  // 1. Extension (real capture with hovers)
  if (state.extensionId) {
    contentImage = await captureViaExtension();
  }

  // 2. Fallback: Microlink (no hovers)
  if (!contentImage) {
    showHint("capturando via microlink...");
    const result = await loadScreenshot(dom.urlInput.value, state.w, state.h, false);
    if (result.image) contentImage = result.image;
  }

  if (contentImage) {
    doExport(contentImage, urlText);
    hideHint();
  } else {
    showHint("error al capturar contenido");
  }
}

function handleScrollableDownload(urlText) {
  const scrollTop = dom.frameBody.scrollTop;
  const visibleH = dom.frameBody.clientHeight;
  const ratio = state.image.naturalWidth / dom.frameImg.clientWidth;

  const crop = {
    sx: 0,
    sy: Math.round(scrollTop * ratio),
    sw: state.image.naturalWidth,
    sh: Math.round(visibleH * ratio),
  };

  doExport(state.image, urlText, crop);
  hideHint();
}

function doExport(image, urlText, crop) {
  exportImage(image, state.style, state.mult, dom.shadowToggle.checked,
    urlText, state.format, state.quality, state.navicon, crop);
}

// ─── Init ───────────────────────────────────────────────

applyDimensions();
detectExtension();
