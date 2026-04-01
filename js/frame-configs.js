/**
 * frame-configs.js
 * Definiciones visuales de los 8 estilos de browser frame para exportación canvas.
 * Cada config describe: barra, dots, URL, bordes, sombras, etc.
 */

const BASE = { dots: true, showUrl: true, dotSize: 12, borderW: 1, radius: 8 };

export function getFrameConfig(style, imgW, imgH) {
  const configs = {

    /* macOS — Barra gris, dots clásicos, URL en pill translúcida */
    macos: {
      ...BASE,
      barH: 38, totalW: imgW, totalH: imgH + 38,
      barBg: "#e8e8e8", borderColor: "#d0d0d0",
      urlStyle: "pill",
    },

    /* Glass — Apple Liquid Glass (2025), backdrop-blur, borde semitransparente */
    glass: {
      ...BASE,
      barH: 40, totalW: imgW, totalH: imgH + 40, radius: 14,
      barBg: "rgba(245,245,247,0.85)", borderColor: "rgba(0,0,0,0.1)",
      dotSize: 11, urlStyle: "glass-pill",
    },

    /* Windows — Edge/Chrome moderno, pill URL redondeada, botones min/max/close */
    windows: {
      ...BASE,
      barH: 36, totalW: imgW, totalH: imgH + 36, radius: 8,
      barBg: "#f3f3f3", borderColor: "#e0e0e0",
      dots: false, urlStyle: "win-pill",
      showClose: true, closeStyle: "windows",
    },

    /* Pixel — Chrome/Android, pill búsqueda con lupa */
    pixel: {
      ...BASE,
      barH: 42, totalW: imgW, totalH: imgH + 42, radius: 12,
      barBg: "#ffffff", borderColor: "#e0e0e0",
      dots: false, urlStyle: "pixel-pill",
    },

    /* Dots — Solo 3 puntos, ultra-minimal */
    dots: {
      ...BASE,
      barH: 32, totalW: imgW, totalH: imgH + 32,
      barBg: "#f0f0f0", borderColor: "#d0d0d0", dotSize: 10,
      showUrl: false,
    },

    /* GX — Opera GX gaming, fondo oscuro, neón rojo */
    gx: {
      ...BASE,
      barH: 38, totalW: imgW, totalH: imgH + 38, radius: 8,
      barBg: "#111118", borderColor: "rgba(224,25,58,0.5)", bodyBg: "#0d0d12",
      dotSize: 10, urlStyle: "gx",
      dotColors: ["rgba(224,25,58,0.8)", "rgba(224,25,58,0.4)", "rgba(224,25,58,0.2)"],
    },

    /* Neu — Neobrutalism, titlebar amarillo, borde negro, sombra offset */
    neu: {
      barH: 38, totalW: imgW + 5, totalH: imgH + 38 + 5, radius: 4,
      barBg: "#ffe566", borderColor: "#000", borderW: 2.5,
      dots: true, dotSize: 13, showUrl: true, urlStyle: "neu",
      boxShadow: true, neuDots: true,
    },

    /* Dia — Editorial/AI-minimalist, serif, bordes ultra-finos */
    dia: {
      ...BASE,
      barH: 42, totalW: imgW, totalH: imgH + 42, radius: 12,
      barBg: "#ffffff", borderColor: "rgba(0,0,0,0.12)", borderW: 0.5,
      dotSize: 10, dotAlpha: 0, urlStyle: "dia",
    },
  };

  return configs[style] || configs.windows;
}
