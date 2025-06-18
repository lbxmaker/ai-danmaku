// YouTube视频内容提取工具
window.youtubeUtils = {
  // 获取视频标题
  getVideoTitle() {
    const titleElement = document.querySelector("h1.title");
    return titleElement ? titleElement.textContent.trim() : "";
  },

  // 获取视频描述
  getVideoDescription() {
    const descriptionElement = document.querySelector("#description-inline-expander");
    return descriptionElement ? descriptionElement.textContent.trim() : "";
  },

  // 获取视频ID
  getVideoId() {
    const url = window.location.href;
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  },

  // 获取当前播放时间
  getCurrentTime() {
    const videoElement = document.querySelector("video");
    return videoElement ? Math.floor(videoElement.currentTime) : 0;
  },

  // 格式化时间（秒 -> MM:SS）
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  },

  // 检查是否是YouTube视频页面
  isYouTubeVideoPage() {
    return window.location.href.includes("youtube.com/watch");
  }
};