/**
 * source.js
 * Carga de contenido: URLs via iframe, microlink.io screenshots, y subida de imágenes.
 */

/**
 * Intenta cargar una URL en un iframe. Detecta bloqueo via timeout.
 * @param {HTMLIFrameElement} iframe
 * @param {string} rawUrl
 * @param {number} timeoutMs — ms antes de considerar fallido (default 3000)
 * @returns {Promise<boolean>} — true si cargo, false si bloqueado/error
 */
export function loadIframe(iframe, rawUrl, timeoutMs = 3000) {
  let url = rawUrl.trim();
  if (!url) return Promise.resolve(false);
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  return new Promise((resolve) => {
    let resolved = false;
    const done = (ok) => { if (!resolved) { resolved = true; resolve(ok); } };

    const timer = setTimeout(() => {
      // Timeout: verificar si el iframe cargo algo accesible
      try {
        // Si podemos acceder al contentDocument, cargo correctamente
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body && doc.body.innerHTML.length > 0) {
          done(true);
        } else {
          done(false);
        }
      } catch {
        // Cross-origin: el iframe cargo pero no podemos leerlo → éxito
        done(true);
      }
    }, timeoutMs);

    iframe.onload = () => {
      clearTimeout(timer);
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        // Si es una pagina de error vacia o about:blank
        if (doc && doc.body && doc.body.innerHTML.length === 0) {
          done(false);
        } else {
          done(true);
        }
      } catch {
        // Cross-origin load → éxito
        done(true);
      }
    };

    iframe.onerror = () => {
      clearTimeout(timer);
      done(false);
    };

    iframe.src = url;
  });
}

/**
 * Carga un screenshot full-page de una URL usando microlink.io.
 * @param {string} rawUrl
 * @param {number} viewportW
 * @param {number} viewportH
 * @param {boolean} fullPage — si true, captura toda la pagina (scrollable)
 * @returns {Promise<{image: HTMLImageElement|null, canExport: boolean, error: string|null}>}
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

  const apiUrl = `https://api.microlink.io?${params}`;

  try {
    const res = await fetch(apiUrl);
    const json = await res.json();

    if (json.status !== "success" || !json.data?.screenshot?.url) {
      const msg = json.message || json.status || "error desconocido";
      return { image: null, canExport: false, error: msg };
    }

    const screenshotUrl = json.data.screenshot.url;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ image: img, canExport: true, error: null });
      img.onerror = () => resolve({ image: null, canExport: false, error: "no se pudo cargar la imagen" });
      img.src = screenshotUrl;
    });
  } catch (e) {
    return { image: null, canExport: false, error: e.message || "error de red" };
  }
}

/**
 * Lee un archivo de imagen del sistema y lo devuelve como HTMLImageElement.
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFile(file) {
  if (file.size > 20 * 1024 * 1024) {
    return Promise.reject(new Error("imagen demasiado grande (max 20 MB)"));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
