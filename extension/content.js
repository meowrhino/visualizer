/**
 * content.js — Injects extension ID + version into the page DOM
 * so the web app can detect and communicate with the extension.
 */

const el = document.createElement("div");
el.id = "visualizer-ext-id";
el.style.display = "none";
el.dataset.version = chrome.runtime.getManifest().version;
el.textContent = chrome.runtime.id;
document.documentElement.appendChild(el);
