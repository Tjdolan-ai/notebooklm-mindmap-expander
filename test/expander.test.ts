import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the CONFIG object
const CONFIG = {
    DEBOUNCE_MS: 200,
    CONTAINER_SELECTOR: 'div[class^="MindMapViewer"]',
    EXPAND_LABEL: "Expand",
    COLLAPSE_LABEL: "Collapse",
    HIGHLIGHT_CLASS: 'nlm-search-highlight',
};

// Mock the walkAndToggle function
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

describe('walkAndToggle', () => {
    let container: HTMLElement;

    beforeEach(() => {
        // Create a mock DOM structure
        container = document.createElement('div');
        container.innerHTML = `
            <div class="node">
                <button aria-label="Expand"></button>
                <div class="node-children">
                    <div class="node-child">
                        <div class="node">
                            <button aria-label="Expand"></button>
                        </div>
                    </div>
                    <div class="node-child">
                        <div class="node">
                            <button aria-label="Expand"></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    it('should expand all nodes when maxDepth is -1', () => {
        const buttons = Array.from(container.querySelectorAll('button'));
        const clickSpies = buttons.map(btn => vi.spyOn(btn, 'click'));

        walkAndToggle(container, CONFIG.EXPAND_LABEL, -1);

        clickSpies.forEach(spy => expect(spy).toHaveBeenCalled());
    });

    it('should expand nodes up to the specified depth', () => {
        const buttons = Array.from(container.querySelectorAll('button'));
        const clickSpies = buttons.map(btn => vi.spyOn(btn, 'click'));

        walkAndToggle(container, CONFIG.EXPAND_LABEL, 1);

        expect(clickSpies[0]).toHaveBeenCalled();
        expect(clickSpies[1]).not.toHaveBeenCalled();
        expect(clickSpies[2]).not.toHaveBeenCalled();
    });
});
