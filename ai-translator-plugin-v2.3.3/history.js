// history.js — 历史记录画廊逻辑

const gallery = document.getElementById("gallery");
const totalCount = document.getElementById("totalCount");

// ---------------------------------------------------------------------------
// 加载所有记录
// ---------------------------------------------------------------------------
function loadRecords() {
  chrome.runtime.sendMessage({ action: "getRecords" }, (res) => {
    if (!res || !res.ok) {
      showEmpty();
      return;
    }
    const records = res.records;
    totalCount.textContent = records.length;

    if (records.length === 0) {
      showEmpty();
      return;
    }

    gallery.innerHTML = "";
    records.forEach((rec) => gallery.appendChild(createCard(rec)));
  });
}

// ---------------------------------------------------------------------------
// 空状态
// ---------------------------------------------------------------------------
function showEmpty() {
  totalCount.textContent = "0";
  gallery.innerHTML = `
    <div class="empty">
      <div class="empty-icon">🖼️</div>
      <h2>暂无翻译记录</h2>
      <p>在任意网页上悬浮图片并点击「AI 翻译」，翻译结果将自动保存在这里。</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// 安全转义 HTML 特殊字符
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// 创建卡片
// ---------------------------------------------------------------------------
function createCard(rec) {
  const card = document.createElement("div");
  card.className = "card";

  const time = new Date(rec.timestamp);
  const timeStr =
    time.toLocaleDateString("zh-CN") +
    " " +
    time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  const sourceDomain = (() => {
    try {
      return new URL(rec.sourcePageUrl).hostname;
    } catch {
      return rec.sourcePageUrl || "未知来源";
    }
  })();

  // 使用 escapeHtml 避免 XSS（用户数据不直接拼进 innerHTML）
  card.innerHTML = `
    <img class="card-img" src="${escapeHtml(rec.translatedB64)}" loading="lazy">
    <div class="card-body">
      <div class="card-meta">
        <span class="lang-badge">${escapeHtml(rec.targetLanguage)}</span>
        <span class="card-time">${escapeHtml(timeStr)}</span>
      </div>
      <div class="card-source" title="${escapeHtml(rec.sourcePageUrl || "")}">${escapeHtml(sourceDomain)}</div>
    </div>
    <div class="card-actions">
      <button class="btn-compare">🔍 对比</button>
      <button class="btn-dl">💾 下载</button>
      <button class="btn-delete">🗑️</button>
    </div>
  `;

  // 点击卡片图片区域 → 打开对比弹窗
  card.querySelector(".card-img").addEventListener("click", () => showCompare(rec));
  card.querySelector(".btn-compare").addEventListener("click", (e) => {
    e.stopPropagation();
    showCompare(rec);
  });

  // 下载
  card.querySelector(".btn-dl").addEventListener("click", (e) => {
    e.stopPropagation();
    downloadImage(rec.translatedB64, rec.timestamp);
  });

  // 删除
  card.querySelector(".btn-delete").addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("确定删除这条翻译记录？")) {
      chrome.runtime.sendMessage({ action: "deleteRecord", id: rec.id }, () => {
        card.style.transform = "scale(0.9)";
        card.style.opacity = "0";
        card.style.transition = "all 0.25s";
        setTimeout(() => {
          card.remove();
          // 更新计数
          const remaining = gallery.querySelectorAll(".card").length;
          totalCount.textContent = remaining;
          if (remaining === 0) showEmpty();
        }, 250);
      });
    }
  });

  return card;
}

// ---------------------------------------------------------------------------
// 对比弹窗
// ---------------------------------------------------------------------------
function showCompare(rec) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const time = new Date(rec.timestamp);
  const timeStr =
    time.toLocaleDateString("zh-CN") +
    " " +
    time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  // 构建骨架 HTML（不含动态用户数据）
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title"></span>
        <button class="modal-close">✕</button>
      </div>
      <div class="compare-grid">
        <div class="compare-col">
          <img>
          <div class="compare-label">原图</div>
        </div>
        <div class="compare-col">
          <img>
          <div class="compare-label">AI 译图</div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-delete">🗑️ 删除</button>
        <button class="btn-download">💾 下载译图</button>
      </div>
    </div>
  `;

  // 用 DOM API 安全填入用户数据
  overlay.querySelector(".modal-title").textContent = `🔍 翻译对比 · ${rec.targetLanguage} · ${timeStr}`;
  const imgs = overlay.querySelectorAll(".compare-col img");
  imgs[0].src = rec.originalUrl;
  imgs[1].src = rec.translatedB64;

  // 关闭
  overlay.querySelector(".modal-close").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // 下载
  overlay.querySelector(".btn-download").addEventListener("click", () => {
    downloadImage(rec.translatedB64, rec.timestamp);
  });

  // 删除
  overlay.querySelector(".btn-delete").addEventListener("click", () => {
    if (confirm("确定删除这条翻译记录？")) {
      chrome.runtime.sendMessage({ action: "deleteRecord", id: rec.id }, () => {
        overlay.remove();
        loadRecords(); // 重新加载
      });
    }
  });

  document.body.appendChild(overlay);
}

// ---------------------------------------------------------------------------
// 下载图片
// ---------------------------------------------------------------------------
function downloadImage(dataUrl, timestamp) {
  try {
    chrome.runtime.sendMessage({
      action: "download",
      url: dataUrl,
      filename: "translated_" + (timestamp || Date.now()) + ".png"
    });
  } catch (err) {
    console.error("下载出错:", err);
  }
}

// ---------------------------------------------------------------------------
// 初始化
// ---------------------------------------------------------------------------
loadRecords();
