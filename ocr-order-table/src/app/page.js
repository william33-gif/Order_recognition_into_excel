"use client";
import Image from "next/image";
import { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function extractInfo(text) {
  // 1. 优惠后金额（商品金额）增强提取逻辑
  let amountDiscount = "未识别";
  const lines = text.split(/\r?\n/);
  // 1.1 优先找“优惠后”关键词
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('优惠后')) {
      let match = lines[i].match(/([¥￥Y]?[\s]*\d{2,6}(?:\.\d{1,2})?)/);
      if (match && /\d/.test(match[0])) {
        amountDiscount = match[0].replace(/[¥￥Y\s]/g, '');
        break;
      }
      // 兼容金额在下一行
      if (i + 1 < lines.length) {
        let matchNext = lines[i + 1].match(/([¥￥Y]?[\s]*\d{2,6}(?:\.\d{1,2})?)/);
        if (matchNext && /\d/.test(matchNext[0])) {
          amountDiscount = matchNext[0].replace(/[¥￥Y\s]/g, '');
          break;
        }
      }
    }
  }
  // 1.2 没有“优惠后”时，找商品区靠右的金额，排除“实付”相关行
  if (amountDiscount === "未识别") {
    for (let i = 0; i < lines.length; i++) {
      if (/实付|微信|订单|编号|下单|发票|快照|金额|运费|礼金|减|共减|支付|退款|价保|发货/.test(lines[i])) continue;
      // 只考虑带有“¥”或“￥”的金额
      let match = lines[i].match(/([¥￥Y][\s]*\d{2,6}(?:\.\d{1,2})?)/);
      if (match && /\d/.test(match[0])) {
        amountDiscount = match[0].replace(/[¥￥Y\s]/g, '');
        break;
      }
    }
  }
  // 2. 实付金额（红框）跨行提取
  let amountPaid = "未识别";
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('实付')) {
      let match = lines[i].match(/([¥￥Y]?\s*\d{2,6}(?:\.\d{1,2})?)/);
      if (match && /\d/.test(match[0])) {
        amountPaid = match[0].replace(/[¥￥Y\s]/g, '');
        break;
      }
      if (i + 1 < lines.length) {
        let matchNext = lines[i + 1].match(/([¥￥Y]?\s*\d{2,6}(?:\.\d{1,2})?)/);
        if (matchNext && /\d/.test(matchNext[0])) {
          amountPaid = matchNext[0].replace(/[¥￥Y\s]/g, '');
          break;
        }
      }
    }
  }
  return {
    amountDiscount,
    amountPaid,
    orderId: extractOrderIdWithLimit(text)
  };
}

function extractOrderIdWithLimit(text) {
  const match = text.match(/\b\d{13,}\b/);
  if (match && match[0]) {
    return match[0].slice(0, 14); // 只取前14位
  }
  return "未识别";
}

