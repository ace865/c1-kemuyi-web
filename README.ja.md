![C1 学科試験クリアアシスタント](docs/assets/readme-cover.svg)

<p align="center">
  <strong>
    <a href="README.md">中文</a> ·
    <a href="README.ja.md">日本語</a> ·
    <a href="README.en.md">English</a>
  </strong>
</p>

<p align="center">
  <strong>
    <a href="https://github.com/ace865/c1-kemuyi-web/releases/latest">ダウンロード</a> ·
    <a href="#クイックスタート">はじめる</a> ·
    <a href="https://github.com/ace865/c1-kemuyi-web/issues">問題を報告</a> ·
    <a href="#開発への参加">開発に参加</a>
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

<h1 align="center">C1 学科試験クリアアシスタントへようこそ</h1>

中国の C1 学科試験に対応した Windows 向けオフライン学習ツールです。2,194 問と 787 枚の画像をアプリに収録し、進捗・誤答・試験履歴は端末内だけに保存します。

画面は HTML、CSS、JavaScript、デスクトップ環境は Electron で構成されています。アカウント登録、オンライン問題データ、外部 API は不要です。

## 学習・模擬試験・復習を一つに

順番学習で全問題を確認し、重複なしのランダム学習と誤答復習で弱点を整理できます。模擬試験は 100 問、45 分、90 点合格で実施し、直近 20 回の結果を問題ごとに復習できます。

<p align="center">
  <img src="docs/assets/app-preview.png" alt="C1 学科試験クリアアシスタントの画面" width="960">
</p>

## クイックスタート

一般ユーザーは **[Releases](https://github.com/ace865/c1-kemuyi-web/releases/latest)** から Windows インストーラーを取得できます。ソースから実行する場合は [Node.js 22+](https://nodejs.org/) が必要です。

```powershell
npm install
npm start
```

ブラウザで確認する場合：

```powershell
node scripts/serve-local.mjs
# http://127.0.0.1:8080
```

## 開発への参加

問題データの訂正、バグ修正、UI 改善、翻訳、文書更新を歓迎します。`main` を直接変更せず、作業ブランチから Pull Request を作成してください。提出前に次を実行します。

```powershell
npm run check
```

コードを書かない場合も、再現手順、OS バージョン、画像を添えて **[Issue を作成](https://github.com/ace865/c1-kemuyi-web/issues/new)** できます。

## ビルド

```powershell
npm run dist:win
```

アイコン生成、オフライン資源の検証、自動テストを実行し、`release/` に Windows NSIS インストーラーを出力します。

## プロジェクト構成

```text
index.html
|-- src/data/                    offline question bank
|-- src/assets/question-images/  local question images
|-- src/js/                      practice, exam, storage, motion
|-- desktop/                     Electron main process
|-- scripts/                     build and integrity checks
`-- tests/                       Node.js tests
```

## 注意

本プロジェクトは非公式の学習ソフトウェアです。法令、問題、試験規則は変更される場合があります。現地当局の最新情報を確認してください。

## ライセンス

独自のプログラムコードと文書は [MIT License](LICENSE) で提供されます。問題データと画像は自動的に MIT License の対象にはなりません。詳細は [NOTICE.md](NOTICE.md) を参照してください。
