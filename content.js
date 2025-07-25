const pokemonNames = [
  "妙蛙种子", "妙蛙草", "妙蛙花", "小火龙", "火恐龙", "喷火龙", "杰尼龟", "卡咪龟", "水箭龟",
  "绿毛虫", "铁甲蛹", "巴大蝶", "独角虫", "铁壳蛹", "大针蜂", "波波", "比比鸟", "大比鸟",
  "小拉达", "拉达", "烈雀", "大嘴雀", "阿柏蛇", "阿柏怪", "皮卡丘", "雷丘", "穿山鼠",
  "穿山王", "尼多兰", "尼多娜", "尼多后", "尼多朗", "尼多力诺", "尼多王", "皮皮", "皮可西",
  "六尾", "九尾", "胖丁", "胖可丁", "超音蝠", "大嘴蝠", "走路草", "臭臭花", "霸王花",
  "派拉斯", "派拉斯特", "毛球", "摩鲁蛾", "地鼠", "三地鼠", "喵喵", "猫老大", "可达鸭",
  "哥达鸭", "猴怪", "火爆猴", "卡蒂狗", "风速狗", "蚊香蝌蚪", "蚊香君", "蚊香泳士", "凯西",
  "勇基拉", "胡地", "腕力", "豪力", "怪力", "喇叭芽", "口呆花", "大食花", "玛瑙水母",
  "毒刺水母", "小拳石", "隆隆石", "隆隆岩", "小火马", "烈焰马", "呆呆兽", "呆壳兽", "小磁怪",
  "三合一磁怪", "大葱鸭", "嘟嘟", "嘟嘟利", "小海狮", "白海狮", "臭泥", "臭臭泥", "大舌贝",
  "刺甲贝", "鬼斯", "鬼斯通", "耿鬼", "大岩蛇", "催眠貘", "引梦貘人", "大钳蟹", "巨钳蟹",
  "霹雳电球", "顽皮雷弹", "蛋蛋", "椰蛋树", "卡拉卡拉", "嘎啦嘎啦", "飞腿郎", "快拳郎", "大舌头",
  "瓦斯弹", "双弹瓦斯", "独角犀牛", "钻角犀兽", "吉利蛋", "蔓藤怪", "袋兽", "墨海马", "海刺龙",
  "角金鱼", "金鱼王", "海星星", "宝石海星", "魔墙人偶", "飞天螳螂", "迷唇姐", "电击兽", "鸭嘴火兽",
  "大甲", "肯泰罗", "鲤鱼王", "暴鲤龙", "拉普拉斯", "百变怪", "伊布", "水伊布", "雷伊布",
  "火伊布", "多边兽", "菊石兽", "多刺菊石兽", "化石盔", "镰刀盔", "化石翼龙", "卡比兽", "急冻鸟",
  "闪电鸟", "火焰鸟", "迷你龙", "哈克龙", "快龙", "超梦", "梦幻"
];

function getRandomPokemonName() {
  return pokemonNames[Math.floor(Math.random() * pokemonNames.length)];
}

chrome.runtime.sendMessage({action: "clearBadge"});

let allTopicElements = []; // Store all topic elements
let currentHiddenTitles = []; // Store currently hidden titles
let isErrorDisplayed = false; // Flag to indicate if an error has been displayed



function hslToRgb(h, s, l) {
  let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs((h / 60) % 2 - 1)),
    m = l - c / 2,
    r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  b = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
}

function getRandomColor() {
  const h = Math.floor(Math.random() * 360); // Hue: 0-360
  const s = Math.floor(Math.random() * (100 - 70) + 70) / 100; // Saturation: 70-100%
  const l = Math.floor(Math.random() * (80 - 60) + 60) / 100; // Lightness: 60-80%
  return hslToRgb(h, s, l);
}

function generateRandomGradientColors(numColors = 3) {
  let colors = [];
  for (let i = 0; i < numColors; i++) {
    colors.push(getRandomColor());
  }
  // Duplicate colors to ensure smooth looping for the animation
  return [...colors, ...colors].join(', ');
}

