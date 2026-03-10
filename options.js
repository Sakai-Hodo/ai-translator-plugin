// options.js — 设置页逻辑

const apiKeyInput = document.getElementById("apiKey");
const baseUrlInput = document.getElementById("baseUrl");
const modelInput = document.getElementById("model");
const saveBtn = document.getElementById("saveBtn");
const testBtn = document.getElementById("testBtn");
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
    const baseUrl = baseUrlInput.value.trim() || "https://api.example.com/v1";
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
// 测试连接
// ---------------------------------------------------------------------------
testBtn.addEventListener("click", () => {
    // 先用当前输入框的值临时保存，再测试
    const apiKey = apiKeyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim() || "https://api.example.com/v1";
    const model = modelInput.value.trim() || "jimeng-4.1";

    if (!apiKey) {
        statusEl.textContent = "❌ 请先输入 API Key";
        statusEl.className = "status error";
        return;
    }

    // 先保存再测试
    chrome.storage.local.set({ apiKey, baseUrl, model }, () => {
        testBtn.disabled = true;
        testBtn.textContent = "⏳ 测试中...";
        statusEl.textContent = "";

        chrome.runtime.sendMessage({ action: "testConfig" }, (res) => {
            testBtn.disabled = false;
            testBtn.textContent = "🔗 测试连接";
            if (res && res.ok) {
                statusEl.textContent = "✅ 连接成功！API 工作正常";
                statusEl.className = "status success";
            } else {
                statusEl.textContent = "❌ " + (res?.error || "连接失败");
                statusEl.className = "status error";
            }
        });
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
