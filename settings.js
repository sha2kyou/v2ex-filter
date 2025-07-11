document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('save');
  const filterSwitch = document.getElementById('filterSwitch');
  const promptInput = document.getElementById('promptInput');
  const modelSelect = document.getElementById('modelSelect');
  const customModelInput = document.getElementById('customModelInput');
  const animatedGradientSwitch = document.getElementById('animatedGradientSwitch');

  // New elements for import/export
  const exportSettingsButton = document.getElementById('exportSettings');
  const importSettingsButton = document.getElementById('importSettings');
  const importFileInput = document.getElementById('importFile'); // Get reference to the hidden file input
  const toastContainer = document.getElementById('toastContainer');

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
    chrome.storage.sync.get(['apiKey', 'filterEnabled', 'customPrompt', 'selectedModel', 'animatedGradientEnabled'], function(data) {
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

      if (data.selectedModel && (data.selectedModel === 'qwen-turbo' || data.selectedModel === 'qwen-plus')) {
        modelSelect.value = data.selectedModel;
        customModelInput.classList.add('hidden');
        settingsToSave.selectedModel = data.selectedModel;
      } else if (data.selectedModel) {
        modelSelect.value = 'other';
        customModelInput.value = data.selectedModel;
        customModelInput.classList.remove('hidden');
        settingsToSave.selectedModel = data.selectedModel;
      } else {
        modelSelect.value = 'qwen-turbo'; // Default
        customModelInput.classList.add('hidden');
        settingsToSave.selectedModel = 'qwen-turbo';
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

  // Check for API errors
  chrome.storage.local.get('apiError', function(data) {
    if (data.apiError) {
      showToast(`API 错误: ${data.apiError}`, 'error');
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
      customModelInput.classList.remove('hidden');
    } else {
      customModelInput.classList.add('hidden');
    }
  });

  // Save API key and custom prompt
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value;
    const customPrompt = promptInput.value;
    let selectedModel = modelSelect.value;
    const animatedGradientEnabled = animatedGradientSwitch.checked;
    if (selectedModel === 'other') {
      selectedModel = customModelInput.value; // Use custom input if 'other' is selected
    }
    chrome.storage.sync.set({apiKey: apiKey, customPrompt: customPrompt, selectedModel: selectedModel, animatedGradientEnabled: animatedGradientEnabled}, function() {
      showToast('设置已保存。');
    });
  });

  // Export settings
  exportSettingsButton.addEventListener('click', function() {
    chrome.storage.sync.get(['apiKey', 'filterEnabled', 'customPrompt', 'selectedModel', 'animatedGradientEnabled'], function(data) {
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
    if (namespace === 'sync' && changes.selectedModel) {
      reloadActiveTab();
    }
  });
});