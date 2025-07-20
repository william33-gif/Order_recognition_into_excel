"use client";
import Image from "next/image";
import { useState } from "react";
import Tesseract from "tesseract.js";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function extractInfo(text) {
  // 1. 优先查找“优 惠 后”或“实 付”中间可有空格的金额
  const discountMatch = text.match(/优\s*惠\s*后[：: ]*([¥￥Y]?\s*\d{2,6}(?:\.\d{1,2})?)/);
  if (discountMatch) {
    return {
      amount: discountMatch[1].replace(/[¥￥Y\s]/g, ''),
      orderId: (text.match(/\b\d{13,}\b/) || [])[0] || "未识别"
    };
  }
  const paidMatch = text.match(/实\s*付[：: ]*([¥￥Y]?\s*\d{2,6}(?:\.\d{1,2})?)/);
  if (paidMatch) {
    return {
      amount: paidMatch[1].replace(/[¥￥Y\s]/g, ''),
      orderId: (text.match(/\b\d{13,}\b/) || [])[0] || "未识别"
    };
  }
  // 2. 其次查找所有“¥”/“￥”/“Y”后面的金额（2-6位数字），只取最靠前的
  const symbolMatch = text.match(/[¥￥Y]\s*(\d{2,6}(?:\.\d{1,2})?)/);
  const amountVal = symbolMatch?.[1] || "未识别";
  const orderIdMatch = text.match(/\b\d{13,}\b/);
  return {
    amount: amountVal,
    orderId: orderIdMatch ? orderIdMatch[0] : "未识别"
  };
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

  const handleOcrAll = async () => {
    setLoading(true);
    setResults([]);
    setSingleRawText("");
    let tempResults = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const { data: { text } } = await Tesseract.recognize(files[i], 'chi_sim');
        const info = extractInfo(text);
        tempResults.push({
          filename: files[i].name,
          amount: info.amount,
          orderId: info.orderId,
          raw: text
        });
        // 如果只识别一张图片，保存原文
        if (files.length === 1) setSingleRawText(text);
      } catch {
        tempResults.push({
          filename: files[i].name,
          amount: "识别失败",
          orderId: "识别失败",
          raw: ""
        });
        if (files.length === 1) setSingleRawText("");
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setResults(tempResults);
    setLoading(false);
  };

  const handleExportExcel = () => {
    const data = results.map((r, idx) => ({
      序号: idx + 1,
      文件名: r.filename,
      实付金额: r.amount,
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
                    <th className="px-2 py-1 border">实付金额</th>
                    <th className="px-2 py-1 border">订单编号</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx} className="hover:bg-green-100">
                      <td className="px-2 py-1 border">{idx + 1}</td>
                      <td className="px-2 py-1 border">{r.filename}</td>
                      <td className="px-2 py-1 border">{r.amount}</td>
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
