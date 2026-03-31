/**
 * convert.js
 * Conversión de canvas a diferentes formatos de imagen (PNG, WebP).
 * Inspirado en meowrhino/imgToWeb — usa canvas.toBlob() nativo del navegador.
 */

/**
 * Convierte un canvas a blob descargable.
 * @param {HTMLCanvasElement} canvas
 * @param {"png"|"webp"} format
 * @param {number} quality — calidad WebP (0.0 - 1.0), ignorado para PNG
 * @returns {Promise<{blob: Blob, ext: string}>}
 */
export function canvasToBlob(canvas, format = "png", quality = 0.85) {
  const mime = format === "webp" ? "image/webp" : "image/png";
  const ext = format === "webp" ? "webp" : "png";

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve({ blob, ext }),
      mime,
      format === "webp" ? quality : undefined
    );
  });
}

/**
 * Descarga un blob como archivo.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
