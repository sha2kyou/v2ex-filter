document.addEventListener('DOMContentLoaded', function() {
  const hiddenTopicsList = document.getElementById('hiddenTopics');
  const openSettingsButton = document.getElementById('openSettingsButton');

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
});