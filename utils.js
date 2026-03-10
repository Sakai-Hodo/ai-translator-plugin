// utils.js — 共享工具函数

/**
 * 将 data URL (base64) 转换为 Blob 对象
 * @param {string} dataUrl - data:image/png;base64,xxxxx 格式
 * @returns {Blob}
 */
function base64ToBlob(dataUrl) {
    const [header, b64] = dataUrl.split(",");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const mimeMatch = header.match(/data:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    return new Blob([bytes], { type: mime });
}

/**
 * 支持的语言列表（var 声明使其在所有 content script 中可见）
 */
var LANGUAGES = [
    { value: "English", label: "🇺🇸 英语" },
    { value: "Chinese", label: "🇨🇳 中文" },
    { value: "Japanese", label: "🇯🇵 日语" },
    { value: "Korean", label: "🇰🇷 韩语" },
    { value: "French", label: "🇫🇷 法语" },
    { value: "German", label: "🇩🇪 德语" },
    { value: "Spanish", label: "🇪🇸 西班牙语" },
    { value: "Portuguese", label: "🇧🇷 葡萄牙语" },
    { value: "Russian", label: "🇷🇺 俄语" },
    { value: "Arabic", label: "🇸🇦 阿拉伯语" },
    { value: "Thai", label: "🇹🇭 泰语" },
    { value: "Vietnamese", label: "🇻🇳 越南语" },
];

// ---------------------------------------------------------------------------
// 共享的 background 通信函数（content.js 和 shoplazza.js 共用）
// ---------------------------------------------------------------------------

/**
 * 发送翻译请求到 background
 * @param {string} imageUrl - 原图 URL
 * @param {string} targetLanguage - 目标语言
 * @returns {Promise<{ok: boolean, translatedDataUrl: string}>}
 */
function sendTranslateRequest(imageUrl, targetLanguage) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { action: "translate", imageUrl, targetLanguage },
            (res) => {
                if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                else if (res?.ok) resolve(res);
                else reject(new Error(res?.error || "翻译失败"));
            }
        );
    });
}

/**
 * 检查 API 是否已配置
 * @returns {Promise<boolean>}
 */
function checkApiConfig() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "checkConfig" }, (res) => {
            resolve(res && res.configured);
        });
    });
}

/**
 * 保存翻译记录到 IndexedDB
 */
function saveTranslateRecord(originalUrl, translatedB64, targetLanguage, sourcePageUrl) {
    chrome.runtime.sendMessage({
        action: "saveRecord",
        originalUrl,
        translatedB64,
        targetLanguage,
        sourcePageUrl,
    });
}

/**
 * 创建语言选择器并自动恢复上次选择
 * @param {string} [className] - CSS class name
 * @returns {HTMLSelectElement}
 */
function createLangSelect(className) {
    const select = document.createElement("select");
    if (className) select.className = className;
    LANGUAGES.forEach((lang) => {
        const opt = document.createElement("option");
        opt.value = lang.value;
        opt.textContent = lang.label;
        select.appendChild(opt);
    });
    chrome.storage.local.get(["lastLanguage"], (data) => {
        if (data.lastLanguage) select.value = data.lastLanguage;
    });
    return select;
}

