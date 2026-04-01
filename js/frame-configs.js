/**
 * frame-configs.js — Visual config for each browser frame style.
 * Used by canvas-draw.js for export rendering.
 */

const BASE = {
  dots: true,
  showUrl: true,
  dotSize: 12,
  borderW: 1,
  radius: 8,
};

export function getFrameConfig(style, imgW, imgH) {
  /** Offset for Neu's box-shadow (5px visual offset drawn in canvas) */
  const NEU_SHADOW = 5;

  const configs = {
    macos: {
      ...BASE,
      barH: 38, totalW: imgW, totalH: imgH + 38,
      barBg: "#e8e8e8", borderColor: "#d0d0d0",
      urlStyle: "pill",
    },

    glass: {
      ...BASE,
      barH: 40, totalW: imgW, totalH: imgH + 40, radius: 14,
      barBg: "rgba(245,245,247,0.85)", borderColor: "rgba(0,0,0,0.1)",
      dotSize: 11, urlStyle: "glass-pill",
    },

    windows: {
      ...BASE,
      barH: 36, totalW: imgW, totalH: imgH + 36,
      barBg: "#f3f3f3", borderColor: "#e0e0e0",
      dots: false, urlStyle: "win-pill",
      showClose: true, closeStyle: "windows",
    },

    pixel: {
      ...BASE,
      barH: 42, totalW: imgW, totalH: imgH + 42, radius: 12,
      barBg: "#ffffff", borderColor: "#e0e0e0",
      dots: false, urlStyle: "pixel-pill",
    },

    dots: {
      ...BASE,
      barH: 32, totalW: imgW, totalH: imgH + 32,
      barBg: "#f0f0f0", borderColor: "#d0d0d0", dotSize: 10,
      showUrl: false,
    },

    gx: {
      ...BASE,
      barH: 38, totalW: imgW, totalH: imgH + 38,
      barBg: "#111118", borderColor: "rgba(224,25,58,0.5)", bodyBg: "#0d0d12",
      dotSize: 10, urlStyle: "gx",
      dotColors: ["rgba(224,25,58,0.8)", "rgba(224,25,58,0.4)", "rgba(224,25,58,0.2)"],
    },

    neu: {
      ...BASE,
      barH: 38,
      totalW: imgW + NEU_SHADOW,
      totalH: imgH + 38 + NEU_SHADOW,
      radius: 4,
      barBg: "#ffe566", borderColor: "#000", borderW: 2.5,
      dotSize: 13, urlStyle: "neu",
      boxShadow: true, neuDots: true,
    },

    dia: {
      ...BASE,
      barH: 42, totalW: imgW, totalH: imgH + 42, radius: 12,
      barBg: "#ffffff", borderColor: "rgba(0,0,0,0.12)", borderW: 0.5,
      dotSize: 10,
      dotAlpha: 0, // Invisible by default, visible on hover (CSS only)
      urlStyle: "dia",
    },
  };

  return configs[style] || configs.windows;
}
