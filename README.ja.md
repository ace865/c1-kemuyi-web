<div align="center">

[中文](./README.md) · [日本語](./README.ja.md) · [English](./README.en.md)

![C1 Theory Offline Desktop System](./docs/assets/readme-cover.svg)

中国 C1 学科試験向けのオフライン学習・模擬試験アプリ。

![Windows x64](https://img.shields.io/badge/Windows-x64-0078D4?style=flat-square&logo=windows11&logoColor=white)
![Electron 43](https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white)
![Questions 2194](https://img.shields.io/badge/questions-2%2C194-35D6A4?style=flat-square)
![Offline](https://img.shields.io/badge/runtime-offline-17232D?style=flat-square)

</div>

## システム仕様

| 問題数 | 画像 | 模擬試験 | 合格点 |
|---:|---:|---:|---:|
| 2,194 問 | 787 枚 | 100 問 / 45 分 | 90 点 |

## 機能

| モジュール | 実装 |
|---|---|
| `PRACTICE` | 順番学習、重複なしランダム学習、誤答復習、即時解説 |
| `EXAM` | タイマー、問題一覧、中断再開、時間切れ自動提出 |
| `REVIEW` | 問題別復習、誤答元の記録、直近 20 回の試験履歴 |
| `PROFILE` | 複数ローカルプロファイル；進捗・成績・誤答を分離 |
| `OFFLINE` | 問題と画像を内蔵；実行時の外部通信依存なし |

## 実行

```powershell
npm install
npm start
```

ブラウザで確認：

```powershell
node scripts/serve-local.mjs
# http://127.0.0.1:8080
```

## 検証とビルド

```powershell
npm run check       # オフライン整合性 + 自動テスト
npm run dist:win    # Windows NSIS インストーラー
```

## 構成

```text
index.html
├─ src/data/                    オフライン問題データ
├─ src/assets/question-images/  問題画像
├─ src/js/                      学習、試験、保存、モーション
├─ desktop/                     Electron メインプロセス
├─ scripts/                     ビルドと整合性チェック
└─ tests/                       Node.js テスト
```

> 非公式の学習ソフトウェアです。最新の試験規定と問題は、現地当局の情報を確認してください。
