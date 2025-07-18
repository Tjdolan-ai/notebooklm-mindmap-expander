document.addEventListener('DOMContentLoaded', () => {
  const openNlmBtn = document.getElementById('open-nlm');
  const settingsBtn = document.getElementById('settings-btn');
  const statusDiv = document.getElementById('status');
  const exportFormatSelect = document.getElementById('export-format') as HTMLSelectElement;
  const exportCurrentBtn = document.getElementById('export-current');
  const exportAllBtn = document.getElementById('export-all');
  const progressBar = document.getElementById('progress-bar');
  const progressBarInner = document.getElementById('progress-bar-inner');

  if (openNlmBtn) {
    openNlmBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://notebooklm.google.com/' });
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (statusDiv) {
      if (tabs[0]?.url?.includes('notebooklm.google.com')) {
        statusDiv.innerHTML = '✅ Active on current tab';
        statusDiv.style.borderColor = '#4caf50';
        statusDiv.style.backgroundColor = '#e8f5e9';
        statusDiv.style.color = '#1b5e20';
      } else {
        statusDiv.innerHTML = '💤 Navigate to NotebookLM to activate';
        statusDiv.style.borderColor = '#ff9800';
        statusDiv.style.backgroundColor = '#fff3e0';
        statusDiv.style.color = '#e65100';
      }
    }
  });

  const showProgress = (show: boolean) => {
    if (progressBar) {
      progressBar.style.display = show ? 'block' : 'none';
    }
  };

  const updateProgress = (percentage: number) => {
    if (progressBarInner) {
      progressBarInner.style.width = `${percentage}%`;
    }
  };

  const handleExport = async (all: boolean) => {
    showProgress(true);
    updateProgress(0);

    const format = exportFormatSelect.value;

    // This will be implemented in the background script
    chrome.runtime.sendMessage({
      action: 'export',
      format,
      all
    }, (response) => {
      if (response.success) {
        // Handle success, maybe show a checkmark
      } else {
        // Handle error
      }
      showProgress(false);
    });
  };

  if (exportCurrentBtn) {
    exportCurrentBtn.addEventListener('click', () => handleExport(false));
  }

  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => handleExport(true));
  }

  // Listen for progress updates from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'exportProgress') {
      updateProgress(message.progress);
    }
  });
});
