const autoExpandCheckbox = document.getElementById('auto-expand') as HTMLInputElement;
const hotkeysEnabledCheckbox = document.getElementById('hotkeys-enabled') as HTMLInputElement;
const optionsForm = document.getElementById('options-form') as HTMLFormElement;
const statusDiv = document.getElementById('status');

// Load saved options
chrome.storage.sync.get(['autoExpand', 'hotkeysEnabled'], (result) => {
  autoExpandCheckbox.checked = result.autoExpand !== false; // default to true
  hotkeysEnabledCheckbox.checked = result.hotkeysEnabled !== false; // default to true
});

// Save options
optionsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const autoExpand = autoExpandCheckbox.checked;
  const hotkeysEnabled = hotkeysEnabledCheckbox.checked;

  chrome.storage.sync.set({ autoExpand, hotkeysEnabled }, () => {
    if (statusDiv) {
      statusDiv.textContent = 'Options saved.';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 1500);
    }
  });
});
