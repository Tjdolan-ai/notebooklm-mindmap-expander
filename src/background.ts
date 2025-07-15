
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
    chrome.tabs.sendMessage(tab.id!, { action: command });
  });
});
