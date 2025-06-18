// LLM模型调用

// 调用GPT-4o生成弹幕
async function generateDanmakuWithGPT4o(context, style, apiKey) {
  if (!apiKey) {
    console.error("未提供API密钥");
    return { error: "未提供API密钥" };
  }
  
  try {
    // 构建提示词
    const prompt = buildPrompt(context, style);
    
    // 调用OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "你是一个专门为视频生成有趣弹幕的AI助手。根据视频内容，生成简短、有趣、相关的弹幕评论。每条弹幕应该简短（不超过20个字），符合视频当前内容，并且有趣或有见解。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
        n: 5  // 一次生成5条弹幕
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error("API错误:", data.error);
      return { error: data.error.message };
    }
    
    // 解析返回的弹幕
    const content = data.choices[0].message.content;
    const danmakuList = parseDanmakuResponse(content);
    
    return { danmaku: danmakuList };
  } catch (error) {
    console.error("生成弹幕时出错:", error);
    return { error: error.message };
  }
}

// 构建提示词
function buildPrompt(context, style) {
  const { title, description, currentTime, subtitles } = context;
  
  let stylePrompt = "";
  switch (style) {
    case "funny":
      stylePrompt = "生成幽默搞笑的弹幕，可以包含梗和笑点";
      break;
    case "critical":
      stylePrompt = "生成批判性思考的弹幕，可以质疑或分析视频内容";
      break;
    default: // standard
      stylePrompt = "生成标准的评论弹幕，表达对视频内容的反应和感受";
  }
  
  return `
    视频标题: ${title}
    视频描述: ${description}
    当前时间点: ${formatTime(currentTime)}
    当前内容字幕: ${subtitles || "无可用字幕"}
    
    ${stylePrompt}
    
    请生成5条简短的弹幕（每条不超过20个字），与视频当前内容相关。
    直接输出弹幕内容，每行一条，不要有编号或其他格式。
  `;
}

// 格式化时间
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// 解析API返回的弹幕内容
function parseDanmakuResponse(content) {
  // 分行并过滤空行
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  // 过滤掉可能的编号和其他非弹幕内容
  return lines.map(line => {
    // 移除可能的编号前缀，如"1. "、"- "等
    return line.replace(/^\d+\.\s*|-\s*|•\s*/, '').trim();
  }).filter(line => line.length > 0 && line.length <= 30);
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  // Node.js环境
  module.exports = { generateDanmakuWithGPT4o };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.apiUtils = { generateDanmakuWithGPT4o };
}
export { generateDanmakuWithGPT4o };