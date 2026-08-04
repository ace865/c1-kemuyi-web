<div align="center">

[中文](./README.md) · [日本語](./README.ja.md) · [English](./README.en.md)

![C1 Theory Offline Desktop System](./docs/assets/readme-cover.svg)

Offline practice and mock-exam desktop app for China's C1 theory test.

![Windows x64](https://img.shields.io/badge/Windows-x64-0078D4?style=flat-square&logo=windows11&logoColor=white)
![Electron 43](https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white)
![Questions 2194](https://img.shields.io/badge/questions-2%2C194-35D6A4?style=flat-square)
![Offline](https://img.shields.io/badge/runtime-offline-17232D?style=flat-square)

</div>

## System specification

| Questions | Images | Mock exam | Pass score |
|---:|---:|---:|---:|
| 2,194 | 787 | 100 questions / 45 min | 90 / 100 |

## Capabilities

| Module | Implementation |
|---|---|
| `PRACTICE` | Sequential, non-repeating random, wrong-answer practice, instant explanations |
| `EXAM` | Timer, question navigator, session resume, automatic submission |
| `REVIEW` | Per-question review, error-source tracking, latest 20 exam records |
| `PROFILE` | Multiple local profiles with isolated progress, scores, and wrong answers |
| `OFFLINE` | Bundled question bank and images; no remote runtime dependency |

## Run

```powershell
npm install
npm start
```

Browser preview:

```powershell
node scripts/serve-local.mjs
# http://127.0.0.1:8080
```

## Verify and build

```powershell
npm run check       # offline integrity + automated tests
npm run dist:win    # Windows NSIS installer
```

## Layout

```text
index.html
├─ src/data/                    offline question bank
├─ src/assets/question-images/  question images
├─ src/js/                      practice, exam, storage, motion
├─ desktop/                     Electron main process
├─ scripts/                     build and integrity checks
└─ tests/                       Node.js tests
```

> Unofficial study software. Refer to current rules and question updates published by local authorities.
