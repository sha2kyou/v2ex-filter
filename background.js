chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "clearCache") {
    console.log("Background: Received clearCache request.");
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(key => key.startsWith('v2ex-filter-cache-') || key === 'hiddenTitles');
      console.log("Background: Keys to remove: ", keysToRemove);
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          if (chrome.runtime.lastError) {
            console.error("Background: Error removing cache keys: ", chrome.runtime.lastError);
            sendResponse({success: false, error: chrome.runtime.lastError.message});
          } else {
            console.log("Background: Cache keys successfully removed.");
            sendResponse({success: true});
          }
        });
      } else {
        console.log("Background: No cache keys found to remove.");
        sendResponse({success: true});
      }
    });
    return true; // Async response
  }

  if (request.topics) {
    chrome.storage.sync.get(['apiKey', 'filterEnabled', 'selectedModel'], async (settings) => {
      if (!settings.apiKey || settings.filterEnabled === false) {
        sendResponse({results: request.topics.map(() => ({ is_useless: false }))});
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const cacheKeyPrefix = `v2ex-filter-cache-${today}`;

      const results = [];
      const cachedData = await chrome.storage.local.get(null);

      for (const title of request.topics) {
        const cacheKey = `${cacheKeyPrefix}:${title}`;
        if (cachedData[cacheKey] !== undefined) {
          results.push({ is_useless: cachedData[cacheKey] });
        } else {
          const is_useless = await isUseless(title, settings.apiKey, settings.selectedModel);
          results.push({ is_useless });
          chrome.storage.local.set({ [cacheKey]: is_useless });
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

async function isUseless(title, apiKey, selectedModel) {
  const API_URL = `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`;

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
    chrome.action.setIcon({
      path: {
        "16": "images/iconbackup/icon16.png",
        "48": "images/iconbackup/icon48.png",
        "128": "images/iconbackup/icon128.png"
      }
    });
  } else {
    chrome.storage.local.remove('apiError');
    chrome.action.setIcon({
      path: {
        "16": "images/icon16.png",
        "48": "images/icon48.png",
        "128": "images/icon128.png"
      }
    });
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
