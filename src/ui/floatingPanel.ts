import { IExporter, JSONExporter, MarkdownExporter, CSVExporter, PDFExporter } from '../exporting/exporters';

// Define the structure for the panel's state
interface PanelState {
  isOpen: boolean;
  position: { x: number; y: number };
}

export class FloatingPanel {
  private panel: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private state: PanelState = {
    isOpen: true,
    position: { x: 20, y: 80 },
  };

  constructor(private mindMapData: () => any[]) {
    this.init();
  }

  private async init() {
    await this.loadState();
    this.createPanel();
    this.attachEventListeners();
  }

  private async loadState() {
    const storedState = await chrome.storage.sync.get('panelState');
    if (storedState.panelState) {
      this.state = storedState.panelState;
    }
  }

  private saveState() {
    chrome.storage.sync.set({ panelState: this.state });
  }

  private createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'notebooklm-utils-panel';
    this.shadowRoot = this.panel.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
      }
      .panel {
        position: fixed;
        top: ${this.state.position.y}px;
        left: ${this.state.position.x}px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        width: 200px;
      }
      .header {
        cursor: move;
        padding: 4px;
        font-weight: 600;
        margin-bottom: 8px;
        user-select: none;
      }
      .button-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .button {
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      }
      .button:hover {
        background: #e8e8e8;
        transform: translateY(-1px);
      }
    `;

    const panelContent = document.createElement('div');
    panelContent.className = 'panel';
    panelContent.innerHTML = `
      <div class="header">NotebookLM Utils</div>
      <div class="button-grid">
        <button class="button" data-format="json">Export JSON</button>
        <button class="button" data-format="md">Export MD</button>
        <button class="button" data-format="csv">Export CSV</button>
        <button class="button" data-format="pdf">Export PDF</button>
      </div>
    `;

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(panelContent);
    document.body.appendChild(this.panel);
  }

  private attachEventListeners() {
    if (!this.panel || !this.shadowRoot) return;

    const header = this.shadowRoot.querySelector('.header');
    if (header) {
      this.makeDraggable(header as HTMLElement);
    }

    this.shadowRoot.querySelector('.button-grid')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('button')) {
        const format = target.dataset.format;
        this.handleExport(format);
      }
    });
  }

  private makeDraggable(element: HTMLElement) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    element.onmousedown = (e) => {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    };

    const elementDrag = (e: MouseEvent) => {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      if (this.panel) {
        this.state.position.y = this.panel.offsetTop - pos2;
        this.state.position.x = this.panel.offsetLeft - pos1;
        this.panel.style.top = `${this.state.position.y}px`;
        this.panel.style.left = `${this.state.position.x}px`;
      }
    };

    const closeDragElement = () => {
      document.onmouseup = null;
      document.onmousemove = null;
      this.saveState();
    };
  }

  private handleExport(format: string | undefined) {
    if (!format) return;

    const data = this.mindMapData();
    let exporter: IExporter;

    switch (format) {
      case 'json':
        exporter = new JSONExporter();
        break;
      case 'md':
        exporter = new MarkdownExporter();
        break;
      case 'csv':
        exporter = new CSVExporter();
        break;
      case 'pdf':
        exporter = new PDFExporter();
        break;
      default:
        console.warn(`Unknown export format: ${format}`);
        return;
    }

    exporter.export(data);
  }
}
