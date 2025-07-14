chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    const url = chrome.runtime.getURL('welcome.html');
    chrome.tabs.create({ url });
  }
});

// Listen for hotkey commands defined in manifest.json
chrome.commands.onCommand.addListener((command, tab) => {
  if (tab?.id) {
    // Send a message to the active tab's content script to perform the action.
    chrome.tabs.sendMessage(tab.id, { action: command });
  }
});
