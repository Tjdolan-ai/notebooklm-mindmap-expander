// Background service worker for NotebookLM Mind Map Expander Pro
chrome.runtime.onInstalled.addListener(() => {
  console.log('NotebookLM Mind Map Expander Pro installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.url?.includes('notebooklm.google.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleExpander' });
  }
});
