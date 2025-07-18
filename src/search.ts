import Fuse from 'fuse.js';

// Define the structure of a searchable item
interface SearchableItem {
  id: string;
  type: 'note' | 'source' | 'mindmap';
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
}

// Define the search options for Fuse.js
const fuseOptions = {
  keys: ['title', 'content', 'tags'],
  includeScore: true,
  threshold: 0.4,
};

let searchableItems: SearchableItem[] = [];
let fuse: Fuse<SearchableItem>;

/**
 * Initializes the search index with the provided items.
 * @param items The items to be indexed.
 */
export function initSearch(items: SearchableItem[]) {
  searchableItems = items;
  fuse = new Fuse(searchableItems, fuseOptions);
}

/**
 * Performs a fuzzy search on the indexed items.
 * @param query The search query.
 * @param filters The advanced filters to apply.
 * @returns The search results.
 */
export function search(query: string, filters: AdvancedFilters = {}) {
  let results;
  if (query) {
    if (!fuse) {
      return [];
    }
    results = fuse.search(query).map(result => result.item);
  } else {
    results = searchableItems;
  }


  if (filters.dateRange && filters.dateRange !== 'all') {
    const now = Date.now();
    let minDate = 0;
    if (filters.dateRange === 'last-24h') {
      minDate = now - 24 * 60 * 60 * 1000;
    } else if (filters.dateRange === 'last-7d') {
      minDate = now - 7 * 24 * 60 * 60 * 1000;
    } else if (filters.dateRange === 'last-30d') {
        minDate = now - 30 * 24 * 60 * 60 * 1000;
    }
    results = results.filter(item => item.createdAt >= minDate);
  }

  if (filters.sourceType && filters.sourceType !== 'all') {
    results = results.filter(item => item.type === filters.sourceType);
  }

  if (filters.contentLength && filters.contentLength > 0) {
    results = results.filter(item => item.content.length >= filters.contentLength);
  }

  if (filters.tags && filters.tags.length > 0) {
    results = results.filter(item => {
        return filters.tags.every(tag => item.tags.includes(tag));
    });
  }

  return results.map(item => ({ item }));
}

export interface AdvancedFilters {
    dateRange?: 'all' | 'last-24h' | 'last-7d' | 'last-30d';
    sourceType?: 'all' | 'note' | 'source' | 'mindmap';
    contentLength?: number;
    tags?: string[];
}

/**
 * Highlights the matched terms in the search results.
 * @param results The search results from Fuse.js.
 * @returns The search results with highlighted matches.
 */
export function highlightMatches(results: Fuse.FuseResult<SearchableItem>[]) {
  // This is a placeholder for the highlighting logic.
  // In a real implementation, we would use a library like `mark.js`
  // or implement our own highlighting logic.
  return results.map(result => {
    return {
      ...result.item,
      highlightedTitle: result.item.title,
      highlightedContent: result.item.content,
    };
  });
}

/**
 * A simple debounce function.
 * @param func The function to be debounced.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced function.
 */
export function debounce<F extends (...args: any[]) => any>(func: F, delay: number): (...args: Parameters<F>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function(...args: Parameters<F>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
}
