// 后台脚本，处理插件的生命周期和事件监听

// 全局变量，用于跟踪每个标签页的暂停状态
let tabPauseStates = {};

// 导入API函数
import { generateDanmakuWithGPT4o } from './utils/api.js';

// 监听标签页更新事件，检测是否进入视频页面
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 检查是否是YouTube或bilibili视频页面
    const isYouTubeVideo = tab.url.includes('youtube.com/watch');
    const isBilibiliVideo = tab.url.includes('bilibili.com/video/');
    
    if (isYouTubeVideo || isBilibiliVideo) {
      // 当用户访问视频页面时，通知content脚本
      chrome.tabs.sendMessage(tabId, { 
        action: "videoPageLoaded",
        platform: isYouTubeVideo ? "youtube" : "bilibili"
      }, response => {
        if (chrome.runtime.lastError) {
          // 忽略"Receiving end does not exist"错误
          console.log("内容脚本可能尚未加载，将在脚本加载后自动初始化");
        }
      });
      // 初始化该标签页的暂停状态为false
      tabPauseStates[tabId] = false;
    }
  }
});

// 监听标签页关闭事件，清理相关状态
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabPauseStates[tabId] !== undefined) {
    delete tabPauseStates[tabId];
  }
});

// 监听来自content脚本或popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 获取发送消息的标签页ID
  const tabId = sender.tab ? sender.tab.id : null;
  
  if (request.action === "generateDanmaku") {
    // 处理生成弹幕的请求
    const DEBUG = false;
    
    // 添加条件日志函数
    function log(...args) {
      if (DEBUG) {
        console.log(...args);
      }
    }
    log("收到生成弹幕请求");
    
    // 检查该标签页是否处于暂停状态
    if (tabId && tabPauseStates[tabId]) {
      console.log("视频已暂停，不生成弹幕");
      sendResponse({ paused: true });
      return true;
    }
    
    // 调用API生成弹幕
    generateDanmakuWithGPT4o(request.context, request.style, request.apiKey)
      .then(result => {
        console.log("弹幕生成结果:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("生成弹幕出错:", error);
        sendResponse({ error: error.message });
      });
    
    return true; // 保持消息通道开放，以便异步响应
  } else if (request.action === "videoPaused") {
    // 处理视频暂停事件
    if (tabId) {
      console.log(`标签页 ${tabId} 视频已暂停`);
      tabPauseStates[tabId] = true;
      // 通知content脚本暂停所有弹幕动画
      chrome.tabs.sendMessage(tabId, { action: "pauseDanmaku" }, response => {
        if (chrome.runtime.lastError) {
          console.log("内容脚本可能尚未加载，无法暂停弹幕");
        }
      });
    }
    sendResponse({ status: "paused" });
    return true;
  } else if (request.action === "videoPlayed") {
    // 处理视频播放事件
    if (tabId) {
      console.log(`标签页 ${tabId} 视频已播放`);
      tabPauseStates[tabId] = false;
      // 通知content脚本恢复所有弹幕动画
      chrome.tabs.sendMessage(tabId, { action: "resumeDanmaku" }, response => {
        if (chrome.runtime.lastError) {
          console.log("内容脚本可能尚未加载，无法恢复弹幕");
        }
      });
    }
    sendResponse({ status: "playing" });
    return true;
  } else if (request.action === "checkPauseState") {
    // 返回当前标签页的暂停状态
    if (tabId) {
      sendResponse({ isPaused: tabPauseStates[tabId] || false });
    } else {
      sendResponse({ isPaused: false });
    }
    return true;
  }
});

// 插件安装或更新时的初始化
chrome.runtime.onInstalled.addListener(() => {
  // 设置默认配置
  chrome.storage.sync.set({
    apiKey: "",  // 用户需要设置自己的OpenAI API密钥
    danmakuFrequency: "medium",  // 弹幕频率：low, medium, high
    danmakuStyle: "standard",  // 弹幕风格：standard, funny, critical
    enabled: true  // 插件是否启用
  });
});