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
