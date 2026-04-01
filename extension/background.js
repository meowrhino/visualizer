/**
 * background.js — Visualizer Screenshot Extension
 * Captures the visible tab and returns it as a dataURL.
 */

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const { action } = message || {};

  if (action === "ping") {
    sendResponse({ pong: true, version: chrome.runtime.getManifest().version });
    return;
  }

  if (action === "captureTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true; // async response
  }
});
