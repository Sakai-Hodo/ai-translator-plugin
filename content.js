// content.js - 最终修复版 (定位修正 + 弹窗功能)

console.log("🚀 AI 翻译插件已就绪 (Frame: " + window.name + ")");

// ==========================================
// 1. 样式配置 (Shadow DOM)
// ==========================================
const STYLES = `
  /* 悬浮工具栏容器 */
  .ai-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* 语言下拉列表 */
  .lang-select {
    background: white;
    color: #374151;
    border: 1px solid #D1D5DB;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    outline: none;
    appearance: auto;
  }
  .lang-select:hover { border-color: #4F46E5; }
  .lang-select:focus { border-color: #4F46E5; box-shadow: 0 0 0 2px rgba(79,70,229,0.3); }

  /* 悬浮按钮样式 */
  .ai-btn {
    background: #4F46E5;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 6px;
    transition: transform 0.2s, background 0.2s;
    white-space: nowrap;
  }
  .ai-btn:hover { background: #4338CA; transform: translateY(-1px); }

  /* 结果弹窗样式 */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-box {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    width: 700px;
    max-width: 90vw;
    font-family: sans-serif;
    animation: fadeIn 0.2s ease-out;
  }
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .modal-title { margin: 0; font-size: 20px; color: #111827; font-weight: 600; }
  
  .compare-area {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    background: #F9FAFB;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 24px;
  }
  .img-col { flex: 1; display: flex; flex-direction: column; align-items: center; }
  .img-col img { 
    max-width: 100%; 
    max-height: 250px; 
    object-fit: contain; 
    border-radius: 6px;
    border: 1px solid #E5E7EB;
    background: white;
  }
  .img-col span { margin-top: 10px; font-size: 13px; color: #6B7280; font-weight: 500; }
  .arrow { font-size: 24px; color: #9CA3AF; }
  
  .actions { display: flex; justify-content: flex-end; gap: 12px; }
  .btn-primary {
    background: #4F46E5; color: white; border: none; padding: 10px 20px;
    border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;
  }
  .btn-primary:hover { background: #4338CA; }
  .btn-secondary {
    background: white; color: #374151; border: 1px solid #D1D5DB; padding: 10px 20px;
    border-radius: 6px; cursor: pointer; font-size: 14px;
  }
  .btn-secondary:hover { background: #F3F4F6; }
`;

// ==========================================
// 2. 悬浮按钮逻辑 (这是刚刚验证成功的版本)
// ==========================================
let hoverBtnHost = null;

function createHoverButton(img) {
  if (hoverBtnHost && hoverBtnHost.dataset.imgSrc === img.src) return;
  removeHoverButton();

  const host = document.createElement('div');
  host.dataset.imgSrc = img.src;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLES;
  shadow.appendChild(style);

  // 工具栏容器
  const toolbar = document.createElement('div');
  toolbar.className = 'ai-toolbar';

  // 语言下拉列表
  const langSelect = document.createElement('select');
  langSelect.className = 'lang-select';
  const languages = [
    { value: 'English', label: '🇺🇸 英语' },
    { value: 'Chinese', label: '🇨🇳 中文' },
    { value: 'Japanese', label: '🇯🇵 日语' },
    { value: 'French', label: '🇫🇷 法语' },
  ];
  languages.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.value;
    opt.textContent = lang.label;
    langSelect.appendChild(opt);
  });

  // 翻译按钮
  const btn = document.createElement('button');
  btn.className = 'ai-btn';
  btn.innerHTML = `<span>✨ AI 翻译</span>`;

  toolbar.appendChild(langSelect);
  toolbar.appendChild(btn);

  // 计算位置 (使用之前验证成功的左上角逻辑)
  const rect = img.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;

  const top = rect.top + scrollTop + 10;
  const left = rect.left + scrollLeft + 10;

  host.style.position = 'absolute';
  host.style.top = `${top}px`;
  host.style.left = `${left}px`;
  host.style.zIndex = '2147483647';

  // 点击触发
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.innerHTML = `⏳ 处理中...`;
    const targetLang = langSelect.value;
    handleTranslate(img.src, targetLang, () => removeHoverButton());
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
}

