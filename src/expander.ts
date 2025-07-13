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
  const seen = new Set<string>();
  let didWork = true;
  while (didWork) {
    didWork = false;
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(`button[aria-label^="${labelPrefix}"][role="button"]`));
    for (const btn of buttons) {
      const id = btn.id || btn.getAttribute("data-node-id") || Math.random().toString(36);
      if (seen.has(id)) continue;
      btn.click();
      seen.add(id);
      didWork = true;
    }
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
    cursor: "pointer"
  } as CSSStyleDeclaration);

  wrapper.textContent = "🌳";
  wrapper.title = "Expand / Collapse";

  let expanded = false;
  wrapper.addEventListener("click", () => {
    expanded ? collapseAll() : expandAll();
    expanded = !expanded;
    wrapper.textContent = expanded ? "🌲" : "🌳";
  });

  lastContainer!.appendChild(wrapper);
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