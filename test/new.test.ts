import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, 'test.html'), 'utf8');
document.body.innerHTML = html;

const CONFIG = {
  DEBOUNCE_MS: 200,
  CONTAINER_SELECTOR: 'div[class^="MindMapViewer"]',
  EXPAND_LABEL: "Expand",
  COLLAPSE_LABEL: "Collapse",
  HIGHLIGHT_CLASS: 'nlm-search-highlight',
};

let lastContainer: HTMLElement | null = null;

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
        await new Promise(resolve => setTimeout(resolve, 0)); // Wait for DOM update
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

describe('Mind Map Expander', () => {
  it('should generate a correct outline', () => {
    ensureContainer();
    const outline = generateOutline();
    const expectedOutline = `- Root\n  - Child 1\n    - Grandchild 1\n  - Child 2`;
    expect(outline).toBe(expectedOutline);
  });

  it('should expand all nodes', async () => {
    ensureContainer();
    const rootNode = lastContainer?.querySelector<HTMLElement>('.node');
    if (rootNode) {
      const clickSpy = vi.spyOn(window.HTMLButtonElement.prototype, 'click');
      await walkAndToggle(rootNode, CONFIG.EXPAND_LABEL, -1);
      expect(clickSpy).toHaveBeenCalledTimes(2);
    }
  });
});
