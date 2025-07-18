chrome.runtime.sendMessage({action: "clearBadge"});

let allTopicElements = []; // Store all topic elements
let currentHiddenTitles = []; // Store currently hidden titles
let isErrorDisplayed = false; // Flag to indicate if an error has been displayed

// Function to apply filter based on currentHiddenTitles
function applyFilter() {
  allTopicElements.forEach(element => {
    const link = element.querySelector('.item_title > a');
    const title = link ? link.innerText : '';
    if (currentHiddenTitles.includes(title)) {
      element.style.display = 'none';
    } else {
      element.style.display = 'block';
    }
  });
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function generateRandomGradientColors(numColors = 3) {
  let colors = [];
  for (let i = 0; i < numColors; i++) {
    colors.push(getRandomColor());
  }
  // Duplicate colors to ensure smooth looping for the animation
  return [...colors, ...colors].join(', ');
}

chrome.storage.sync.get(['filterEnabled', 'animatedGradientEnabled', 'suggestedProgressBarEnabled'], function(data) {
  const topicElements = document.querySelectorAll('div.cell.item');
  allTopicElements = Array.from(topicElements); // Convert NodeList to Array
  const totalTopics = allTopicElements.length;
  let processedTopics = 0;
  let filterStartTime = 0;

  // Detect page theme colors
  const computedStyle = getComputedStyle(document.body);
  const pageBackgroundColor = computedStyle.backgroundColor;
  const pageTextColor = computedStyle.color;

  // Create and append progress bar
  const progressBarContainer = document.createElement('div');
  progressBarContainer.id = 'v2ex-filter-progress-container';
  const progressBarHeight = data.suggestedProgressBarEnabled ? '5px' : '20px';
  progressBarContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: ${progressBarHeight}; /* Increased height for text */
    background-color: ${pageBackgroundColor};
    z-index: 9999;
    display: none; /* Hidden by default */
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;

  const progressBar = document.createElement('div');
  progressBar.id = 'v2ex-filter-progress-bar';
  progressBar.style.cssText = `
    width: 0%;
    height: 100%;
    transition: width 0.1s linear; /* Smooth transition */
  `;

  // Check if animated gradient is enabled
  if (data.animatedGradientEnabled !== false) { // Default to true
    // Inject animated gradient CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gradientFlowAnimation {
        0% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
      }
      .animated-gradient {
        background: linear-gradient(90deg, ${generateRandomGradientColors()});
        background-size: 200% 100%; /* Wider background to allow for continuous flow */
        animation: gradientFlowAnimation 10s linear infinite; /* Adjust duration for desired speed */
      }
      .v2ex-filter-blurred {
        filter: blur(5px); /* Initial blur */
        pointer-events: none; /* Disable clicks */
        transition: filter 0.3s ease-out; /* Smooth transition for unblurring */
      }
    `;
    document.head.appendChild(style);
    progressBar.classList.add('animated-gradient'); // Add the class for animated gradient
  } else {
    progressBar.style.backgroundColor = '#2196F3'; // Blue background
  }

  const progressText = document.createElement('div');
  progressText.id = 'v2ex-filter-progress-text';
  progressText.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    color: ${pageTextColor};
    text-align: center;
    line-height: ${progressBarHeight}; /* Match container height */
    font-size: 12px;
    font-weight: bold;
    text-shadow: 0 0 2px ${pageBackgroundColor};
    display: ${data.suggestedProgressBarEnabled ? 'none' : 'block'};
  `;

  progressBarContainer.appendChild(progressBar);
  progressBarContainer.appendChild(progressText);
  document.body.appendChild(progressBarContainer);

  if (data.filterEnabled === false) {
    // If filtering is disabled, show all topics and clear badge
    allTopicElements.forEach(element => {
      element.style.display = 'block';
    });
    chrome.runtime.sendMessage({hiddenTitles: []}); // Clear hidden titles and badge
    progressBarContainer.style.display = 'none'; // Ensure progress bar is hidden
  } else {
    // Show progress bar and set initial text
    progressText.textContent = `AI 过滤准备中... (0 / ${totalTopics})`;
    if (data.suggestedProgressBarEnabled) {
      progressText.style.display = 'none';
    } else {
      progressText.style.display = 'block';
    }
    progressBarContainer.style.display = 'block';

    // First, apply blur and disable clicks to all topics
    allTopicElements.forEach(element => {
      element.classList.add('v2ex-filter-blurred');
    });

    // Then, hide all topics to ensure consistent behavior
    allTopicElements.forEach(element => {
      element.style.display = 'none';
    });

    // If filtering is enabled, proceed with the filtering logic
    const topics = allTopicElements.map(element => {
      const link = element.querySelector('.item_title > a');
      return {
        title: link ? link.innerText : '',
        element: element
      };
    });
    
    filterStartTime = Date.now();

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
        currentHiddenTitles = hiddenTitles; // Store hidden titles
        chrome.runtime.sendMessage({hiddenTitles: hiddenTitles});
        // Hide progress bar after a short delay to show completion
        setTimeout(() => {
          progressBarContainer.style.display = 'none';
          // Remove blur and enable clicks for all topics
          allTopicElements.forEach(element => {
            element.classList.remove('v2ex-filter-blurred');
            element.style.filter = ''; // Clear inline filter style
          });
        }, 500);
      } else if (response && response.error) {
        // Handle error from background.js
        console.error("Content.js: Error from background script:", response.error);
        progressText.textContent = `AI 过滤失败: ${response.error}`;
        if (data.suggestedProgressBarEnabled) {
          progressText.style.display = 'none';
        } else {
          progressText.style.display = 'block';
        }
        progressBar.style.width = '100%'; // Fill progress bar to indicate completion/error
        progressBar.style.backgroundColor = 'var(--danger-color)'; // Change color to red
        // Show all topics when AI filtering fails
        allTopicElements.forEach(element => {
          element.style.display = 'block';
        });
        isErrorDisplayed = true; // Set flag to true
        setTimeout(() => {
          progressBarContainer.style.display = 'none';
        }, 3000); // Keep error message visible for longer
      }
    });
  }

  // Listen for progress updates from background.js
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (isErrorDisplayed) { // If an error has been displayed, stop processing progress updates
      return;
    }

    if (request.action === "updateProgress") {
      processedTopics = request.processedCount;
      const progress = (processedTopics / totalTopics) * 100;
      progressBar.style.width = `${progress}%`;

      // Update blur effect
      const blurValue = Math.max(0, 5 - (progress / 20)); // Blur from 5px down to 0px
      allTopicElements.forEach(element => {
        element.style.filter = `blur(${blurValue}px)`;
      });

      let statusText = `AI 过滤中: ${processedTopics} / ${totalTopics} (${progress.toFixed(0)}%)`;

      // 计算并显示剩余时间
      if (processedTopics > 0 && filterStartTime > 0) {
        const elapsedTime = (Date.now() - filterStartTime) / 1000; // 已花费时间（秒）
        const avgTimePerTopic = elapsedTime / processedTopics; // 平均每个话题的处理时间
        const estimatedRemainingTime = avgTimePerTopic * (totalTopics - processedTopics); // 估算剩余时间

        statusText += ` - 预计剩余 ${Math.max(0, estimatedRemainingTime).toFixed(0)} 秒`; // 确保不显示负数
      } else {
        statusText += ` - 正在估算剩余时间...`;
      }

      if (!data.suggestedProgressBarEnabled) {
        progressText.textContent = statusText;
      }

      if (processedTopics === totalTopics) {
        // Hide progress bar after a short delay to show completion
        setTimeout(() => {
          progressBarContainer.style.display = 'none';
          // Remove blur and enable clicks for all topics
          allTopicElements.forEach(element => {
            element.classList.remove('v2ex-filter-blurred');
            element.style.filter = ''; // Clear inline filter style
          });
        }, 500);
      }
    } else if (request.action === "showAllTopics") {
      allTopicElements.forEach(element => {
        element.style.display = 'block';
      });
    } else if (request.action === "showFilteredTopics") {
      applyFilter(); // Use the new applyFilter function
    } else if (request.action === "updateHiddenTitlesAndRefilter") {
      currentHiddenTitles = request.hiddenTitles; // Update the hidden titles
      applyFilter(); // Re-apply the filter with the new hidden titles
      chrome.runtime.sendMessage({hiddenTitles: currentHiddenTitles}); // Update badge in background.js
    }
  });
});