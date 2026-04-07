/**
 * source.js — Image loading and URL metadata.
 */

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * Fetch page metadata (title) via Microlink API. Lightweight — no screenshot.
 */
export async function fetchPageMeta(rawUrl) {
  let url = rawUrl.trim();
  if (!url) return { title: null };
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const params = new URLSearchParams({ url, meta: "true" });

  try {
    const res = await fetch(`https://api.microlink.io?${params}`);
    const json = await res.json();

    if (json.status === "success" && json.data) {
      return { title: json.data.title || null };
    }
    return { title: null };
  } catch {
    return { title: null };
  }
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
