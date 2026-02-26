// popup.js — 弹出面板逻辑

const apiStatus = document.getElementById("apiStatus");
const recordCount = document.getElementById("recordCount");
const settingsBtn = document.getElementById("settingsBtn");
const historyBtn = document.getElementById("historyBtn");

// ---------------------------------------------------------------------------
// 检查 API 配置状态
// ---------------------------------------------------------------------------
chrome.runtime.sendMessage({ action: "checkConfig" }, (res) => {
    if (res && res.configured) {
        apiStatus.textContent = "✅ 已配置";
        apiStatus.style.color = "#22c55e";
    } else {
        apiStatus.textContent = "⚠️ 未配置";
        apiStatus.style.color = "#f59e0b";
    }
});

// ---------------------------------------------------------------------------
// 获取翻译记录数
// ---------------------------------------------------------------------------
chrome.runtime.sendMessage({ action: "getRecordCount" }, (res) => {
    recordCount.textContent =
        res && res.count !== undefined ? `${res.count} 条` : "0 条";
});

// ---------------------------------------------------------------------------
// 按钮跳转
// ---------------------------------------------------------------------------
settingsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
});

historyBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("history.html") });
    window.close();
});
