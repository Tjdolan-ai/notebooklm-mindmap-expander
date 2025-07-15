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
];

/**
 * Waits for the mind map container to appear in the DOM.
 * @param {number} timeoutMs - Max time to wait (default 10000ms)
 * @param {number} intervalMs - Polling interval (default 200ms)
 * @returns {Promise<HTMLElement|null>} The container or null if not found
 */
export async function waitForContainer(timeoutMs = 10000, intervalMs = 200): Promise<HTMLElement | null> {
  const start = Date.now();
  let warned = false;
  while (Date.now() - start < timeoutMs) {
    for (const selector of CONTAINER_SELECTORS) {
      try {
        const el = document.querySelector<HTMLElement>(selector);
        if (el) return el;
      } catch (e) {
        // Ignore selector errors
      }
    }
    await new Promise(res => setTimeout(res, intervalMs));
  }
  if (!warned) {
    console.warn('[elementDetector] Mind map container not found after 10s.');
    warned = true;
  }
  return null;
}

/**
 * For testability: expose selectors
 */
export { CONTAINER_SELECTORS };
