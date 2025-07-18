
/**
 * On install, open welcome page.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    const url = chrome.runtime.getURL('welcome.html');
    chrome.tabs.create({ url });
  }
});

/**
 * Listen for hotkey commands defined in manifest.json.
 */
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab?.id) return;

  if (command === 'open-search' || command === 'open-advanced-filters') {
    // Send a message to the popup script
    chrome.runtime.sendMessage({ action: command });
  } else {
    // Forward other commands to the content script
    chrome.storage.sync.get(['hotkeysEnabled'], (result) => {
      if (result.hotkeysEnabled === false) return;

      chrome.tabs.sendMessage(tab.id!, { action: command })
        .catch((error) => {
          console.log('Background script: Content script not ready or tab closed:', error);
        });
    });
  }
});
