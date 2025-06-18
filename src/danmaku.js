// 内容脚本，直接与视频页面交互

// 全局变量
let danmakuContainer = null;
let videoElement = null;
let danmakuQueue = [];
let subtitles = [];
let lastProcessedTime = 0;
let config = {
  apiKey: "",
  danmakuFrequency: "medium",
  danmakuStyle: "standard",
  enabled: true,
  danmakuDisplayArea: "full" // 默认显示区域为全屏
};

// 全局变量部分
let isPaused = false;
let danmakuBatchTimer = null;
let isBatchGenerating = false;

// 平台相关变量
let currentPlatform = "youtube"; // 默认为YouTube，可以是"youtube"或"bilibili"

// 初始化函数
async function initialize() {
  console.log("AI Danmaku初始化中...");
  
  // 清理页面上所有已存在的弹幕元素
  clearAllDanmaku();
  
  // 重置全局变量
  danmakuContainer = null;
  danmakuQueue = [];
  subtitles = [];
  lastProcessedTime = 0;
  isPaused = false;
  isBatchGenerating = false;
  if (danmakuBatchTimer) {
    clearTimeout(danmakuBatchTimer);
    danmakuBatchTimer = null;
  }
  
  // 检测当前平台
  if (window.youtubeUtils && window.youtubeUtils.isYouTubeVideoPage()) {
    currentPlatform = "youtube";
    console.log("检测到YouTube平台");
  } else if (window.bilibiliUtils && window.bilibiliUtils.isBilibiliVideoPage()) {
    currentPlatform = "bilibili";
    console.log("检测到Bilibili平台");
  } else {
    console.log("不支持的平台，停止初始化");
    return;
  }
  
  // 加载配置
  chrome.storage.sync.get(["apiKey", "danmakuFrequency", "danmakuStyle", "enabled", "danmakuDisplayArea"], (result) => {
    config = { ...config, ...result };
    console.log("配置加载完成", config);
    
    if (!config.enabled || !config.apiKey) {
      console.log("插件未启用或API密钥未设置");
      return;
    }
    
    // 设置弹幕容器
    setupDanmakuContainer();
    
    // 获取视频元素
    videoElement = document.querySelector("video");
    if (videoElement) {
      // 监听视频播放事件
      videoElement.addEventListener("timeupdate", handleTimeUpdate);
      
      // 添加暂停和播放事件监听
      videoElement.addEventListener("pause", handleVideoPause);
      videoElement.addEventListener("play", handleVideoPlay);
      
      // 检查初始暂停状态
      chrome.runtime.sendMessage({ action: "checkPauseState" }, (response) => {
        isPaused = response.isPaused || videoElement.paused;
        
        // 尝试获取字幕
        extractSubtitles();
        
        // 启动随机弹幕生成（如果未暂停）
        if (!isPaused) {
          startRandomDanmakuGeneration();
        }
      });
    }
  });
}

function setupDanmakuContainer() {
  // 检查是否已存在
  if (document.getElementById("ai-danmaku-container")) {
    danmakuContainer = document.getElementById("ai-danmaku-container");
    console.log("弹幕容器已存在");
    return;
  }
  
  // 创建弹幕容器
  danmakuContainer = document.createElement("div");
  danmakuContainer.id = "ai-danmaku-container";
  
  // 获取视频元素的高度
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    console.error('未找到视频元素');
    return;
  }
  
  // 设置容器样式
  Object.assign(danmakuContainer.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: `${videoElement.offsetHeight}px`,
    pointerEvents: "none",
    zIndex: "10000",
    overflow: "hidden",
    visibility: "visible",
    display: "block"
  });
  
  // 监听视频尺寸变化
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      danmakuContainer.style.height = `${entry.target.offsetHeight}px`;
      console.log('弹幕容器高度已更新：', entry.target.offsetHeight);
    }
  });
  
  resizeObserver.observe(videoElement);
  
  // 将容器添加到视频播放器上
  let playerContainer;
  
  if (currentPlatform === "youtube") {
    playerContainer = document.querySelector(".html5-video-container");
  } else if (currentPlatform === "bilibili") {
    playerContainer = document.querySelector(".bpx-player-video-wrap");
  }
  
  if (!playerContainer) {
    console.error(`未找到${currentPlatform}播放器容器`);
    return;
  }
  
  // 确保播放器容器有正确的定位
  if (window.getComputedStyle(playerContainer).position === "static") {
    playerContainer.style.position = "relative";
  }
  
  playerContainer.appendChild(danmakuContainer);
  
  // 输出容器状态
  console.log("弹幕容器已创建，状态：", {
    width: danmakuContainer.offsetWidth,
    height: danmakuContainer.offsetHeight,
    position: window.getComputedStyle(danmakuContainer).position,
    zIndex: window.getComputedStyle(danmakuContainer).zIndex,
    visibility: window.getComputedStyle(danmakuContainer).visibility
  });
}

