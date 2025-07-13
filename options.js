document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('theme');
  chrome.storage.sync.get('themePreference', (res) => {
    sel.value = res.themePreference || 'auto';
  });
  sel.addEventListener('change', () => {
    chrome.storage.sync.set({ themePreference: sel.value });
  });
});
