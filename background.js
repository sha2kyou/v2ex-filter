chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "clearCache") {
    console.log("Background: Received clearCache request.");
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(key => key.startsWith('v2ex-filter-cache:') || key === 'hiddenTitles');
      console.log("Background: Keys to remove: ", keysToRemove);
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          if (chrome.runtime.lastError) {
            console.error("Background: Error removing cache keys: ", chrome.runtime.lastError);
            sendResponse({success: false, error: chrome.runtime.lastError.message});
          } else {
            console.log("Background: Cache keys successfully removed.");
            chrome.action.setBadgeText({text: ''}); // Clear badge
            sendResponse({success: true});
          }
        });
      } else {
        console.log("Background: No cache keys found to remove.");
        chrome.action.setBadgeText({text: ''}); // Clear badge
        sendResponse({success: true});
      }
    });
    return true; // Async response
  }

  if (request.action === "clearBadge") { // 新增：处理 clearBadge 动作
    console.log("Background: Received clearBadge request.");
    chrome.action.setBadgeText({text: ''}); // 清除徽章
    sendResponse({success: true});
    return true; // Async response
  }

  if (request.topics) {
    chrome.storage.sync.get(['apiKey', 'filterEnabled', 'selectedModel'], async (settings) => {
      if (!settings.apiKey || settings.filterEnabled === false) {
        sendResponse({results: request.topics.map(() => ({ is_useless: false }))});
        return;
      }

      const CACHE_DURATION_MS = 15 * 24 * 60 * 60 * 1000; // 15 days
      const cacheKeyPrefix = 'v2ex-filter-cache:';
      const now = Date.now();

      const results = [];
      // Get all keys we might need
      const keysToGet = request.topics.map(title => `${cacheKeyPrefix}${title}`);
      const cachedData = await chrome.storage.local.get(keysToGet);

      for (let i = 0; i < request.topics.length; i++) {
        const title = request.topics[i];
        const cacheKey = `${cacheKeyPrefix}${title}`;
        const cachedItem = cachedData[cacheKey];

        let is_useless_result;
        if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION_MS)) {
          // Cache hit and not expired
          is_useless_result = cachedItem.result;
        } else {
          // Cache miss or expired
          is_useless_result = await isUseless(title, settings.apiKey, settings.selectedModel);
          // Set new cache item with timestamp
          chrome.storage.local.set({ [cacheKey]: { result: is_useless_result, timestamp: now } });
        }
        results.push({ is_useless: is_useless_result });

        // Send progress update to content.js
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "updateProgress",
          processedCount: i + 1,
          totalCount: request.topics.length
        });
      }
      sendResponse({ results });
    });
  } else if (request.hiddenTitles) {
    chrome.storage.local.set({hiddenTitles: request.hiddenTitles});
    updateBadge(request.hiddenTitles.length);
  }
  return true; // Indicates that the response is sent asynchronously
});

async function isUseless(title, apiKey, selectedModel) {
  const API_URL = `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`;

  const defaultPrompt = `
    你是一个论坛的内容审核员。
    你的任务是判断一个帖子标题是否表明其内容是无用的。
    无用内容定义为：
    1. 纯粹的情绪发泄（例如，抱怨、吐槽）。
    2. 无需任何专业知识、任何人都可以评论的鸡毛蒜皮的家庭琐事。

    请分析以下标题，判断它是否属于无用类别。
    如果无用，请只回答 "true"，否则回答 "false"。

    标题：“{title}”
  `;

  const settings = await chrome.storage.sync.get('customPrompt');
  const promptTemplate = settings.customPrompt || defaultPrompt;
  const prompt = promptTemplate.replace('{title}', title);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        "model": selectedModel || "qwen-turbo", // Use selectedModel, default to qwen-turbo
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim().toLowerCase();
    setErrorState(null); // Clear error on success
    return result === 'true';
  } catch (error) {
    console.error('Error calling Bailian API:', error);
    setErrorState(error.message);
    return false; // Default to not hiding the post in case of an error
  }
}

function setErrorState(errorMessage) {
  if (errorMessage) {
    chrome.storage.local.set({apiError: errorMessage});
    
  } else {
    chrome.storage.local.remove('apiError');
    
  }
}

function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({text: count.toString()});
    chrome.action.setBadgeBackgroundColor({color: '#d9534f'});
  } else {
    chrome.action.setBadgeText({text: ''});
  }
}
