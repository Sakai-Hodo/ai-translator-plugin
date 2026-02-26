// background.js — 纯浏览器端翻译 + IndexedDB 历史 + 下载

const DB_NAME = "TranslatorHistory";
const DB_VERSION = 1;
const STORE_NAME = "records";

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true,
                });
                store.createIndex("timestamp", "timestamp", { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ---------------------------------------------------------------------------
// 读取用户配置
// ---------------------------------------------------------------------------
function getConfig() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["apiKey", "baseUrl", "model"], (data) => {
            resolve({
                apiKey: data.apiKey || "",
                baseUrl: data.baseUrl || "https://oneapi.gemiaude.com/v1",
                model: data.model || "jimeng-4.1",
            });
        });
    });
}

// ---------------------------------------------------------------------------
// 下载图片 → base64
// ---------------------------------------------------------------------------
async function downloadImageAsBase64(url) {
    const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
    });
    if (!resp.ok) throw new Error(`图片下载失败: ${resp.status}`);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // data:image/xxx;base64,xxxxx → 只取 base64 部分
            const b64 = reader.result.split(",")[1];
            resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ---------------------------------------------------------------------------
// 调用 OpenAI 兼容 API 翻译图片
// ---------------------------------------------------------------------------
async function translateImage(imageUrl, targetLanguage) {
    const config = await getConfig();
    if (!config.apiKey) {
        throw new Error("未配置 API Key，请点击插件图标打开设置页");
    }

    const imgB64 = await downloadImageAsBase64(imageUrl);
    const prompt = `将图片中的所有文字翻译为${targetLanguage}，保持原有排版、字体风格和设计风格不变，只替换文字内容`;

    // 尝试方式1: images/edits (标准 OpenAI 接口)
    let result = await tryImagesEdit(config, imgB64, prompt);
    if (result) return result;

    // 尝试方式2: images/generations + image 字段 (非标准但常见)
    result = await tryImagesGenerate(config, imgB64, prompt);
    if (result) return result;

    throw new Error("API 未返回翻译结果");
}

async function tryImagesEdit(config, imgB64, prompt) {
    try {
        // 构建 multipart/form-data
        const formData = new FormData();
        // 将 base64 转为 Blob
        const binary = atob(imgB64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "image/png" });
        formData.append("image", blob, "image.png");
        formData.append("prompt", prompt);
        formData.append("model", config.model);
        formData.append("response_format", "b64_json");

        const resp = await fetch(`${config.baseUrl}/images/edits`, {
            method: "POST",
            headers: { Authorization: `Bearer ${config.apiKey}` },
            body: formData,
        });

        if (!resp.ok) {
            console.log(`images/edits returned ${resp.status}, trying fallback...`);
            return null;
        }

        const json = await resp.json();
        if (json.data && json.data.length > 0 && json.data[0].b64_json) {
            return `data:image/png;base64,${json.data[0].b64_json}`;
        }
        return null;
    } catch (e) {
        console.log("images/edits failed:", e.message);
        return null;
    }
}

async function tryImagesGenerate(config, imgB64, prompt) {
    try {
        const resp = await fetch(`${config.baseUrl}/images/generations`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: config.model,
                prompt: prompt,
                image: imgB64,
                response_format: "b64_json",
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`API 错误 ${resp.status}: ${errText.slice(0, 200)}`);
        }

        const json = await resp.json();
        if (json.data && json.data.length > 0 && json.data[0].b64_json) {
            return `data:image/png;base64,${json.data[0].b64_json}`;
        }
        throw new Error("API 返回数据格式异常");
    } catch (e) {
        throw e;
    }
}

// ---------------------------------------------------------------------------
// 消息处理
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // 翻译图片
    if (msg.action === "translate") {
        (async () => {
            try {
                const translatedDataUrl = await translateImage(msg.imageUrl, msg.targetLanguage);
                sendResponse({ ok: true, translatedDataUrl });
            } catch (err) {
                console.error("translate error:", err);
                sendResponse({ ok: false, error: err.message });
            }
        })();
        return true;
    }

    // 检查是否已配置
    if (msg.action === "checkConfig") {
        getConfig().then((config) => {
            sendResponse({ configured: !!config.apiKey });
        });
        return true;
    }

    // 下载图片
    if (msg.action === "download") {
        chrome.downloads.download(
            {
                url: msg.url,
                filename: msg.filename || "translated.png",
                saveAs: true,
            },
            (downloadId) => sendResponse({ ok: !!downloadId })
        );
        return true;
    }

    // 保存翻译记录
    if (msg.action === "saveRecord") {
        (async () => {
            try {
                const db = await openDB();
                const tx = db.transaction(STORE_NAME, "readwrite");
                tx.objectStore(STORE_NAME).add({
                    originalUrl: msg.originalUrl,
                    translatedB64: msg.translatedB64,
                    targetLanguage: msg.targetLanguage,
                    sourcePageUrl: msg.sourcePageUrl,
                    timestamp: Date.now(),
                });
                tx.oncomplete = () => sendResponse({ ok: true });
                tx.onerror = () => sendResponse({ ok: false });
            } catch (err) {
                sendResponse({ ok: false });
            }
        })();
        return true;
    }

    // 获取所有记录
    if (msg.action === "getRecords") {
        (async () => {
            try {
                const db = await openDB();
                const tx = db.transaction(STORE_NAME, "readonly");
                const req = tx.objectStore(STORE_NAME).getAll();
                req.onsuccess = () => {
                    const records = req.result.sort((a, b) => b.timestamp - a.timestamp);
                    sendResponse({ ok: true, records });
                };
                req.onerror = () => sendResponse({ ok: false, records: [] });
            } catch (err) {
                sendResponse({ ok: false, records: [] });
            }
        })();
        return true;
    }

    // 删除单条记录
    if (msg.action === "deleteRecord") {
        (async () => {
            try {
                const db = await openDB();
                const tx = db.transaction(STORE_NAME, "readwrite");
                tx.objectStore(STORE_NAME).delete(msg.id);
                tx.oncomplete = () => sendResponse({ ok: true });
                tx.onerror = () => sendResponse({ ok: false });
            } catch (err) {
                sendResponse({ ok: false });
            }
        })();
        return true;
    }

    // 获取记录数量（供 popup 使用）
    if (msg.action === "getRecordCount") {
        (async () => {
            try {
                const db = await openDB();
                const tx = db.transaction(STORE_NAME, "readonly");
                const req = tx.objectStore(STORE_NAME).count();
                req.onsuccess = () => sendResponse({ ok: true, count: req.result });
                req.onerror = () => sendResponse({ ok: true, count: 0 });
            } catch (err) {
                sendResponse({ ok: true, count: 0 });
            }
        })();
        return true;
    }

    // 测试 API 连通性
    if (msg.action === "testConfig") {
        (async () => {
            try {
                const config = await getConfig();
                if (!config.apiKey) {
                    sendResponse({ ok: false, error: "未配置 API Key" });
                    return;
                }
                const resp = await fetch(`${config.baseUrl}/models`, {
                    headers: { Authorization: `Bearer ${config.apiKey}` },
                });
                if (resp.ok) {
                    sendResponse({ ok: true });
                } else {
                    const text = await resp.text();
                    sendResponse({ ok: false, error: `HTTP ${resp.status}: ${text.slice(0, 100)}` });
                }
            } catch (err) {
                sendResponse({ ok: false, error: err.message });
            }
        })();
        return true;
    }
});

// ---------------------------------------------------------------------------
// 首次安装 → 打开设置页
// ---------------------------------------------------------------------------
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.runtime.openOptionsPage();
    }
});
