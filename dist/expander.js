"use strict";
(() => {
  // src/expander.ts
  var CONFIG = {
    DEBOUNCE_MS: 200,
    CONTAINER_SELECTOR: 'div[class^="MindMapViewer"]',
    EXPAND_LABEL: "Expand",
    COLLAPSE_LABEL: "Collapse",
    HIGHLIGHT_CLASS: "nlm-search-highlight"
  };
  var debouncedTimeout = null;
  var lastContainer = null;
  var isDarkTheme = false;
  function hasDOM() {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }
  function ensureContainer() {
    if (lastContainer && document.body.contains(lastContainer)) return true;
    const container = document.querySelector(CONFIG.CONTAINER_SELECTOR);
    if (container) {
      lastContainer = container;
      return true;
    }
    return false;
  }
  function walkAndToggle(node, labelPrefix, maxDepth = -1, currentDepth = 0) {
    if (maxDepth !== -1 && currentDepth >= maxDepth) {
      return;
    }
    const buttons = Array.from(node.querySelectorAll(`:scope > button[aria-label^="${labelPrefix}"]`));
    for (const btn of buttons) {
      btn.click();
      if (labelPrefix === CONFIG.EXPAND_LABEL) {
        const childContainer = btn.closest(".node")?.querySelector(":scope > .node-children");
        if (childContainer) {
          const children = Array.from(childContainer.querySelectorAll(":scope > .node-child > .node"));
          for (const child of children) {
            walkAndToggle(child, labelPrefix, maxDepth, currentDepth + 1);
          }
        }
      }
    }
  }
  function expand(depth) {
    if (!lastContainer) return;
    const rootNode = lastContainer.querySelector(".node");
    if (rootNode) {
      walkAndToggle(rootNode, CONFIG.EXPAND_LABEL, depth);
    }
  }
  function collapseAll() {
    if (!lastContainer) return;
    const buttons = Array.from(lastContainer.querySelectorAll(`button[aria-label^="${CONFIG.COLLAPSE_LABEL}"]`));
    for (const btn of buttons.reverse()) {
      btn.click();
    }
  }
  function generateOutline() {
    if (!lastContainer) return "Mind map not found.";
    let outline = "";
    function walk(node, depth) {
      const label = node.querySelector(".node-label-text")?.textContent?.trim();
      if (label) {
        outline += `${"  ".repeat(depth)}- ${label}
`;
      }
      const childrenContainer = node.querySelector(":scope > .node-children");
      if (childrenContainer) {
        const children = Array.from(childrenContainer.querySelectorAll(":scope > .node-child > .node"));
        for (const child of children) {
          walk(child, depth + 1);
        }
      }
    }
    const root = lastContainer.querySelector(".node");
    if (root) {
      walk(root, 0);
    }
    return outline.trim();
  }
  function showOutlineModal(outline) {
    document.getElementById("nlm-exporter-modal")?.remove();
    const modal = document.createElement("div");
    modal.id = "nlm-exporter-modal";
    modal.className = isDarkTheme ? "dark" : "";
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";
    const pre = document.createElement("pre");
    pre.textContent = outline;
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => modal.remove());
    modalContent.appendChild(pre);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
  function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    if (!lastContainer) return;
    lastContainer.querySelectorAll(`.${CONFIG.HIGHLIGHT_CLASS}`).forEach((el) => {
      el.classList.remove(CONFIG.HIGHLIGHT_CLASS);
    });
    if (query.length < 2) return;
    const labels = lastContainer.querySelectorAll(".node-label-text");
    labels.forEach((label) => {
      if (label.textContent?.toLowerCase().includes(query)) {
        label.closest(".node")?.classList.add(CONFIG.HIGHLIGHT_CLASS);
      }
    });
  }
  function injectToolbar() {
    if (document.getElementById("nlm-expander-toolbar")) return;
    if (!ensureContainer() || !lastContainer) return;
    const toolbarWrapper = document.createElement("div");
    toolbarWrapper.id = "nlm-expander-toolbar";
    toolbarWrapper.className = isDarkTheme ? "dark" : "";
    const expandButton = document.createElement("button");
    expandButton.textContent = "Expand";
    expandButton.title = "Expand nodes to the selected depth";
    expandButton.addEventListener("click", () => {
      const depthSelect2 = document.getElementById("depth-select");
      expand(parseInt(depthSelect2.value, 10));
    });
    const depthSelect = document.createElement("select");
    depthSelect.id = "depth-select";
    depthSelect.innerHTML = `
      <option value="1">1 Level</option>
      <option value="2">2 Levels</option>
      <option value="3">3 Levels</option>
      <option value="-1" selected>All</option>
  `;
    const collapseButton = document.createElement("button");
    collapseButton.textContent = "Collapse All";
    collapseButton.addEventListener("click", collapseAll);
    const exportButton = document.createElement("button");
    exportButton.textContent = "Export";
    exportButton.title = "Export mind map as a text outline";
    exportButton.addEventListener("click", () => {
      const outline = generateOutline();
      showOutlineModal(outline);
    });
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search map...";
    searchInput.addEventListener("input", handleSearch);
    const themeToggle = document.createElement("button");
    themeToggle.textContent = "Theme";
    themeToggle.title = "Toggle light/dark theme";
    themeToggle.addEventListener("click", () => {
      isDarkTheme = !isDarkTheme;
      toolbarWrapper.classList.toggle("dark", isDarkTheme);
      document.getElementById("nlm-exporter-modal")?.classList.toggle("dark", isDarkTheme);
    });
    toolbarWrapper.appendChild(depthSelect);
    toolbarWrapper.appendChild(expandButton);
    toolbarWrapper.appendChild(collapseButton);
    toolbarWrapper.appendChild(exportButton);
    toolbarWrapper.appendChild(searchInput);
    toolbarWrapper.appendChild(themeToggle);
    lastContainer.appendChild(toolbarWrapper);
  }
  function observeMindMap() {
    if (!hasDOM() || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      if (debouncedTimeout) clearTimeout(debouncedTimeout);
      debouncedTimeout = window.setTimeout(() => {
        if (!ensureContainer()) return;
        injectToolbar();
      }, CONFIG.DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      if (ensureContainer()) {
        injectToolbar();
      }
    }, 1e3);
  }
  if (hasDOM()) {
    observeMindMap();
  }
})();
