// src/expander.ts
/**
 * NotebookLM Mind Map Expander - FIXED VERSION
 * Now targets the actual text symbols used by NotebookLM
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const HOTKEYS = {
  expand: { key: 'e', alt: true, shift: true },
  collapse: { key: 'c', alt: true, shift: true },
  exportOutline: { key: 'o', alt: true, shift: true }
};

class NotebookLMExpander {
  private observer: MutationObserver | null = null;
  private isDarkTheme = false;
  private retryCount = 0;
  private toolbar: HTMLElement | null = null;
  private settings = { autoExpand: true, hotkeysEnabled: true };
  private expandedNodes = new Set<string>();

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log('🚀 NotebookLM Expander initializing...');
    await this.loadSettings();
    this.setupMessageListener();
    this.registerHotkeys();
    this.setupMutationObserver();
    this.checkForMindMap();
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await this.getStorageValues(['autoExpand', 'hotkeysEnabled', 'isDarkTheme']);
      this.settings.autoExpand = stored.autoExpand !== false;
      this.settings.hotkeysEnabled = stored.hotkeysEnabled !== false;
      this.isDarkTheme = stored.isDarkTheme === true;
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
    }
  }

  private getStorageValues(keys: string[]): Promise<any> {
    return new Promise((resolve) => {
      if (!chrome?.storage?.sync) {
        resolve({});
        return;
      }
      
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    });
  }

  private setupMessageListener(): void {
    if (!chrome?.runtime?.onMessage) return;

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      console.log('Received message:', message);
      
      switch (message.action) {
        case 'expand-nodes':
        case 'expand-all':
          this.expandAll();
          sendResponse({ success: true });
          break;
        case 'collapse-nodes':
        case 'collapse-all':
          this.collapseAll();
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ success: false });
      }
      
      return true;
    });
  }

  private setupMutationObserver(): void {
    this.observer = new MutationObserver(() => {
      this.checkForMindMap();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private checkForMindMap(): void {
    const mindMapSelectors = [
      '[data-cy="studio-panel"]',
      '.studio-panel',
      '[aria-label*="mind map" i]',
      'svg:has(> g > g.node)',
      'div:has(> svg g.node)'
    ];

    const container = this.findElement(mindMapSelectors);
    
    if (container) {
      console.log('✅ Mind map container detected');
      this.waitForNodes(container);
    }
  }

  private findElement(selectors: string[]): Element | null {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        // Skip invalid selectors
      }
    }
    return null;
  }

  private async waitForNodes(container: Element): Promise<void> {
    await this.delay(1000); // Give UI time to render
    
    const nodeSelectors = [
      'g.node',
      '[class*="node"]',
      'g:has(> text)'
    ];
    
    const nodes = this.findNodes(container, nodeSelectors);
    
    if (nodes.length > 0) {
      console.log(`✅ Found ${nodes.length} nodes`);
      
      if (!this.toolbar) {
        this.injectToolbar(container);
      }
      
      if (this.settings.autoExpand) {
        await this.delay(500);
        this.expandAll();
      }
    } else if (this.retryCount < MAX_RETRIES) {
      this.retryCount++;
      setTimeout(() => this.waitForNodes(container), RETRY_DELAY);
    }
  }

  private findNodes(container: Element, selectors: string[]): NodeListOf<Element> {
    for (const selector of selectors) {
      try {
        const nodes = container.querySelectorAll(selector);
        if (nodes.length > 0) return nodes;
      } catch (e) {
        // Skip invalid selectors
      }
    }
    return document.querySelectorAll('.null-selector');
  }

  private injectToolbar(container: Element): void {
    if (this.toolbar) return;

    this.toolbar = document.createElement('div');
    this.toolbar.id = 'nlm-expander-toolbar';
    this.toolbar.innerHTML = `
      <style>
        #nlm-expander-toolbar {
          position: fixed;
          top: 80px;
          right: 20px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #nlm-expander-toolbar.dark {
          background: #1e1e1e;
          border-color: #444;
          color: white;
        }
        
        .nlm-toolbar-header {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 4px;
          opacity: 0.8;
        }
        
        .nlm-toolbar-button {
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .nlm-toolbar-button:hover {
          background: #e8e8e8;
          transform: translateY(-1px);
        }
        
        .dark .nlm-toolbar-button {
          background: #333;
          border-color: #555;
          color: white;
        }
        
        .dark .nlm-toolbar-button:hover {
          background: #444;
        }
        
        .nlm-hotkey {
          opacity: 0.6;
          font-size: 11px;
          margin-left: 8px;
        }
      </style>
      <div class="nlm-toolbar-header">Mind Map Tools</div>
      <button class="nlm-toolbar-button" id="nlm-expand-all">
        🌳 Expand All <span class="nlm-hotkey">Alt+Shift+E</span>
      </button>
      <button class="nlm-toolbar-button" id="nlm-collapse-all">
        🌲 Collapse All <span class="nlm-hotkey">Alt+Shift+C</span>
      </button>
      <button class="nlm-toolbar-button" id="nlm-export">
        📋 Export <span class="nlm-hotkey">Alt+Shift+O</span>
      </button>
      <button class="nlm-toolbar-button" id="nlm-theme-toggle">
        ${this.isDarkTheme ? '☀️' : '🌙'} Theme
      </button>
    `;

    if (this.isDarkTheme) {
      this.toolbar.classList.add('dark');
    }

    document.body.appendChild(this.toolbar);

    // Add event listeners
    this.toolbar.querySelector('#nlm-expand-all')?.addEventListener('click', () => this.expandAll());
    this.toolbar.querySelector('#nlm-collapse-all')?.addEventListener('click', () => this.collapseAll());
    this.toolbar.querySelector('#nlm-export')?.addEventListener('click', () => this.exportToOutline());
    this.toolbar.querySelector('#nlm-theme-toggle')?.addEventListener('click', () => this.toggleTheme());
  }

  private expandAll(): void {
    console.log('🌳 Expanding all nodes...');
    let expandedCount = 0;
    
    // Find all nodes with expand symbols
    const expandableNodes = document.querySelectorAll('g.node');
    
    expandableNodes.forEach(node => {
      // Check if this node has a ">" symbol (meaning it's collapsed)
      const expandSymbol = node.querySelector('text.expand-symbol, text');
      if (expandSymbol && expandSymbol.textContent?.trim() === '>') {
        // Find the clickable circle element within the same node
        const clickableCircle = node.querySelector('circle[style*="cursor: pointer"]');
        if (clickableCircle) {
          this.simulateClick(clickableCircle);
          expandedCount++;
          
          // Track expanded nodes
          const nodeId = this.getNodeIdentifier(node);
          if (nodeId) this.expandedNodes.add(nodeId);
        }
      }
    });
    
    console.log(`✅ Expansion complete. Expanded ${expandedCount} nodes.`);
    
    // Run again after a delay to catch newly revealed nodes
    if (expandedCount > 0) {
      setTimeout(() => {
        const secondPassCount = this.expandSecondPass();
        if (secondPassCount > 0) {
          console.log(`✅ Second pass: Expanded ${secondPassCount} more nodes.`);
        }
      }, 500);
    }
  }

  private expandSecondPass(): number {
    let expandedCount = 0;
    
    const expandableNodes = document.querySelectorAll('g.node');
    expandableNodes.forEach(node => {
      const expandSymbol = node.querySelector('text');
      if (expandSymbol?.textContent?.trim() === '>') {
        const nodeId = this.getNodeIdentifier(node);
        if (nodeId && !this.expandedNodes.has(nodeId)) {
          const clickableCircle = node.querySelector('circle[style*="cursor: pointer"]');
          if (clickableCircle) {
            this.simulateClick(clickableCircle);
            expandedCount++;
            this.expandedNodes.add(nodeId);
          }
        }
      }
    });
    
    return expandedCount;
  }

  private collapseAll(): void {
    console.log('🌲 Collapsing all nodes...');
    let collapsedCount = 0;
    
    // Find all nodes with collapse symbols
    const collapsibleNodes = document.querySelectorAll('g.node');
    
    collapsibleNodes.forEach(node => {
      // Check if this node has a "<" symbol (meaning it's expanded)
      const collapseSymbol = node.querySelector('text.expand-symbol, text');
      if (collapseSymbol && collapseSymbol.textContent?.trim() === '<') {
        // Find the clickable circle element within the same node
        const clickableCircle = node.querySelector('circle[style*="cursor: pointer"]');
        if (clickableCircle) {
          this.simulateClick(clickableCircle);
          collapsedCount++;
          
          // Remove from tracked nodes
          const nodeId = this.getNodeIdentifier(node);
          if (nodeId) this.expandedNodes.delete(nodeId);
        }
      }
    });
    
    // Clear tracked nodes
    this.expandedNodes.clear();
    
    console.log(`✅ Collapsed ${collapsedCount} nodes.`);
  }

  private getNodeIdentifier(node: Element): string | null {
    // Try to get a unique identifier for the node
    const textContent = node.querySelector('text:not(.expand-symbol)')?.textContent?.trim();
    return textContent || null;
  }

  private simulateClick(element: Element): void {
    // Create and dispatch mouse events for SVG elements
    const mousedownEvent = new MouseEvent('mousedown', {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 1
    });
    
    const mouseupEvent = new MouseEvent('mouseup', {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 0
    });
    
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    
    element.dispatchEvent(mousedownEvent);
    element.dispatchEvent(mouseupEvent);
    element.dispatchEvent(clickEvent);
    
    // Also try pointer events which some frameworks prefer
    const pointerEvent = new PointerEvent('pointerup', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    
    element.dispatchEvent(pointerEvent);
  }

  private exportToOutline(): void {
    console.log('📋 Exporting mind map...');
    
    let outline = 'Mind Map Export\n' + '='.repeat(50) + '\n';
    
    // Gather all text content from nodes
    const processedTexts = new Set<string>();
    const nodes = document.querySelectorAll('g.node');
    
    nodes.forEach((node, index) => {
      const textElements = node.querySelectorAll('text');
      textElements.forEach(text => {
        const content = text.textContent?.trim();
        // Skip expand/collapse symbols
        if (content && content !== '>' && content !== '<' && !processedTexts.has(content)) {
          processedTexts.add(content);
          
          // Try to determine depth based on transform or position
          const depth = this.estimateNodeDepth(node);
          outline += '  '.repeat(depth) + '• ' + content + '\n';
        }
      });
    });
    
    console.log('Export content:', outline);
    this.showExportModal(outline);
  }

  private estimateNodeDepth(node: Element): number {
    // Simple heuristic: count parent g elements
    let depth = 0;
    let current = node.parentElement;
    
    while (current && depth < 10) {
      if (current.tagName.toLowerCase() === 'g') {
        depth++;
      }
      current = current.parentElement;
    }
    
    return Math.max(0, depth - 2); // Adjust for SVG structure
  }

  private showExportModal(content: string): void {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      ">
        <div style="
          background: ${this.isDarkTheme ? '#1e1e1e' : 'white'};
          color: ${this.isDarkTheme ? 'white' : 'black'};
          padding: 24px;
          border-radius: 12px;
          max-width: 600px;
          max-height: 80vh;
          overflow: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        ">
          <h3 style="margin-top: 0;">Mind Map Export</h3>
          <pre style="
            background: ${this.isDarkTheme ? '#2d2d2d' : '#f5f5f5'};
            padding: 16px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            max-height: 400px;
            overflow: auto;
          ">${content}</pre>
          <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: flex-end;">
            <button id="nlm-copy-export" style="
              padding: 8px 16px;
              border-radius: 6px;
              border: 1px solid ${this.isDarkTheme ? '#555' : '#ddd'};
              background: ${this.isDarkTheme ? '#333' : 'white'};
              color: ${this.isDarkTheme ? 'white' : 'black'};
              cursor: pointer;
            ">Copy to Clipboard</button>
            <button id="nlm-close-export" style="
              padding: 8px 16px;
              border-radius: 6px;
              border: none;
              background: #1a73e8;
              color: white;
              cursor: pointer;
            ">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#nlm-copy-export')?.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        const button = modal.querySelector('#nlm-copy-export') as HTMLElement;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = 'Copy to Clipboard';
        }, 2000);
      });
    });

    modal.querySelector('#nlm-close-export')?.addEventListener('click', () => {
      modal.remove();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal.firstElementChild?.parentElement) {
        modal.remove();
      }
    });
  }

  private toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    
    if (this.toolbar) {
      this.toolbar.classList.toggle('dark', this.isDarkTheme);
      const themeButton = this.toolbar.querySelector('#nlm-theme-toggle');
      if (themeButton) {
        themeButton.textContent = this.isDarkTheme ? '☀️ Theme' : '🌙 Theme';
      }
    }
    
    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ isDarkTheme: this.isDarkTheme });
    }
  }

  private registerHotkeys(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.settings.hotkeysEnabled) return;
      
      if (e.altKey && e.shiftKey) {
        const key = e.key.toLowerCase();
        
        if (key === HOTKEYS.expand.key) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.expandAll();
          return false;
        } else if (key === HOTKEYS.collapse.key) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.collapseAll();
          return false;
        } else if (key === HOTKEYS.exportOutline.key) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.exportToOutline();
          return false;
        }
      }
    }, true);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private retry(): void {
    if (this.retryCount < MAX_RETRIES) {
      this.retryCount++;
      console.log(`🔄 Retrying... (${this.retryCount}/${MAX_RETRIES})`);
      setTimeout(() => this.init(), RETRY_DELAY * this.retryCount);
    }
  }
}

// Initialize
declare global {
  interface Window {
    notebookLMExpander?: NotebookLMExpander;
  }
}

if (typeof window !== 'undefined' && !window.notebookLMExpander) {
  window.notebookLMExpander = new NotebookLMExpander();
}