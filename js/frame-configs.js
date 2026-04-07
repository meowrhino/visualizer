/**
 * frame-configs.js — Visual config for browser frame.
 * Only Windows style active for now.
 */

export function getFrameConfig(style, imgW, imgH) {
  // Windows — only active style
  return {
    barH: 68,
    totalW: imgW,
    totalH: imgH + 68,
    radius: 8,
    barBg: "#f3f3f3",
    borderColor: "#e0e0e0",
    borderW: 1,
    bodyBg: "#fff",
  };
}
