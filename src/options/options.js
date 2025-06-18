// 选项页面脚本

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const apiKeyInput = document.getElementById('api-key');
  const apiModelSelect = document.getElementById('api-model');
  const danmakuFontSizeInput = document.getElementById('danmaku-font-size');
  const fontSizeValue = document.getElementById('font-size-value');
  const danmakuSpeedSelect = document.getElementById('danmaku-speed');
  const danmakuOpacityInput = document.getElementById('danmaku-opacity');
  const opacityValue = document.getElementById('opacity-value');
  const danmakuColorSelect = document.getElementById('danmaku-color');
  const promptTemplateTextarea = document.getElementById('prompt-template');
  const temperatureInput = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperature-value');
  const useSubtitlesCheckbox = document.getElementById('use-subtitles');
  const saveButton = document.getElementById('save-button');
  const resetButton = document.getElementById('reset-button');
  
  // 默认配置
  const defaultConfig = {
    apiKey: '',
    apiModel: 'gpt-4o',
    danmakuFontSize: 24,
    danmakuSpeed: 'normal',
    danmakuOpacity: 1,
    danmakuColor: 'random',
    promptTemplate: `视频标题: {{title}}
视频描述: {{description}}
当前时间点: {{currentTime}}
当前内容字幕: {{subtitles}}

{{stylePrompt}}

请生成5条简短的弹幕（每条不超过20个字），与视频当前内容相关。
直接输出弹幕内容，每行一条，不要有编号或其他格式。`,
    temperature: 0.7,
    useSubtitles: true
  };
  
  // 加载保存的配置
  loadConfig();
  
  // 更新显示值的事件监听器
  danmakuFontSizeInput.addEventListener('input', function() {
    fontSizeValue.textContent = this.value + 'px';
  });
  
  danmakuOpacityInput.addEventListener('input', function() {
    opacityValue.textContent = Math.round(this.value * 100) + '%';
  });
  
  temperatureInput.addEventListener('input', function() {
    temperatureValue.textContent = this.value;
  });
  
  // 保存按钮事件监听器
  saveButton.addEventListener('click', function() {
    const config = {
      apiKey: apiKeyInput.value,
      apiModel: apiModelSelect.value,
      danmakuFontSize: parseInt(danmakuFontSizeInput.value),
      danmakuSpeed: danmakuSpeedSelect.value,
      danmakuOpacity: parseFloat(danmakuOpacityInput.value),
      danmakuColor: danmakuColorSelect.value,
      promptTemplate: promptTemplateTextarea.value,
      temperature: parseFloat(temperatureInput.value),
      useSubtitles: useSubtitlesCheckbox.checked
    };
    
    saveConfig(config);
    showSaveMessage('设置已保存！');
  });
  
  // 重置按钮事件监听器
  resetButton.addEventListener('click', function() {
    if (confirm('确定要恢复默认设置吗？')) {
      // 保留API密钥
      const apiKey = apiKeyInput.value;
      saveConfig({ ...defaultConfig, apiKey });
      loadConfig();
      showSaveMessage('已恢复默认设置！');
    }
  });
  
  // 加载配置
  function loadConfig() {
    chrome.storage.sync.get(Object.keys(defaultConfig), function(result) {
      // 合并默认配置和保存的配置
      const config = { ...defaultConfig, ...result };
      
      // 更新UI
      apiKeyInput.value = config.apiKey || '';
      apiModelSelect.value = config.apiModel || 'gpt-4o';
      danmakuFontSizeInput.value = config.danmakuFontSize || 24;
      fontSizeValue.textContent = (config.danmakuFontSize || 24) + 'px';
      danmakuSpeedSelect.value = config.danmakuSpeed || 'normal';
      danmakuOpacityInput.value = config.danmakuOpacity || 1;
      opacityValue.textContent = Math.round((config.danmakuOpacity || 1) * 100) + '%';
      danmakuColorSelect.value = config.danmakuColor || 'random';
      promptTemplateTextarea.value = config.promptTemplate || defaultConfig.promptTemplate;
      temperatureInput.value = config.temperature || 0.7;
      temperatureValue.textContent = config.temperature || 0.7;
      useSubtitlesCheckbox.checked = config.useSubtitles !== undefined ? config.useSubtitles : true;
    });
  }
  
  // 保存配置
  function saveConfig(config) {
    chrome.storage.sync.set(config);
  }
  
  // 显示保存消息
  function showSaveMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.bottom = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.backgroundColor = '#4CAF50';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.zIndex = '1000';
    
    document.body.appendChild(messageElement);
    
    setTimeout(function() {
      document.body.removeChild(messageElement);
    }, 3000);
  }
});