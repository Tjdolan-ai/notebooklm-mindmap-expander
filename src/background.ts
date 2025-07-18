
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

import { CitationManager } from './citation';

const citationManager = new CitationManager();

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'toggle-side-panel') {
    chrome.sidePanel.open({ windowId: sender.tab?.windowId });
  } else if (message.action === 'copy-citation') {
    const citation = citationManager.generateCitation(message.metadata, 'apa');
    chrome.scripting.executeScript({
      target: { tabId: sender.tab!.id! },
      func: (citation) => {
        navigator.clipboard.writeText(citation);
      },
      args: [citation],
    });
  }
});
