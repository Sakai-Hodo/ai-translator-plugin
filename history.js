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

  card.innerHTML = `
    <img class="card-img" src="${rec.translatedB64}" loading="lazy">
    <div class="card-body">
      <div class="card-meta">
        <span class="lang-badge">${rec.targetLanguage}</span>
        <span class="card-time">${timeStr}</span>
      </div>
      <div class="card-source" title="${rec.sourcePageUrl || ""}">${sourceDomain}</div>
    </div>
    <div class="card-actions">
      <button class="btn-compare" data-id="${rec.id}">🔍 对比</button>
      <button class="btn-dl" data-id="${rec.id}">💾 下载</button>
      <button class="btn-delete" data-id="${rec.id}">🗑️</button>
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

  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">🔍 翻译对比 · ${rec.targetLanguage} · ${timeStr}</span>
        <button class="modal-close">✕</button>
      </div>
      <div class="compare-grid">
        <div class="compare-col">
          <img src="${rec.originalUrl}">
          <div class="compare-label">原图</div>
        </div>
        <div class="compare-col">
          <img src="${rec.translatedB64}">
          <div class="compare-label">AI 译图</div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-delete">🗑️ 删除</button>
        <button class="btn-download">💾 下载译图</button>
      </div>
    </div>
  `;

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
  const blob = base64ToBlob(dataUrl);
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = "translated_" + (timestamp || Date.now()) + ".png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
}

// ---------------------------------------------------------------------------
// 初始化
// ---------------------------------------------------------------------------
loadRecords();
