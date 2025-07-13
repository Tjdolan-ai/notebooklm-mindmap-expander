"use strict";
(() => {
  // src/expander.ts
  var DEBOUNCE_MS = 200;
  var EXPAND_LABEL = "Expand";
  var COLLAPSE_LABEL = "Collapse";
  var debouncedTimeout = null;
  var lastContainer = null;
  function hasDOM() {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }
  function expandAll() {
    if (!hasDOM()) return;
    if (!ensureContainer()) return;
    if (tryToolbarExpand()) return;
    walkAndToggle(EXPAND_LABEL);
  }
  function collapseAll() {
    if (!hasDOM()) return;
    if (!ensureContainer()) return;
    if (tryToolbarCollapse()) return;
    walkAndToggle(COLLAPSE_LABEL);
  }
  function ensureContainer() {
    if (lastContainer && document.contains(lastContainer)) return true;
    const candidate = document.querySelector('div[class^="MindMapViewer"]');
    if (!candidate) return false;
    lastContainer = candidate;
    return true;
  }
  function tryToolbarExpand() {
    const button = document.querySelector('button[aria-label*="open"][role="button"],button[aria-label*="Expand all"][role="button"]');
    if (button) {
      button.click();
      return true;
    }
    return false;
  }
  function tryToolbarCollapse() {
    const button = document.querySelector('button[aria-label*="close"][role="button"],button[aria-label*="Collapse all"][role="button"]');
    if (button) {
      button.click();
      return true;
    }
    return false;
  }
  function walkAndToggle(labelPrefix) {
    const seen = /* @__PURE__ */ new Set();
    let didWork = true;
    while (didWork) {
      didWork = false;
      const buttons = Array.from(document.querySelectorAll(`button[aria-label^="${labelPrefix}"][role="button"]`));
      for (const btn of buttons) {
        const id = btn.id || btn.getAttribute("data-node-id") || Math.random().toString(36);
        if (seen.has(id)) continue;
        btn.click();
        seen.add(id);
        didWork = true;
      }
    }
  }
  function injectToggle() {
    if (document.getElementById("nlm-expander-toggle")) return;
    if (!ensureContainer()) return;
    const wrapper = document.createElement("div");
    wrapper.id = "nlm-expander-toggle";
    Object.assign(wrapper.style, {
      position: "absolute",
      top: "8px",
      right: "8px",
      zIndex: "10000",
      fontSize: "14px",
      userSelect: "none",
      cursor: "pointer"
    });
    wrapper.textContent = "\u{1F333}";
    wrapper.title = "Expand / Collapse";
    let expanded = false;
    wrapper.addEventListener("click", () => {
      expanded ? collapseAll() : expandAll();
      expanded = !expanded;
      wrapper.textContent = expanded ? "\u{1F332}" : "\u{1F333}";
    });
    lastContainer.appendChild(wrapper);
  }
  function observeMindMap() {
    if (!hasDOM() || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      if (debouncedTimeout) clearTimeout(debouncedTimeout);
      debouncedTimeout = window.setTimeout(() => {
        if (!ensureContainer()) return;
        injectToggle();
        expandAll();
      }, DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      injectToggle();
      expandAll();
    }, 1e3);
  }
  function registerHotkeys() {
    window.addEventListener("keydown", (e) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.code === "KeyE") {
        e.preventDefault();
        expandAll();
      } else if (e.code === "KeyC") {
        e.preventDefault();
        collapseAll();
      }
    });
  }
  if (hasDOM()) {
    observeMindMap();
    registerHotkeys();
  }
})();
