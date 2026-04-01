/**
 * source.js — Loading content: URLs via iframe/microlink, image upload.
 */

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * Try loading a URL in an iframe. Returns true if loaded, false if blocked.
 */
export function loadIframe(iframe, rawUrl, timeoutMs = 3000) {
  let url = rawUrl.trim();
  if (!url) return Promise.resolve(false);
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok); } };

    const timer = setTimeout(() => {
      try {
        iframe.contentDocument; // cross-origin = success (loaded but can't read)
        finish(false);          // same-origin empty = fail
      } catch { finish(true); } // cross-origin = loaded OK
    }, timeoutMs);

    iframe.onload = () => {
      clearTimeout(timer);
      try {
        const doc = iframe.contentDocument;
        finish(doc?.body?.innerHTML.length > 0);
      } catch { finish(true); } // cross-origin = loaded OK
    };

    iframe.onerror = () => { clearTimeout(timer); finish(false); };
    iframe.src = url;
  });
}

/**
 * Capture a screenshot via microlink.io API.
 * @param {boolean} fullPage - Capture entire page (for scrollable mode)
 */
export async function loadScreenshot(rawUrl, viewportW, viewportH, fullPage = false) {
  let url = rawUrl.trim();
  if (!url) return { image: null, canExport: false, error: null };
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const params = new URLSearchParams({
    url,
    screenshot: "true",
    meta: "false",
    "viewport.width": viewportW,
    "viewport.height": viewportH,
    "viewport.deviceScaleFactor": 1,
    waitForTimeout: 8000,
  });
  if (fullPage) params.set("screenshot.fullPage", "true");

  try {
    const res = await fetch(`https://api.microlink.io?${params}`);
    const json = await res.json();

    if (json.status !== "success" || !json.data?.screenshot?.url) {
      return { image: null, canExport: false, error: json.message || json.status || "error desconocido" };
    }

    return loadImageFromUrl(json.data.screenshot.url);
  } catch (e) {
    return { image: null, canExport: false, error: e.message || "error de red" };
  }
}

/**
 * Load an image from a URL with CORS.
 */
function loadImageFromUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ image: img, canExport: true, error: null });
    img.onerror = () => resolve({ image: null, canExport: false, error: "no se pudo cargar la imagen" });
    img.src = url;
  });
}

/**
 * Load a local image file. Uses createObjectURL (more efficient than dataURL).
 */
export function loadImageFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error("imagen demasiado grande (max 20 MB)"));
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("no se pudo leer la imagen")); };
    img.src = url;
  });
}
