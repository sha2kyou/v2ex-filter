document.addEventListener('DOMContentLoaded', function() {
  const hiddenTopicsList = document.getElementById('hiddenTopics');
  const openSettingsButton = document.getElementById('openSettingsButton');
  const clearCacheButton = document.getElementById('clearCache');
  const status = document.getElementById('status');

  // Load and display hidden topics
  chrome.storage.local.get('hiddenTitles', function(data) {
    if (data.hiddenTitles) {
      data.hiddenTitles.forEach(function(title) {
        const li = document.createElement('li');
        li.textContent = title;
        hiddenTopicsList.appendChild(li);
      });
    }
  });

  // Open settings page
  openSettingsButton.addEventListener('click', function() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('settings.html'));
    }
  });

  // Clear cache
  clearCacheButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "clearCache"}, function(response) {
      if (response.success) {
        status.textContent = '缓存已清除。';
        hiddenTopicsList.innerHTML = ''; // Clear the displayed list
        setTimeout(function() {
          status.textContent = '';
        }, 2000);
      }
    });
  });

  function reloadActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  }

  // Listen for changes in selectedModel and reload tab
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.selectedModel) {
      reloadActiveTab();
    }
  });
});