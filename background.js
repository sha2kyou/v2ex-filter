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

  if (request.action === "testApiKey") {
    console.log("Background: Received testApiKey request.");
    const { apiKey, selectedModel, apiUrl } = request;
    // Use a dummy title to test the API key
    isUseless("这是一个测试标题", apiKey, selectedModel, apiUrl)
      .then(result => {
        sendResponse({ success: true });
        setErrorState(null); // Clear any previous API errors on successful test
      })
      .catch(error => {
        console.error("Background: API Key test failed:", error);
        sendResponse({ success: false, error: error.message });
        setErrorState(error.message); // Set error state on failed test
      });
    return true; // Indicates that the response is sent asynchronously
  }

  if (request.topics) {
    chrome.storage.sync.get(['apiKey', 'filterEnabled', 'selectedModel', 'apiUrl', 'selectedApiUrl', 'customApiUrl', 'concurrencyLimit'], async (settings) => {
      if (!settings.apiKey || settings.filterEnabled === false) {
        sendResponse({results: request.topics.map(() => ({ is_useless: false }))});
        return;
      }

      const CACHE_DURATION_MS = 15 * 24 * 60 * 60 * 1000; // 15 days
      const cacheKeyPrefix = 'v2ex-filter-cache:';
      const now = Date.now();
      const totalTopics = request.topics.length;
      let processedCount = 0;

      const processTopic = async (title, index) => {
        const cacheKey = `${cacheKeyPrefix}${title}`;
        const cachedItem = await chrome.storage.local.get(cacheKey);

        let is_useless_result;
        if (cachedItem[cacheKey] && (now - cachedItem[cacheKey].timestamp < CACHE_DURATION_MS)) {
          // Cache hit and not expired
          is_useless_result = cachedItem[cacheKey].result;
        } else {
          // Cache miss or expired
          try {
            let currentApiUrl = settings.apiUrl; // Default to the direct apiUrl if available
            if (settings.selectedApiUrl === 'dashscope') {
              currentApiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
            } else if (settings.selectedApiUrl === 'other') {
              currentApiUrl = settings.customApiUrl;
            }
            is_useless_result = await isUseless(title, settings.apiKey, settings.selectedModel, currentApiUrl);
            setErrorState(null); // Clear any previous API errors on successful test
          } catch (error) {
            console.error("Background: Error during AI processing:", error);
            setErrorState(error.message); // Set API error on failed AI call
            is_useless_result = false; // Default to not hiding on error
            // Send error to content.js
            sendResponse({ error: error.message });
            return; // Stop further processing for this request
          }
          // Set new cache item with timestamp
          await chrome.storage.local.set({ [cacheKey]: { result: is_useless_result, timestamp: now } });
        }

        processedCount++;
        // Send progress update to content.js
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "updateProgress",
          processedCount: processedCount,
          totalCount: totalTopics
        });

        return { is_useless: is_useless_result };
      };

      const CONCURRENCY_LIMIT = settings.concurrencyLimit || 5; // Limit concurrent AI requests, default to 5
      const results = [];
      const promises = [];

      for (let i = 0; i < totalTopics; i++) {
        const title = request.topics[i];
        promises.push(processTopic(title, i));

        if (promises.length >= CONCURRENCY_LIMIT || i === totalTopics - 1) {
          // Wait for the current batch to complete
          const batchResults = await Promise.all(promises);
          results.push(...batchResults);
          promises.length = 0; // Clear the batch
        }
      }
      sendResponse({ results });
    });
  } else if (request.hiddenTitles) {
    chrome.storage.local.set({hiddenTitles: request.hiddenTitles});
    updateBadge(request.hiddenTitles.length);
  }
  return true; // Indicates that the response is sent asynchronously
});

async function isUseless(title, apiKey, selectedModel, apiUrl) {
  const API_URL = apiUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

  const defaultPrompt = `
    你是一个论坛的内容审核员。
    你的任务是判断一个帖子标题是否表明其内容是无用的。
    无用内容定义为：
    1. 纯粹的情绪发泄（例如，抱怨、吐槽）。
    2. 无需任何专业知识、任何人都可以评论的鸡毛蒜琐事。

    请分析以下标题，判断它是否属于无用类别。
    如果无用，请只回答 "true" 或 "false"。

    标题：“{title}”
  `;

  const settings = await chrome.storage.sync.get(['customPrompt', 'aiIntensity']);
  const promptTemplate = settings.customPrompt || defaultPrompt;
  let aiInstruction = '';

  switch (settings.aiIntensity) {
    case 'low':
      aiInstruction = '请你非常宽松地判断，只有非常明显、毫无疑问的无用内容才应标记为无用。';
      break;
    case 'high':
      aiInstruction = '请你非常严格地判断，任何沾边的无用内容都应标记为无用。';
      break;
    case 'medium':
    default:
      aiInstruction = '请你正常判断。';
      break;
  }

  const prompt = `${promptTemplate.replace('{title}', title)}\n${aiInstruction}`;

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
    return result === 'true';
  } catch (error) {
    console.error('Error calling Bailian API:', error);
    throw error; // Re-throw the error so the caller can catch it
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
    chrome.action.setBadgeBackgroundColor({color: '#000000'});
  } else {
    chrome.action.setBadgeText({text: ''});
  }
}