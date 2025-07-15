/**
 * NotebookLM Mind Map Auto-Expander Pro
 * -------------------------------------
 * Content script that enhances NotebookLM mind maps with features like
 * selective expansion, text export, search, and themes.
 *
 * © 2025 Visionary42 — MIT License
 */


/**
 * @typedef {Object} ExpanderSettings
 * @property {boolean} autoExpand
 * @property {number} defaultDepth
 * @property {boolean} hotkeysEnabled
 * @property {string} theme
 */


import { waitForContainer } from './elementDetector';

const CONFIG = {
  DEBOUNCE_MS: 200,
  EXPAND_LABEL: "Expand",
  COLLAPSE_LABEL: "Collapse",
  HIGHLIGHT_CLASS: 'nlm-search-highlight',
};

let debouncedTimeout: number | null = null;
let lastContainer: HTMLElement | null = null;
let isDarkTheme = false;
let settings: {
  autoExpand: boolean;
  defaultDepth: number;
  hotkeysEnabled: boolean;
  theme: string;
} = {
  autoExpand: true,
  defaultDepth: -1,
  hotkeysEnabled: true,
  theme: 'auto',
};

/**
 * Loads settings from chrome.storage.sync and updates local settings.
 * @returns {Promise<void>}
 */
async function loadSettings() {
  return new Promise<void>((resolve) => {
    chrome.storage.sync.get(['autoExpand', 'defaultDepth', 'hotkeysEnabled', 'theme'], (result) => {
      settings.autoExpand = result.autoExpand !== false;
      settings.defaultDepth = typeof result.defaultDepth === 'number' ? result.defaultDepth : -1;
      settings.hotkeysEnabled = result.hotkeysEnabled !== false;
      settings.theme = result.theme || 'auto';
      isDarkTheme = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      resolve();
    });
  });
}

/**
 * Applies the current theme to toolbar and modal.
 */
function applyTheme() {
  isDarkTheme = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.getElementById('nlm-expander-toolbar')?.classList.toggle('dark', isDarkTheme);
  document.getElementById('nlm-exporter-modal')?.classList.toggle('dark', isDarkTheme);
}

