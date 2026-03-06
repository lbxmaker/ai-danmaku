# AI Danmaku Generator (AI弹幕生成器) 🚀

一个基于大语言模型（LLM）和多智能体（Multi-Agent）架构的 Chrome 浏览器扩展。它能够“观看”视频、“阅读”字幕，并为 YouTube 和 Bilibili 自动生成个性化、场景化的高质量实时弹幕。

## ✨ 核心功能特点 (Features)

* 🎭 **多智能体协作架构 (CrewAI-inspired)**
    基于多角色 Agent 协同工作，内置三种不同性格的“虚拟观众”，让弹幕生态更真实丰富：
    * 🤓 **领航学伴 (Standard)**：充当“课代表”，总结要点，梳理知识脉络。
    * 💖 **暖心同路人 (Humor)**：提供情感支持，赞美精彩瞬间，活跃气氛。
    * 🤔 **认知破壁者 (Critical)**：深度思考者，提出启发性问题，引入不同视角。
* 👁️ **原生视觉理解 (Visual Analysis)**
    不仅能读取字幕，还能按设定间隔或“场景变化检测 (Scene Change Detection)”截取视频画面，调用多模态视觉大模型（Vision LLM）生成与画面高度相关的弹幕。
* 🧠 **多模型提供商支持**
    原生支持 OpenAI (如 GPT-4o) 和 SiliconFlow (如 Qwen 系列、DeepSeek-VL2 视觉模型)，支持灵活切换。
* ⚙️ **极致的自定义体验**
    * **外观控制**：自定义弹幕的字体大小、透明度、速度、颜色（支持按 Agent 角色分配专属颜色或随机色彩），以及显示区域（全屏/半屏/四分之一屏）。
    * **AI 调优**：自由组合启用的 Agent，甚至可以单独调节每个 Agent 的“温度值 (Temperature)”来控制生成的创造力。

## 🛠️ 安装指南 (Installation)

由于本项目目前在开发阶段（未上架 Chrome Web Store），请通过“开发者模式”本地安装：

1. 下载此项目的 ZIP 压缩包并解压，或者使用 Git 克隆：
   \`\`\`bash
   git clone https://github.com/your-username/ai-danmaku.git
   \`\`\`
2. 打开 Chrome 浏览器，在地址栏输入 \`chrome://extensions/\` 并回车。
3. 开启页面右上角的 “开发者模式” (Developer mode)。
4. 点击左上角的 “加载已解压的扩展程序” (Load unpacked)。
5. 选择你刚刚解压/克隆的项目文件夹（即包含 \`manifest.json\` 的文件夹）。

## 🚀 配置与使用 (Configuration & Usage)

1. **设置 API Key**：安装完成后，点击浏览器右上角的扩展程序图标，点击“高级设置”进入配置页。根据你的选择填入 OpenAI 或 SiliconFlow 的 API Key。
   *(注：你的 API Key 仅保存在浏览器本地存储中，不会上传至任何第三方服务器。)*
2. **个性化调整**：在设置页中，你可以勾选需要的 Agent 角色，调节弹幕密度和视觉分析频率。
3. **开始体验**：打开任意一个 [YouTube](https://www.youtube.com/) 或 [Bilibili](https://www.bilibili.com/) 视频播放页面。点击扩展图标确保插件处于“开启”状态，视频播放时即可看到 AI 自动生成的弹幕流！

## 💻 技术栈 (Tech Stack)

* **Extension API**: Chrome Manifest V3
* **Core Logic**: Vanilla JavaScript (ES6+), DOM MutationObserver
* **AI Architecture**: 自定义轻量级 CrewAI 实现、大模型 API 对接
* **UI/UX**: HTML5 Canvas (用于视觉帧截取), CSS3 Animations (用于弹幕平滑滚动)

## 📜 许可证 (License)

[MIT License](LICENSE)
