const autoExpandCheckbox = document.getElementById('auto-expand') as HTMLInputElement;
const hotkeysEnabledCheckbox = document.getElementById('hotkeys-enabled') as HTMLInputElement;
const defaultDepthSelect = document.getElementById('default-depth') as HTMLSelectElement;
const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
const optionsForm = document.getElementById('options-form') as HTMLFormElement;
const statusDiv = document.getElementById('status');

// Load saved options
chrome.storage.sync.get(['autoExpand', 'hotkeysEnabled', 'defaultDepth', 'theme'], (result) => {
  autoExpandCheckbox.checked = result.autoExpand !== false; // default to true
  hotkeysEnabledCheckbox.checked = result.hotkeysEnabled !== false; // default to true
  if (defaultDepthSelect) {
    const depth = typeof result.defaultDepth === 'number' ? result.defaultDepth.toString() : '0';
    defaultDepthSelect.value = depth;
  }
  if (themeSelect) {
    themeSelect.value = result.theme || 'auto';
  }
});

// Save options
optionsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const autoExpand = autoExpandCheckbox.checked;
  const hotkeysEnabled = hotkeysEnabledCheckbox.checked;
  const defaultDepth = parseInt(defaultDepthSelect.value, 10);
  const theme = themeSelect.value;

  chrome.storage.sync.set({ autoExpand, hotkeysEnabled, defaultDepth, theme }, () => {
    if (statusDiv) {
      statusDiv.textContent = 'Options saved.';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 1500);
    }
  });
});
