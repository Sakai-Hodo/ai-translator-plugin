# ✨# AI Image Translator 2.2 (Shoplazza 版)

一款强大的浏览器插件，可以在网页上直接翻译包含外文的图片，并将原图中的文字无缝替换为目标语言，同时保持原图的设计和排版。
特供 Shoplazza 版本，专为跨境电商优化！

## 🔥 v2.2 更新内容 (2026-02-27)
* **核心修复**：修复火山引擎 Seedream (4.5/5.0) 模型图生图无法传入参考图的问题，确保精准翻译图片文字而不改变原图。
* **水印移除**：自动关闭 Seedream 生成图片的官方水印。
* 移除测试用参考强度参数，提升 API 兼容性。

![Version](https://img.shields.io/badge/Version-2.2.0-blue)
![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-brightgreen)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Shoplazza](https://img.shields.io/badge/Shoplazza-专用版-purple)

> 📌 通用版请切换到 [main 分支](https://github.com/Sakai-Hodo/ai-translator-plugin/tree/main)

## 🎯 功能特点

### 通用功能
- 🖱️ **悬浮翻译** — 鼠标移到网页图片上，自动出现翻译按钮
- 🌍 **12 种语言** — 英/中/日/韩/法/德/西/葡/俄/阿/泰/越
- 🔄 **替换原图** / 💾 **下载译图**
- 📋 **翻译历史** — 自动保存，画廊式浏览
- 🚀 **多图并发** + 🔔 **Toast 通知**
- 🔗 **API 测试** + 🧩 **弹出面板**

### 🆕 Shoplazza 专属功能
- 📸 **批量翻译商品描述图片** — 在 Shoplazza 翻译页面一键提取并翻译所有描述图片
- ☑️ **勾选翻译** — 自由选择需要翻译的图片
- 🔍 **放大预览** — 点击缩略图放大查看原图/译图细节
- 📥 **一键插入** — 翻译完成后直接替换回编辑器
- 🔁 **单张重试** — 翻译失败可单独重新翻译
- ⚡ **实时进度** — 弹窗内显示翻译进度
- 🔄 **SPA 兼容** — 切换商品自动重新注入按钮
- ⚠️ **智能提示** — 编辑器为空时提示先翻译文本

## 📸 使用方式

### Shoplazza 批量翻译
1. 进入 Shoplazza 后台 → 翻译 → 选择商品
2. 先点击「自动翻译」翻译文本内容
3. 在右侧「商品描述」编辑器上方找到 **📸 翻译描述图片** 按钮
4. 点击按钮 → 弹窗展示描述中所有图片
5. 勾选需要翻译的图片，选择目标语言
6. 点击 **✨ 一键翻译**
7. 翻译完成后点击 **📥 插入** 替换回编辑器

### 通用悬浮翻译
1. 在任意网页上，将鼠标悬浮到图片上
2. 选择目标语言，点击 **✨ AI 翻译**
3. 在弹窗中查看对比效果
4. 选择 **替换原图** 或 **下载图片**

## 🚀 安装与配置

### 1. 安装扩展

```bash
git clone https://github.com/Sakai-Hodo/ai-translator-plugin.git
git checkout ai-translator-plugin-Shoplazza
```

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `ai-translator-plugin` 文件夹

### 2. 配置 API Key

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **API Key** | 兼容 OpenAI 接口的 API Key | `sk-xxxxxxxxxxxx` |
| **API Base URL** | API 服务地址 | `https://your-api-proxy.com/v1` |
| **模型名称** | 图片编辑模型 ID | `jimeng-4.1` |

> 💡 配置完成后可点击 **🔗 测试连接** 验证 API 是否可用。

## 📁 项目结构

```
ai-translator-plugin/
├── manifest.json        # Chrome 扩展配置
├── background.js        # Service Worker（API 调用 + 存储）
├── content.js           # 通用内容脚本（悬浮按钮 + 翻译弹窗）
├── content.css          # 通用内容脚本样式
├── shoplazza.js         # 🆕 Shoplazza 专用（批量翻译弹窗）
├── utils.js             # 共享工具函数 + 语言列表
├── popup.html/css/js    # 弹出面板
├── options.html/css/js  # 设置页
├── history.html/css/js  # 翻译历史画廊
└── icon.png             # 扩展图标
```

## 📋 更新日志

### v2.1.0
- 🔒 悬浮翻译限制为仅在右侧编辑器 iframe（body_html_ifr）内激活
- 🔒 插件作用域收窄至 Shoplazza 翻译页面，其他网页不再加载

### v2.0.0 (Shoplazza 版)
- 🆕 Shoplazza 商品描述图片批量翻译
- 🆕 图片勾选、放大预览、一键插入回编辑器
- 🆕 SPA 兼容（切换商品自动重新注入按钮）
- 🆕 自定义 Toast 提示（防止被页面框架拦截）
- 🆕 编辑器内容检测（空/无图片智能提示）
- ✅ LANGUAGES 提取至 utils.js 共享

### v1.1.0
- 语言支持扩展至 12 种
- Toast 通知系统 + 弹出面板 + API 测试
- 悬浮按钮 fixed 定位 + mouseout 处理
- CSS 提取 + 共享工具函数

### v1.0.0
- 初始版本：AI 图片翻译 + 历史画廊 + 设置页

## 📄 License

MIT License
