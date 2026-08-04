# 参与开发

感谢参与 C1 驾考通关助手。所有改动都应以“小范围、可验证、可回退”为原则。

## 开始之前

1. 阅读 `AGENTS.md`、`CLAUDE.md` 和 `MAINTENANCE.md`。
2. 安装 Node.js 22 或更高版本。
3. 从最新 `main` 创建独立分支，不要直接向 `main` 提交。
4. 运行一次基线检查：

```powershell
npm install
npm run check
```

## 分支与提交

分支名称使用下列格式：

```text
feat/subject-feature
fix/question-loading
docs/readme-update
test/storage-migration
chore/dependency-update
```

提交信息使用简短的 Conventional Commits 风格：

```text
feat: add focused practice category
fix: abort stalled question requests
docs: update maintenance guide
test: cover subject storage isolation
```

一次提交只处理一个主题。不要把题库更新、界面重写、依赖升级和文档调整混在同一个提交中。

## 修改流程

1. 先定位问题并记录当前行为。
2. 对迁移任务先列出新增、修改、缺失和删除文件，不得整体复制其他仓库。
3. 采用最小增量修改，保留已有动画、数据、桌面构建、安全限制和用户存储。
4. Bug 修复必须增加回归测试。
5. 新数据或资源必须同步更新加载器、打包清单、MIME、完整性检查和文档。
6. 修改存储结构必须提供旧数据迁移测试。

## 提交 PR 前

```powershell
npm run check
git diff --check
git diff --stat
git diff --name-status --diff-filter=D
```

还需要完成：

- 桌面和手机尺寸浏览器验证；
- 涉及 Electron 时验证桌面启动与本地资源；
- 涉及 Android 时进行真机验证，无法验证必须在 PR 中说明；
- 中、日、英 README 同步更新；
- 检查题库数量和全部图片引用。

## 需要维护者批准的变更

- 删除或重命名文件：`approved-file-deletion`
- 核心 UI 文件大范围重写：`approved-large-rewrite`
- 题库或题目图片变更：`approved-question-bank-update`

PR 必须逐项说明原因和影响。没有对应标签时，自动检查会阻止合并。

## 审查与合并

- 先创建 Draft PR，完成验证后再标记为 Ready for review。
- 编写者不得把“测试通过”代替人工审查。
- 所有审查意见解决后再合并。
- 默认使用 merge commit 保留协作历史；维护者可按实际情况选择 squash。
- 不要由 AI 自动删除远端分支，除非维护者明确要求。
