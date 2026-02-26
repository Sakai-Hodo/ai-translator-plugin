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
