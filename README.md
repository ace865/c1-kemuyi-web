<div align="center">

# C1 科目一通关助手

**C1 Theory Test · Offline Practice System**  
**C1 学科試験 · オフライン学習システム**

`HTML` · `CSS` · `JavaScript` · `Electron` · `Windows x64`

</div>

---

| 中文 | English | 日本語 |
|---|---|---|
| C1 科目一离线刷题与模拟考试工具。 | Offline C1 theory practice and mock-exam tool. | C1 学科試験向けのオフライン学習・模擬試験ツール。 |
| 无需账号；题库、图片和学习数据均保存在本机。 | No account required. Questions, images, and progress stay on-device. | アカウント不要。問題・画像・学習記録は端末内に保存されます。 |

## Specification · 规格 · 仕様

| Item | Value |
|---|---:|
| Question bank / 题库 / 問題数 | 2,194 |
| Local images / 离线图片 / ローカル画像 | 787 |
| Mock exam / 模拟考试 / 模擬試験 | 100 questions |
| Time limit / 限时 / 制限時間 | 45 min |
| Pass score / 合格线 / 合格点 | 90 / 100 |
| Storage / 数据存储 / データ保存 | Local only |

## Modules · 模块 · モジュール

| Module | 中文 | English | 日本語 |
|---|---|---|---|
| Practice | 顺序、随机、错题练习 | Sequential, random, wrong-answer practice | 順番・ランダム・誤答復習 |
| Exam | 计时、答题卡、自动交卷 | Timer, navigator, automatic submission | タイマー・問題一覧・自動提出 |
| Review | 成绩、逐题解析、考试历史 | Score, per-question review, exam history | 採点・問題別復習・試験履歴 |
| Profiles | 多档案、本地隔离 | Multiple isolated local profiles | 複数ローカルプロファイル |
| Offline | 本地题库与图片，无远程依赖 | Local dataset and images; no remote runtime dependency | 問題・画像を内蔵、外部通信に依存しない |

## Run · 运行 · 実行

Requirements / 环境要求 / 必要環境: **Node.js 22+**

```powershell
npm install
npm start
```

Browser preview / 浏览器预览 / ブラウザ確認:

```powershell
node scripts/serve-local.mjs
# http://127.0.0.1:8080
```

## Verify · 验证 · 検証

```powershell
npm run check
```

```text
offline:check  dataset count · image mapping · remote URL detection
tests          storage · exam · lifecycle · DOM contract · desktop security
```

## Build · 构建 · ビルド

```powershell
npm run dist:win
```

Output / 输出 / 出力: `release/C1-Kemuyi-Setup-*.exe`

## Layout · 结构 · 構成

```text
index.html
├─ src/
│  ├─ data/                    offline question bank
│  ├─ assets/question-images/  local image set
│  ├─ js/                      practice, exam, storage, motion
│  └─ css/                     responsive UI
├─ desktop/                    Electron main process
├─ scripts/                    build and integrity checks
└─ tests/                      Node.js test suite
```

---

<sub>
中文：非官方学习工具，请以当地最新考试规定为准。<br>
English: Unofficial study software. Refer to current local exam regulations.<br>
日本語：非公式の学習ソフトウェアです。最新の試験規定を確認してください。
</sub>
