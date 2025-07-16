// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {

    // Open NotebookLM button
    const openNLMBtn = document.getElementById('open-nlm');
    if (openNLMBtn) {
        openNLMBtn.addEventListener('click', function () {
            chrome.tabs.create({ url: 'https://notebooklm.google.com/' });
        });
    }

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function () {
            chrome.runtime.openOptionsPage();
        });
    }

    // Check if we're on NotebookLM and update status
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const statusDiv = document.getElementById('status');
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
    });
});
