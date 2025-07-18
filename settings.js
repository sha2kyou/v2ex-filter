document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const apiUrlSelect = document.getElementById('apiUrlSelect');
  const customApiUrlInput = document.getElementById('customApiUrlInput');
  const filterSwitch = document.getElementById('filterSwitch');
  const promptInput = document.getElementById('promptInput');
  const modelSelect = document.getElementById('modelSelect');
  const customModelInput = document.getElementById('customModelInput');
  const animatedGradientSwitch = document.getElementById('animatedGradientSwitch');
  const simpleProgressBarSwitch = document.getElementById('suggestedProgressBarSwitch');
  const pokemonReminderSwitch = document.getElementById('pokemonReminderSwitch');
  const aiIntensityButtons = document.querySelectorAll('#aiIntensitySegmentedControl button');
  const concurrencyLimitInput = document.getElementById('concurrencyLimit');

  // New elements for import/export
  const exportSettingsButton = document.getElementById('exportSettings');
  const importSettingsButton = document.getElementById('importSettings');
  const importFileInput = document.getElementById('importFile'); // Get reference to the hidden file input
  const toastContainer = document.getElementById('toastContainer');
  const testApiKeyButton = document.getElementById('testApiKey');

  const intensityDescriptions = {
    low: 'AI 将非常宽松地判断，只有非常明显、毫无疑问的无用内容才会被过滤。适合希望保留大部分内容的用户。',
    medium: 'AI 将正常判断，平衡过滤效果和内容保留。适合大多数用户。',
    high: 'AI 将非常严格地判断，任何沾边的无用内容都可能被过滤。适合希望获得最清爽体验的用户。',
  };

  

  // Function to show toast notifications
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Show the toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Hide and remove the toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      }, { once: true });
    }, 1500);
  }

  // Helper function to save settings
  function saveSetting(key, value) {
    chrome.storage.sync.set({ [key]: value }, function() {
      if (chrome.runtime.lastError) {
        console.error(`Error saving ${key}:`, chrome.runtime.lastError);
        showToast(`保存 ${key} 失败。`, 'error');
      } else if (key !== 'selectedModel' && key !== 'selectedApiUrl') {
        showToast(`设置已保存。`);
      }
    });
  }

  // 默认提示词
  const defaultPrompt = `
    你是一个论坛的内容审核员。
    你的任务是判断一个帖子标题是否表明其内容是无用的。
    无用内容定义为：
    1. 纯粹的情绪发泄（例如，抱怨、吐槽）。
    2. 无需任何专业知识、任何人都可以评论的鸡毛蒜琐事。

    请分析以下标题，判断它是否属于无用类别。
    如果无用，请只回答 "true"，否则回答 "false"。

    标题：“{title}”
  `;

  // Load saved settings
  function loadSettings() {
    chrome.storage.sync.get(['apiKey', 'filterEnabled', 'customPrompt', 'selectedModel', 'animatedGradientEnabled', 'aiIntensity', 'selectedApiUrl', 'customApiUrl', 'concurrencyLimit', 'simpleProgressBarEnabled', 'pokemonReminderEnabled'], function(data) {
      const settingsToSave = {};

      if (data.apiKey) {
        apiKeyInput.value = data.apiKey;
        settingsToSave.apiKey = data.apiKey;
      }

      filterSwitch.checked = data.filterEnabled !== false; // Default to true
      settingsToSave.filterEnabled = filterSwitch.checked;

      promptInput.value = data.customPrompt || defaultPrompt;
      settingsToSave.customPrompt = promptInput.value;

      animatedGradientSwitch.checked = data.animatedGradientEnabled !== false; // Default to true
      settingsToSave.animatedGradientEnabled = animatedGradientSwitch.checked;

      simpleProgressBarSwitch.checked = data.simpleProgressBarEnabled !== false; // Default to true
      settingsToSave.simpleProgressBarEnabled = simpleProgressBarSwitch.checked;

      pokemonReminderSwitch.checked = data.pokemonReminderEnabled !== false; // Default to true
      settingsToSave.pokemonReminderEnabled = pokemonReminderSwitch.checked;

      const initialAiIntensity = data.aiIntensity || 'medium'; // Default to medium
      updateIntensityButtons(initialAiIntensity);
      settingsToSave.aiIntensity = initialAiIntensity;

      // 处理 concurrencyLimit
      let loadedConcurrencyLimit = data.concurrencyLimit;
      if (typeof loadedConcurrencyLimit !== 'number' || loadedConcurrencyLimit < 1) {
        loadedConcurrencyLimit = 5; // 默认值
      }
      concurrencyLimitInput.value = loadedConcurrencyLimit;
      settingsToSave.concurrencyLimit = loadedConcurrencyLimit; // 确保这个值被保存回去

      // Handle AI Model selection
      if (data.selectedModel) {
        if (data.selectedModel === 'qwen-turbo') {
          modelSelect.value = data.selectedModel;
          customModelInput.classList.add('hidden');
          modelSelect.classList.remove('connected-top');
          customModelInput.classList.remove('connected-bottom');
        } else {
          modelSelect.value = 'other';
          customModelInput.value = data.customModel || ''; // Use customModel from storage or empty string
          customModelInput.classList.remove('hidden');
          modelSelect.classList.add('connected-top');
          customModelInput.classList.add('connected-bottom');
        }
        settingsToSave.selectedModel = data.selectedModel;
      } else {
        modelSelect.value = 'qwen-turbo'; // Default
        customModelInput.classList.add('hidden');
        modelSelect.classList.remove('connected-top');
        customModelInput.classList.remove('connected-bottom');
        settingsToSave.selectedModel = 'qwen-turbo';
      }

      // Handle API URL selection
      const initialApiUrl = data.selectedApiUrl || 'dashscope'; // Default to dashscope
      apiUrlSelect.value = initialApiUrl;
      settingsToSave.selectedApiUrl = initialApiUrl;

      if (initialApiUrl === 'other') {
        customApiUrlInput.value = data.customApiUrl || ''; // Use customApiUrl from storage or empty string
        customApiUrlInput.classList.remove('hidden');
        apiUrlSelect.classList.add('connected-top');
        customApiUrlInput.classList.add('connected-bottom');
        settingsToSave.customApiUrl = customApiUrlInput.value;
      } else {
        customApiUrlInput.classList.add('hidden');
        apiUrlSelect.classList.remove('connected-top');
        customApiUrlInput.classList.remove('connected-bottom');
      }

      // Save all settings back to storage.sync to ensure all fields are present
      chrome.storage.sync.set(settingsToSave, function() {
        if (chrome.runtime.lastError) {
          console.error('Error saving default settings:', chrome.runtime.lastError);
        }
      });
    });
  }

  loadSettings(); // Initial load

  // AI Intensity Segmented Control Logic
  function updateIntensityButtons(selectedIntensity) {
    aiIntensityButtons.forEach(button => {
      if (button.dataset.intensity === selectedIntensity) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    if (aiIntensityDescription) {
      aiIntensityDescription.textContent = intensityDescriptions[selectedIntensity];
    }
  }

  // Auto-save settings on change
  apiKeyInput.addEventListener('change', function() {
    saveSetting('apiKey', apiKeyInput.value);
  });

  promptInput.addEventListener('change', function() {
    saveSetting('customPrompt', promptInput.value);
  });

  filterSwitch.addEventListener('change', function() {
    saveSetting('filterEnabled', filterSwitch.checked);
  });

  animatedGradientSwitch.addEventListener('change', function() {
    saveSetting('animatedGradientEnabled', animatedGradientSwitch.checked);
  });

  simpleProgressBarSwitch.addEventListener('change', function() {
    saveSetting('simpleProgressBarEnabled', simpleProgressBarSwitch.checked);
  });

  pokemonReminderSwitch.addEventListener('change', function() {
    saveSetting('pokemonReminderEnabled', pokemonReminderSwitch.checked);
  });

  concurrencyLimitInput.addEventListener('change', function() {
    let value = parseInt(concurrencyLimitInput.value);
    if (isNaN(value) || value < 1) {
      value = 1; // Ensure minimum of 1
      concurrencyLimitInput.value = value;
    }
    saveSetting('concurrencyLimit', value);
  });

  // Add event listeners to intensity buttons
  aiIntensityButtons.forEach(button => {
    button.addEventListener('click', function() {
      const newIntensity = this.dataset.intensity;
      saveSetting('aiIntensity', newIntensity);
      updateIntensityButtons(newIntensity); // Update UI immediately
    });
  });

  modelSelect.addEventListener('change', function() {
    const selectedModel = modelSelect.value;
    if (selectedModel === 'other') {
      customModelInput.classList.remove('hidden');
      modelSelect.classList.add('connected-top');
      customModelInput.classList.add('connected-bottom');
    } else {
      customModelInput.classList.add('hidden');
      modelSelect.classList.remove('connected-top');
      customModelInput.classList.remove('connected-bottom');
    }
    saveSetting('selectedModel', selectedModel);
  });

  customModelInput.addEventListener('change', function() {
    if (modelSelect.value === 'other') {
      saveSetting('customModel', customModelInput.value);
    }
  });

  apiUrlSelect.addEventListener('change', function() {
    const selectedApiUrl = apiUrlSelect.value;
    if (selectedApiUrl === 'other') {
      customApiUrlInput.classList.remove('hidden');
      apiUrlSelect.classList.add('connected-top');
      customApiUrlInput.classList.add('connected-bottom');
    } else {
      customApiUrlInput.classList.add('hidden');
      apiUrlSelect.classList.remove('connected-top');
      customApiUrlInput.classList.remove('connected-bottom');
    }
    saveSetting('selectedApiUrl', selectedApiUrl);
  });

  customApiUrlInput.addEventListener('change', function() {
    if (apiUrlSelect.value === 'other') {
      saveSetting('customApiUrl', customApiUrlInput.value);
    }
  });

  // Check for API errors

  // Export settings
  exportSettingsButton.addEventListener('click', function() {
    chrome.storage.sync.get(['apiKey', 'filterEnabled', 'customPrompt', 'selectedModel', 'customModel', 'animatedGradientEnabled', 'aiIntensity', 'selectedApiUrl', 'customApiUrl', 'concurrencyLimit', 'simpleProgressBarEnabled', 'pokemonReminderEnabled'], function(data) {
      const settingsJson = JSON.stringify(data, null, 2);
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'v2ex_filter_settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('设置已导出到 v2ex_filter_settings.json。');
    });
  });

  // Test API Key
  testApiKeyButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value;
    let selectedModel = modelSelect.value;
    if (selectedModel === 'other') {
      selectedModel = customModelInput.value;
    }
    let apiUrl = apiUrlSelect.value;
    if (apiUrl === 'other') {
      apiUrl = customApiUrlInput.value;
    } else if (apiUrl === 'dashscope') {
      apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    }

    if (!apiKey) {
      showToast('请输入 API 密钥。', 'error');
      return;
    }

    showToast('正在测试 API 密钥...', 'info');

    chrome.runtime.sendMessage({ action: "testApiKey", apiKey: apiKey, selectedModel: selectedModel, apiUrl: apiUrl }, function(response) {
      if (response && response.success) {
        showToast('API 密钥测试成功！', 'success');
      } else {
        showToast(`API 密钥测试失败: ${response.error || '未知错误'}`, 'error');
      }
    });
  });

  // Import settings
  importSettingsButton.addEventListener('click', function() {
    importFileInput.click(); // Trigger the hidden file input click
  });

  importFileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const importedSettings = JSON.parse(e.target.result);
          chrome.storage.sync.set(importedSettings, function() {
            if (chrome.runtime.lastError) {
              showToast('导入设置失败。', 'error');
              console.error('Error importing settings:', chrome.runtime.lastError);
            } else {
              showToast('设置已成功导入。');
              loadSettings(); // Reload settings to update UI
            }
          });
        } catch (e) {
          showToast('导入失败：JSON 格式不正确或文件内容无效。', 'error');
          console.error('JSON parse error or file content invalid:', e);
        }
      };
      reader.readAsText(file);
    }
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
    // if (namespace === 'sync' && changes.selectedModel) {
    //   reloadActiveTab();
    // }
  });
});