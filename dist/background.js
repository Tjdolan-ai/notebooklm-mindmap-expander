"use strict";
(() => {
  // src/background.ts
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      const url = chrome.runtime.getURL("welcome.html");
      chrome.tabs.create({ url });
    }
  });
})();