// 处理视频时间更新事件
function handleTimeUpdate() {
  if (!videoElement || !config.enabled) return;
  
  const currentTime = Math.floor(videoElement.currentTime);
  
  // 每隔一段时间处理一次，避免过于频繁
  if (currentTime !== lastProcessedTime) {
    lastProcessedTime = currentTime;
    
    // 显示队列中的弹幕
    showQueuedDanmaku();
  }
}

// 随机批量生成弹幕函数
function startRandomDanmakuGeneration() {
  if (isBatchGenerating || isPaused) return;
  
  isBatchGenerating = true;
  console.log("开始随机批量生成弹幕");
  
  // 生成一批弹幕
  generateDanmakuBatch();
  
  // 设置下一批弹幕的生成时间（随机1-5秒）
  const nextBatchDelay = Math.floor(Math.random() * 4000) + 1000;
  danmakuBatchTimer = setTimeout(() => {
    isBatchGenerating = false;
    startRandomDanmakuGeneration();
  }, nextBatchDelay);
}

// 生成一批弹幕
function generateDanmakuBatch() {
  if (!videoElement || !config.enabled || !config.apiKey) return;
  
  const currentTime = Math.floor(videoElement.currentTime);
  const videoContext = getVideoContext(currentTime);
  
  // 生成10-20条弹幕
  const danmakuCount = Math.floor(Math.random() * 11) + 10;
  console.log(`准备生成${danmakuCount}条弹幕`);
  
  // 调用API生成弹幕
  chrome.runtime.sendMessage(
    {
      action: "generateDanmaku",
      context: videoContext,
      style: config.danmakuStyle,
      apiKey: config.apiKey,
      count: danmakuCount,  // 添加数量参数
      platform: currentPlatform // 添加平台信息
    },
    (response) => {
      if (response && response.danmaku) {
        // 将生成的弹幕添加到队列
        addDanmakuToQueue(response.danmaku);
        console.log("成功生成弹幕批次:", response.danmaku);
        
        // 立即显示一部分弹幕
        showQueuedDanmaku();
        
        // 设置随机间隔显示剩余弹幕
        const displayInterval = setInterval(() => {
          if (danmakuQueue.length > 0) {
            showQueuedDanmaku();
          } else {
            clearInterval(displayInterval);
          }
        }, Math.floor(Math.random() * 500) + 500);  // 每0.5-1秒显示一批
      } else if (response && response.error) {
        console.error("生成弹幕失败:", response.error);
      }
    }
  );
}

// 获取视频上下文
function getVideoContext(currentTime) {
  let videoTitle = "";
  let videoDescription = "";
  
  // 根据平台选择不同的获取方法
  if (currentPlatform === "youtube" && youtubeUtils) {
    videoTitle = youtubeUtils.getVideoTitle();
    videoDescription = youtubeUtils.getVideoDescription();
  } else if (currentPlatform === "bilibili" && bilibiliUtils) {
    videoTitle = bilibiliUtils.getVideoTitle();
    videoDescription = bilibiliUtils.getVideoDescription();
  }
  
  // 获取当前时间点附近的字幕
  const nearbySubtitles = subtitles.filter(sub => 
    Math.abs(sub.time - currentTime) < 30
  ).map(sub => sub.text).join(" ");
  
  return {
    title: videoTitle,
    description: videoDescription,
    currentTime: currentTime,
    subtitles: nearbySubtitles,
    platform: currentPlatform
  };
}

