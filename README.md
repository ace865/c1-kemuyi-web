# 🚗 C1 手动挡科目一通关助手

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-43.0.0-blue)](https://www.electronjs.org/)

原生 HTML、CSS、JavaScript 编写的 C1 驾照科目一刷题与模拟考试工具。同时支持**浏览器版**和**完全离线的 Windows 桌面 App**。

> 离线题库包含 2,194 道单选/判断题，787 张图片均打包进应用。学习档案和成绩仅保存在本地，不上传云端。

## ✨ 功能

- 📝 **顺序刷题** — 按章节逐题练习，实时查看对错
- 🎯 **随机练习** — 随机抽题，打乱选项顺序
- 📊 **模拟考试** — 45 分钟倒计时，100 题，90 分及格
- 📈 **学习档案** — 记录做题进度、正确率、错题本
- 🖥️ **浏览器版** — 无需安装，打开即用
- 💻 **桌面 App** — Electron 打包，完全离线，无需 Node 或网络
- 🌐 **离线题库** — 图片和题目全部本地化

## 📸 截图

<!-- TODO: 上传截图后替换下面的占位链接 -->
<!-- ![刷题界面](screenshots/practice.png) -->
<!-- ![模拟考试](screenshots/exam.png) -->

## 📦 直接安装（Windows）

从 [Releases 页面](../../releases) 下载 `C1-Kemuyi-Setup-*.exe`，双击按向导安装。

> ⚠️ 安装包暂未购买代码签名证书。如果 Windows SmartScreen 显示"Windows 已保护你的电脑"，点击 **"更多信息"** → **"仍要运行"**。可用同目录的 `SHA256SUMS.txt` 校验文件完整性。

## 🔧 开发

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- Windows x64（打包需要）

### 安装依赖

```powershell
npm install
```

### 启动浏览器版

```powershell
npm run dev
```

浏览器打开 `http://localhost:3000` 即可使用。

### 启动桌面开发版

```powershell
npm run desktop:dev
```

### 生成 Windows 安装包

```powershell
npm run dist:win
```

该命令会依次：生成图标 → 下载离线图片 → 运行测试 → 构建 NSIS 安装程序 → 生成安装说明和 SHA-256 校验值。

安装包输出在 `release/` 目录。

## 🧪 测试

```powershell
npm test
npm run offline:check
```

## 📁 项目结构

```
c1-kemuyi-web/
├── index.html              # 主页面
├── server.mjs              # 开发服务器
├── package.json            # 项目配置 & 打包配置
├── src/
│   ├── css/                # 样式
│   ├── js/                 # 核心逻辑
│   ├── data/               # 题库（原始 + 离线）
│   └── assets/             # 离线图片资源
├── desktop/
│   └── main.cjs            # Electron 主进程
├── scripts/                # 构建脚本
├── tests/                  # 测试
└── release/                # 构建产物（不上传 Git）
```

## 🛠 技术栈

| 技术 | 用途 |
|------|------|
| HTML / CSS / JavaScript | 前端界面与交互逻辑 |
| [Electron](https://www.electronjs.org/) | 桌面 App 运行时 |
| [electron-builder](https://www.electron.build/) | NSIS 安装包打包 |
| Node.js | 开发服务器 & 构建脚本 |

## 📄 许可证

[MIT](LICENSE) © 2026

---

⭐ 如果这个项目帮到了你，欢迎点个 Star！
