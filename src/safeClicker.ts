/**
 * SafeClicker - Robust DOM element detection and interaction
 * Handles Google's frequent DOM changes with fallback strategies
 */

export const EXPAND_BUTTON_SELECTORS = [
  'text.expand-symbol',          // SVG glyph for every expand arrow
  '[aria-label="Expand"]',       // fallback
  '[aria-expanded="false"]'
];

export class SafeClicker {
  /** Click element or its parent <g> if the element is the <text> glyph */
  static click(el: Element): void {
    const target =
      el.tagName.toLowerCase() === 'text' && el.parentElement
        ? el.parentElement
        : el;

    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  /** Verify success by detecting <text class="collapse-symbol"> */
  static verifyClick(target: Element): boolean {
    const hasCollapse = (n: Element | null) =>
      !!n?.querySelector?.('text.collapse-symbol');
    return hasCollapse(target) || hasCollapse(target.parentElement);
  }

  static async waitForElement(
    selectors: string[],
    timeout = 10000
  ): Promise<Element | null> {
    const endTime = Date.now() + timeout;

    while (Date.now() < endTime) {
      for (const selector of selectors) {
        try {
          const el = document.querySelector(selector);
          if (el && this.isElementVisible(el)) {
            return el;
          }
        } catch (e) {
          // Continue to next selector if this one fails
          continue;
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }

  static async waitForElementInContext(
    selectors: string[],
    context: Element,
    timeout = 5000
  ): Promise<Element | null> {
    const endTime = Date.now() + timeout;

    while (Date.now() < endTime) {
      for (const selector of selectors) {
        try {
          const el = context.querySelector(selector);
          if (el && this.isElementVisible(el)) {
            return el;
          }
        } catch (e) {
          continue;
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }

  static isElementVisible(element: Element): boolean {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  static async safeClick(element: Element): Promise<boolean> {
    if (!element || !this.isElementVisible(element)) {
      return false;
    }

    try {
      // Try direct click first
      (element as HTMLElement).click();
      return true;
    } catch (e) {
      // Fallback to dispatching click event
      try {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        element.dispatchEvent(event);
        return true;
      } catch (e2) {
        console.warn('SafeClicker: Failed to click element', e2);
        return false;
      }
    }
  }

  static async waitForAnyElement(
    selectorGroups: string[][],
    timeout = 10000
  ): Promise<{ element: Element; group: number } | null> {
    const endTime = Date.now() + timeout;

    while (Date.now() < endTime) {
      for (let groupIndex = 0; groupIndex < selectorGroups.length; groupIndex++) {
        const selectors = selectorGroups[groupIndex];
        for (const selector of selectors) {
          try {
            const el = document.querySelector(selector);
            if (el && this.isElementVisible(el)) {
              return { element: el, group: groupIndex };
            }
          } catch (e) {
            continue;
          }
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }
}