export default function Home() {
  const [files, setFiles] = useState([]); // 文件数组
  const [previews, setPreviews] = useState([]); // 预览数组
  const [results, setResults] = useState([]); // 识别结果数组
  const [progress, setProgress] = useState(0); // 识别进度
  const [loading, setLoading] = useState(false);
  const [singleRawText, setSingleRawText] = useState("");

  const handleFileChange = (e) => {
    const fileList = Array.from(e.target.files);
    setFiles(fileList);
    setPreviews(fileList.map(f => URL.createObjectURL(f)));
    setResults([]);
    setProgress(0);
  };

  // 新的批量识别逻辑，调用后端API
  const handleOcrAll = async () => {
    setLoading(true);
    setResults([]);
    setSingleRawText("");
    setProgress(0);

    // 1. 读取所有图片为base64
    const getBase64List = (files) => {
      return Promise.all(
        files.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result.split(',')[1]); // 只要base64部分
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
    };

    try {
      const base64List = await getBase64List(files);
      // 2. 调用后端API
      const res = await axios.post("/api/baidu-ocr", { images: base64List });
      const ocrResults = res.data.results;

      let tempResults = [];
      ocrResults.forEach((ocr, idx) => {
        // 拼接所有行文本
        const text = ocr.words_result?.map(w => w.words).join('\n') || '';
        const info = extractInfo(text);
        tempResults.push({
          filename: files[idx].name,
          amountDiscount: info.amountDiscount,
          amountPaid: info.amountPaid,
          orderId: info.orderId,
          raw: text
        });
        if (files.length === 1) setSingleRawText(text);
      });
      setResults(tempResults);
    } catch (e) {
      setResults(files.map(f => ({
        filename: f.name,
        amountDiscount: "识别失败",
        amountPaid: "识别失败",
        orderId: "识别失败",
        raw: ""
      })));
      setSingleRawText("");
    }
    setLoading(false);
    setProgress(100);
  };

  const handleExportExcel = () => {
    const data = results.map((r, idx) => ({
      序号: idx + 1,
      文件名: r.filename,
      商品金额: r.amountDiscount,
      实付金额: r.amountPaid,
      订单编号: r.orderId
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "订单信息");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "订单信息.xlsx");
  };

  const handleClear = () => {
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setProgress(0);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      <header className="w-full flex items-center justify-center py-8 border-b border-gray-100 mb-8">
        <div className="flex items-center gap-3">
          <span className="inline-block w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-green-400 flex items-center justify-center text-white text-2xl font-bold shadow">单</span>
          <span className="text-2xl font-semibold tracking-tight text-gray-800">订单识别成表工具</span>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-white/80 shadow-xl rounded-3xl p-10 w-full max-w-2xl flex flex-col items-center gap-8 border border-gray-100">
          {/* 上传区 */}
          <div className="w-full flex flex-col items-center gap-4">
            <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-xl p-6 cursor-pointer hover:bg-blue-50 transition">
              <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
              <span className="text-blue-500 text-lg font-medium mb-2">点击或拖拽上传订单截图（支持多选）</span>
              <span className="text-gray-400 text-sm">支持 JPG/PNG 等常见图片格式</span>
            </label>
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-4 justify-center w-full">
                {previews.map((src, idx) => (
                  <img key={idx} src={src} alt={`预览${idx+1}`} className="max-w-[120px] max-h-32 rounded-xl border border-gray-200 shadow" />
                ))}
              </div>
            )}
          </div>
          {/* 操作按钮区 */}
          <div className="w-full flex flex-col items-center gap-4">
            <button onClick={handleOcrAll} disabled={files.length === 0 || loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-green-400 text-white text-lg font-semibold shadow hover:scale-105 transition disabled:opacity-50">
              {loading ? `正在批量识别...${progress}%` : "批量识别图片文字"}
            </button>
            <button onClick={handleClear} disabled={loading} className="w-full py-2 rounded-xl bg-gray-200 text-gray-700 text-base font-medium hover:bg-gray-300 transition">清空</button>
          </div>
          {/* 识别结果区 */}
          {results.length > 0 && (
            <div className="w-full overflow-x-auto">
              <div className="text-lg font-bold mb-2 text-green-700">识别结果</div>
              <table className="min-w-full border text-center text-sm bg-green-50 rounded-xl">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border">序号</th>
                    <th className="px-2 py-1 border">文件名</th>
                    <th className="px-2 py-1 border">商品金额</th>
                    <th className="px-2 py-1 border">实付金额</th>
                    <th className="px-2 py-1 border">订单编号</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx} className="hover:bg-green-100">
                      <td className="px-2 py-1 border">{idx + 1}</td>
                      <td className="px-2 py-1 border">{r.filename}</td>
                      <td className="px-2 py-1 border">{r.amountDiscount}</td>
                      <td className="px-2 py-1 border">{r.amountPaid}</td>
                      <td className="px-2 py-1 border">{r.orderId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={handleExportExcel} className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition">导出所有结果为 Excel</button>
              {/* 单张图片时展示 OCR 原文 */}
              {files.length === 1 && singleRawText && (
                <div className="mt-6 w-full">
                  <div className="text-gray-500 text-xs mb-1">OCR 转文字内容（便于排查识别问题）</div>
                  <textarea value={singleRawText} readOnly rows={8} className="w-full p-3 border rounded-xl bg-gray-50 text-gray-700 text-sm" />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <footer className="w-full text-center text-gray-400 text-xs py-6 mt-8">© 2024 订单识别成表工具</footer>
    </div>
  );
}
