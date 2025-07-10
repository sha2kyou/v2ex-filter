document.addEventListener('DOMContentLoaded', function() {
  const hiddenTopicsList = document.getElementById('hiddenTopics');
  const openSettingsButton = document.getElementById('openSettingsButton');
  const clearCacheButton = document.getElementById('clearCache');
  const toggleFilterButton = document.getElementById('toggleFilterButton');
  const status = document.getElementById('status');

  let isShowingAll = false; // Initial state: showing filtered topics (button says "显示全部" to switch to all)

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

  // Toggle filter button
  toggleFilterButton.addEventListener('click', function() {
    if (isShowingAll) { // If currently showing all topics (button says "显示过滤")
      // Action: switch to filtered view
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "showFilteredTopics"});
        status.textContent = '显示过滤后话题。';
        setTimeout(function() {
          status.textContent = '';
        }, 2000);
      });
      toggleFilterButton.textContent = '显示全部'; // Button text changes to "Show All" (meaning, click me to show all)
    } else { // If currently showing filtered topics (button says "显示全部")
      // Action: switch to all topics view
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "showAllTopics"});
        status.textContent = '显示所有话题。';
        setTimeout(function() {
          status.textContent = '';
        }, 2000);
      });
      toggleFilterButton.textContent = '显示过滤'; // Button text changes to "Show Filtered" (meaning, click me to show filtered)
    }
    isShowingAll = !isShowingAll; // Toggle state
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