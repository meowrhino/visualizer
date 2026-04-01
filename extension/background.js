/**
 * background.js
 * Visualizer Screenshot Extension
 * Captura la pestaña actual y devuelve la imagen como dataURL.
 */

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.action !== "captureTab") return;

  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ dataUrl });
    }
  });

  // true = respuesta asíncrona
  return true;
});
