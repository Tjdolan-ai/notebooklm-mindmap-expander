/**
 * NotebookLM Mind Map Auto-Expander Pro
 * -------------------------------------
 * Content script that enhances NotebookLM mind maps with features like
 * selective expansion, text export, search, and themes.
 *
 * © 2025 Visionary42 — MIT License
 */

const CONFIG = {
  DEBOUNCE_MS: 200,
  CONTAINER_SELECTOR: 'div[class^="MindMapViewer"]',
  EXPAND_LABEL: "Expand",
  COLLAPSE_LABEL: "Collapse",
  HIGHLIGHT_CLASS: 'nlm-search-highlight',
};

let debouncedTimeout: number | null = null;
let lastContainer: HTMLElement | null = null;
let isDarkTheme = false;

function hasDOM(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function ensureContainer(): boolean {
  if (lastContainer && document.body.contains(lastContainer)) return true;
  const container = document.querySelector<HTMLElement>(CONFIG.CONTAINER_SELECTOR);
  if (container) {
    lastContainer = container;
    return true;
  }
  return false;
}

async function walkAndToggle(node: HTMLElement, labelPrefix: string, maxDepth: number = -1, currentDepth: number = 0) {
    if (maxDepth !== -1 && currentDepth >= maxDepth) {
        return;
    }

    const buttons = Array.from(node.querySelectorAll<HTMLButtonElement>(`:scope > button[aria-label^="${labelPrefix}"]`));
    for (const btn of buttons) {
        btn.click();
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for DOM update
        // Recursively walk children if expanding
        if (labelPrefix === CONFIG.EXPAND_LABEL) {
            const childContainer = btn.closest('.node')?.querySelector(':scope > .node-children');
            if (childContainer) {
                const children = Array.from(childContainer.querySelectorAll<HTMLElement>(':scope > .node-child > .node'));
                for (const child of children) {
                    await walkAndToggle(child, labelPrefix, maxDepth, currentDepth + 1);
                }
            }
        }
    }
}

async function expand(depth: number) {
    if (!lastContainer) return;
    const rootNode = lastContainer.querySelector<HTMLElement>('.node');
    if (rootNode) {
        await walkAndToggle(rootNode, CONFIG.EXPAND_LABEL, depth);
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
    const labelEl = node.querySelector('.node-label-text');
    if (labelEl && labelEl.textContent) {
      const label = labelEl.textContent.trim();
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


function injectToolbar() {
  if (document.getElementById("nlm-expander-toolbar")) return;
  if (!ensureContainer() || !lastContainer) return;

  const toolbarWrapper = document.createElement("div");
  toolbarWrapper.id = "nlm-expander-toolbar";
  toolbarWrapper.className = isDarkTheme ? 'dark' : '';

  // --- Expand Controls ---
  const expandButton = document.createElement("button");
  expandButton.textContent = "Expand";
  expandButton.title = "Expand nodes to the selected depth";
  expandButton.addEventListener("click", async () => {
      const depthSelect = document.getElementById('depth-select') as HTMLSelectElement;
      await expand(parseInt(depthSelect.value, 10));
  });

  const depthSelect = document.createElement("select");
  depthSelect.id = 'depth-select';
  depthSelect.innerHTML = `
      <option value="1">1 Level</option>
      <option value="2">2 Levels</option>
      <option value="3">3 Levels</option>
      <option value="-1" selected>All</option>
  `;

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
       isDarkTheme = !isDarkTheme;
       toolbarWrapper.classList.toggle('dark', isDarkTheme);
       document.getElementById("nlm-exporter-modal")?.classList.toggle('dark', isDarkTheme);
   });


  // --- Assemble Toolbar ---
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

  // Initial run
  setTimeout(() => {
      if (ensureContainer()) {
          injectToolbar();
      }
  }, 1000);
}

if (hasDOM()) {
  observeMindMap();
}