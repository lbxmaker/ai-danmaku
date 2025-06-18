// 弹出窗口脚本

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const statusIcon = document.getElementById('status-icon');
  const statusText = document.getElementById('status-text');
  const enabledToggle = document.getElementById('enabled-toggle');
  const frequencySelect = document.getElementById('frequency-select');
  const displayAreaSelect = document.getElementById('display-area-select');
  const styleSelect = document.getElementById('style-select');
  const apiKeyInput = document.getElementById('api-key');
  const saveApiKeyButton = document.getElementById('save-api-key');
  const optionsButton = document.getElementById('options-button');
  
  // 加载保存的配置
  loadConfig();
  
  // 检查当前标签页是否为YouTube视频
  checkCurrentTab();
  
  // 事件监听器
  enabledToggle.addEventListener('change', function() {
    saveConfig({ enabled: this.checked });
    updateStatus();
  });
  
  frequencySelect.addEventListener('change', function() {
    saveConfig({ danmakuFrequency: this.value });
  });
  
  displayAreaSelect.addEventListener('change', function() {
    saveConfig({ danmakuDisplayArea: this.value });
  });
  
  styleSelect.addEventListener('change', function() {
    saveConfig({ danmakuStyle: this.value });
  });
  
  saveApiKeyButton.addEventListener('click', function() {
    saveConfig({ apiKey: apiKeyInput.value });
    showSaveMessage();
  });
  
  optionsButton.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // 加载配置
  function loadConfig() {
    chrome.storage.sync.get(['apiKey', 'danmakuFrequency', 'danmakuStyle', 'danmakuDisplayArea', 'enabled'], function(result) {
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
      }
      
      if (result.danmakuFrequency) {
        frequencySelect.value = result.danmakuFrequency;
      }
      
      if (result.danmakuDisplayArea) {
        displayAreaSelect.value = result.danmakuDisplayArea;
      }
      
      if (result.danmakuStyle) {
        styleSelect.value = result.danmakuStyle;
      }
      
      if (result.enabled !== undefined) {
        enabledToggle.checked = result.enabled;
      }
      
      updateStatus();
    });
  }
  
  // 保存配置
  function saveConfig(config) {
    chrome.storage.sync.set(config, function() {
      // 通知内容脚本配置已更新
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com/watch')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'configUpdated',
            config: config
          });
        }
      });
    });
  }
  
  // 显示保存消息
  function showSaveMessage() {
    const message = document.createElement('div');
    message.textContent = '已保存！';
    message.style.position = 'fixed';
    message.style.bottom = '10px';
    message.style.left = '50%';
    message.style.transform = 'translateX(-50%)';
    message.style.backgroundColor = '#4CAF50';
    message.style.color = 'white';
    message.style.padding = '8px 16px';
    message.style.borderRadius = '4px';
    message.style.zIndex = '1000';
    
    document.body.appendChild(message);
    
    setTimeout(function() {
      document.body.removeChild(message);
    }, 2000);
  }
  
  // 检查当前标签页
  function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].url) {
        const isYouTubeVideo = tabs[0].url.includes('youtube.com/watch');
        updateStatus(isYouTubeVideo);
      } else {
        updateStatus(false);
      }
    });
  }
  
  // 更新状态显示
  function updateStatus(isYouTubeVideo) {
    chrome.storage.sync.get(['enabled', 'apiKey'], function(result) {
      const enabled = result.enabled !== undefined ? result.enabled : true;
      const hasApiKey = result.apiKey && result.apiKey.trim() !== '';
      
      if (isYouTubeVideo === false) {
        statusIcon.className = 'status-icon inactive';
        statusText.textContent = '当前页面不是YouTube视频';
        return;
      }
      
      if (!enabled) {
        statusIcon.className = 'status-icon inactive';
        statusText.textContent = '插件已禁用';
      } else if (!hasApiKey) {
        statusIcon.className = 'status-icon inactive';
        statusText.textContent = '未设置API密钥';
      } else {
        statusIcon.className = 'status-icon active';
        statusText.textContent = '插件运行中';
      }
    });
  }
});