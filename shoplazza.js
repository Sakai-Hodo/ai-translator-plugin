// shoplazza.js — Shoplazza 商品描述图片批量翻译
// 仅在 *.myshoplaza.com/admin/smart_apps/uakari/* 页面激活

(function () {
    "use strict";

    // ==========================================
    // 1. 样式配置（Shadow DOM 用，fetch 外部 CSS，和 content.js 同模式）
    // ==========================================
    let _cachedCSS = "";
    fetch(chrome.runtime.getURL("shoplazza.css"))
        .then((r) => r.text())
        .then((css) => { _cachedCSS = css; })
        .catch((err) => {
            console.warn("⚠️ shoplazza.css 加载失败:", err.message);
        });

    function createStyleElement() {
        const style = document.createElement("style");
        style.textContent = _cachedCSS;
        return style;
    }

    // ==========================================
    // 2. 等待编辑器加载 & 注入按钮
    // ==========================================
    let triggerBtn = null;

    function init() {
        // 持续轮询：SPA 切换商品时编辑器会重建，需要重新注入按钮
        setInterval(() => {
            const iframe = document.getElementById("body_html_ifr") || document.querySelector("iframe.tox-edit-area__iframe");
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
        const iframe = document.getElementById("body_html_ifr") || document.querySelector("iframe.tox-edit-area__iframe");
        const body = iframe?.contentDocument?.body;

        if (!body) {
            showTip("⚠️ 编辑器未加载");
            return;
        }

        const images = extractImages();

        const isPythonProductsPage = window.location.href.includes('/python/products/');

        // 旧版页面逻辑：如果连文字都没有，提示先翻译文字
        if (!isPythonProductsPage && !body.textContent.trim() && images.length === 0) {
            showTip("⚠️ 请先翻译文本部分");
            return;
        }

        // 统一检测：只要没有图片，就拦截
        if (images.length === 0) {
            showTip("⚠️ 请检查描述中是否包含图片");
            return;
        }

        // 有图片（不管有没有文字）→ 直接弹窗
        showBatchModal(images);
    }

    // ==========================================
    // 3. 提取图片
    // ==========================================
    function extractImages() {
        const iframe = document.getElementById("body_html_ifr") || document.querySelector("iframe.tox-edit-area__iframe");
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
        shadow.appendChild(createStyleElement());

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

        // 使用 utils.js 共享的语言选择器
        const langSelect = createLangSelect("sp-lang");

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
                // 使用 utils.js 共享函数
                const result = await sendTranslateRequest(item.src, targetLang);

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

                // 保存历史（使用 utils.js 共享函数）
                saveTranslateRecord(item.src, result.translatedDataUrl, targetLang, window.location.href);
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
        const iframe = document.getElementById("body_html_ifr") || document.querySelector("iframe.tox-edit-area__iframe");
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
