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
  } else if (request.action === "reloadTab") {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  } else if (request.action === "getDefaultPrompt") {
    sendResponse({defaultPrompt: DEFAULT_PROMPT});
  }
  return true; // Indicates that the response is sent asynchronously
});

const DEFAULT_PROMPT = `你是一位论坛内容审核员。你的任务是判断帖子标题是否属于无用内容。
无用内容的定义包括：

- 纯情绪表达（发泄、抱怨、阴阳怪气）
- 无需专业知识的家庭琐事
- 自我推广（推销服务、APP、会员、产品、社交账号或内容）
- 中医相关内容
- 硬件、软件求推荐相关话题
- 招聘求职信息
- 地域攻击言论
- 动物保护话题
- 封号、审核相关话题
- 意义不明的标题
- 离职、跑路相关话题

请分析以下标题，判断是否属于无用内容。
如果是无用内容，回答"true"；如果不是，回答"false"。

标题: "{title}"
  `;

async function isUseless(title, apiKey, selectedModel) {
  const API_URL = `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`;

  const settings = await chrome.storage.sync.get('customPrompt');
  const promptTemplate = settings.customPrompt || DEFAULT_PROMPT;
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
