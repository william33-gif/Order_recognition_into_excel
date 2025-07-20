# 订单截图识别与导出工具

## 项目目标
本项目用于上传订单截图图片，自动识别图片中的“实付金额”和“订单编号”，并可将识别结果导出为 Excel 表格。

## 沟通与实现记录

### 2024-xx-xx
1. 用户需求：上传订单截图，自动识别实付金额和订单编号，导出 Excel。
2. 方案选择：优先采用前端纯 JS 识别（Tesseract.js），无需后端和云服务，数据隐私性好。
3. 第一步：安装 tesseract.js 依赖包。
   - 目的：为后续在前端实现图片 OCR 识别做准备。
   - 操作命令：`npm install tesseract.js`
4. 第二步：页面添加图片上传与预览功能。
   - 目的：让用户可以上传订单截图图片，并在页面上预览，作为后续 OCR 识别的输入。
5. 第三步：集成 Tesseract.js 实现图片文字识别。
   - 目的：用户上传图片后，利用 Tesseract.js 进行 OCR 识别，获取图片中的全部文字内容，为后续提取订单号和金额做准备。
6. 第四步：自动提取实付金额和订单编号。
   - 目的：通过正则表达式等方式，从 OCR 识别结果中自动提取出订单截图中的“实付金额”和“订单编号”，并在页面上展示。
7. 第五步：导出为 Excel 文件。
   - 目的：将识别到的实付金额和订单编号等信息，生成 Excel 文件，方便用户批量整理和下载保存。
8. 金额提取逻辑优化：
   - 目的：解决部分订单截图金额识别为两位数（如14而非147）的问题。
   - 优化点：优先匹配“实付”后面的金额、匹配“¥”或“￥”后金额、全局找最大数字，提升准确率。
9. 金额提取逻辑方案一（关键词定位+金额正则）：
   - 优先匹配“实付”、“实付款”、“应付金额”等关键词后面的金额（支持“¥”、“￥”符号，允许有空格或冒号）。
   - 其次匹配“¥”或“￥”后面的金额。
   - 都没有时返回“未识别”。
10. 批量上传与批量识别优化：
    - 支持多图片批量上传，批量识别每张图片的实付金额和订单号。
    - 识别结果以表格形式展示，可一键导出所有结果为 Excel。
11. 金额提取锁定红框数字方案一（版式优先+位置靠前）：
    - 在 OCR 结果中查找所有“¥”/“￥”/“Y”后面的金额（2-6位数字）。
    - 只取最靠前（文本中第一次出现）的金额，作为红框金额。
    - 只要识别到金额，立即返回，不再继续查找。
12. 金额提取逻辑最高优先级由“优惠后”改为“实付”：
    - 优先查找“实付”后面的金额，作为实付金额。
    - 如果没有“实付”金额，则进入下一级“¥/￥/Y”靠前金额逻辑。
13. 金额提取逻辑升级：
    - 最高优先级为“优惠后”或“实付”后面的金额。
    - “优惠后”“实付”与金额之间允许有一个或多个空格、可有“¥/￥/Y”符号。
    - 其次为“¥/￥/Y”靠前金额。

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

### 2024-07-18 进度总结
1. 完成批量上传、批量识别、批量导出 Excel 的核心功能。
2. 多轮优化金额提取逻辑，支持“优惠后”“实付”及其空格变体，优先级明确，极大提升了准确率。
3. 增加单张图片识别时展示 OCR 转文字内容，便于排查问题。
4. 针对 OCR 识别不准问题，分析了图片预处理、云端 OCR、人工校对等多种提升方案。
5. 决定下阶段接入百度云等云端 OCR 服务，进一步提升识别准确率。

下次将继续实现云端 OCR 接入与前端调用。
