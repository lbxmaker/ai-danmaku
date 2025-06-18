// bilibili视频内容提取工具
window.bilibiliUtils = {
  // 获取视频标题
  getVideoTitle() {
    const titleElement = document.querySelector(".video-title");
    return titleElement ? titleElement.textContent.trim() : "";
  },

  // 获取视频描述
  getVideoDescription() {
    const descriptionElement = document.querySelector(".desc-info");
    return descriptionElement ? descriptionElement.textContent.trim() : "";
  },

  // 获取视频ID
  getVideoId() {
    const url = window.location.href;
    const match = url.match(/\/video\/([^\/?]+)/);
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

  // 检查是否是bilibili视频页面
  isBilibiliVideoPage() {
    return window.location.href.includes("bilibili.com/video/");
  }
};