function hasDOM(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

// Container detection is now handled by waitForContainer

function walkAndToggle(node: HTMLElement, labelPrefix: string, maxDepth: number = -1, currentDepth: number = 0) {
    if (maxDepth !== -1 && currentDepth >= maxDepth) {
        return;
    }

    const buttons = Array.from(node.querySelectorAll<HTMLButtonElement>(`:scope > button[aria-label^="${labelPrefix}"]`));
    for (const btn of buttons) {
        btn.click();
        // Recursively walk children if expanding
        if (labelPrefix === CONFIG.EXPAND_LABEL) {
            const childContainer = btn.closest('.node')?.querySelector(':scope > .node-children');
            if (childContainer) {
                const children = Array.from(childContainer.querySelectorAll<HTMLElement>(':scope > .node-child > .node'));
                for (const child of children) {
                    walkAndToggle(child, labelPrefix, maxDepth, currentDepth + 1);
                }
            }
        }
    }
}

function expand(depth: number) {
    if (!lastContainer) return;
    const rootNode = lastContainer.querySelector<HTMLElement>('.node');
    if (rootNode) {
        walkAndToggle(rootNode, CONFIG.EXPAND_LABEL, depth);
    }
}

function collapseAll() {
    if (!lastContainer) return;
    const buttons = Array.from(lastContainer.querySelectorAll<HTMLButtonElement>(`button[aria-label^="${CONFIG.COLLAPSE_LABEL}"]`));
    // Iterate in reverse to collapse deepest nodes first
    for (const btn of buttons.reverse()) {
        btn.click();
    }
}

function generateOutline(): string {
  if (!lastContainer) return "Mind map not found.";

  let outline = "";
  function walk(node: Element, depth: number) {
    const label = node.querySelector('.node-label-text')?.textContent?.trim();
    if (label) {
      outline += `${"  ".repeat(depth)}- ${label}\n`;
    }
    const childrenContainer = node.querySelector(':scope > .node-children');
    if (childrenContainer) {
        const children = Array.from(childrenContainer.querySelectorAll(':scope > .node-child > .node'));
        for (const child of children) {
          walk(child, depth + 1);
        }
    }
  }

  const root = lastContainer.querySelector('.node');
  if (root) {
    walk(root, 0);
  }

  return outline.trim();
}

function showOutlineModal(outline: string) {
  // Remove existing modal first
  document.getElementById("nlm-exporter-modal")?.remove();

  const modal = document.createElement("div");
  modal.id = "nlm-exporter-modal";
  modal.className = isDarkTheme ? 'dark' : '';

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

function handleSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    if (!lastContainer) return;

    // Clear previous highlights
    lastContainer.querySelectorAll(`.${CONFIG.HIGHLIGHT_CLASS}`).forEach(el => {
        el.classList.remove(CONFIG.HIGHLIGHT_CLASS);
    });

    if (query.length < 2) return;

    const labels = lastContainer.querySelectorAll<HTMLElement>('.node-label-text');
    labels.forEach(label => {
        if (label.textContent?.toLowerCase().includes(query)) {
            label.closest('.node')?.classList.add(CONFIG.HIGHLIGHT_CLASS);
        }
    });
}


/**
 * Injects the toolbar UI into the mind map container.
 */
function injectToolbar() {
  if (document.getElementById("nlm-expander-toolbar") || !lastContainer) return;

  const toolbarWrapper = document.createElement("div");
  toolbarWrapper.id = "nlm-expander-toolbar";
  toolbarWrapper.className = isDarkTheme ? 'dark' : '';

  // --- Expand Controls ---
  const expandButton = document.createElement("button");
  expandButton.textContent = "Expand";
  expandButton.title = "Expand nodes to the selected depth";
  expandButton.addEventListener("click", () => {
      const depthSelect = document.getElementById('depth-select') as HTMLSelectElement;
      expand(parseInt(depthSelect.value, 10));
  });

  const depthSelect = document.createElement("select");
  depthSelect.id = 'depth-select';
  depthSelect.innerHTML = `
      <option value="1">1 Level</option>
      <option value="2">2 Levels</option>
      <option value="3">3 Levels</option>
      <option value="-1" selected>All</option>
  `;
  // Set defaultDepth from settings
  depthSelect.value = settings.defaultDepth?.toString() ?? '-1';

  // --- Collapse Button ---
  const collapseButton = document.createElement("button");
  collapseButton.textContent = "Collapse All";
  collapseButton.addEventListener("click", collapseAll);

  // --- Export Button ---
  const exportButton = document.createElement("button");
  exportButton.textContent = "Export";
  exportButton.title = "Export mind map as a text outline";
  exportButton.addEventListener("click", () => {
      const outline = generateOutline();
      showOutlineModal(outline);
  });

  // --- Search Input ---
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search map...";
  searchInput.addEventListener("input", handleSearch);

  // --- Theme Toggle ---
   const themeToggle = document.createElement("button");
   themeToggle.textContent = "Theme";
   themeToggle.title = "Toggle light/dark theme";
   themeToggle.addEventListener('click', () => {
       settings.theme = isDarkTheme ? 'light' : 'dark';
       chrome.storage.sync.set({ theme: settings.theme });
   });

  // --- Assemble Toolbar ---
  toolbarWrapper.appendChild(depthSelect);
  toolbarWrapper.appendChild(expandButton);
  toolbarWrapper.appendChild(collapseButton);
  toolbarWrapper.appendChild(exportButton);
  toolbarWrapper.appendChild(searchInput);
  toolbarWrapper.appendChild(themeToggle);
  lastContainer.appendChild(toolbarWrapper);
  applyTheme();
}

/**
 * Observes the DOM for mind map container and injects toolbar. Triggers autoExpand if enabled.
 */
async function observeMindMap() {
  if (!hasDOM() || typeof MutationObserver === "undefined") return;
  // Wait for container with retry/fallback
  lastContainer = await waitForContainer(10000, 200);
  if (!lastContainer) {
    // Warn already handled in waitForContainer
    return;
  }
  if (!document.getElementById("nlm-expander-toolbar")) {
    injectToolbar();
    applyTheme();
  }
  if (settings.autoExpand && lastContainer && !lastContainer.dataset.hasAutoExpanded) {
    expand(settings.defaultDepth);
    lastContainer.dataset.hasAutoExpanded = 'true';
  }
  // Observe for dynamic DOM changes
  const observer = new MutationObserver(async () => {
    if (debouncedTimeout) clearTimeout(debouncedTimeout);
    debouncedTimeout = window.setTimeout(async () => {
      if (!lastContainer || !document.body.contains(lastContainer)) {
        lastContainer = await waitForContainer(10000, 200);
        if (!lastContainer) return;
      }
      if (!document.getElementById("nlm-expander-toolbar")) {
        injectToolbar();
        applyTheme();
      }
    }, CONFIG.DEBOUNCE_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}


/**
 * Handles hotkey commands from background, if hotkeysEnabled.
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!settings.hotkeysEnabled) return;
  if (msg?.action === 'expand-mindmap') {
    expand(settings.defaultDepth);
  } else if (msg?.action === 'collapse-mindmap') {
    collapseAll();
  }
});

/**
 * Listen for live settings updates and apply changes.
 */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  let needsTheme = false;
  if (changes.theme) {
    settings.theme = changes.theme.newValue;
    needsTheme = true;
  }
  if (changes.autoExpand) {
    settings.autoExpand = changes.autoExpand.newValue !== false;
  }
  if (changes.defaultDepth) {
    settings.defaultDepth = typeof changes.defaultDepth.newValue === 'number' ? changes.defaultDepth.newValue : -1;
  }
  if (changes.hotkeysEnabled) {
    settings.hotkeysEnabled = changes.hotkeysEnabled.newValue !== false;
  }
  if (needsTheme) applyTheme();
});

// Main entry
if (hasDOM()) {
  loadSettings().then(() => {
    observeMindMap();
  });
}