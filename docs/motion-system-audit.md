# 动画系统影响审查

本清单记录 2026-08-05 动画稳定性优化后的控制关系。应用内“减少动画”和系统 `prefers-reduced-motion` 汇总为同一动态状态；两者任一开启，均停止运动并保留颜色、边框、图标、文字及紧急状态。

| 动画 | 触发与元素 | 属性 / 实现 | 时长与缓动 | 循环 | 减少动画 | 冲突审查 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 启动 Logo | 首次加载 `.splash-logo` | opacity、scale / CSS | 240ms ease-out | 否 | 立即终态 | 单一 CSS 控制 | 保留并收敛 |
| 启动退出 | 题库加载完成 `loading-view` | opacity / CSS | 180ms ease-out | 否 | 跳过且无等待 | JS 等待与 CSS 一致 | 保留并收敛 |
| 加载指示器 | 数据加载 `.loader` | rotate / CSS | 850ms linear | 是，仅加载页 | 停止 | 无业务状态依赖 | 保留 |
| 页面转场 | 导航到新视图 | opacity、translateX/Y / CSS class | 280ms ease-out-expo，16px | 否 | 立即切换 | 代次令牌清除旧类；仅一套 enter | 保留并统一 |
| 首页标题 | 首次首页标题字符 | opacity、translateY / CSS | 240ms ease-out，20ms 间隔 | 否 | 直接文字 | 无 blur | 收敛 |
| 数字计数 | 首页统计、考试分数 | textContent / RAF | 600ms ease-out-expo | 否 | 立即终值 | 隐藏页、系统变化时立即终值 | 保留并收敛 |
| 卡片交错 | 档案、模式、统计和功能卡片 | opacity、transform / WAAPI | 240ms ease-out，35–70ms 间隔 | 否 | 不创建动画 | 隐藏祖先跳过；取消后无内联样式 | 保留并收敛 |
| 选项选中 | 多选选择 `.is-selected` | transform / CSS | 400ms spring | 否 | 停止，选中颜色保留 | CSS 单一控制 | 保留 |
| 答对反馈 | `.is-correct` | color、border、scale / CSS | 260ms，最大 1.02 | 否 | 仅颜色、边框、文字 | 已移除 JS `pulse()` 调用 | 保留并收敛 |
| 答错反馈 | `.is-wrong` | color、border、translateX / CSS | 320ms ease-out，最大 ±4px | 否 | 仅颜色、边框、文字 | 已移除 JS `shake()` 调用 | 保留并收敛 |
| 答案面板 / 下一题 | 答题后显示 | opacity、translateY / CSS | 180ms ease-out | 否 | 立即显示 | 不阻塞点击 | 保留并收敛 |
| Toast 进入 / 退出 | `showToast()` | opacity、translateY / WAAPI | 200ms / 140ms | 否 | 立即显示 / 隐藏 | generation + cancel 隔离旧回调；CSS transition 关闭 | 保留并修复 |
| 帮助折叠 | `<details>` 点击、Enter、Space | height、opacity、translateY / WAAPI | 240ms / 180ms | 否 | 浏览器原生即时切换 | 点击被稳定拦截；finish/cancel 均清理 | 保留并修复 |
| 紧急计时 | 剩余时间进入紧急状态 | color、background、scale / CSS | 1s | 是，仅紧急期 | 停止 scale，颜色与文字保留 | 状态不依赖动画 | 保留 |
| 背景光斑 | 应用可见且允许运动 | transform / CSS，单节点 | 28s ease-in-out | 是 | 根本不创建 DOM | 从 5 个降至 1 个，移除大面积 blur/will-change | 收敛 |
| 普通答题粒子 | 普通正确答案 | 原 WAAPI 临时节点 | — | 否 | 不创建 | 调用已停用 | 停用 |
| 考试通过彩纸 | 通过模考 | transform、opacity / WAAPI，18 节点 | 1.5–2.5s，延迟 ≤300ms | 否 | 不创建 | 重入、隐藏、偏好变化均先取消并删除 | 保留并收敛 |
| 渐变文字 / Hero 旋转 / Hero 呼吸 / 胶片颗粒 | 装饰层 | 原 CSS 无限动画 | — | 原为循环 | 停止 | 无必要反馈价值 | 停用 |

## 兼容入口与后续债务

`motion.js` 仍保留未被主应用调用的 `spring()`、`animate()`、`transitionView()`、`shake()` 与 `pulse()` 导出，避免在本次受保护能力优化中破坏潜在兼容入口。主应用不再调用第二套页面转场或 JavaScript 答题 `transform`。对应死代码和未绑定 CSS 规则可在获得明确删除审批后单独清理。

## 验证范围

- 自动检查：题库、资源、加载失败、存储迁移、双科目隔离、考试、多选判分、页面结构、动画专项、桌面安全和仓库保护。
- Electron：`app:` 本地协议真实启动；1440×900 与 390×844 无横向溢出。
- 交互：系统偏好运行中切换、连续 Toast、快速导航、帮助连续点击、隐藏页清理和背景节点创建。
- 未改变：题库、图片、判分、科目隔离、用户数据结构、Electron 协议、安全限制和打包清单。