// 监听鼠标移动
document.addEventListener('mouseover', (e) => {
  const target = e.target;
  // 排除掉我们插件自己的按钮
  if (target === hoverBtnHost || (hoverBtnHost && hoverBtnHost.contains(target))) return;

  if (target.tagName === 'IMG') {
    const rect = target.getBoundingClientRect();
    // 只要图片有尺寸就显示 (放宽限制到 20px)
    if (rect.width > 20 && rect.height > 20) {
      createHoverButton(target);
    }
  }
}, true);

// 滚动时隐藏，防止错位
document.addEventListener('scroll', removeHoverButton, true);

// ==========================================
// 3. AI 翻译 (通过 background.js 调用 API)
// ==========================================

async function handleTranslate(srcUrl, targetLang, cleanupCallback) {
  try {
    // 先检查是否已配置 API Key
    const configOk = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "checkConfig" }, (res) => {
        resolve(res && res.configured);
      });
    });

    if (!configOk) {
      alert("⚠️ 请先配置 API Key！\n右键点击插件图标 → 选项，或点击插件图标打开设置。");
      chrome.runtime.sendMessage({ action: "openOptions" });
      if (cleanupCallback) cleanupCallback();
      return;
    }

    // 发送翻译请求到 background.js
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "translate", imageUrl: srcUrl, targetLanguage: targetLang },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (res && res.ok) {
            resolve(res);
          } else {
            reject(new Error(res?.error || "翻译失败"));
          }
        }
      );
    });

    // 自动保存翻译记录到 IndexedDB
    chrome.runtime.sendMessage({
      action: "saveRecord",
      originalUrl: srcUrl,
      translatedB64: result.translatedDataUrl,
      targetLanguage: targetLang,
      sourcePageUrl: window.location.href,
    });

    // 调用 showModal 显示结果
    showModal(srcUrl, result.translatedDataUrl);

    if (cleanupCallback) cleanupCallback();
  } catch (error) {
    console.error("Translation Error:", error);
    alert("处理失败: " + error.message);
    if (cleanupCallback) cleanupCallback();
  }
}

// ==========================================
// 4. 结果弹窗 (这就是之前缺失的 showModal)
// ==========================================
function showModal(originalUrl, translatedUrl) {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLES;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'modal-overlay';

  container.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">✨ AI 翻译完成</h3>
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
        <button id="cancelBtn" class="btn-secondary">取消</button>
        <button id="downloadBtn" class="btn-secondary">💾 下载图片</button>
        <button id="replaceBtn" class="btn-primary">🔄 替换原图</button>
      </div>
    </div>
  `;

  // 事件绑定
  container.querySelector('#cancelBtn').onclick = () => host.remove();

  // 下载图片 — 通过 background.js 的 chrome.downloads API
  container.querySelector('#downloadBtn').onclick = () => {
    const [header, b64] = translatedUrl.split(",");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/png" });
    const blobUrl = URL.createObjectURL(blob);

    chrome.runtime.sendMessage({
      action: "download",
      url: blobUrl,
      filename: "translated_" + Date.now() + ".png",
    }, () => {
      // 延迟释放 blob URL，确保下载开始后再回收
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    });
  };

  // 替换页面上的原图（不关闭弹窗）
  container.querySelector('#replaceBtn').onclick = () => {
    const imgs = document.querySelectorAll(`img[src="${originalUrl}"]`);
    imgs.forEach(img => { img.src = translatedUrl; });
    container.querySelector('#replaceBtn').innerText = "✅ 已替换";
    container.querySelector('#replaceBtn').disabled = true;
  };

  shadow.appendChild(container);

  // 尝试挂载到顶层窗口, 如果不行就挂载到当前 iframe
  try {
    window.top.document.body.appendChild(host);
  } catch (e) {
    console.log("挂载到 Top 失败，降级显示");
    document.body.appendChild(host);
  }
}