// src/expander.ts
/**
 * NotebookLM Mind Map Expander - FIXED VERSION
 * Now targets the actual text symbols used by NotebookLM
 */

import { AIInsightsAnalyzer } from './aiInsights';
import { FloatingPanel } from './ui/floatingPanel';
import { MindMapNode } from './exporting/exporters';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const HOTKEYS = {
  expand: { key: 'e', alt: true, shift: true },
  collapse: { key: 'c', alt: true, shift: true },
  exportOutline: { key: 'o', alt: true, shift: true },
  aiInsights: { key: 'i', alt: true, shift: true }
};

class NotebookLMExpander {
  private observer: MutationObserver | null = null;
  private isDarkTheme = false;
  private retryCount = 0;
  private settings = { autoExpand: true, hotkeysEnabled: true };
  private expandedNodes = new Set<string>();
  private aiInsightsAnalyzer: AIInsightsAnalyzer | null = null;
  private floatingPanel: FloatingPanel | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log('🚀 NotebookLM Expander initializing...');
    await this.loadSettings();
    this.initializeAIInsights();
    this.setupMessageListener();
    this.registerHotkeys();
    this.setupMutationObserver();
    this.checkForMindMap();
  }

  private initializeAIInsights(): void {
    this.aiInsightsAnalyzer = new AIInsightsAnalyzer(this.isDarkTheme);
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
      
      if (!this.floatingPanel) {
        this.floatingPanel = new FloatingPanel(() => this.getMindMapData());
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

  private getMindMapData(): MindMapNode[] {
    const nodes = document.querySelectorAll('g.node');
    const rootNodes: MindMapNode[] = [];
    const nodeMap = new Map<string, MindMapNode>();

    nodes.forEach((nodeElement, i) => {
      const textElement = nodeElement.querySelector('text:not(.expand-symbol)');
      const text = textElement?.textContent?.trim();
      if (!text) return;

      const id = this.getNodeIdentifier(nodeElement) || `node-${i}`;
      const depth = this.estimateNodeDepth(nodeElement);
      const mindMapNode: MindMapNode = { id, text, children: [], depth };

      nodeMap.set(id, mindMapNode);
    });

    nodes.forEach((nodeElement) => {
        const id = this.getNodeIdentifier(nodeElement);
        if (!id) return;

        const parentElement = nodeElement.parentElement?.closest('g.node');
        if (parentElement) {
            const parentId = this.getNodeIdentifier(parentElement);
            if (parentId && nodeMap.has(parentId) && nodeMap.has(id)) {
                const parentNode = nodeMap.get(parentId);
                const childNode = nodeMap.get(id);
                if(parentNode && childNode) {
                    parentNode.children.push(childNode);
                }
            }
        } else {
            const node = nodeMap.get(id)
            if(node) {
                rootNodes.push(node);
            }
        }
    });

    return rootNodes;
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

  private toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    
    // Update AI insights analyzer theme
    if (this.aiInsightsAnalyzer) {
      this.aiInsightsAnalyzer = new AIInsightsAnalyzer(this.isDarkTheme);
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
        } else if (key === HOTKEYS.aiInsights.key) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.showAIInsights();
          return false;
        }
      }
      return true;
    }, true);
  }

  private async showAIInsights(): Promise<void> {
    if (!this.aiInsightsAnalyzer) {
      console.error('AI Insights analyzer not initialized');
      return;
    }

    try {
      // Show loading indicator
      const loadingModal = this.createLoadingModal();
      document.body.appendChild(loadingModal);

      // Analyze with debounce
      const insights = await this.aiInsightsAnalyzer.analyzeWithDebounce();
      
      // Remove loading modal
      document.body.removeChild(loadingModal);

      // Show insights modal
      this.showInsightsModal(insights);
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      
      // Remove loading modal if it exists
      const loadingModal = document.querySelector('#nlm-loading-modal');
      if (loadingModal) {
        document.body.removeChild(loadingModal);
      }
      
      // Show error message
      this.showErrorModal('Failed to generate AI insights. Please try again.');
    }
  }

  private createLoadingModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.id = 'nlm-loading-modal';
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
        z-index: 10002;
      ">
        <div style="
          background: ${this.isDarkTheme ? '#1e1e1e' : 'white'};
          color: ${this.isDarkTheme ? 'white' : 'black'};
          padding: 32px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 3px solid ${this.isDarkTheme ? '#333' : '#f3f3f3'};
            border-top: 3px solid #1a73e8;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          "></div>
          <h3 style="margin: 0; font-size: 16px;">🧠 Analyzing Mind Map</h3>
          <p style="margin: 8px 0 0; opacity: 0.7; font-size: 14px;">Generating AI insights...</p>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    return modal;
  }

  private showInsightsModal(insights: any): void {
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
        overflow: auto;
      ">
        <div style="
          background: ${this.isDarkTheme ? '#1e1e1e' : 'white'};
          color: ${this.isDarkTheme ? 'white' : 'black'};
          padding: 24px;
          border-radius: 12px;
          max-width: 800px;
          max-height: 90vh;
          overflow: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          margin: 20px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
              🧠 AI Insights
            </h2>
            <button id="nlm-close-insights" style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: ${this.isDarkTheme ? 'white' : 'black'};
              opacity: 0.7;
              padding: 4px;
            ">✕</button>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #1a73e8; margin-bottom: 8px; font-size: 16px;">📊 Summary</h3>
            <p style="
              background: ${this.isDarkTheme ? '#2d2d2d' : '#f8f9fa'};
              padding: 12px;
              border-radius: 8px;
              margin: 0;
              line-height: 1.5;
              font-size: 14px;
            ">${insights.summary}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #1a73e8; margin-bottom: 8px; font-size: 16px;">🌳 Main Branches</h3>
            <ul style="
              background: ${this.isDarkTheme ? '#2d2d2d' : '#f8f9fa'};
              padding: 12px 12px 12px 32px;
              border-radius: 8px;
              margin: 0;
              line-height: 1.6;
              font-size: 14px;
            ">
              ${insights.mainBranches.map((branch: string) => `<li>${branch}</li>`).join('')}
            </ul>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #1a73e8; margin-bottom: 8px; font-size: 16px;">🔗 Suggested Connections</h3>
            <div style="
              background: ${this.isDarkTheme ? '#2d2d2d' : '#f8f9fa'};
              padding: 12px;
              border-radius: 8px;
              margin: 0;
              font-size: 14px;
            ">
              ${insights.suggestedConnections.length > 0 ? 
                insights.suggestedConnections.map((conn: any) => `
                  <div style="margin-bottom: 12px; padding: 8px; background: ${this.isDarkTheme ? '#1e1e1e' : 'white'}; border-radius: 6px; border-left: 3px solid #1a73e8;">
                    <strong>${conn.from}</strong> ↔ <strong>${conn.to}</strong>
                    <br><small style="opacity: 0.8;">${conn.reason}</small>
                  </div>
                `).join('') : 
                '<p style="margin: 0; opacity: 0.7; font-style: italic;">No specific connections identified</p>'
              }
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #1a73e8; margin-bottom: 8px; font-size: 16px;">💡 Suggested Missing Topics</h3>
            <ul style="
              background: ${this.isDarkTheme ? '#2d2d2d' : '#f8f9fa'};
              padding: 12px 12px 12px 32px;
              border-radius: 8px;
              margin: 0;
              line-height: 1.6;
              font-size: 14px;
            ">
              ${insights.missingTopics.map((topic: string) => `<li>${topic}</li>`).join('')}
            </ul>
          </div>

          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="nlm-refresh-insights" style="
              padding: 8px 16px;
              border-radius: 6px;
              border: 1px solid ${this.isDarkTheme ? '#555' : '#ddd'};
              background: ${this.isDarkTheme ? '#333' : 'white'};
              color: ${this.isDarkTheme ? 'white' : 'black'};
              cursor: pointer;
              transition: all 0.2s;
            ">🔄 Refresh</button>
            <button id="nlm-close-insights-footer" style="
              padding: 8px 16px;
              border-radius: 6px;
              border: none;
              background: #1a73e8;
              color: white;
              cursor: pointer;
              transition: all 0.2s;
            ">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('#nlm-close-insights')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('#nlm-close-insights-footer')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#nlm-refresh-insights')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      this.showAIInsights();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  private showErrorModal(message: string): void {
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
          max-width: 400px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        ">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h3 style="margin: 0 0 12px; color: #dc3545;">Error</h3>
          <p style="margin: 0 0 20px; line-height: 1.5;">${message}</p>
          <button id="nlm-close-error" style="
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            background: #1a73e8;
            color: white;
            cursor: pointer;
          ">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#nlm-close-error')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Unused but kept for potential future use
  // private _retry(): void {
  //   if (this.retryCount < MAX_RETRIES) {
  //     this.retryCount++;
  //     console.log(`🔄 Retrying... (${this.retryCount}/${MAX_RETRIES})`);
  //     setTimeout(() => this.init(), RETRY_DELAY * this.retryCount);
  //   }
  // }
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