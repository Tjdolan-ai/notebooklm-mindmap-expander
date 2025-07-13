/**
 * NotebookLM Mind Map Auto‑Expander
 * ---------------------------------
 * Content script (TypeScript) that automatically expands every branch in any
 * Mind Map once it renders. Falls back to a recursive walker if the toolbar's
 * one‑click expand button is absent.
 *
 * © 2025 Visionary42 — MIT License
 */

const DEBOUNCE_MS = 200;
const EXPAND_LABEL = "Expand";
const COLLAPSE_LABEL = "Collapse";

let debouncedTimeout: number | null = null;
let lastContainer: HTMLElement | null = null;

/**
 * Utility to detect whether we're running in a browser-like environment with a
 * real DOM.  This allows the library to be imported in Node.js/Vitest without
 * immediately throwing reference errors for global browser APIs.
 */
function hasDOM(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Public API — can be invoked via UI button or hotkeys.
 */
export function expandAll(): void {
  if (!hasDOM()) return;
  if (!ensureContainer()) return;
  if (tryToolbarExpand()) return;
  walkAndToggle(EXPAND_LABEL);
}

export function collapseAll(): void {
  if (!hasDOM()) return;
  if (!ensureContainer()) return;
  if (tryToolbarCollapse()) return;
  walkAndToggle(COLLAPSE_LABEL);
}

/* –––––––––––––––– private helpers –––––––––––––––– */

function ensureContainer(): boolean {
  if (lastContainer && document.contains(lastContainer)) return true;
  const candidate = document.querySelector<HTMLElement>('div[class^="MindMapViewer"]');
  if (!candidate) return false;
  lastContainer = candidate;
  return true;
}

function tryToolbarExpand(): boolean {
  const button = document.querySelector<HTMLButtonElement>('button[aria-label*="open"][role="button"],button[aria-label*="Expand all"][role="button"]');
  if (button) {
    button.click();
    return true;
  }
  return false;
}

function tryToolbarCollapse(): boolean {
  const button = document.querySelector<HTMLButtonElement>('button[aria-label*="close"][role="button"],button[aria-label*="Collapse all"][role="button"]');
  if (button) {
    button.click();
    return true;
  }
  return false;
}

function walkAndToggle(labelPrefix: string): void {
  const seen = new Set<HTMLElement>();

  function walk(node: HTMLElement) {
    const buttons = Array.from(node.querySelectorAll<HTMLButtonElement>(`button[aria-label^="${labelPrefix}"][role="button"]`));
    for (const btn of buttons) {
      if (seen.has(btn)) continue;
      btn.click();
      seen.add(btn);
      walk(node); // Re-query the same node to find new buttons
      return; // Only process one button per walk to avoid stale collections
    }
  }

  const container = document.querySelector('div[class^="MindMapViewer"]');
  if (container) {
    walk(container as HTMLElement);
  }
}

/* –––––––––––––––– bootstrap –––––––––––––––– */

/**
 * Injects custom floating toggle in the upper‑right corner of the Mind Map.
 */
function injectToggle(): void {
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
    cursor: "pointer",
    display: "flex",
    gap: "8px",
  } as CSSStyleDeclaration);

  const expander = document.createElement("div");
  expander.textContent = "🌳";
  expander.title = "Expand / Collapse";
  let expanded = false;
  expander.addEventListener("click", () => {
    expanded ? collapseAll() : expandAll();
    expanded = !expanded;
    expander.textContent = expanded ? "🌲" : "🌳";
  });

  const exporter = document.createElement("div");
  exporter.textContent = "📋";
  exporter.title = "Export as Text";
  exporter.addEventListener("click", () => {
    const outline = generateOutline();
    showOutlineModal(outline);
  });

  wrapper.appendChild(expander);
  wrapper.appendChild(exporter);
  lastContainer!.appendChild(wrapper);
}

function generateOutline(): string {
  const container = document.querySelector('div[class^="MindMapViewer"]');
  if (!container) return "Mind map not found.";

  let outline = "";
  function walk(node: Element, depth: number) {
    const label = node.querySelector('.node-label-text')?.textContent?.trim();
    if (label) {
      outline += `${"  ".repeat(depth)}- ${label}\n`;
    }
    const children = Array.from(node.querySelectorAll(':scope > .node-children > .node-child > .node'));
    for (const child of children) {
      walk(child, depth + 1);
    }
  }

  const root = container.querySelector('.node');
  if (root) {
    walk(root, 0);
  }

  return outline;
}

function showOutlineModal(outline: string): void {
  const modal = document.createElement("div");
  modal.id = "nlm-exporter-modal";
  Object.assign(modal.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: "10001",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  } as CSSStyleDeclaration);

  const modalContent = document.createElement("div");
  Object.assign(modalContent.style, {
    backgroundColor: "#fff",
    padding: "2rem",
    borderRadius: "8px",
    width: "600px",
    maxHeight: "80vh",
    overflowY: "auto",
  } as CSSStyleDeclaration);

  const pre = document.createElement("pre");
  pre.textContent = outline;

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => {
    modal.remove();
  });

  modalContent.appendChild(pre);
  modalContent.appendChild(closeButton);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

/**
 * Observes DOM mutations to detect Mind Map render events.
 */
function observeMindMap(): void {
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
  // Initial run in case map already present
  setTimeout(() => {
    injectToggle();
    expandAll();
  }, 1000);
}

/**
 * Global hotkeys
 */
function registerHotkeys(): void {
  window.addEventListener("keydown", (e: KeyboardEvent) => {
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

/* Entry point – only bootstrap when DOM is present */
if (hasDOM()) {
  observeMindMap();
  registerHotkeys();
}