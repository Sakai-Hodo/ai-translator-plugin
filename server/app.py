"""
SaaS AI Image Translator - Flask Backend
Pipeline: Download Image → SeedEdit API (translate) → Base64 Response
"""

import os
import io
import base64
import traceback

import requests
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from openai import OpenAI

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
ARK_API_KEY = os.getenv("ARK_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://oneapi.gemiaude.com/v1")
SEEDEDIT_MODEL = os.getenv("SEEDEDIT_MODEL", "jimeng-4.1")

client = OpenAI(api_key=ARK_API_KEY, base_url=OPENAI_BASE_URL)

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# Helper: Download image → PIL Image
# ---------------------------------------------------------------------------
def download_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=15, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
    })
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content)).convert("RGBA")


# ---------------------------------------------------------------------------
# Helper: PIL Image → base64 string (no data-url prefix)
# ---------------------------------------------------------------------------
def image_to_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# ---------------------------------------------------------------------------
# Helper: PIL Image → base64 data-url
# ---------------------------------------------------------------------------
def image_to_data_url(img: Image.Image) -> str:
    return f"data:image/png;base64,{image_to_base64(img)}"


# ---------------------------------------------------------------------------
# SeedEdit: translate image in one API call
# ---------------------------------------------------------------------------
def seededit_translate(img: Image.Image, target_language: str) -> str:
    """
    Call SeedEdit to translate all text in the image to target_language.
    Returns base64-encoded translated image data URL.

    Uses OpenAI-compatible images.edit endpoint via the proxy.
    """
    prompt = f"将图片中的所有文字翻译为{target_language}，保持原有排版、字体风格和设计风格不变，只替换文字内容"

    # 将 PIL Image 转为内存中的 PNG 文件对象，供 OpenAI SDK 使用
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    buf.seek(0)
    buf.name = "image.png"  # OpenAI SDK 需要 .name 属性

    try:
        # 方式1: 标准 OpenAI images.edit 接口
        response = client.images.edit(
            model=SEEDEDIT_MODEL,
            image=buf,
            prompt=prompt,
            response_format="b64_json",
        )
    except Exception as e:
        print(f"⚠️ images.edit failed ({e}), falling back to images.generate with extra_body...")
        # 方式2: 有些中转站只支持 images.generate + 非标准 image 字段
        img_b64 = image_to_base64(img)
        response = client.images.generate(
            model=SEEDEDIT_MODEL,
            prompt=prompt,
            response_format="b64_json",
            extra_body={"image": img_b64},
        )

    if response.data and len(response.data) > 0:
        result_b64 = response.data[0].b64_json
        return f"data:image/png;base64,{result_b64}"

    raise RuntimeError("SeedEdit API returned no images")


# ---------------------------------------------------------------------------
# Main endpoint
# ---------------------------------------------------------------------------
@app.route("/translate", methods=["POST"])
def translate():
    try:
        data = request.get_json(force=True)
        image_url = data.get("image_url", "")
        target_language = data.get("target_language", "English")
        if not image_url:
            return jsonify({"status": "error", "message": "Missing image_url"}), 400

        # Step 1: Download
        print(f"📥 Downloading: {image_url[:80]}...")
        print(f"   Target language: {target_language}")
        original = download_image(image_url)
        w, h = original.size
        print(f"   Image size: {w}x{h}")

        # Step 2: SeedEdit translate
        print(f"🎨 Calling SeedEdit to translate to {target_language}...")
        translated_data_url = seededit_translate(original, target_language)
        print(f"✅ Done! Base64 length: {len(translated_data_url)}")

        return jsonify({
            "status": "success",
            "translated_image_url": translated_data_url,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e),
        }), 500


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    print("🚀 AI Image Translator Backend starting...")
    print(f"   ARK API Key: {'✅ set' if ARK_API_KEY else '❌ missing'}")
    print(f"   Model:       {SEEDEDIT_MODEL}")
    app.run(host="0.0.0.0", port=5000, debug=True)
