import { describe, it, expect, vi } from 'vitest';

// Mocking a simplified version of a function you might have in expander.ts
// You will need to replace this with an actual import from '../src/expander.ts'
const exportMindMap = () => {
  // This is a placeholder for your actual export logic.
  // It should query the DOM for mind map nodes and format them.
  const rootNode = document.querySelector('[data-node-id="root"]');
  if (!rootNode) return null;

  return {
    topic: rootNode.textContent || 'Root',
    children: Array.from(rootNode.querySelectorAll('[data-node-id]'))
      .filter(el => el !== rootNode)
      .map(el => ({ topic: el.textContent || 'Child' }))
  };
};

describe('Mind Map Exporter', () => {
  it('should export the mind map data correctly', () => {
    // 1. Setup a mock DOM
    document.body.innerHTML = `
      <div>
        <div data-node-id="root">
          Root Topic
          <div data-node-id="child1">Child 1</div>
          <div data-node-id="child2">Child 2</div>
        </div>
      </div>
    `;

    // 2. Run the export function
    const result = exportMindMap();

    // 3. Assert the expected output
    expect(result).not.toBeNull();
    expect(result?.topic).toBe('Root Topic');
    expect(result?.children).toHaveLength(2);
    expect(result?.children[0].topic).toBe('Child 1');
  });

  it('should return null if the mind map is not found', () => {
    // Setup a DOM without the mind map structure
    document.body.innerHTML = '<div>No mind map here</div>';
    const result = exportMindMap();
    expect(result).toBeNull();
  });
});