chrome.storage.sync.get(['filterEnabled', 'animatedGradientEnabled', 'simpleProgressBarEnabled', 'pokemonReminderEnabled'], function(data) {
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
  const progressBarHeight = data.simpleProgressBarEnabled ? '5px' : '20px';
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
        pointer-events: none !important; /* Disable clicks */
        transition: filter 0.3s ease-out; /* Smooth transition for unblurring */
        user-select: none; /* Disable text selection */
      }
      .v2ex-filter-blurred .v2p-topic-actions {
        pointer-events: none !important; /* Ensure actions are not clickable when blurred */
      }
      .v2ex-filter-blurred a {
        pointer-events: none !important; /* Ensure all links are not clickable when blurred */
      }
      .v2ex-filter-blurred span[title],
      .v2ex-filter-blurred .v2p-topic-preview-btn {
        pointer-events: none !important; /* Ensure these specific elements are not clickable */
      }

      .v2ex-filter-blurred:hover,
      .v2ex-filter-blurred a:hover,
      .v2ex-filter-blurred td a:hover,
      .v2ex-filter-blurred strong a:hover,
      .v2ex-filter-blurred span[title]:hover,
      .v2ex-filter-blurred .v2p-topic-preview-btn:hover {
        cursor: default !important;
        text-decoration: none !important;
        background-color: initial !important; /* Reset background color on hover */
        color: initial !important; /* Reset text color on hover */
      }
      .v2ex-filter-blurred strong a {
        pointer-events: none !important; /* Ensure strong links are not clickable when blurred */
      }

      .v2ex-filter-blurred td a {
        pointer-events: none !important; /* Ensure td links are not clickable when blurred */
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
    display: ${data.simpleProgressBarEnabled ? 'none' : 'block'};
  `;

  progressBarContainer.appendChild(progressBar);
  progressBarContainer.appendChild(progressText);
  document.body.appendChild(progressBarContainer);

  if (data.filterEnabled === false) {
    // If filtering is disabled, show all topics and clear badge
    
    chrome.runtime.sendMessage({hiddenTitles: []}); // Clear hidden titles and badge
    progressBarContainer.style.display = 'none'; // Ensure progress bar is hidden
  } else {
    // Show progress bar and set initial text
    if (data.animatedGradientEnabled && !data.simpleProgressBarEnabled && data.pokemonReminderEnabled) {
      progressText.textContent = `${getRandomPokemonName()} 正在帮你过滤 (0 / ${totalTopics}, 0%)`;
    } else {
      progressText.textContent = `AI 过滤准备中... (0 / ${totalTopics})`;
    }
    if (data.simpleProgressBarEnabled) {
      progressText.style.display = 'none';
    } else {
      progressText.style.display = 'block';
    }
    progressBarContainer.style.display = 'block';

    // First, apply blur and disable clicks to all topics
    allTopicElements.forEach(element => {
      element.classList.add('v2ex-filter-blurred');
    });

    

    // If filtering is enabled, proceed with the filtering logic
    const topics = allTopicElements.map((element, index) => {
      const link = element.querySelector('.item_title > a');
      const title = link ? link.textContent : '';
      return {
        title: title,
        element: element,
        index: index
      };
    });

    
    
    currentHiddenTitles = [];
    filterStartTime = Date.now();

    // Send all topics to background script for processing
    chrome.runtime.sendMessage({topics: topics.map(t => t.title)});
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

      const topic = allTopicElements[request.index];
      if (topic) {
        if (request.is_useless) {
          const link = topic.querySelector('.item_title > a');
          if (link) {
            currentHiddenTitles.push(link.innerText);
            
          }
        } else {
          topic.classList.remove('v2ex-filter-blurred');
          topic.style.filter = ''; // Clear inline filter style
        }
      }

      let statusText = `AI 过滤中: ${processedTopics} / ${totalTopics} (${progress.toFixed(0)}%)`;

      if (data.animatedGradientEnabled && !data.simpleProgressBarEnabled && data.pokemonReminderEnabled) {
        statusText = `${getRandomPokemonName()} 正在帮你过滤 (${processedTopics} / ${totalTopics}, ${progress.toFixed(0)}%)`;
      } else {
        // 计算并显示剩余时间
        if (processedTopics > 0 && filterStartTime > 0) {
          const elapsedTime = (Date.now() - filterStartTime) / 1000; // 已花费时间（秒）
          const avgTimePerTopic = elapsedTime / processedTopics; // 平均每个话题的处理时间
          const estimatedRemainingTime = avgTimePerTopic * (totalTopics - processedTopics); // 估算剩余时间

          statusText += ` - 预计剩余 ${Math.max(0, estimatedRemainingTime).toFixed(0)} 秒`; // 确保不显示负数
        } else {
          statusText += ` - 正在估算剩余时间...`;
        }
      }

      if (!data.simpleProgressBarEnabled) {
        progressText.textContent = statusText;
      }
    } else if (request.action === "filteringComplete") {
      // Hide progress bar after a short delay to show completion
      setTimeout(() => {
        progressBarContainer.style.display = 'none';
        // Ensure any remaining blurred items are un-blurred if they are not in hiddenTitles
        allTopicElements.forEach(element => {
          const link = element.querySelector('.item_title > a');
          const title = link ? link.innerText : '';
          if (!currentHiddenTitles.includes(title)) {
            element.classList.remove('v2ex-filter-blurred');
            element.style.filter = ''; // Clear inline filter style
          }
        });
        // Update the badge with the final count of hidden titles (which are now blurred titles)
        
        chrome.runtime.sendMessage({hiddenTitles: currentHiddenTitles});
      }, 500);
    } else if (request.action === "filterError") {
        // Handle error from background.js
        
        progressText.textContent = `AI 过滤失败: ${request.error}`;
        if (data.simpleProgressBarEnabled) {
          progressText.style.display = 'none';
        } else {
          progressText.style.display = 'block';
        }
        progressBar.style.width = '100%'; // Fill progress bar to indicate completion/error
        progressBar.style.backgroundColor = 'var(--danger-color)'; // Change color to red
        // Remove blur for the specific topic that caused the AI filtering failure
        if (request.errorTopicTitle) {
          const errorTopicElement = allTopicElements.find(element => {
            const link = element.querySelector('.item_title > a');
            return link && link.textContent === request.errorTopicTitle;
          });
          if (errorTopicElement) {
            errorTopicElement.classList.remove('v2ex-filter-blurred');
            errorTopicElement.style.filter = '';
          }
        }
        isErrorDisplayed = true; // Set flag to true
        setTimeout(() => {
          progressBarContainer.style.display = 'none';
        }, 3000); // Keep error message visible for longer
    } else if (request.action === "showAllTopics") {
      allTopicElements.forEach(element => {
        element.classList.remove('v2ex-filter-blurred');
        element.style.filter = '';
      });
    } else if (request.action === "showFilteredTopics") {
      // With the new logic, "showFilteredTopics" means re-applying blur to useless topics
      // This requires re-evaluating all topics based on the stored hiddenTitles
      allTopicElements.forEach(element => {
        const link = element.querySelector('.item_title > a');
        const title = link ? link.innerText : '';
        if (currentHiddenTitles.includes(title)) {
          element.classList.add('v2ex-filter-blurred');
          element.style.filter = 'blur(5px)'; // Re-apply blur
        } else {
          element.classList.remove('v2ex-filter-blurred');
          element.style.filter = '';
        }
      });
    } else if (request.action === "updateHiddenTitlesAndRefilter") {
      currentHiddenTitles = request.hiddenTitles; // Update the hidden titles
      // Re-apply the filter (blur/unblur) with the new hidden titles
      allTopicElements.forEach(element => {
        const link = element.querySelector('.item_title > a');
        const title = link ? link.innerText : '';
        if (currentHiddenTitles.includes(title)) {
          element.classList.add('v2ex-filter-blurred');
          element.style.filter = 'blur(5px)'; // Re-apply blur
        } else {
          element.classList.remove('v2ex-filter-blurred');
          element.style.filter = '';
        }
      });
      chrome.runtime.sendMessage({hiddenTitles: currentHiddenTitles}); // Update badge in background.js
    }
  });
});

// Listen for API error messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "apiError") {
    
    // Display the error in the progress bar
    const progressBarContainer = document.getElementById('v2ex-filter-progress-container');
    const progressBar = document.getElementById('v2ex-filter-progress-bar');
    const progressText = document.getElementById('v2ex-filter-progress-text');

    if (progressBarContainer && progressBar && progressText) {
      progressBarContainer.style.display = 'block';
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = 'var(--danger-color)'; // Red color for error
      progressText.textContent = `API 错误: ${request.error}`;
      progressText.style.display = 'block';

      // Hide the error message after a few seconds
      setTimeout(() => {
        progressBarContainer.style.display = 'none';
      }, 5000);
    }
  }
});