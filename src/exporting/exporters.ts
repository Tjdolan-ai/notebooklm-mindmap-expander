/* eslint-disable @typescript-eslint/no-unused-vars */
import { saveAs } from './download';

// Define a common structure for a mind map node
export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  depth: number;
}

// Base Exporter Interface
export interface IExporter {
  export(data: MindMapNode[]): void;
}

// JSON Exporter
export class JSONExporter implements IExporter {
  export(data: MindMapNode[]): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    saveAs(blob, 'mind-map.json');
  }
}

// Markdown Exporter
export class MarkdownExporter implements IExporter {
  private formatNode(node: MindMapNode): string {
    let markdown = '';
    markdown += `${'  '.repeat(node.depth)}* ${node.text}\n`;
    for (const child of node.children) {
      markdown += this.formatNode(child);
    }
    return markdown;
  }

  export(data: MindMapNode[]): void {
    let markdown = '# Mind Map Export\n\n';
    for (const node of data) {
      markdown += this.formatNode(node);
    }
    const blob = new Blob([markdown], { type: 'text/markdown' });
    saveAs(blob, 'mind-map.md');
  }
}

// CSV Exporter
export class CSVExporter implements IExporter {
  private flattenNodes(nodes: MindMapNode[]): Omit<MindMapNode, 'children'>[] {
    const flattened: Omit<MindMapNode, 'children'>[] = [];
    const traverse = (node: MindMapNode, parentId: string | null = null) => {
      flattened.push({ id: node.id, text: node.text, depth: node.depth });
      for (const child of node.children) {
        traverse(child, node.id);
      }
    };
    for (const node of nodes) {
      traverse(node);
    }
    return flattened;
  }

  export(data: MindMapNode[]): void {
    const flattenedData = this.flattenNodes(data);
    let csv = 'id,text,depth\n';
    for (const row of flattenedData) {
      csv += `"${row.id}","${row.text}",${row.depth}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, 'mind-map.csv');
  }
}

// PDF Exporter (Placeholder)
export class PDFExporter implements IExporter {
  export(data: MindMapNode[]): void {
    // PDF generation is complex and would require a library like jsPDF.
    // This is a placeholder for future implementation.
    alert('PDF export is not yet implemented.');
  }
}