// 提取视频字幕
async function extractSubtitles() {
  try {
    if (currentPlatform === "youtube") {
      // YouTube字幕提取
      // 检查字幕按钮状态
      const captionsButton = document.querySelector(".ytp-subtitles-button");
      const subtitlesEnabled = captionsButton && captionsButton.getAttribute("aria-pressed") === "true";
      
      if (!subtitlesEnabled) {
        console.log("字幕未启用");
        return;
      }
      
      // 方法1：从字幕容器中提取文本
      const selectors = [
        ".ytp-caption-segment", // 新版YouTube字幕
        ".captions-text",       // 旧版字幕
        ".caption-window"       // 另一种可能的容器
      ];
      
      let foundSubtitles = false;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements && elements.length > 0) {
          const currentTime = Math.floor(videoElement.currentTime);
          
          // 收集所有字幕片段
          Array.from(elements).forEach(element => {
            const text = element.textContent.trim();
            if (text) {
              // 添加到字幕数组
              subtitles.push({
                text: text,
                time: currentTime
              });
              console.log(`提取到字幕: ${text} (${currentTime}秒)`);
            }
          });
          
          foundSubtitles = true;
          break;
        }
      }
      
      // 方法2：如果没有找到字幕元素，设置MutationObserver监听字幕变化
      if (!foundSubtitles) {
        setupSubtitleObserver();
      }
    } else if (currentPlatform === "bilibili") {
      // Bilibili字幕提取
      const selectors = [
        ".bpx-player-subtitle-item-text", // Bilibili字幕文本
        ".bilibili-player-video-subtitle-item-text" // 旧版字幕
      ];
      
      let foundSubtitles = false;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements && elements.length > 0) {
          const currentTime = Math.floor(videoElement.currentTime);
          
          // 收集所有字幕片段
          Array.from(elements).forEach(element => {
            const text = element.textContent.trim();
            if (text) {
              // 添加到字幕数组
              subtitles.push({
                text: text,
                time: currentTime
              });
              console.log(`提取到Bilibili字幕: ${text} (${currentTime}秒)`);
            }
          });
          
          foundSubtitles = true;
          break;
        }
      }
      
      // 如果没有找到字幕元素，设置MutationObserver监听字幕变化
      if (!foundSubtitles) {
        setupBilibiliSubtitleObserver();
      }
    }
  } catch (error) {
    console.error("提取字幕时出错:", error);
  }
}

// 设置YouTube字幕观察器
function setupSubtitleObserver() {
  // 创建一个观察器实例
  const subtitleObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const subtitleSelectors = [".ytp-caption-segment", ".captions-text", ".caption-window"];
        for (const selector of subtitleSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements && elements.length > 0) {
            const currentTime = Math.floor(videoElement.currentTime);
            Array.from(elements).forEach(element => {
              const text = element.textContent.trim();
              if (text) {
                // 添加到字幕数组
                subtitles.push({
                  text: text,
                  time: currentTime
                });
                console.log(`观察器提取到字幕: ${text} (${currentTime}秒)`);
              }
            });
          }
        }
      }
    }
  });
  
  // 配置观察选项
  const config = { 
    childList: true, 
    subtree: true, 
    characterData: true
  };
  
  // 选择需要观察变动的节点
  const targetNode = document.querySelector('.html5-video-container');
  if (targetNode) {
    subtitleObserver.observe(targetNode, config);
    console.log("已设置YouTube字幕观察器");
  }
}

// 设置Bilibili字幕观察器
function setupBilibiliSubtitleObserver() {
  // 创建一个观察器实例
  const subtitleObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const subtitleSelectors = [".bpx-player-subtitle-item-text", ".bilibili-player-video-subtitle-item-text"];
        for (const selector of subtitleSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements && elements.length > 0) {
            const currentTime = Math.floor(videoElement.currentTime);
            Array.from(elements).forEach(element => {
              const text = element.textContent.trim();
              if (text) {
                // 添加到字幕数组
                subtitles.push({
                  text: text,
                  time: currentTime
                });
                console.log(`观察器提取到Bilibili字幕: ${text} (${currentTime}秒)`);
              }
            });
          }
        }
      }
    }
  });
  
  // 配置观察选项
  const config = { 
    childList: true, 
    subtree: true, 
    characterData: true
  };
  
  // 选择需要观察变动的节点
  const targetNode = document.querySelector('.bpx-player-video-wrap') || document.querySelector('.bilibili-player-video-subtitle');
  if (targetNode) {
    subtitleObserver.observe(targetNode, config);
    console.log("已设置Bilibili字幕观察器");
  }
}

