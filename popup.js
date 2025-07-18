import { initSearch, search, highlightMatches, debounce } from './src/search.js';

// Mock data for demonstration purposes
const mockData = [
  { id: '1', type: 'note', title: 'My first note', content: 'This is the content of my first note.', tags: ['personal', 'thoughts'], createdAt: Date.now() },
  { id: '2', type: 'source', title: 'A cool article', content: 'This is an article I saved.', tags: ['research', 'web'], createdAt: Date.now() - 86400000 },
  { id: '3', type: 'mindmap', title: 'Project plan', content: 'This is the mind map for my project.', tags: ['work', 'planning'], createdAt: Date.now() - 172800000 },
  { id: '4', type: 'note', title: 'A very old note', content: 'This note is from a long time ago.', tags: ['archive'], createdAt: Date.now() - 31536000000 },
];

let currentFilters = {};

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {
    // Initialize search
    initSearch(mockData);

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const advancedFilterBtn = document.getElementById('advanced-filter-btn');
    const advancedFiltersContainer = document.createElement('div');
    advancedFiltersContainer.id = 'advanced-filters-container';
    advancedFiltersContainer.style.display = 'none';
    document.querySelector('.content').appendChild(advancedFiltersContainer);


    const debouncedSearch = debounce(() => {
        performSearch();
    }, 300);

    searchInput.addEventListener('input', () => {
        debouncedSearch();
    });

    searchInput.addEventListener('focus', () => {
        loadSearchHistory();
    });

    function loadSearchHistory() {
        chrome.storage.local.get('searchHistory', (data) => {
            const history = data.searchHistory || [];
            const historyContainer = document.getElementById('search-history');
            if (!historyContainer) {
                const container = document.createElement('div');
                container.id = 'search-history';
                searchResults.before(container);
            } else {
                historyContainer.innerHTML = '';
            }

            if (history.length > 0) {
                const title = document.createElement('h4');
                title.textContent = 'Recent Searches';
                historyContainer.appendChild(title);

                const ul = document.createElement('ul');
                history.forEach(query => {
                    const li = document.createElement('li');
                    li.textContent = query;
                    li.addEventListener('click', () => {
                        searchInput.value = query;
                        performSearch();
                        historyContainer.style.display = 'none';
                    });
                    ul.appendChild(li);
                });
                historyContainer.appendChild(ul);
            }
        });
    }

    function performSearch() {
        const query = searchInput.value;
        if (query) {
            saveSearchQuery(query);
        }
        const results = search(query, currentFilters);
        const highlighted = highlightMatches(results);
        renderResults(highlighted);
    }

    function saveSearchQuery(query) {
        chrome.storage.local.get('searchHistory', (data) => {
            let history = data.searchHistory || [];
            // Add to the beginning of the array
            history.unshift(query);
            // Remove duplicates
            history = [...new Set(history)];
            // Keep only the last 10 queries
            history = history.slice(0, 10);
            chrome.storage.local.set({ searchHistory: history });
        });
    }

    function renderResults(results) {
        searchResults.innerHTML = '';
        if (results.length === 0) {
            searchResults.innerHTML = '<p>No results found.</p>';
            return;
        }

        const ul = document.createElement('ul');
        results.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `
                <h3>${result.item.highlightedTitle || result.item.title}</h3>
                <p>${result.item.highlightedContent || result.item.content}</p>
                <div class="result-actions">
                    <button class="cite-btn" data-id="${result.item.id}">Cite</button>
                    <button class="export-btn" data-id="${result.item.id}">Export</button>
                </div>
            `;
            ul.appendChild(li);
        });
        searchResults.appendChild(ul);

        document.querySelectorAll('.cite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const item = mockData.find(item => item.id === id);
                alert(`Cite: ${item.title}`);
            });
        });

        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const item = mockData.find(item => item.id === id);
                alert(`Export: ${item.title}`);
            });
        });
    }

    advancedFilterBtn.addEventListener('click', () => {
        if (advancedFiltersContainer.style.display === 'none') {
            fetch('advanced-filters.html')
                .then(response => response.text())
                .then(html => {
                    advancedFiltersContainer.innerHTML = html;
                    advancedFiltersContainer.style.display = 'block';
                    addFilterEventListeners();
                });
        } else {
            advancedFiltersContainer.style.display = 'none';
        }
    });

    function addFilterEventListeners() {
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        applyFiltersBtn.addEventListener('click', () => {
            applyFilters();
            advancedFiltersContainer.style.display = 'none';
        });

        const savePresetBtn = document.getElementById('save-preset-btn');
        savePresetBtn.addEventListener('click', () => {
            const presetName = prompt('Enter a name for this preset:');
            if (presetName) {
                const preset = getFiltersFromUI();
                chrome.storage.sync.get('searchPresets', (data) => {
                    const presets = data.searchPresets || {};
                    presets[presetName] = preset;
                    chrome.storage.sync.set({ searchPresets: presets }, () => {
                        alert(`Preset "${presetName}" saved!`);
                        loadPresets();
                    });
                });
            }
        });

        loadPresets();
    }

    function getFiltersFromUI() {
        return {
            dateRange: document.getElementById('date-range').value,
            sourceType: document.getElementById('source-type').value,
            contentLength: document.getElementById('content-length').value,
            tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean),
        };
    }

    function applyFilters() {
        currentFilters = getFiltersFromUI();
        performSearch();
    }

    function loadPresets() {
        chrome.storage.sync.get('searchPresets', (data) => {
            const presets = data.searchPresets || {};
            const presetsContainer = document.getElementById('presets-container');
            if (!presetsContainer) {
                const container = document.createElement('div');
                container.id = 'presets-container';
                advancedFiltersContainer.querySelector('h2').after(container);
            } else {
                presetsContainer.innerHTML = '';
            }

            for (const presetName in presets) {
                const preset = presets[presetName];
                const button = document.createElement('button');
                button.textContent = presetName;
                button.addEventListener('click', () => {
                    document.getElementById('date-range').value = preset.dateRange;
                    document.getElementById('source-type').value = preset.sourceType;
                    document.getElementById('content-length').value = preset.contentLength;
                    document.getElementById('tags').value = preset.tags.join(', ');
                    applyFilters();
                });
                presetsContainer.appendChild(button);
            }
        });

        const contentLengthInput = document.getElementById('content-length');
        const contentLengthValue = document.getElementById('content-length-value');
        contentLengthInput.addEventListener('input', () => {
            contentLengthValue.textContent = contentLengthInput.value;
        });
    }


    // Open NotebookLM button
    const openNLMBtn = document.getElementById('open-nlm');
    if (openNLMBtn) {
        openNLMBtn.addEventListener('click', function () {
            chrome.tabs.create({ url: 'https://notebooklm.google.com/' });
        });
    }

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function () {
            chrome.runtime.openOptionsPage();
        });
    }

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'open-search') {
            searchInput.focus();
        } else if (message.action === 'open-advanced-filters') {
            advancedFilterBtn.click();
        }
    });
});
