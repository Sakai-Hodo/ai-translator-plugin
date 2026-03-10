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

    let result;

    // seedream 模型必须走 images/generations + ref_image_url，跳过 images/edits
    if (!config.model.includes('seedream')) {
        // 尝试方式1: images/edits (标准 OpenAI 接口，如 jimeng)
        result = await tryImagesEdit(config, imgB64, prompt);
        if (result) return result;
    }

    // 尝试方式2: images/generations + ref_image_url (seedream) 或 image 字段 (非标准但常见)
    result = await tryImagesGenerate(config, imgB64, prompt, imageUrl);
    if (result) return result;

    // 尝试方式3: chat/completions (Gemini 等多模态模型)
    result = await tryChatCompletions(config, imgB64, prompt);
    if (result) return result;

    throw new Error("API 未返回翻译结果，请检查模型是否支持图片编辑");
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

async function tryImagesGenerate(config, imgB64, prompt, originalUrl) {
    try {
        const bodyData = {
            model: config.model,
            prompt: prompt,
            response_format: "b64_json",
        };

        // 针对火山引擎 seedream 模型：使用 image（字符串，URL或Base64）实现图生图
        if (config.model.includes('seedream')) {
            bodyData.image = originalUrl;           // 单图参考：传入原始图片的公网 URL
            bodyData.response_format = "url";
            bodyData.size = "2K";
            bodyData.watermark = false;
        } else {
            // 非 seedream 的其他模型走 base64 方式
            bodyData.image = imgB64;
        }

        const resp = await fetch(`${config.baseUrl}/images/generations`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(bodyData),
        });


        if (!resp.ok) {
            console.log(`images/generations returned ${resp.status}, trying fallback...`);
            return null;
        }

        const json = await resp.json();
        if (json.data && json.data.length > 0) {
            const dataObj = json.data[0];
            if (dataObj.b64_json) {
                return `data:image/png;base64,${dataObj.b64_json}`;
            } else if (dataObj.url) {
                return dataObj.url;
            }
        }
        return null;
    } catch (e) {
        console.log("images/generations failed:", e.message);
        return null;
    }
}

async function tryChatCompletions(config, imgB64, prompt) {
    try {
        const resp = await fetch(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: { url: `data:image/png;base64,${imgB64}` },
                            },
                            {
                                type: "text",
                                text: prompt,
                            },
                        ],
                    },
                ],
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.log(`chat/completions returned ${resp.status}: ${errText.slice(0, 200)}`);
            throw new Error(`API 错误 ${resp.status}: ${errText.slice(0, 200)}`);
        }

        const json = await resp.json();
        const message = json.choices?.[0]?.message;
        if (!message) return null;

        // 格式1: content 是数组（含 inline_data / image_url 部分）
        if (Array.isArray(message.content)) {
            for (const part of message.content) {
                // Gemini 原生格式
                if (part.type === "image" && part.source?.data) {
                    const mime = part.source.media_type || "image/png";
                    return `data:${mime};base64,${part.source.data}`;
                }
                // OpenAI 兼容格式
                if (part.type === "image_url" && part.image_url?.url) {
                    return part.image_url.url;
                }
                // inline_data 格式 (一些代理用这个)
                if (part.inline_data?.data) {
                    const mime = part.inline_data.mime_type || "image/png";
                    return `data:${mime};base64,${part.inline_data.data}`;
                }
            }
        }

        // 格式2: content 是字符串，包含 markdown 图片或裸 base64
        if (typeof message.content === "string") {
            const text = message.content;

            // 提取 markdown 图片中的 data URL
            const mdMatch = text.match(/!\[.*?\]\((data:image\/[^)]+)\)/);
            if (mdMatch) return mdMatch[1];

            // 提取 markdown 图片中的普通 base64（无 data: 前缀）
            const mdB64 = text.match(/!\[.*?\]\(([A-Za-z0-9+/=]{100,})\)/);
            if (mdB64) return `data:image/png;base64,${mdB64[1]}`;

            // 纯 base64 字符串（整段内容就是 base64）
            if (/^[A-Za-z0-9+/=]{100,}$/.test(text.trim())) {
                return `data:image/png;base64,${text.trim()}`;
            }
        }

        console.log("chat/completions: 无法从响应中提取图片");
        return null;
    } catch (e) {
        console.log("chat/completions failed:", e.message);
        return null;
    }
}

// ---------------------------------------------------------------------------
// 消息 Handler（每个 action 对应一个独立函数）
// ---------------------------------------------------------------------------

