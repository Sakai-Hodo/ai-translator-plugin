// options.js — 设置页逻辑

const apiKeyInput = document.getElementById("apiKey");
const baseUrlInput = document.getElementById("baseUrl");
const modelInput = document.getElementById("model");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const toggleKey = document.getElementById("toggleKey");

// ---------------------------------------------------------------------------
// 加载已保存的配置
// ---------------------------------------------------------------------------
chrome.storage.local.get(["apiKey", "baseUrl", "model"], (data) => {
    if (data.apiKey) apiKeyInput.value = data.apiKey;
    if (data.baseUrl) baseUrlInput.value = data.baseUrl;
    if (data.model) modelInput.value = data.model;
});

// ---------------------------------------------------------------------------
// 保存
// ---------------------------------------------------------------------------
saveBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim() || "https://oneapi.gemiaude.com/v1";
    const model = modelInput.value.trim() || "jimeng-4.1";

    if (!apiKey) {
        statusEl.textContent = "❌ 请输入 API Key";
        statusEl.className = "status error";
        return;
    }

    chrome.storage.local.set({ apiKey, baseUrl, model }, () => {
        statusEl.textContent = "✅ 设置已保存！";
        statusEl.className = "status success";
        setTimeout(() => { statusEl.textContent = ""; }, 3000);
    });
});

// ---------------------------------------------------------------------------
// 显示/隐藏 API Key
// ---------------------------------------------------------------------------
toggleKey.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    toggleKey.textContent = isPassword ? "🙈" : "👁️";
});
