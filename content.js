// content.js - Shoplazza 版：仅在右侧编辑器 iframe (body_html_ifr) 中激活悬浮翻译

(function () {
  "use strict";

  // 只在目标 iframe 中运行
  if (window.frameElement?.id !== "body_html_ifr" && window.name !== "body_html_ifr") return;

  console.log("🚀 AI 翻译插件已就绪 (Frame: " + window.name + ")");

  // ==========================================
  // 1. 样式配置 (Shadow DOM 用, fetch + inline 注入, 兼容 iframe CSP)
  // ==========================================
  let _cachedCSS = "";
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", chrome.runtime.getURL("content.css"), false); // 同步
    xhr.send();
    if (xhr.status === 200) _cachedCSS = xhr.responseText;
  } catch (err) {
    console.warn("⚠️ content.css 加载失败:", err.message);
  }

  function createStyleElement() {
    const style = document.createElement("style");
    style.textContent = _cachedCSS;
    return style;
  }

  // ==========================================
  // 2. 翻译状态追踪
  // ==========================================
  // key: img.src, value: "translating" | "done"
  const translatingImages = new Map();

  // ==========================================
  // 3. Toast 通知系统
  // ==========================================
  let toastHost = null;
  let toastContainer = null;

  function ensureToastHost() {
    if (toastHost && document.body.contains(toastHost)) return;
    toastHost = document.createElement("div");
    const shadow = toastHost.attachShadow({ mode: "open" });
    shadow.appendChild(createStyleElement());
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    shadow.appendChild(toastContainer);
    document.body.appendChild(toastHost);
  }

  function showToast(message, type = "info", duration = 4000) {
    ensureToastHost();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icons = { info: "ℹ️", success: "✅", error: "❌", loading: "⏳" };
    toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = "toastOut 0.3s ease-in forwards";
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
    return toast;
  }

  // ==========================================
  // 4. 悬浮按钮逻辑（支持多图并发）
  // ==========================================
  let hoverBtnHost = null;
  let hoverTimeout = null;

  // LANGUAGES 已移至 utils.js 共享

  function createHoverButton(img) {
    if (hoverBtnHost && hoverBtnHost.dataset.imgSrc === img.src) return;
    removeHoverButton();

    const imgSrc = img.src;
    const state = translatingImages.get(imgSrc);

    // 已经翻译完成的图片不再显示按钮
    if (state === "done") return;

    const host = document.createElement("div");
    host.dataset.imgSrc = imgSrc;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.appendChild(createStyleElement());

    const toolbar = document.createElement("div");
    toolbar.className = "ai-toolbar";

    // 语言下拉列表（使用 utils.js 共享函数）
    const langSelect = createLangSelect("lang-select");

    // 翻译按钮
    const btn = document.createElement("button");
    btn.className = "ai-btn";

    // 如果正在翻译，按钮显示进度并禁用
    if (state === "translating") {
      btn.innerHTML = `⏳ 翻译中...`;
      btn.disabled = true;
      langSelect.disabled = true;
    } else {
      btn.innerHTML = `<span>✨ AI 翻译</span>`;
    }

    toolbar.appendChild(langSelect);
    toolbar.appendChild(btn);

    // 使用 fixed 定位，左上角偏移（top +45 避开编辑器 Alt 按钮）
    const rect = img.getBoundingClientRect();
    host.style.position = "fixed";
    host.style.top = `${rect.top + 45}px`;
    host.style.left = `${rect.left + 10}px`;
    host.style.zIndex = "2147483647";

    // hover 到按钮上时取消自动隐藏
    host.addEventListener("mouseenter", () => clearTimeout(hoverTimeout));
    host.addEventListener("mouseleave", (e) => {
      const related = e.relatedTarget;
      if (related && related.tagName === "IMG" && related.src === imgSrc) return;
      hoverTimeout = setTimeout(removeHoverButton, 300);
    });

    // 点击触发翻译
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.innerHTML = `⏳ 翻译中...`;
      btn.disabled = true;
      langSelect.disabled = true;
      const targetLang = langSelect.value;
      // 记住语言选择
      chrome.storage.local.set({ lastLanguage: targetLang });
      handleTranslate(imgSrc, targetLang);
    };

    shadow.appendChild(toolbar);
    document.body.appendChild(host);
    hoverBtnHost = host;
  }

  function removeHoverButton() {
    if (hoverBtnHost) {
      hoverBtnHost.remove();
      hoverBtnHost = null;
    }
    clearTimeout(hoverTimeout);
  }

  // 监听鼠标移入
  document.addEventListener(
    "mouseover",
    (e) => {
      const target = e.target;
      if (
        target === hoverBtnHost ||
        (hoverBtnHost && hoverBtnHost.contains(target))
      )
        return;

      if (target.tagName === "IMG") {
        const rect = target.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20) {
          clearTimeout(hoverTimeout);
          createHoverButton(target);
        }
      }
    },
    true
  );

  // 监听鼠标移出（延迟移除）
  document.addEventListener(
    "mouseout",
    (e) => {
      if (e.target.tagName !== "IMG") return;
      const related = e.relatedTarget;
      if (related === hoverBtnHost) return;
      if (hoverBtnHost && hoverBtnHost.contains(related)) return;
      hoverTimeout = setTimeout(removeHoverButton, 300);
    },
    true
  );

  // 滚动时隐藏
  document.addEventListener("scroll", removeHoverButton, true);

  // ==========================================
  // 5. AI 翻译（支持并发，互不干扰）
  // ==========================================

  async function handleTranslate(srcUrl, targetLang) {
    // 标记为翻译中
    translatingImages.set(srcUrl, "translating");
    const loadingToast = showToast("正在翻译图片...", "loading", 0);

    try {
      // 检查配置（使用 utils.js 共享函数）
      const configOk = await checkApiConfig();

      if (!configOk) {
        translatingImages.delete(srcUrl);
        removeHoverButton();
        loadingToast.remove();
        showToast("请先配置 API Key！点击插件图标 → 设置", "error", 6000);
        return;
      }

      // 发送翻译请求（使用 utils.js 共享函数）
      const result = await sendTranslateRequest(srcUrl, targetLang);

      // 标记为已完成
      translatingImages.set(srcUrl, "done");
      removeHoverButton();
      loadingToast.remove();
      showToast("翻译完成！", "success", 3000);

      // 保存记录（使用 utils.js 共享函数）
      saveTranslateRecord(srcUrl, result.translatedDataUrl, targetLang, window.location.href);

      // 显示结果弹窗（传入 targetLang 用于重试）
      showModal(srcUrl, result.translatedDataUrl, targetLang);
    } catch (error) {
      console.error("Translation Error:", error);
      translatingImages.delete(srcUrl);
      removeHoverButton();
      loadingToast.remove();
      showToast("翻译失败: " + error.message, "error", 6000);
    }
  }

  // ==========================================
  // 6. 结果弹窗（队列式，一次只显示一个）
  // ==========================================
  const modalQueue = [];
  let isModalOpen = false;

  function showModal(originalUrl, translatedUrl, targetLang) {
    if (isModalOpen) {
      modalQueue.push({ originalUrl, translatedUrl, targetLang });
      return;
    }
    _renderModal(originalUrl, translatedUrl, targetLang);
  }

  function _renderModal(originalUrl, translatedUrl, targetLang) {
    isModalOpen = true;

    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.appendChild(createStyleElement());

    const container = document.createElement("div");
    container.className = "modal-overlay";

    const queueInfo =
      modalQueue.length > 0
        ? ` <span style="font-size:13px;color:#9CA3AF;font-weight:400;">(还有 ${modalQueue.length} 张待查看)</span>`
        : "";

    container.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">✨ AI 翻译完成${queueInfo}</h3>
        <button id="closeX" class="close-btn">✕</button>
      </div>

      <div class="compare-area">
        <div class="img-col">
          <img src="${originalUrl}">
          <span>原图</span>
        </div>
        <div class="arrow">→</div>
        <div class="img-col">
          <img src="${translatedUrl}">
          <span>AI 译图</span>
        </div>
      </div>

      <div class="actions">
        <button id="retryBtn" class="btn-retry">🔁 重试</button>
        <button id="downloadBtn" class="btn-secondary">💾 下载图片</button>
        <button id="replaceBtn" class="btn-primary">🔄 替换原图</button>
      </div>
    </div>
  `;

    function closeModal() {
      host.remove();
      isModalOpen = false;
      // 显示队列中的下一个
      if (modalQueue.length > 0) {
        const next = modalQueue.shift();
        _renderModal(next.originalUrl, next.translatedUrl, next.targetLang);
      }
    }

    container.querySelector("#closeX").onclick = closeModal;

    // 重试翻译 — 使用闭包中的 targetLang，不再依赖全局变量
    container.querySelector("#retryBtn").onclick = () => {
      const retryBtn = container.querySelector("#retryBtn");
      retryBtn.innerText = "⏳ 重新翻译中...";
      retryBtn.disabled = true;
      // 重置图片状态
      translatingImages.delete(originalUrl);
      // 关闭当前弹窗
      closeModal();
      // 重新发起翻译（使用本次 modal 的 targetLang）
      handleTranslate(originalUrl, targetLang);
    };

    // 下载（使用共享工具函数）
    container.querySelector("#downloadBtn").onclick = () => {
      const blob = base64ToBlob(translatedUrl);
      const blobUrl = URL.createObjectURL(blob);

      chrome.runtime.sendMessage(
        {
          action: "download",
          url: blobUrl,
          filename: "translated_" + Date.now() + ".png",
        },
        () => {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        }
      );
    };

    // 替换原图（遍历比较 src 属性，避免 CSS 选择器特殊字符问题）
    container.querySelector("#replaceBtn").onclick = () => {
      document.querySelectorAll("img").forEach((img) => {
        if (img.src === originalUrl) img.src = translatedUrl;
      });
      container.querySelector("#replaceBtn").innerText = "✅ 已替换";
      container.querySelector("#replaceBtn").disabled = true;
    };

    shadow.appendChild(container);

    try {
      window.top.document.body.appendChild(host);
    } catch (e) {
      document.body.appendChild(host);
    }
  }

})();