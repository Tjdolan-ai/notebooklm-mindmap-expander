// src/elementDetector.ts
/**
 * Robust element detector for NotebookLM Mind Map Expander
 * Uses a multi-selector strategy and retries for up to 10 seconds.
 * Returns the container element or null if not found.
 */


const CONTAINER_SELECTORS = [
  'div[class^="MindMapViewer"]',
  '[data-test-id="mind-map-container"]',
  '#mind-map-container',
  '.mindmap-root',
  'main .node-tree',
  'div[data-testid="mind-map-root"]',
  'div.mindmap',
  'section.mindmap',
  'div[class*="mindmap"]',
  'div[class*="NodeTree"]',
  'mindmap',
  'mindmap svg'
];

/**
 * Waits for the mind map container to appear in the DOM.
 * @param {number} timeoutMs - Max time to wait (default 10000ms)
 * @param {number} intervalMs - Polling interval (default 200ms)
 * @returns {Promise<HTMLElement|null>} The container or null if not found
 */
export async function waitForContainer(
  timeoutMs = 10_000,
  intervalMs = 200
): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const sel of CONTAINER_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;                     // success
      } catch { /* ignore invalid selector */ }
    }
    await new Promise(res => setTimeout(res, intervalMs));
  }
  console.warn('[elementDetector] Mind map container not found after 10 s.');
  return null;
}

/**
 * For testability: expose selectors
 */
export { CONTAINER_SELECTORS };
