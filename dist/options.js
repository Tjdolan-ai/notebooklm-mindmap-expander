"use strict";
(() => {
  // src/options.ts
  var autoExpandCheckbox = document.getElementById("auto-expand");
  var hotkeysEnabledCheckbox = document.getElementById("hotkeys-enabled");
  var defaultDepthSelect = document.getElementById("default-depth");
  var themeSelect = document.getElementById("theme-select");
  var optionsForm = document.getElementById("options-form");
  var statusDiv = document.getElementById("status");
  chrome.storage.sync.get(["autoExpand", "hotkeysEnabled", "defaultDepth", "theme"], (result) => {
    autoExpandCheckbox.checked = result.autoExpand !== false;
    hotkeysEnabledCheckbox.checked = result.hotkeysEnabled !== false;
    if (defaultDepthSelect) {
      const depth = typeof result.defaultDepth === "number" ? result.defaultDepth.toString() : "0";
      defaultDepthSelect.value = depth;
    }
    if (themeSelect) {
      themeSelect.value = result.theme || "auto";
    }
  });
  optionsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const autoExpand = autoExpandCheckbox.checked;
    const hotkeysEnabled = hotkeysEnabledCheckbox.checked;
    const defaultDepth = parseInt(defaultDepthSelect.value, 10);
    const theme = themeSelect.value;
    chrome.storage.sync.set({ autoExpand, hotkeysEnabled, defaultDepth, theme }, () => {
      if (statusDiv) {
        statusDiv.textContent = "Options saved.";
        setTimeout(() => {
          statusDiv.textContent = "";
        }, 1500);
      }
    });
  });
})();
