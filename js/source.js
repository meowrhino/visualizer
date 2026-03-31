/**
 * source.js
 * Carga de contenido: URLs via microlink.io y subida de imágenes (drag & drop / file input).
 */

/**
 * Carga un screenshot de una URL usando microlink.io (gratis, sin API key, con CORS).
 * Devuelve la imagen y si es exportable via canvas.
 *
 * @param {string} rawUrl — URL introducida por el usuario
 * @param {number} viewportW — ancho del viewport para la captura
 * @param {number} viewportH — alto del viewport para la captura
 * @returns {Promise<{image: HTMLImageElement|null, canExport: boolean}>}
 */
export function loadScreenshot(rawUrl, viewportW, viewportH) {
  let url = rawUrl.trim();
  if (!url) return Promise.resolve({ image: null, canExport: false });
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const params = new URLSearchParams({
    url,
    screenshot: "true",
    meta: "false",
    "embed": "screenshot.url",
    "viewport.width": viewportW,
    "viewport.height": viewportH,
    "viewport.deviceScaleFactor": 1,
  });
  const apiUrl = `https://api.microlink.io?${params}`;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ image: img, canExport: true });
    img.onerror = () => resolve({ image: null, canExport: false });
    img.src = apiUrl;
  });
}

/**
 * Lee un archivo de imagen del sistema y lo devuelve como HTMLImageElement.
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFile(file) {
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
