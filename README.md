![C1 科目一通关助手](docs/assets/readme-cover.svg)

<p align="center">
  <strong>
    <a href="README.md">中文</a> ·
    <a href="README.ja.md">日本語</a> ·
    <a href="README.en.md">English</a>
  </strong>
</p>

<p align="center">
  <strong>
    <a href="https://github.com/ace865/c1-kemuyi-web/releases/latest">下载</a> ·
    <a href="#快速开始">开始使用</a> ·
    <a href="https://github.com/ace865/c1-kemuyi-web/issues">问题反馈</a> ·
    <a href="#参与开发">参与开发</a>
  </strong>
</p>

<p align="center">
  <a href="https://github.com/ace865/c1-kemuyi-web/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/ace865/c1-kemuyi-web?style=flat-square&label=release"></a>
  <img alt="Windows x64" src="https://img.shields.io/badge/Windows-x64-0078D4?style=flat-square&logo=windows11&logoColor=white">
  <img alt="Electron 43" src="https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white">
  <img alt="Offline" src="https://img.shields.io/badge/runtime-offline-17232D?style=flat-square">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-F2D56B?style=flat-square"></a>
  <a href="https://github.com/ace865/c1-kemuyi-web/pulls"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-2EA44F?style=flat-square"></a>
</p>

<h1 align="center">欢迎使用 C1 科目一通关助手</h1>

这是一个面向 Windows 的 C1 科目一离线学习工具。2,194 道题目与 787 张配图随应用提供，刷题进度、错题和考试记录只保存在本机。

项目使用原生 HTML、CSS 和 JavaScript 构建界面，以 Electron 提供桌面运行环境。没有账号系统，也不依赖远程题库或在线接口。

## 把练习、考试和复盘放在一起

顺序练习负责覆盖完整题库，随机练习保证单轮不重复，错题练习集中处理薄弱项。模拟考试按 100 题、45 分钟、90 分及格执行，并保留最近 20 场考试记录供逐题复盘。

<p align="center">
  <img src="docs/assets/app-preview.png" alt="C1 科目一通关助手界面" width="960">
</p>

## 快速开始

普通用户可从 **[Releases](https://github.com/ace865/c1-kemuyi-web/releases/latest)** 下载 Windows 安装包。源码运行需要 [Node.js 22+](https://nodejs.org/)：

```powershell
npm install
npm start
```

浏览器预览：

```powershell
node scripts/serve-local.mjs
# http://127.0.0.1:8080
```

## 参与开发

欢迎提交题库勘误、缺陷修复、界面改进、翻译和文档更新。请从独立分支发起 Pull Request，不要直接修改 `main`；提交前运行：

```powershell
npm run check
```

发现问题但暂时不方便写代码，也可以直接 **[创建 Issue](https://github.com/ace865/c1-kemuyi-web/issues/new)**，附上复现步骤、系统版本和截图。

## 构建

```powershell
npm run dist:win
```

该命令会生成图标、检查离线资源、运行自动化测试，并在 `release/` 输出 Windows NSIS 安装包。

## 项目结构

```text
index.html
|-- src/data/                    offline question bank
|-- src/assets/question-images/  local question images
|-- src/js/                      practice, exam, storage, motion
|-- desktop/                     Electron main process
|-- scripts/                     build and integrity checks
`-- tests/                       Node.js tests
```

## 说明

本项目是非官方学习工具。法规、题目和考试规则可能调整，请以当地主管部门发布的最新信息为准。

## 开源协议

原创程序代码与原创文档采用 [MIT License](LICENSE)。题库数据和题目图片不自动包含在 MIT 授权范围内，详情见 [NOTICE.md](NOTICE.md)。
