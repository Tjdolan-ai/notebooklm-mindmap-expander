import { describe, it, expect, vi } from 'vitest';
import { MindMapNode, JSONExporter, MarkdownExporter, CSVExporter } from '../src/exporting/exporters';
import * as download from '../src/exporting/download';

// Mock the download function
vi.mock('../src/exporting/download', () => ({
  saveAs: vi.fn(),
}));

const mockData: MindMapNode[] = [
  {
    id: 'root',
    text: 'Root Node',
    depth: 0,
    children: [
      {
        id: 'child1',
        text: 'Child 1',
        depth: 1,
        children: [],
      },
      {
        id: 'child2',
        text: 'Child 2',
        depth: 1,
        children: [
          {
            id: 'grandchild1',
            text: 'Grandchild 1',
            depth: 2,
            children: [],
          },
        ],
      },
    ],
  },
];

describe('Exporters', () => {
  it('JSONExporter should export correct JSON', () => {
    const exporter = new JSONExporter();
    exporter.export(mockData);
    expect(download.saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      'mind-map.json'
    );
    const blob = (download.saveAs as vi.Mock).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
  });

  it('MarkdownExporter should export correct Markdown', () => {
    const exporter = new MarkdownExporter();
    exporter.export(mockData);
    expect(download.saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      'mind-map.md'
    );
    const blob = (download.saveAs as vi.Mock).mock.calls[1][0] as Blob;
    expect(blob.type).toBe('text/markdown');
  });

  it('CSVExporter should export correct CSV', () => {
    const exporter = new CSVExporter();
    exporter.export(mockData);
    expect(download.saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      'mind-map.csv'
    );
    const blob = (download.saveAs as vi.Mock).mock.calls[2][0] as Blob;
    expect(blob.type).toBe('text/csv');
  });
});
