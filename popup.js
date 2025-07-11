document.addEventListener('DOMContentLoaded', function() {
  const hiddenTopicsList = document.getElementById('hiddenTopics');
  const openSettingsButton = document.getElementById('openSettingsButton');
  const clearCacheButton = document.getElementById('clearCache');
  const toggleFilterButton = document.getElementById('toggleFilterButton');
  const hiddenTopicsCount = document.getElementById('hiddenTopicsCount'); // Get reference to the new span
  const toastContainer = document.getElementById('toastContainer');

  // Modal elements
  const confirmationModal = document.getElementById('confirmationModal');
  const confirmClearCacheButton = document.getElementById('confirmClearCache');
  const cancelClearCacheButton = document.getElementById('cancelClearCache');

  // Function to show toast notifications
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Show the toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Hide and remove the toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      }, { once: true });
    }, 1500);
  }

  let isShowingAll = false; // Initial state: showing filtered topics (button says "显示全部" to switch to all)

  // Function to render hidden topics
  function renderHiddenTopics() {
    hiddenTopicsList.innerHTML = ''; // Clear existing list
    chrome.storage.local.get('hiddenTitles', function(data) {
      const hiddenCount = data.hiddenTitles ? data.hiddenTitles.length : 0;
      hiddenTopicsCount.textContent = `(${hiddenCount} 个)`; // Update the count

      if (data.hiddenTitles && data.hiddenTitles.length > 0) {
        data.hiddenTitles.forEach(function(title) {
          const li = document.createElement('li');
          const titleSpan = document.createElement('span');
          titleSpan.textContent = title;
          titleSpan.classList.add('topic-title'); // Add a class for styling if needed

          const deleteButton = document.createElement('span');
          deleteButton.textContent = 'x';
          deleteButton.classList.add('delete-button');
          deleteButton.title = '取消隐藏'; // Updated tooltip

          deleteButton.addEventListener('click', function() {
            deleteHiddenTopic(title);
          });

          li.appendChild(titleSpan);
          li.appendChild(deleteButton);
          hiddenTopicsList.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = '暂无隐藏话题。';
        li.classList.add('no-topics-message'); // Add new class
        hiddenTopicsList.appendChild(li);
      }
    });
  }

  // Function to delete a hidden topic (and mark as not useless in cache)
  function deleteHiddenTopic(titleToDelete) {
    chrome.storage.local.get('hiddenTitles', function(data) {
      let hiddenTitles = data.hiddenTitles || [];
      const updatedHiddenTitles = hiddenTitles.filter(title => title !== titleToDelete);

      // Update the cache for this specific topic to mark it as not useless
      const cacheKey = `v2ex-filter-cache:${titleToDelete}`;
      chrome.storage.local.get(cacheKey, function(cacheData) {
        const cachedItem = cacheData[cacheKey];
        if (cachedItem) {
          cachedItem.result = false; // Mark as not useless
          cachedItem.timestamp = Date.now(); // Update timestamp to refresh cache
          chrome.storage.local.set({ [cacheKey]: cachedItem }, function() {
            if (chrome.runtime.lastError) {
              console.error('Error updating cache for topic:', chrome.runtime.lastError);
            }
          });
        }
      });

      chrome.storage.local.set({hiddenTitles: updatedHiddenTitles}, function() {
        if (chrome.runtime.lastError) {
          console.error('Error saving hiddenTitles:', chrome.runtime.lastError);
          showToast('操作失败。', 'error');
        } else {
          showToast('话题已标记为不隐藏。'); // Updated status message
          renderHiddenTopics(); // Re-render the list

          // Notify content.js to re-filter the page
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
              // Send the updated hiddenTitles to content.js so it can re-apply the filter
              chrome.tabs.sendMessage(tabs[0].id, {action: "updateHiddenTitlesAndRefilter", hiddenTitles: updatedHiddenTitles});
            }
          });
        }
      });
    });
  }

  // Initial load of hidden topics
  renderHiddenTopics();

  // Open settings page
  openSettingsButton.addEventListener('click', function() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('settings.html'));
    }
  });

  // Clear cache button click handler
  clearCacheButton.addEventListener('click', function() {
    confirmationModal.style.display = 'flex'; // Show the modal
  });

  // Confirm clear cache
  confirmClearCacheButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "clearCache"}, function(response) {
      if (response.success) {
        showToast('缓存已清除。');
        renderHiddenTopics(); // Re-render to show "暂无隐藏话题"
      } else {
        showToast('清除缓存失败。', 'error');
        console.error('Clear cache failed:', response.error);
      }
      confirmationModal.style.display = 'none'; // Hide the modal
    });
  });

  // Cancel clear cache
  cancelClearCacheButton.addEventListener('click', function() {
    confirmationModal.style.display = 'none'; // Hide the modal
  });

  // Toggle filter button
  toggleFilterButton.addEventListener('click', function() {
    if (isShowingAll) { // If currently showing all topics (button says "显示过滤")
      // Action: switch to filtered view
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "showFilteredTopics"});
        showToast('显示过滤后话题。');
      });
      toggleFilterButton.textContent = '显示全部'; // Button text changes to "Show All" (meaning, click me to show all)
    } else { // If currently showing filtered topics (button says "显示全部")
      // Action: switch to all topics view
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "showAllTopics"});
        showToast('显示所有话题。');
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