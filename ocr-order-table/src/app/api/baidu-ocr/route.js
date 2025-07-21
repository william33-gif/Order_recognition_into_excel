import { NextResponse } from 'next/server';
import axios from 'axios';

// 百度OCR access_token（建议后续用环境变量管理）
const access_token = '24.3a7c831bff39582d82a2d51c015130a3.2592000.1755599519.282335-119558742';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req) {
  try {
    const { images } = await req.json(); // images: base64数组
    if (!images || !Array.isArray(images)) {
      return NextResponse.json({ error: '参数错误，需传递base64图片数组' }, { status: 400 });
    }

    // 顺序识别所有图片，每次间隔500ms，避免QPS超限
    const results = [];
    for (const img_base64 of images) {
      try {
        const res = await axios.post(
          `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${access_token}`,
          `image=${encodeURIComponent(img_base64)}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        results.push(res.data);
      } catch (err) {
        results.push({ error: true, message: err.message });
      }
      await sleep(500); // 每次请求后延迟500ms
    }

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
} 