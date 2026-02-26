// shoplazza.js — Shoplazza 商品描述图片批量翻译
// 仅在 *.myshoplaza.com/admin/smart_apps/uakari/* 页面激活

(function () {
    "use strict";

    // ==========================================
    // 1. 内联样式（Shadow DOM 用）
    // ==========================================
    const SP_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .sp-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(6px);
      z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
    }
    .sp-modal {
      background: #1a1d27; color: #e4e6ef;
      border: 1px solid #2a2e3e; border-radius: 16px;
      width: 900px; max-width: 95vw; max-height: 85vh;
      display: flex; flex-direction: column;
      font-family: 'Inter', system-ui, sans-serif;
      animation: spUp 0.25s ease-out;
    }
    @keyframes spUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

    .sp-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid #2a2e3e;
    }
    .sp-title { font-size: 18px; font-weight: 600; }
    .sp-close {
      width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid #2a2e3e; background: transparent;
      color: #8b8fa3; font-size: 16px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .sp-close:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444; }

    .sp-toolbar {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 24px; border-bottom: 1px solid #2a2e3e;
    }
    .sp-select-all { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #8b8fa3; cursor: pointer; }
    .sp-count { color: #6366f1; font-weight: 500; }
    .sp-lang {
      background: #0f1117; color: #e4e6ef;
      border: 1px solid #2a2e3e; border-radius: 6px;
      padding: 6px 10px; font-size: 13px; outline: none; cursor: pointer;
    }
    .sp-lang:focus { border-color: #6366f1; }
    .sp-translate-btn {
      margin-left: auto; background: #6366f1; color: white;
      border: none; border-radius: 8px; padding: 8px 20px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .sp-translate-btn:hover { background: #818cf8; }
    .sp-translate-btn:disabled { background: #4a4e5e; cursor: not-allowed; }

    .sp-list { flex: 1; overflow-y: auto; padding: 16px 24px; }
    .sp-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; border-bottom: 1px solid #1f2233;
    }
    .sp-row:last-child { border-bottom: none; }
    .sp-checkbox { width: 18px; height: 18px; accent-color: #6366f1; cursor: pointer; flex-shrink: 0; }

    .sp-thumb {
      width: 140px; height: 100px; border-radius: 8px;
      border: 1px solid #2a2e3e; overflow: hidden; cursor: pointer;
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      background: #0f1117; transition: border-color 0.15s;
    }
    .sp-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .sp-thumb:hover { border-color: #6366f1; }
    .sp-thumb.empty { border-style: dashed; color: #4a4e5e; font-size: 12px; cursor: default; }

    .sp-arrow { color: #4a4e5e; font-size: 20px; flex-shrink: 0; }

    .sp-spinner {
      width: 24px; height: 24px; border: 3px solid #2a2e3e;
      border-top-color: #6366f1; border-radius: 50%;
      animation: spSpin 0.8s linear infinite;
    }
    @keyframes spSpin { to { transform: rotate(360deg); } }

    .sp-row-actions { display: flex; flex-direction: column; gap: 6px; margin-left: auto; flex-shrink: 0; }
    .sp-row-btn {
      padding: 5px 12px; border-radius: 6px; border: 1px solid #2a2e3e;
      background: transparent; color: #8b8fa3; font-size: 12px;
      cursor: pointer; white-space: nowrap; transition: all 0.15s;
    }
    .sp-row-btn:hover { border-color: #6366f1; color: #6366f1; background: rgba(99,102,241,0.08); }
    .sp-row-btn.insert { border-color: #22c55e; color: #22c55e; }
    .sp-row-btn.insert:hover { background: rgba(34,197,94,0.08); }
    .sp-row-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .sp-lightbox {
      position: fixed; inset: 0; background: rgba(0,0,0,0.92);
      z-index: 2147483647; display: flex; align-items: center;
      justify-content: center; cursor: zoom-out; animation: spUp 0.2s ease-out;
    }
    .sp-lightbox img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }

    .sp-list::-webkit-scrollbar { width: 6px; }
    .sp-list::-webkit-scrollbar-track { background: transparent; }
    .sp-list::-webkit-scrollbar-thumb { background: #2a2e3e; border-radius: 3px; }
  `;

    // ==========================================
    // 2. 等待编辑器加载 & 注入按钮
    // ==========================================
    let triggerBtn = null;

    function init() {
        // 持续轮询：SPA 切换商品时编辑器会重建，需要重新注入按钮
        setInterval(() => {
            const iframe = document.getElementById("body_html_ifr");
            // 按钮不在 DOM 中（首次或被 SPA 移除）→ 重新注入
            if (iframe && (!triggerBtn || !document.body.contains(triggerBtn))) {
                triggerBtn = null;
                injectButton(iframe);
            }
        }, 1500);
    }

    function injectButton(iframe) {
        const mceContainer = iframe.closest(".tox-tinymce");
        if (!mceContainer) return;

        // 向上遍历找到编辑器的外层容器（跳过 flex 布局的 orca_editor 等）
        let target = mceContainer;
        for (let i = 0; i < 5; i++) {
            if (!target.parentElement || target.parentElement === document.body) break;
            target = target.parentElement;
        }

        triggerBtn = document.createElement("button");
        triggerBtn.textContent = "📸 翻译描述图片";
        triggerBtn.setAttribute("data-sp-btn", "translate");
        Object.assign(triggerBtn.style, {
            background: "#6366f1", color: "white", border: "none",
            borderRadius: "6px", padding: "7px 16px", fontSize: "13px",
            fontWeight: "600", cursor: "pointer",
            fontFamily: "system-ui, -apple-system, sans-serif",
            transition: "background 0.15s",
            position: "absolute", right: "0", top: "-36px",
            zIndex: "100",
        });
        triggerBtn.addEventListener("mouseenter", () => (triggerBtn.style.background = "#818cf8"));
        triggerBtn.addEventListener("mouseleave", () => (triggerBtn.style.background = "#6366f1"));
        triggerBtn.addEventListener("click", handleTriggerClick);

        // 确保父容器有 position 以支持 absolute
        target.style.position = "relative";
        target.appendChild(triggerBtn);
    }

    // 自定义提示（替代 alert，不会被页面拦截）
    function showTip(msg) {
        const tip = document.createElement("div");
        Object.assign(tip.style, {
            position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
            background: "#1a1d27", color: "#e4e6ef", border: "1px solid #2a2e3e",
            borderRadius: "10px", padding: "12px 24px", fontSize: "14px",
            fontFamily: "system-ui, sans-serif", zIndex: "2147483647",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)", transition: "opacity 0.3s",
        });
        tip.textContent = msg;
        document.body.appendChild(tip);
        setTimeout(() => { tip.style.opacity = "0"; setTimeout(() => tip.remove(), 300); }, 2500);
    }

    function handleTriggerClick() {
        const iframe = document.getElementById("body_html_ifr");
        const body = iframe?.contentDocument?.body;

        // 检查编辑器是否有内容
        if (!body || !body.textContent.trim()) {
            showTip("⚠️ 请先翻译文本部分");
            return;
        }

        const images = extractImages();
        if (images.length === 0) {
            showTip("⚠️ 请检查描述中是否包含图片");
            return;
        }
        showBatchModal(images);
    }

    // ==========================================
    // 3. 提取图片
    // ==========================================
    function extractImages() {
        const iframe = document.getElementById("body_html_ifr");
        if (!iframe?.contentDocument) return [];
        const imgs = iframe.contentDocument.querySelectorAll("img");
        return Array.from(imgs)
            .filter((img) => img.src && !img.src.startsWith("data:"))
            .map((img, i) => ({ index: i, src: img.src, element: img }));
    }

    // ==========================================
    // 4. 批量翻译弹窗
    // ==========================================
    let modalHost = null;

    function showBatchModal(images) {
        if (modalHost) modalHost.remove();
        modalHost = document.createElement("div");
        const shadow = modalHost.attachShadow({ mode: "open" });

        const style = document.createElement("style");
        style.textContent = SP_STYLES;
        shadow.appendChild(style);

        // 每张图片的状态
        const items = images.map((img) => ({
            ...img, checked: true, status: "pending", translatedSrc: null,
        }));

        // --- 构建 DOM ---
        const overlay = document.createElement("div");
        overlay.className = "sp-modal-overlay";

        const modal = document.createElement("div");
        modal.className = "sp-modal";

        // Header
        const header = document.createElement("div");
        header.className = "sp-header";
        header.innerHTML = `<span class="sp-title">📸 批量翻译图片</span><button class="sp-close">✕</button>`;
        header.querySelector(".sp-close").onclick = () => modalHost.remove();
        modal.appendChild(header);

        // Toolbar
        const toolbar = document.createElement("div");
        toolbar.className = "sp-toolbar";

        const selectAllLabel = document.createElement("label");
        selectAllLabel.className = "sp-select-all";
        const selectAllCb = document.createElement("input");
        selectAllCb.type = "checkbox";
        selectAllCb.checked = true;
        selectAllCb.className = "sp-checkbox";
        const countSpan = document.createElement("span");
        countSpan.className = "sp-count";
        selectAllLabel.appendChild(selectAllCb);
        selectAllLabel.append(" 全选 ");
        selectAllLabel.appendChild(countSpan);

        const langSelect = document.createElement("select");
        langSelect.className = "sp-lang";
        LANGUAGES.forEach((l) => {
            const opt = document.createElement("option");
            opt.value = l.value;
            opt.textContent = l.label;
            langSelect.appendChild(opt);
        });
        chrome.storage.local.get(["lastLanguage"], (data) => {
            if (data.lastLanguage) langSelect.value = data.lastLanguage;
        });

        const translateBtn = document.createElement("button");
        translateBtn.className = "sp-translate-btn";
        translateBtn.textContent = "✨ 一键翻译";

        toolbar.appendChild(selectAllLabel);
        toolbar.appendChild(langSelect);
        toolbar.appendChild(translateBtn);
        modal.appendChild(toolbar);

        // Image list
        const list = document.createElement("div");
        list.className = "sp-list";

        const rowEls = [];

        items.forEach((item) => {
            const row = document.createElement("div");
            row.className = "sp-row";

            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = true;
            cb.className = "sp-checkbox";
            cb.onchange = () => { item.checked = cb.checked; updateCount(); };

            const origThumb = document.createElement("div");
            origThumb.className = "sp-thumb";
            const origImg = document.createElement("img");
            origImg.src = item.src;
            origThumb.appendChild(origImg);
            origThumb.onclick = () => showLightbox(shadow, item.src);

            const arrow = document.createElement("div");
            arrow.className = "sp-arrow";
            arrow.textContent = "→";

            const resultThumb = document.createElement("div");
            resultThumb.className = "sp-thumb empty";
            resultThumb.textContent = "待翻译";

            const actions = document.createElement("div");
            actions.className = "sp-row-actions";

            row.append(cb, origThumb, arrow, resultThumb, actions);
            list.appendChild(row);
            rowEls.push({ cb, resultThumb, actions });
        });

        modal.appendChild(list);
        overlay.appendChild(modal);
        shadow.appendChild(overlay);
        document.body.appendChild(modalHost);

        // --- 计数更新 ---
        function updateCount() {
            const n = items.filter((i) => i.checked).length;
            countSpan.textContent = `(${n}/${items.length})`;
            selectAllCb.checked = n === items.length;
            selectAllCb.indeterminate = n > 0 && n < items.length;
        }
        updateCount();

        selectAllCb.onchange = () => {
            items.forEach((item, i) => {
                item.checked = selectAllCb.checked;
                rowEls[i].cb.checked = selectAllCb.checked;
            });
            updateCount();
        };

        // --- 翻译单张图片（共享逻辑）---
        async function translateOne(item, rowEl, targetLang) {
            item.status = "translating";
            rowEl.resultThumb.className = "sp-thumb";
            rowEl.resultThumb.innerHTML = '<div class="sp-spinner"></div>';
            rowEl.actions.innerHTML = "";

            try {
                const result = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { action: "translate", imageUrl: item.src, targetLanguage: targetLang },
                        (res) => {
                            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                            else if (res?.ok) resolve(res);
                            else reject(new Error(res?.error || "翻译失败"));
                        }
                    );
                });

                item.status = "done";
                item.translatedSrc = result.translatedDataUrl;

                // 显示译图
                rowEl.resultThumb.className = "sp-thumb";
                rowEl.resultThumb.innerHTML = "";
                const tImg = document.createElement("img");
                tImg.src = result.translatedDataUrl;
                rowEl.resultThumb.appendChild(tImg);
                rowEl.resultThumb.onclick = () => showLightbox(shadow, result.translatedDataUrl);

                // 操作按钮
                renderDoneActions(item, rowEl, targetLang);

                // 保存历史
                chrome.runtime.sendMessage({
                    action: "saveRecord",
                    originalUrl: item.src,
                    translatedB64: result.translatedDataUrl,
                    targetLanguage: targetLang,
                    sourcePageUrl: window.location.href,
                });
            } catch (err) {
                item.status = "error";
                rowEl.resultThumb.className = "sp-thumb empty";
                rowEl.resultThumb.textContent = "❌ " + err.message.slice(0, 30);
                renderErrorActions(item, rowEl, targetLang);
            }
        }

        function renderDoneActions(item, rowEl, targetLang) {
            rowEl.actions.innerHTML = "";
            const retryBtn = document.createElement("button");
            retryBtn.className = "sp-row-btn";
            retryBtn.textContent = "🔁 重试";
            retryBtn.onclick = () => translateOne(item, rowEl, targetLang);

            const insertBtn = document.createElement("button");
            insertBtn.className = "sp-row-btn insert";
            insertBtn.textContent = "📥 插入";
            insertBtn.onclick = () => {
                insertTranslatedImage(item);
                insertBtn.textContent = "✅ 已插入";
                insertBtn.disabled = true;
            };

            rowEl.actions.append(retryBtn, insertBtn);
        }

        function renderErrorActions(item, rowEl, targetLang) {
            rowEl.actions.innerHTML = "";
            const retryBtn = document.createElement("button");
            retryBtn.className = "sp-row-btn";
            retryBtn.textContent = "🔁 重试";
            retryBtn.onclick = () => translateOne(item, rowEl, targetLang);
            rowEl.actions.appendChild(retryBtn);
        }

        // --- 一键翻译 ---
        translateBtn.onclick = async () => {
            const toTranslate = items.filter((i) => i.checked && i.status !== "done");
            if (toTranslate.length === 0) return;

            const targetLang = langSelect.value;
            chrome.storage.local.set({ lastLanguage: targetLang });

            translateBtn.disabled = true;
            let done = 0;
            translateBtn.textContent = `⏳ 翻译中 (0/${toTranslate.length})...`;

            for (const item of toTranslate) {
                await translateOne(item, rowEls[item.index], targetLang);
                done++;
                translateBtn.textContent = `⏳ 翻译中 (${done}/${toTranslate.length})...`;
            }

            translateBtn.disabled = false;
            translateBtn.textContent = "✨ 一键翻译";
        };
    }

    // ==========================================
    // 5. 放大查看
    // ==========================================
    function showLightbox(shadowRoot, src) {
        const lb = document.createElement("div");
        lb.className = "sp-lightbox";
        const img = document.createElement("img");
        img.src = src;
        lb.appendChild(img);
        lb.onclick = () => lb.remove();
        shadowRoot.appendChild(lb);
    }

    // ==========================================
    // 6. 插入翻译图片回编辑器
    // ==========================================
    function insertTranslatedImage(item) {
        if (!item.element || !item.translatedSrc) return;
        item.element.src = item.translatedSrc;
        // 通知 TinyMCE 内容已更改
        const iframe = document.getElementById("body_html_ifr");
        if (iframe?.contentDocument?.body) {
            iframe.contentDocument.body.dispatchEvent(
                new Event("input", { bubbles: true })
            );
        }
    }

    // ==========================================
    // Init
    // ==========================================
    init();
})();
