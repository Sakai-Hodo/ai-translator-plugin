# ✨ AI Image Translator — Chrome Extension

一款基于 AI 的图片翻译 Chrome 浏览器扩展。悬浮在任意网页图片上，一键将图中文字翻译为目标语言，保持原有排版和设计风格不变。

![Version](https://img.shields.io/badge/Version-1.0.2-blue)
![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-brightgreen)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 功能特点

- 🖱️ **悬浮翻译** — 鼠标移到网页图片上，自动出现翻译按钮
- 🌍 **多语言支持** — 支持翻译为英语、中文、日语、法语
- 🔄 **替换原图** — 一键将翻译后的图片替换到页面上
- 💾 **下载译图** — 将翻译结果保存为 PNG 文件
- 📋 **翻译历史** — 自动保存所有翻译记录，点击插件图标查看画廊
- 🚀 **多图并发** — 可同时翻译多张图片，结果按队列依次展示
- 🌙 **深色主题** — 历史记录和设置页均采用精美深色主题设计
- 🔒 **隐私安全** — 所有数据本地存储（IndexedDB），不上传云端
- ☁️ **无需后端** — 纯浏览器端运行，无需部署服务器

## 📸 使用演示

1. 在任意网页上，将鼠标悬浮到图片上
2. 选择目标语言，点击 **✨ AI 翻译**
3. 等待翻译完成，在弹窗中查看对比效果
4. 选择 **替换原图** 或 **下载图片**

> 💡 可以同时对多张图片发起翻译，翻译结果会按完成顺序依次弹窗展示。

## 🚀 安装与配置

### 1. 安装扩展

```bash
# 克隆仓库
git clone https://github.com/Sakai-Hodo/ai-translator-plugin.git
```

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `ai-translator-plugin` 文件夹

### 2. 配置 API Key

安装后会自动打开设置页。你也可以右键插件图标 → **选项** 进入设置。

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **API Key** | 兼容 OpenAI 接口的 API Key | `sk-xxxxxxxxxxxx` |
| **API Base URL** | API 服务地址 | `https://your-api-proxy.com/v1` |
| **模型名称** | 图片编辑模型 ID | `jimeng-4.1` |

> 💡 本扩展兼容所有 OpenAI 格式的图片生成/编辑 API（包括各类中转服务）。

### 3. 开始使用

配置完成后，在任意网页上悬浮图片即可看到翻译按钮！

## 📁 项目结构

```
ai-translator-plugin/
├── manifest.json        # Chrome 扩展配置
├── background.js        # Service Worker（API 调用 + 存储 + 下载）
├── content.js           # 内容脚本（悬浮按钮 + 翻译弹窗 + 并发控制）
├── options.html/css/js  # 设置页（API 配置）
├── history.html/css/js  # 翻译历史画廊页
├── icon.png             # 扩展图标
└── server/              # [可选] 本地后端（开发调试用）
    ├── app.py
    └── requirements.txt
```

## 🔧 技术架构

```
用户浏览网页
    ↓ 鼠标悬浮图片
Content Script（注入悬浮按钮）
    ↓ 点击翻译（支持多图并发）
Background Service Worker
    ├── 下载原图 → Base64
    ├── 调用 AI API（OpenAI 兼容接口）
    ├── 保存记录到 IndexedDB
    └── 返回翻译结果
    ↓
Content Script（队列式弹窗展示）
    ├── 🔄 替换原图
    └── 💾 下载图片
```

- **纯浏览器端运行**，无需后端服务器
- **Manifest V3** 架构，符合 Chrome Web Store 最新规范
- **IndexedDB** 本地存储翻译历史
- **并发翻译** + **队列弹窗**，多图翻译不丢失

## 📋 更新日志

### v1.0.2
- ✅ 弹窗标题栏新增 ✕ 关闭按钮
- ✅ 新增 🔁 重试按钮，一键重新翻译

### v1.0.1
- ✅ 支持多图片并发翻译
- ✅ 弹窗队列化展示，不再堆叠
- ✅ 翻译状态追踪，防重复提交
- ✅ 已翻译图片不再显示翻译按钮

### v1.0.0
- 🎉 初始版本发布
- ✨ AI 图片翻译核心功能
- 📋 翻译历史画廊
- ⚙️ API 配置设置页
- ☁️ 无后端纯浏览器架构

## 📄 License

MIT License

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request！