// 将弹幕添加到队列
function addDanmakuToQueue(danmakuList) {
  if (!Array.isArray(danmakuList)) {
    danmakuList = [danmakuList]; // 转换为数组
  }
  
  danmakuQueue.push(...danmakuList);
}

// 显示队列中的弹幕
function showQueuedDanmaku() {
  if (danmakuQueue.length === 0 || !danmakuContainer) return;
  
  // 根据频率决定每次显示的弹幕数量
  const batchSizes = {
    low: 1,
    medium: 3,
    high: 5
  };
  
  const batchSize = batchSizes[config.danmakuFrequency] || 1;
  const danmakuToShow = danmakuQueue.splice(0, batchSize);
  
  danmakuToShow.forEach(text => {
    createDanmakuElement(text);
  });
}

// 从danmaku.js合并的函数

// 创建弹幕元素
function createDanmaku(text, container, config) {
  if (!container) return null;
  
  const danmaku = document.createElement("div");
  danmaku.className = "ai-danmaku";
  danmaku.textContent = text;
  
  // 应用基本样式
  danmaku.style.position = "absolute";
  danmaku.style.left = "100%";
  danmaku.style.whiteSpace = "nowrap";
  danmaku.style.pointerEvents = "none";
  
  // 应用配置样式
  applyDanmakuStyle(danmaku, config);
  
  // 根据显示区域设置随机垂直位置
  let minTop = 5; // 默认最小顶部位置（5%）
  let maxTop = 90; // 默认最大顶部位置（90%）
  
  // 根据配置的显示区域调整垂直范围
  if (config.danmakuDisplayArea) {
    switch(config.danmakuDisplayArea) {
      case 'quarter': // 四分之一
        minTop = 5;
        maxTop = 25;
        break;
      case 'half': // 半屏
        minTop = 5;
        maxTop = 50;
        break;
      case 'full': // 全屏
      default:
        minTop = 5;
        maxTop = 90;
        break;
    }
  }
  
  // 在指定范围内生成随机位置
  const top = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
  danmaku.style.top = `${top}%`;
  
  // 添加到容器
  container.appendChild(danmaku);
  
  return danmaku;
}

// 应用弹幕样式
function applyDanmakuStyle(danmaku, config) {
  // 默认配置
  const defaultConfig = {
    fontSize: 24,
    speed: 'normal',
    opacity: 1,
    color: 'random'
  };
  
  // 合并配置
  const mergedConfig = { ...defaultConfig, ...config };
  
  // 设置字体大小
  danmaku.style.fontSize = `${mergedConfig.fontSize}px`;
  
  // 设置透明度
  danmaku.style.opacity = mergedConfig.opacity;
  
  // 设置颜色
  if (mergedConfig.color === 'random') {
    danmaku.style.color = getRandomColor();
  } else {
    danmaku.style.color = mergedConfig.color;
  }
  
  // 添加文字阴影以提高可读性
  danmaku.style.textShadow = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";
  
  // 设置动画速度
  const speedMap = {
    slow: 20,
    normal: 15,   // 默认持续时间
    fast: 12
  };
  
  const duration = speedMap[mergedConfig.speed] || 15;
  danmaku.style.transition = `transform ${duration}s linear`;
  
  return danmaku;
}

// 获取元素的transition-duration值（毫秒）
function getTransitionDurationInMs(element) {
  const style = window.getComputedStyle(element);
  const duration = style.getPropertyValue('transition-duration');
  
  // 转换为毫秒
  if (duration.indexOf('ms') > -1) {
    return parseFloat(duration);
  } else if (duration.indexOf('s') > -1) {
    return parseFloat(duration) * 1000;
  }
  
  return 12000;
}

