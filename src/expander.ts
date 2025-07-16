/**
 * NotebookLM Mind Map Auto-Expander (FIXED)
 * -----------------------------------------
 * Content script that safely expands mind map nodes without affecting sidebar
 * © 2025 Visionary42 — MIT License
 */

import { SafeClicker } from './safeClicker';

const DEBOUNCE_MS = 300;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 10;

// Updated selectors based on current NotebookLM structure
const CHAT_INPUT_SELECTORS = [
  '.conversationRecorder_constructor',
  '[contenteditable="true"]',
  'mat-form-field textarea',
  'textarea[placeholder*="chat"]',
  'textarea[aria-label*="chat"]',
  '.mce-autosize-textarea' // Legacy fallback
];

const PLAYBACK_SELECTORS = [
  '[aria-label="Play"]',
  'button[mattooltip*="Play"]',
  '.mat-icon:has-text("play_arrow")',
  '[data-test-id="playback-button"]',
  'button[aria-label*="play"]'
];

const MIND_MAP_SELECTORS = [
  '[data-testid="mind-map-container"]',
  '.mind-map-container',
  '.mind-map-wrapper',
  '[class*="mind-map"][role="application"]',
  '.studio-panel [class*="mind-map"]',
  'div[class*="MindMap"]',
  '.notebook-mind-map',
  '[aria-label*="mind map"]'
];

const STUDIO_PANEL_SELECTORS = [
  '.studio-panel',
  '[data-testid="studio-panel"]',
  'div[class*="studio"]',
  '#studio-panel',
  '.notebook-studio',
  '[role="main"] [class*="studio"]'
];

class NotebookLMExpander {
  private container: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private retryCount = 0;
  private debounceTimer: number | null = null;
  private isExpanded = false;

