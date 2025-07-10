chrome.storage.sync.get('filterEnabled', function(data) {
  const topicElements = document.querySelectorAll('div.cell.item');
  const totalTopics = topicElements.length;
  let processedTopics = 0;

  // Create and append progress bar
  const progressBarContainer = document.createElement('div');
  progressBarContainer.id = 'v2ex-filter-progress-container';
  progressBarContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background-color: #f0f0f0;
    z-index: 9999;
    display: none; /* Hidden by default */
  `;
  const progressBar = document.createElement('div');
  progressBar.id = 'v2ex-filter-progress-bar';
  progressBar.style.cssText = `
    width: 0%;
    height: 100%;
    background-color: #4CAF50;
  `;
  progressBarContainer.appendChild(progressBar);
  document.body.appendChild(progressBarContainer);

  if (data.filterEnabled === false) {
    // If filtering is disabled, show all topics and clear badge
    topicElements.forEach(element => {
      element.style.display = 'block';
    });
    chrome.runtime.sendMessage({hiddenTitles: []}); // Clear hidden titles and badge
    progressBarContainer.style.display = 'none'; // Ensure progress bar is hidden
  } else {
    // Show progress bar
    progressBarContainer.style.display = 'block';

    // First, hide all topics to ensure consistent behavior
    topicElements.forEach(element => {
      element.style.display = 'none';
    });

    // If filtering is enabled, proceed with the filtering logic
    const topics = Array.from(topicElements).map(element => {
      const link = element.querySelector('.item_title > a');
      return {
        title: link ? link.innerText : '',
        element: element
      };
    });

    chrome.runtime.sendMessage({topics: topics.map(t => t.title)}, function(response) {
      if (response && response.results) {
        const hiddenTitles = [];
        response.results.forEach((result, index) => {
          if (result.is_useless) {
            topics[index].element.style.display = 'none'; // Explicitly hide useless topics
            hiddenTitles.push(topics[index].title);
          } else {
            // Show the entire container div for useful topics
            topics[index].element.style.display = 'block';
          }
        });
        chrome.runtime.sendMessage({hiddenTitles: hiddenTitles});
        progressBarContainer.style.display = 'none'; // Hide progress bar after completion
      }
    });
  }

  // Listen for progress updates from background.js
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateProgress") {
      processedTopics = request.processedCount;
      const progress = (processedTopics / totalTopics) * 100;
      progressBar.style.width = `${progress}%`;
      if (processedTopics === totalTopics) {
        progressBarContainer.style.display = 'none'; // Hide when 100%
      }
    }
  });
});