// 启动弹幕动画
function animateDanmaku(danmaku, container, callback) {
  if (!danmaku || !container) return;
  
  // 触发动画
  setTimeout(() => {
    // 计算移动距离，确保完全穿过屏幕
    const danmakuWidthPercent = (danmaku.offsetWidth / container.offsetWidth) * 100;
    const distance = 100 + danmakuWidthPercent + 500;
    
    danmaku.style.transform = `translateX(-${distance}%)`;
    
    // 检查是否需要立即暂停动画
    chrome.runtime.sendMessage({ action: "checkPauseState" }, (response) => {
      if (response.isPaused) {
        // 如果视频已暂停，暂停动画
        danmaku.style.animationPlayState = 'paused';
      }
    });
  }, 50);
  
  // 获取动画持续时间
  const transitionDuration = getTransitionDurationInMs(danmaku);
  
  // 动画结束后移除
  setTimeout(() => {
    if (danmaku.parentNode) {
      danmaku.parentNode.removeChild(danmaku);
      if (typeof callback === 'function') {
        callback();
      }
    }
  }, transitionDuration);
  
  // 返回动画对象，以便可以控制暂停/播放
  return danmaku;
}

function createDanmakuElement(text) {
  if (!danmakuContainer || !videoElement) {
    console.error("创建弹幕失败：容器或视频元素不存在");
    return;
  }
  
  console.log("创建弹幕：", text);
  console.log("容器状态：", {
    width: danmakuContainer.offsetWidth,
    height: danmakuContainer.offsetHeight,
    visibility: window.getComputedStyle(danmakuContainer).visibility,
    display: window.getComputedStyle(danmakuContainer).display,
    zIndex: window.getComputedStyle(danmakuContainer).zIndex
  });
  
  const danmaku = document.createElement("div");
  danmaku.className = "ai-danmaku";
  danmaku.textContent = text;
  
  // 设置弹幕样式
  Object.assign(danmaku.style, {
    position: "absolute",
    left: "100%",
    whiteSpace: "nowrap",
    fontWeight: "normal",
    textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
    fontSize: "24px",
    willChange: "transform",
    visibility: "visible",
    display: "block",
    zIndex: "10000",
    opacity: "0.9",
    transform: "translateZ(0)",  // 启用GPU加速
    backfaceVisibility: "hidden"
  });
  
  // 应用随机颜色
  const randomColor = getRandomColor();
  danmaku.style.color = randomColor;
  
  // 添加渐变效果
  danmaku.animate([
    { opacity: 0 },
    { opacity: 0.9, offset: 0.1 },
    { opacity: 0.9, offset: 0.9 },
    { opacity: 0 }
  ], {
    duration: 12000, // 持续时间
    easing: "ease-in-out"
  });
  
  // 根据显示区域设置随机垂直位置
  let minTop = 5; // 默认最小顶部位置（5%）
  let maxTop = 90; // 默认最大顶部位置（90%）
  
  // 根据配置的显示区域调整垂直范围
  switch(config.danmakuDisplayArea) {
    case 'quarter': // 四分之一
      minTop = 5;
      maxTop = 25;
      break;
    case 'half': // 半屏
      minTop = 5;
      maxTop = 50;
      break;
    case 'full': // 全屏
    default:
      minTop = 5;
      maxTop = 90;
      break;
  }
  
  // 在指定范围内生成随机位置
  const top = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
  danmaku.style.top = `${top}%`;
  
  console.log(`弹幕显示区域: ${config.danmakuDisplayArea}, 垂直位置: ${top}%`);
  
  // 添加到容器
  danmakuContainer.appendChild(danmaku);
  console.log("弹幕已添加到容器，元素状态：", {
    width: danmaku.offsetWidth,
    height: danmaku.offsetHeight,
    top: danmaku.style.top,
    left: danmaku.style.left
  });
  
  // 强制重排以确保样式已应用
  danmaku.offsetHeight;
  
  // 触发动画
  requestAnimationFrame(() => {
    // 确保弹幕完全贯穿视频容器宽度
    const danmakuWidthPercent = (danmaku.offsetWidth / danmakuContainer.offsetWidth) * 100;
    // 增加移动距离，确保弹幕完全穿过视频容器
    // 容器宽度(100%) + 弹幕宽度的百分比 + 额外的500%确保完全移出
    const distance = 100 + danmakuWidthPercent + 500;
    
    // 使用 Web Animations API 创建移动动画
    const moveAnimation = danmaku.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(-${distance}%)` }
    ], {
      duration: 12000,
      easing: 'linear',
      fill: 'forwards'
    });
    
    // 存储动画对象，以便在视频暂停时可以控制
    danmaku.moveAnimation = moveAnimation;
    
    // 如果当前是暂停状态，立即暂停移动动画
    if (isPaused) {
      moveAnimation.pause();
    }
    
    console.log("弹幕动画已触发，移动距离：", distance);
    
    // 监听动画完成事件
    moveAnimation.onfinish = () => {
      if (danmaku.parentNode) {
        danmaku.parentNode.removeChild(danmaku);
        console.log("弹幕已移除");
      }
    };
  });
}

// 获取随机颜色
function getRandomColor() {
  const colors = [
    '#FFFFFF', // 白色
    '#FF4444', // 红色
    '#44AAFF', // 蓝色
    '#44FF44', // 绿色
    '#FFFF44', // 黄色
    '#FF44FF', // 粉色
    '#44FFFF'  // 青色
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

// 处理视频暂停事件
function handleVideoPause() {
  console.log("视频已暂停，通知后台脚本");
  
  // 通知后台脚本视频已暂停
  chrome.runtime.sendMessage({ action: "videoPaused" }, (response) => {
    console.log("后台脚本响应:", response);
  });
  
  // 本地暂停处理
  isPaused = true;
  
  // 清除弹幕生成定时器
  if (danmakuBatchTimer) {
    clearTimeout(danmakuBatchTimer);
    danmakuBatchTimer = null;
  }
  
  // 重置批量生成状态
  isBatchGenerating = false;
}

// 处理视频播放事件
function handleVideoPlay() {
  console.log("视频已播放，通知后台脚本");
  
  // 通知后台脚本视频已播放
  chrome.runtime.sendMessage({ action: "videoPlayed" }, (response) => {
    console.log("后台脚本响应:", response);
  });
  
  // 本地播放处理
  isPaused = false;
  
  // 重新启动弹幕生成
  if (!isBatchGenerating) {
    startRandomDanmakuGeneration();
  }
}

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "videoPageLoaded") {
    // 页面加载完成，初始化插件
    initialize();
    sendResponse({ status: "initialized" });
  } else if (request.action === "configUpdated") {
    // 配置更新
    config = { ...config, ...request.config };
    sendResponse({ status: "configUpdated" });
  } else if (request.action === "pauseDanmaku") {
    // 暂停所有弹幕动画
    document.querySelectorAll('.ai-danmaku').forEach(danmaku => {
      if (danmaku.moveAnimation) {
        danmaku.moveAnimation.pause();
      }
    });
    isPaused = true;
    sendResponse({ status: "paused" });
  } else if (request.action === "resumeDanmaku") {
    // 恢复所有弹幕动画
    document.querySelectorAll('.ai-danmaku').forEach(danmaku => {
      if (danmaku.moveAnimation) {
        danmaku.moveAnimation.play();
      }
    });
    isPaused = false;
    // 重新启动弹幕生成
    if (!isBatchGenerating) {
      startRandomDanmakuGeneration();
    }
    sendResponse({ status: "resumed" });
  }
  return true;
});

// 清理所有弹幕元素
function clearAllDanmaku() {
  console.log("清理所有已存在的弹幕元素");
  const existingDanmakus = document.querySelectorAll('.ai-danmaku');
  existingDanmakus.forEach(danmaku => {
    if (danmaku.moveAnimation) {
      danmaku.moveAnimation.cancel();
    }
    if (danmaku.parentNode) {
      danmaku.parentNode.removeChild(danmaku);
    }
  });
  
  // 清理弹幕容器
  const existingContainers = document.querySelectorAll('.ai-danmaku-container');
  existingContainers.forEach(container => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });
  console.log("弹幕清理完成");
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", initialize);

// 如果页面已经加载完成，立即初始化
if (document.readyState === "complete" || document.readyState === "interactive") {
  initialize();
}