  constructor() {
    this.init();
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    // Check if chrome.runtime is available (extension context)
    if (!chrome?.runtime?.onMessage) {
      console.warn('Chrome runtime not available');
      return;
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === 'expand-all') {
        this.expandAll();
        sendResponse({ success: true });
      } else if (message.action === 'collapse-all') {
        this.collapseAll();
        sendResponse({ success: true });
      }
      return true; // Keep message channel open for async response
    });
  }

  private async init(): Promise<void> {
    console.log('🌳 NotebookLM Expander: Initializing...');

    try {
      // Wait for NotebookLM interface
      await this.waitForInterface();

      // Setup observers
      this.setupObserver();

      // Register hotkeys
      this.registerHotkeys();

      // Initial check
      await this.checkForMindMap();

      console.log('✅ NotebookLM Expander: Ready!');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.retry();
    }
  }

  private async waitForInterface(): Promise<void> {
    // Use SafeClicker to wait for studio panel
    const element = await SafeClicker.waitForElement(STUDIO_PANEL_SELECTORS, 10000);
    if (element) {
      console.log('✅ Studio panel found using SafeClicker');
      return;
    }

    throw new Error('Studio panel not found');
  }

  private setupObserver(): void {
    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        this.checkForMindMap();
      }, DEBOUNCE_MS);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-testid', 'aria-expanded']
    });
  }

  private async checkForMindMap(): Promise<void> {
    // Use updated selectors for mind map container
    const container = await SafeClicker.waitForElement(MIND_MAP_SELECTORS, 1000);

    if (container && container !== this.container) {
      this.container = container as HTMLElement;
      console.log('🎯 Mind map detected using SafeClicker!');
      this.injectControls();

      // Check if auto-expand is enabled
      const settings = await this.getSettings();
      if (settings.autoExpand) {
        await this.expandAll();
      }
    }
  }

  private injectControls(): void {
    if (!this.container || document.getElementById('nlm-expander-controls')) return;

    const controls = document.createElement('div');
    controls.id = 'nlm-expander-controls';
    controls.innerHTML = `
      <button id="nlm-expand-toggle" title="Expand/Collapse All (Ctrl+Shift+E)">
        <span class="expand-icon">▶</span>
      </button>
      <button id="nlm-export" title="Export Mind Map">
        <span class="export-icon">📋</span>
      </button>
    `;

    this.container.style.position = 'relative';
    this.container.appendChild(controls);

    // Event listeners
    document.getElementById('nlm-expand-toggle')?.addEventListener('click', () => {
      this.isExpanded ? this.collapseAll() : this.expandAll();
    });

    document.getElementById('nlm-export')?.addEventListener('click', () => {
      this.exportMindMap();
    });
  }

  async expandAll(): Promise<void> {
    console.log('🌳 Expanding all nodes...');

    // Method 1: Try toolbar button (safer)
    const expandButton = await this.findToolbarButton('expand');
    if (expandButton) {
      const success = await SafeClicker.safeClick(expandButton);
      if (success) {
        this.isExpanded = true;
        this.updateToggleIcon(true);
        console.log('✅ Used toolbar expand button');
        return;
      }
    }

    // Method 2: Expand individual nodes
    await this.toggleNodes(true);
  }

  async collapseAll(): Promise<void> {
    console.log('🌲 Collapsing all nodes...');

    // Method 1: Try toolbar button
    const collapseButton = await this.findToolbarButton('collapse');
    if (collapseButton) {
      const success = await SafeClicker.safeClick(collapseButton);
      if (success) {
        this.isExpanded = false;
        this.updateToggleIcon(false);
        console.log('✅ Used toolbar collapse button');
        return;
      }
    }

    // Method 2: Collapse individual nodes
    await this.toggleNodes(false);
  }

  private async findToolbarButton(type: 'expand' | 'collapse'): Promise<HTMLElement | null> {
    const selectors = type === 'expand' ? [
      '[aria-label="Expand all"]',
      '[data-testid="expand-all-button"]',
      'button[title*="Expand all"]',
      '.mind-map-toolbar button:has(svg[class*="expand"])',
      // Specific selectors that won't catch sidebar buttons
      '.mind-map-container button[aria-label*="Expand all"]',
      '.studio-panel button[aria-label*="Expand all"]',
      'button[aria-label*="expand"]'
    ] : [
      '[aria-label="Collapse all"]',
      '[data-testid="collapse-all-button"]',
      'button[title*="Collapse all"]',
      '.mind-map-toolbar button:has(svg[class*="collapse"])',
      // Specific selectors that won't catch sidebar buttons
      '.mind-map-container button[aria-label*="Collapse all"]',
      '.studio-panel button[aria-label*="Collapse all"]',
      'button[aria-label*="collapse"]'
    ];

    // Use SafeClicker to find the button
    const button = await SafeClicker.waitForElement(selectors, 2000);
    if (button && this.isValidMindMapButton(button as HTMLElement)) {
      return button as HTMLElement;
    }

    return null;
  }

  private isValidMindMapButton(button: HTMLElement): boolean {
    // Ensure button is within mind map context, not sidebar
    const parent = button.closest('.mind-map-container, .studio-panel, [data-testid="mind-map-container"]');
    const inSidebar = button.closest('.sidebar, [class*="sidebar"], nav');

    return !!parent && !inSidebar;
  }

  private async toggleNodes(expand: boolean): Promise<void> {
    const targetState = expand ? 'false' : 'true';
    const nodeSelectors = [
      `.mind-map-container [aria-expanded="${targetState}"]`,
      `.studio-panel [aria-expanded="${targetState}"]`,
      `[data-testid="mind-map-container"] [aria-expanded="${targetState}"]`,
      `[class*="mind-map"] [aria-expanded="${targetState}"]`
    ];

    let toggledCount = 0;
    const processedNodes = new Set<HTMLElement>();

    for (const selector of nodeSelectors) {
      const nodes = document.querySelectorAll<HTMLElement>(selector);

      for (const node of nodes) {
        if (processedNodes.has(node)) continue;

        // Validate it's a mind map node button
        if (this.isValidNodeButton(node)) {
          const success = await SafeClicker.safeClick(node);
          if (success) {
            processedNodes.add(node);
            toggledCount++;

            // Small delay to prevent UI overload
            if (toggledCount % 5 === 0) {
              await this.delay(50);
            }
          }
        }
      }
    }

    this.isExpanded = expand;
    this.updateToggleIcon(expand);
    console.log(`✅ Toggled ${toggledCount} nodes using SafeClicker`);
  }

  private isValidNodeButton(element: HTMLElement): boolean {
    // Must be a button
    if (element.tagName !== 'BUTTON') return false;

    // Must be within mind map context
    const inMindMap = element.closest('.mind-map-container, [data-testid="mind-map-container"], .studio-panel');
    const inSidebar = element.closest('.sidebar, [class*="sidebar"], nav');

    // Must have expand/collapse indicators
    const hasAriaExpanded = element.hasAttribute('aria-expanded');
    const hasExpandIcon = !!element.querySelector('[class*="chevron"], [class*="arrow"], .expand-icon');

    return !!inMindMap && !inSidebar && (hasAriaExpanded || hasExpandIcon);
  }

  private updateToggleIcon(expanded: boolean): void {
    const icon = document.querySelector('#nlm-expand-toggle .expand-icon');
    if (icon) {
      icon.textContent = expanded ? '▼' : '▶';
      icon.classList.toggle('expanded', expanded);
    }
  }

  private async exportMindMap(): Promise<void> {
    const text = this.extractMindMapText();
    this.showExportModal(text);
  }

  private extractMindMapText(): string {
    if (!this.container) return 'Mind map not found';

    let outline = 'NotebookLM Mind Map Export\n' + '='.repeat(30) + '\n\n';

    const walk = (element: Element, depth = 0): void => {
      // Find node text
      const textSelectors = [
        '.node-label-text',
        '[class*="node-text"]',
        '[class*="node-content"]',
        'span[class*="label"]'
      ];

      let nodeText = '';
      for (const selector of textSelectors) {
        const textEl = element.querySelector(selector);
        if (textEl?.textContent) {
          nodeText = textEl.textContent.trim();
          break;
        }
      }

      if (nodeText) {
        outline += '  '.repeat(depth) + '- ' + nodeText + '\n';
      }

      // Find child nodes
      const childSelectors = [
        ':scope > .node-children > .node-child',
        ':scope > [class*="children"] > [class*="child"]',
        ':scope > ul > li'
      ];

      for (const selector of childSelectors) {
        const children = element.querySelectorAll(selector);
        children.forEach(child => walk(child, depth + 1));
      }
    };

    // Find root nodes
    const rootSelectors = [
      '.mind-map-root',
      '.root-node',
      '[class*="root-node"]',
      '.mind-map-container > .node'
    ];

    for (const selector of rootSelectors) {
      const roots = this.container.querySelectorAll(selector);
      if (roots.length > 0) {
        roots.forEach(root => walk(root, 0));
        break;
      }
    }

    return outline || 'Could not extract mind map structure';
  }

  private showExportModal(content: string): void {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div id="nlm-export-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 600px;
          max-height: 80vh;
          overflow: auto;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          <h3>Mind Map Export</h3>
          <pre style="
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
          ">${content}</pre>
          <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button id="nlm-copy-export">Copy to Clipboard</button>
            <button id="nlm-close-export">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('nlm-copy-export')?.addEventListener('click', () => {
      navigator.clipboard.writeText(content);
      alert('Copied to clipboard!');
    });

    document.getElementById('nlm-close-export')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  private registerHotkeys(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;

      if (e.key === 'E' || e.key === 'e') {
        e.preventDefault();
        this.expandAll();
      } else if (e.key === 'C' || e.key === 'c') {
        e.preventDefault();
        this.collapseAll();
      }
    });
  }

  private async getSettings(): Promise<{ autoExpand: boolean }> {
    return new Promise((resolve) => {
      // Check if chrome.storage is available
      if (!chrome?.storage?.sync) {
        console.warn('Chrome storage not available, using defaults');
        resolve({ autoExpand: true });
        return;
      }

      try {
        chrome.storage.sync.get(['autoExpand'], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('Storage error:', chrome.runtime.lastError);
            resolve({ autoExpand: true }); // Default value
          } else {
            resolve({ autoExpand: result.autoExpand !== false });
          }
        });
      } catch (error) {
        console.warn('Storage access error:', error);
        resolve({ autoExpand: true }); // Default value
      }
    });
  }

  private retry(): void {
    if (this.retryCount < MAX_RETRIES) {
      this.retryCount++;
      console.log(`🔄 Retrying... (${this.retryCount}/${MAX_RETRIES})`);
      setTimeout(() => this.init(), RETRY_DELAY * this.retryCount);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize only once
declare global {
  interface Window {
    notebookLMExpander?: NotebookLMExpander;
  }
}

if (typeof window !== 'undefined' && !window.notebookLMExpander) {
  window.notebookLMExpander = new NotebookLMExpander();
}