document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('save');
  const clearCacheButton = document.getElementById('clearCache');
  const filterSwitch = document.getElementById('filterSwitch');
  const status = document.getElementById('status');
  const errorDisplay = document.getElementById('errorDisplay');
  const promptInput = document.getElementById('promptInput');
  const modelSelect = document.getElementById('modelSelect');
  const customModelInput = document.getElementById('customModelInput');
  const animatedGradientSwitch = document.getElementById('animatedGradientSwitch'); // 新增

  // 默认提示词
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

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'filterEnabled', 'customPrompt', 'selectedModel', 'animatedGradientEnabled'], function(data) {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
    filterSwitch.checked = data.filterEnabled !== false; // Default to true
    promptInput.value = data.customPrompt || defaultPrompt;
    animatedGradientSwitch.checked = data.animatedGradientEnabled !== false; // Default to true

    if (data.selectedModel && (data.selectedModel === 'qwen-turbo' || data.selectedModel === 'qwen-plus')) {
      modelSelect.value = data.selectedModel;
      customModelInput.style.display = 'none';
    } else if (data.selectedModel) {
      modelSelect.value = 'other';
      customModelInput.value = data.selectedModel;
      customModelInput.style.display = 'block';
    } else {
      modelSelect.value = 'qwen-turbo'; // Default
      customModelInput.style.display = 'none';
    }
  });

  // Check for API errors
  chrome.storage.local.get('apiError', function(data) {
    if (data.apiError) {
      errorDisplay.textContent = `API 错误: ${data.apiError}`;
      errorDisplay.style.display = 'block';
      chrome.storage.local.remove('apiError'); // Clear the error after displaying
    }
  });

  // Save filter switch state
  filterSwitch.addEventListener('change', function() {
    chrome.storage.sync.set({filterEnabled: filterSwitch.checked});
  });

  // Show/hide custom model input based on selection
  modelSelect.addEventListener('change', function() {
    if (modelSelect.value === 'other') {
      customModelInput.style.display = 'block';
    } else {
      customModelInput.style.display = 'none';
    }
  });

  // Save API key and custom prompt
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value;
    const customPrompt = promptInput.value;
    let selectedModel = modelSelect.value;
    const animatedGradientEnabled = animatedGradientSwitch.checked; // 新增
    if (selectedModel === 'other') {
      selectedModel = customModelInput.value; // Use custom input if 'other' is selected
    }
    chrome.storage.sync.set({apiKey: apiKey, customPrompt: customPrompt, selectedModel: selectedModel, animatedGradientEnabled: animatedGradientEnabled}, function() {
      status.textContent = '设置已保存。';
      setTimeout(function() {
        status.textContent = '';
      }, 2000);
    });
  });

  // Clear cache
  clearCacheButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "clearCache"}, function(response) {
      if (response.success) {
        status.textContent = '缓存已清除。';
        setTimeout(function() {
          status.textContent = '';
        }, 2000);
      }
    });
  });

  function reloadActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  }

  // Listen for changes in selectedModel and reload tab
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.selectedModel) {
      reloadActiveTab();
    }
  });
});