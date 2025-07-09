document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('save');
  const clearCacheButton = document.getElementById('clearCache');
  const hiddenTopicsList = document.getElementById('hiddenTopics');
  const filterSwitch = document.getElementById('filterSwitch');
  const status = document.getElementById('status');
  const errorDisplay = document.getElementById('errorDisplay');
  const promptInput = document.getElementById('promptInput');

  const hiddenTopicsView = document.getElementById('hiddenTopicsView');
  const settingsView = document.getElementById('settingsView');
  const openSettingsButton = document.getElementById('openSettingsButton');
  const backButton = document.getElementById('backButton');

  // Default prompt
  const defaultPrompt = `
    You are a content moderator for a forum.
    Your task is to determine if a post title suggests that the content is useless.
    Useless content is defined as:
    1. Purely emotional expressions (e.g., rants, complaints).
    2. Trivial family matters that don't require any specific knowledge and can be commented on by anyone.

    Analyze the following title and determine if it falls into the useless category.
    Respond with only "true" if it is useless, and "false" if it is not.

    Title: "{title}"
  `;

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'filterEnabled', 'customPrompt'], function(data) {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
    filterSwitch.checked = data.filterEnabled !== false; // Default to true
    promptInput.value = data.customPrompt || defaultPrompt;
  });

  // Check for API errors
  chrome.storage.local.get('apiError', function(data) {
    if (data.apiError) {
      errorDisplay.textContent = `API Error: ${data.apiError}`;
      errorDisplay.style.display = 'block';
      chrome.storage.local.remove('apiError'); // Clear the error after displaying
    }
  });

  // Save filter switch state
  filterSwitch.addEventListener('change', function() {
    chrome.storage.sync.set({filterEnabled: filterSwitch.checked});
  });

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

  // Save API key and custom prompt
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value;
    const customPrompt = promptInput.value;
    chrome.storage.sync.set({apiKey: apiKey, customPrompt: customPrompt}, function() {
      status.textContent = 'Settings saved.';
      setTimeout(function() {
        status.textContent = '';
      }, 2000);
    });
  });

  // Clear cache
  clearCacheButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "clearCache"}, function(response) {
      if (response.success) {
        status.textContent = 'Cache cleared.';
        setTimeout(function() {
          status.textContent = '';
        }, 2000);
      }
    });
  });

  // View switching logic
  openSettingsButton.addEventListener('click', function() {
    hiddenTopicsView.style.display = 'none';
    settingsView.style.display = 'block';
  });

  backButton.addEventListener('click', function() {
    settingsView.style.display = 'none';
    hiddenTopicsView.style.display = 'block';
  });
});