---
name: html-keynote-deck
description: >-
  一套自包含的「网页演示 / 动态 HTML Keynote」模板：单个 HTML 文件即完整可播放，
  内置 1920×1080 自适应舞台、20+ 入场/强调/数据/对比动画原语、分步揭示（multi-stage reveal）、
  以及一个内建的所见即所得编辑器（点击选中、拖动、八向手柄缩放、属性面板、双击改字、撤销重做、
  S 键导出 HTML）。配套一个仅监听本机的 Node 静态预览服务器和双击启动 .bat。
  当用户要做「网页版 PPT / HTML 演示 / 动态幻灯片 / 录课用演示 / 1920×1080 动画演示文稿」，
  或需要把一套演示做成可交付、可二次编辑的 HTML 模板时使用。
  与 presentation-editor 技能配套：本模板已内建其编辑器，无需再注入。
license: Proprietary — internal use only.
metadata:
  version: "6.0"
---

# HTML Keynote Deck — 自包含网页演示文稿模板

把 `assets/presentation.html` 当作起点：它是一个**单文件**演示文稿，内联了全部 CSS
与 JS，不依赖构建工具；打开即播放，按 `E` 进入可视化编辑，按 `S` 导出编辑后的 HTML。

模板已清理掉任何具体主题、讲师姓名、日期、竞赛/课程编号与业务文案，只保留
封面 / 内容页 / 结语 三页**结构示例**，示范各组件类与分步写法。

## 文件清单（均在 `assets/` 下）

| 文件 | 作用 |
|------|------|
| `presentation.html` | 模板本体：1920×1080 舞台 + 设计令牌 + 20+ 动画原语 + 导航 + 内建编辑器。**复制它来做新演示** |
| `preview-server.js` | 仅监听 `127.0.0.1:8765` 的静态服务器，带防目录穿越；默认打开 `/presentation.html` |
| `启动预览服务器.bat` | Windows 双击启动：切 UTF-8 代码页、开浏览器、起 node 服务器 |

## 快速开始

```powershell
# 方式一：Windows 双击
assets\启动预览服务器.bat

# 方式二：命令行
cd assets
node preview-server.js
# 浏览器打开 http://127.0.0.1:8765/presentation.html
```

> 也可以直接双击 `presentation.html` 用 `file://` 打开，二者**渲染**一致；但
> **编辑写盘**只有通过本地服务器才可用（`POST /save`）。建议固定用 bat/服务器
> 这一个入口——同一文件混用两种打开方式是内容对不上的常见根源。

## 播放与编辑操作

| 按键 | 效果 |
|------|------|
| `→` / `空格` / `PageDown` | 下一步（含 build 的子分步；翻到页末再翻页） |
| `←` / `PageUp` | 上一步 |
| `F` | 全屏 |
| `E` | 进入 / 退出**编辑模式** |
| 编辑态：单击元素 | 选中；右侧属性面板显示文字/样式/位置/动画 |
| 编辑态：拖动 / 八向手柄 | 移动 / 缩放（超过 3px 才算拖动，单击绝不改 DOM） |
| 编辑态：双击叶子元素 | 直接改文字 |
| 编辑态：`Ctrl+Z` / `Ctrl+Y` | 撤销 / 重做 |
| 编辑态：`S` | 导出干净的可播放 HTML（自动清理编辑态痕迹） |
| 编辑态：`Esc` | 取消选中 |

## 基于模板做新演示

DOM 契约（导航与编辑器都依赖，新增页面时保持）：

```
#stage-wrap            舞台缩放容器（JS 按窗口尺寸写 scale）
  #stage               舞台根
    .step              一页；当前页加 .active（第一页模板已带 active）
      .build           一个「构建块」；data-build 序号；可选 data-sub-stages="N"
        .v5-stage      页面内边距容器
          .moving-title            会从居中放大移到左上角的页标题
          .stage-only-1/2/3        仅在第 N 个子分步显示（display:none→block 重放动画）
```

**新增一页**：复制模板里任意一个 `.step` 块，改 `.step` 内容即可；页数与总步数由
JS 自动统计（`document.querySelectorAll('.step')` 与 `data-sub-stages`），无需手工改
进度条。

**常用组件类**（样式都在模板 `<style>` 内，可直接复用）：

- 封面：`.cover-wrap` / `.cover-kicker` / `.cover-title` / `.cover-sub` / `.cover-line`
- 文字层级：`.chapter-tag`、`.v5-title`、`.v5-text`、`.v5-note`、`.v5-top`、`.mono-tag(.accent/.warn)`
- 布局：`.grid-4` + `.card`（`.card-title`/`.card-desc`）、`.bridge`（`.bridge-node(.now)`/`.bridge-arrow`）、`.quote-block`、`.metrics`（`.metric(.warn)`/`.metric-val`/`.metric-cap`）
- 分层：`.layer` + `.layer-l1..l4`、`.layer-tag`、`.layer-sub`
- 大字金句：`.stat-big`、`.type-reveal`
- 底栏：`.footer-bar`

**动画工具类**（加在元素上，页面 visible 时自动播放）：`.anim`/`.anim-fade`、
`.anim-scale`、`.anim-slide-left/right/up`、`.anim-bounce`、`.anim-stagger`；
延迟用 `.d1…d9`，聚焦用 `.zoom-focus`、`.pulse-warn`。全部关键帧见 `<style>` 中
「5. 扩展动画库」一节，可按需新增 `@keyframes`。

**设计令牌**在 `:root`：主色（porcelain / indigo-deep / gold / warn / ok）、
思源/Noto 字体族、6 档字号（`--fs-hero` 120px … `--fs-tag` 23px，按 1920×1080 设计稿）。
改主题只需改 `:root` 变量。

## 已清理内容（移植/再分发前无需再做）

- 标题与封面：去掉讲师姓名、汇报日期、竞赛/课程编号、难度系数，改为占位文案
- 原 12 页业务正文（某门内训课程的案例、框架、清单）整段替换为 3 页结构示例
- JS 中课程相关的 localStorage key、导出文件名已去课程化
- 类名 `.v5-*`、版本注释 `v6.0` 等为技术标识，予以保留（改名会破坏全文件样式选择器）

## 与其它技能的配合

- **presentation-editor**：本模板已内建其编辑器（等同已注入）；若要把这套编辑器
  移植到**别的** `.step/.build` 结构演示上，用该技能的 `inject-editor.mjs`。
- 导出（`S`）后得到的 HTML 可直接录屏/配音，或交给 `web-video-presentation` 类流程做后期。