async function handleTranslate(msg, sendResponse) {
    try {
        const translatedDataUrl = await translateImage(msg.imageUrl, msg.targetLanguage);
        sendResponse({ ok: true, translatedDataUrl });
    } catch (err) {
        console.error("translate error:", err);
        sendResponse({ ok: false, error: err.message });
    }
}

async function handleCheckConfig(_msg, sendResponse) {
    const config = await getConfig();
    sendResponse({ configured: !!config.apiKey });
}

async function handleDownload(msg, sendResponse) {
    const extMap = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/bmp": ".bmp",
        "image/svg+xml": ".svg",
    };

    function ensureFilenameExt(name, mime) {
        const ext = extMap[mime] || ".png";
        // 去掉已有的图片后缀，换成正确的
        name = name.replace(/\.(png|jpe?g|webp|gif|bmp|svg)$/i, "");
        return name + ext;
    }

    try {
        let finalUrl = msg.url;
        let mime = "image/png";

        // ----------------------------------------------------------------
        // 情况 1: 外部 HTTP(S) URL → fetch 后转 data URL
        // ----------------------------------------------------------------
        if (finalUrl.startsWith("http")) {
            console.log("[Download] 外部 URL，正在 fetch...");
            const resp = await fetch(finalUrl);
            const buffer = await resp.arrayBuffer();

            const bytes = new Uint8Array(buffer);
            let binary = "";
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            const b64 = btoa(binary);

            mime = (resp.headers.get("Content-Type") || "image/png").split(";")[0].trim();
            if (!mime.startsWith("image/")) mime = "image/png";

            finalUrl = `data:${mime};base64,${b64}`;
        }
        // ----------------------------------------------------------------
        // 情况 2: 已经是 data URL → 提取并修正 MIME
        // ----------------------------------------------------------------
        else if (finalUrl.startsWith("data:")) {
            const m = finalUrl.match(/^data:([^;,]+)/);
            if (m) {
                mime = m[1];
                // 修正非图片 MIME
                if (!mime.startsWith("image/")) {
                    mime = "image/png";
                    // 重写 data URL 的 MIME 头
                    finalUrl = finalUrl.replace(/^data:[^;,]+/, `data:${mime}`);
                }
            }
            console.log("[Download] Data URL, MIME:", mime, "长度:", finalUrl.length);
        }

        let filename = msg.filename || `translated_${Date.now()}.png`;
        filename = ensureFilenameExt(filename, mime);

        console.log("[Download] 最终 filename:", filename, "MIME:", mime, "saveAs: true");

        chrome.downloads.download(
            {
                url: finalUrl,
                filename: filename,
                saveAs: true,
            },
            (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error("[Download] Chrome error:", chrome.runtime.lastError.message);
                }
                console.log("[Download] downloadId:", downloadId);
                sendResponse({ ok: !!downloadId });
            }
        );
    } catch (err) {
        console.error("[Download] Error:", err);
        // 降级：直接用原始 URL 下载
        let fallbackName = msg.filename || `translated_${Date.now()}.png`;
        fallbackName = ensureFilenameExt(fallbackName, "image/png");

        chrome.downloads.download(
            {
                url: msg.url,
                filename: fallbackName,
                saveAs: true,
            },
            (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error("[Download] Fallback error:", chrome.runtime.lastError.message);
                }
                sendResponse({ ok: !!downloadId });
            }
        );
    }
}

async function handleSaveRecord(msg, sendResponse) {
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
}

async function handleGetRecords(_msg, sendResponse) {
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
}

async function handleDeleteRecord(msg, sendResponse) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(msg.id);
        tx.oncomplete = () => sendResponse({ ok: true });
        tx.onerror = () => sendResponse({ ok: false });
    } catch (err) {
        sendResponse({ ok: false });
    }
}

async function handleGetRecordCount(_msg, sendResponse) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).count();
        req.onsuccess = () => sendResponse({ ok: true, count: req.result });
        req.onerror = () => sendResponse({ ok: true, count: 0 });
    } catch (err) {
        sendResponse({ ok: true, count: 0 });
    }
}

async function handleTestConfig(_msg, sendResponse) {
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
}

// ---------------------------------------------------------------------------
// 消息路由（handler map 替代 if/else 链）
// ---------------------------------------------------------------------------
const messageHandlers = {
    translate: handleTranslate,
    checkConfig: handleCheckConfig,
    download: handleDownload,
    saveRecord: handleSaveRecord,
    getRecords: handleGetRecords,
    deleteRecord: handleDeleteRecord,
    getRecordCount: handleGetRecordCount,
    testConfig: handleTestConfig,
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const handler = messageHandlers[msg.action];
    if (handler) {
        handler(msg, sendResponse);
        return true; // 异步 sendResponse
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
