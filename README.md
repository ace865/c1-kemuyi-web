<div align="center">

[中文](./README.md) · [日本語](./README.ja.md) · [English](./README.en.md)

![C1 Theory Offline Desktop System](./docs/assets/readme-cover.svg)

离线运行的 C1 科目一刷题与模拟考试桌面应用。

![Windows x64](https://img.shields.io/badge/Windows-x64-0078D4?style=flat-square&logo=windows11&logoColor=white)
![Electron 43](https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white)
![Questions 2194](https://img.shields.io/badge/questions-2%2C194-35D6A4?style=flat-square)
![Offline](https://img.shields.io/badge/runtime-offline-17232D?style=flat-square)

</div>

## 系统规格

| 数据集 | 图片资源 | 模拟考试 | 合格线 |
|---:|---:|---:|---:|
| 2,194 题 | 787 张 | 100 题 / 45 分钟 | 90 分 |

## 功能

| 模块 | 实现 |
|---|---|
| `PRACTICE` | 顺序练习、无重复随机练习、错题练习、即时解析 |
| `EXAM` | 计时、答题卡、断点恢复、到时自动交卷 |
| `REVIEW` | 逐题复盘、错题来源、最近 20 场考试记录 |
| `PROFILE` | 多本地档案；进度、成绩和错题相互隔离 |
| `OFFLINE` | 题库与图片全部本地化；运行时无远程依赖 |

## 运行

```powershell
npm install
npm start
```

浏览器预览：

```powershell
node scripts/serve-local.mjs
# http://127.0.0.1:8080
```

## 验证与构建

```powershell
npm run check       # 离线完整性 + 自动化测试
npm run dist:win    # 输出 Windows NSIS 安装包
```

## 结构

```text
index.html
├─ src/data/                    离线题库
├─ src/assets/question-images/  题目图片
├─ src/js/                      练习、考试、存储、动效
├─ desktop/                     Electron 主进程
├─ scripts/                     构建与完整性检查
└─ tests/                       Node.js 测试
```

> 非官方学习工具。考试规则与题目更新以当地主管部门发布的信息为准。
