
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
 * Listen for hotkey commands defined in manifest.json, but only forward if hotkeysEnabled is true.
 */
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab?.id) return;

  chrome.storage.sync.get(['hotkeysEnabled'], (result) => {
    if (result.hotkeysEnabled === false) return;

    // Send message to content script with error handling
    chrome.tabs.sendMessage(tab.id!, { action: command })
      .catch((error) => {
        console.log('Background script: Content script not ready or tab closed:', error);
      });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'export') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
          sendResponse(response);
        });
      }
    });
    return true; // Indicates that the response is sent asynchronously
  } else if (request.action === 'exportProgress') {
    // Forward progress to popup
    chrome.runtime.sendMessage(request);
  }
});
