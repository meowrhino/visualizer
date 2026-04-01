/**
 * content.js
 * Inyecta el ID de la extensión en el DOM para que la web app lo detecte.
 */

const el = document.createElement("div");
el.id = "visualizer-ext-id";
el.style.display = "none";
el.textContent = chrome.runtime.id;
document.documentElement.appendChild(el);
