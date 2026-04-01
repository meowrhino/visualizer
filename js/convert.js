/**
 * convert.js — Canvas to blob conversion and file download.
 */

/**
 * Convert a canvas to a downloadable blob.
 */
export function canvasToBlob(canvas, format = "png", quality = 0.85) {
  const mime = format === "webp" ? "image/webp" : "image/png";
  const ext = format === "webp" ? "webp" : "png";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve({ blob, ext });
        else reject(new Error("canvas.toBlob returned null"));
      },
      mime,
      format === "webp" ? quality : undefined
    );
  });
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
