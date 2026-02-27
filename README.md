# ✨ AI Image Translator (Shoplazza 专版)

> 一款强大的浏览器插件，支持在网页上直接翻译包含外文的图片，并将原图中的文字无缝替换为目标语言，同时保持原图的设计和排版。本分支为 Shoplazza 定制版本，专为跨境电商优化！

![Version](https://img.shields.io/badge/Version-2.3.0-blue)
![Platform](https://img.shields.io/badge/Platform-Chrome%20Extension-brightgreen)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Shoplazza](https://img.shields.io/badge/Shoplazza-专用版-purple)

📌 **说明**：通用版请切换至 [main 分支](https://github.com/Sakai-Hodo/ai-translator-plugin/tree/main)。

---

## � v2.3 更新内容 (2026-02-27)

- **新增适配**：全面支持 Shoplazza 常规商品管理页面 (`.../admin/smart_apps/python/products/...`)。
- **页面兼容**：优化了匹配规则和注入逻辑，适配更多 Shoplazza 后台路径，做到多页面通用。

*注：v2.2 修复了火山引擎 Seedream 图生图无参考图的 bug，并自动去除了官方水印。*

---

## 🎯 核心功能

### � Shoplazza 专属优化
- 📸 **一键批量处理**：在商品编辑/翻译页面，一键提取并翻译所有描述图片。
- ☑️ **灵活选择**：支持弹窗内勾选需要的图片进行局部或批量翻译。
- 🔍 **高清预览**：点击缩略图即可放大查看「原图 vs 译图」对比细节。
- 📥 **一键插入**：翻译完成后，可一键将其替换回 Shoplazza 富文本编辑器。
- ⚡ **无感兼容**：支持 SPA（单页面应用）架构，切换商品自动重新注入插件。
- ⚠️ **智能提示**：当内容为空或无图片时，智能提示先翻译文本或添加图片。

### 🌍 通用翻译能力
- 🖱️ **悬浮即翻**：鼠标悬停网页图片，自动唤起翻译按钮。
- 🌐 **多语种支持**：支持 英/中/日/韩/法/德/西/葡/俄/阿/泰/越 12 种语言。
- 🔄 **灵活保存**：支持直接替换网页原图，或将翻译后的图片下载至本地。
- 📋 **翻译画廊**：历史记录自动保存，随时可溯。
- 🚀 **高并发处理**：支持多图同时翻译，搭配精美 Toast 状态提示。

---

## 📸 使用指南

### 场景一：Shoplazza 批量翻译
1. 进入 Shoplazza 后台页面（如翻译页或商品处理页）。
2. 在「商品描述」编辑器上方找到 **📸 翻译描述图片** 按钮。
3. 点击呼出图片面板，勾选目标图片并选择语言。
4. 点击 **✨ 一键翻译** 等待完成。
5. 点击 **📥 插入**，译图将自动覆盖回编辑器中。

### 场景二：网页悬浮单点翻译
1. 将鼠标悬停在页面上的任意图片。
2. 在出现的插件按钮选定语言，点击 **✨ AI 翻译**。
3. 预览翻译效果，选择 **替换原图** 体验无缝阅读，或 **下载图片** 留存。

---

## 🚀 安装部署

### 1. 下载与安装

```bash
git clone https://github.com/Sakai-Hodo/ai-translator-plugin.git
git checkout ai-translator-plugin-Shoplazza
```

1. 在 Chrome 地址栏输入 `chrome://extensions/`。
2. 开启右上角 **开发者模式**。
3. 点击 **加载已解压的扩展程序**。
4. 选择刚刚克隆下来的 `ai-translator-plugin` 根文件夹。

### 2. API 配置

插件安装后会自动跳出（或通过点击扩展图标选择“选项”）**选项 / Options** 页面，请配置以下参数：

| 配置项 | 填写说明 | 示例 |
|--------|---------|------|
| **API Key** | 兼容 OpenAI 格式的密钥 | `sk-xxx...` |
| **API Base URL** | 接口底座地址 | `https://api.example.com/v1` |
| **模型名称** | 使用的图像编辑模型 | `seedream-5.0` |

> 💡 **Tip**: 配置完成后，请点击 **🔗 测试连接** 验证连通性。

---

## 📁 目录结构

```text
ai-translator-plugin/
├── manifest.json        # 扩展声明文件
├── background.js        # 后台 Server Worker（处理 API 请求与跨域）
├── content.js/css       # 通用脚本与样式（悬浮与单页逻辑）
├── shoplazza.js/css     # Shoplazza 专有逻辑（监听编辑器并批量处理）
├── utils.js             # 公共函数与多语言设定
├── popup.*              # 点击图标时的快捷弹出面板
├── options.*            # 配置页面
├── history.*            # 历史记录画廊
└── icon.png             # 扩展图标
```

---

## 📄 开源协议

MIT License
