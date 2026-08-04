![C1 Theory Test Assistant](docs/assets/readme-cover.svg)

<p align="center">
  <strong>
    <a href="README.md">中文</a> ·
    <a href="README.ja.md">日本語</a> ·
    <a href="README.en.md">English</a>
  </strong>
</p>

<p align="center">
  <strong>
    <a href="https://github.com/ace865/c1-kemuyi-web/releases/latest">download</a> ·
    <a href="#getting-started">getting started</a> ·
    <a href="https://github.com/ace865/c1-kemuyi-web/issues">issues</a> ·
    <a href="#how-to-contribute">contribute</a>
  </strong>
</p>

<p align="center">
  <a href="https://github.com/ace865/c1-kemuyi-web/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/ace865/c1-kemuyi-web?style=flat-square&label=release"></a>
  <img alt="Windows x64" src="https://img.shields.io/badge/Windows-x64-0078D4?style=flat-square&logo=windows11&logoColor=white">
  <img alt="Electron 43" src="https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white">
  <img alt="Offline" src="https://img.shields.io/badge/runtime-offline-17232D?style=flat-square">
  <a href="https://github.com/ace865/c1-kemuyi-web/pulls"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-2EA44F?style=flat-square"></a>
</p>

<h1 align="center">Welcome to C1 Theory Test Assistant</h1>

This is an offline Windows study tool for China's C1 theory test. The application bundles 2,194 questions and 787 images; progress, wrong answers, and exam history remain on the device.

The interface is built with HTML, CSS, and JavaScript, with Electron providing the desktop runtime. No account, remote question service, or external API is required.

## Practice, exam, and review in one place

Sequential practice covers the full bank, while non-repeating random sessions and wrong-answer practice target weak areas. Mock exams follow a 100-question, 45-minute, 90-point format and retain the latest 20 results for per-question review.

<p align="center">
  <img src="docs/assets/app-preview.png" alt="C1 Theory Test Assistant interface" width="960">
</p>

## Getting Started

Download the Windows installer from **[Releases](https://github.com/ace865/c1-kemuyi-web/releases/latest)**. Running from source requires [Node.js 22+](https://nodejs.org/):

```powershell
npm install
npm start
```

Browser preview:

```powershell
node scripts/serve-local.mjs
# http://127.0.0.1:8080
```

## How to Contribute

Question corrections, bug fixes, interface improvements, translations, and documentation updates are welcome. Open a Pull Request from a dedicated branch instead of committing directly to `main`, and run this before submission:

```powershell
npm run check
```

If you are not writing code, **[open an Issue](https://github.com/ace865/c1-kemuyi-web/issues/new)** with reproduction steps, your Windows version, and screenshots.

## Building

```powershell
npm run dist:win
```

This generates the icon, verifies offline resources, runs the automated tests, and writes a Windows NSIS installer to `release/`.

## Project Layout

```text
index.html
|-- src/data/                    offline question bank
|-- src/assets/question-images/  local question images
|-- src/js/                      practice, exam, storage, motion
|-- desktop/                     Electron main process
|-- scripts/                     build and integrity checks
`-- tests/                       Node.js tests
```

## Notice

This is unofficial study software. Regulations, questions, and exam rules may change; refer to the latest information published by local authorities.
