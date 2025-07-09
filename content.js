chrome.storage.sync.get('filterEnabled', function(data) {
  const topicElements = document.querySelectorAll('div.cell.item');

  if (data.filterEnabled === false) {
    // If filtering is disabled, show all topics and clear badge
    topicElements.forEach(element => {
      element.style.display = 'block';
    });
    chrome.runtime.sendMessage({hiddenTitles: []}); // Clear hidden titles and badge
  } else {
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
      }
    });
  }
});