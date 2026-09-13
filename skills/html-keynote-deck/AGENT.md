# AGENT.md — html-keynote-deck 快速驾驭手册

> 给后续 agent：这一页是最短路径，读完就能改演示。完整设计哲学见 `SKILL.md`。

## 一句话定位

`assets/presentation.html` 是一个**自包含**的 1920×1080 HTML 演示文稿（内联全部 CSS/JS）。
要做新演示：**复制它，然后只改 body 里的 `.step` 内容，不要动 `<style>` 和 `<script>`。**

## 运行机制（必须理解，否则会改坏）

- 舞台：`#stage-wrap`（固定 1920×1080，JS 按窗口写 `scale(k)` 居中）> `#stage`。
- 分页：每页一个 `<div class="step">`；当前页加 `.active`。**第一页模板已带 `active`，新增页不要加。**
- 构建块：`.step` 内放一个 `<div class="build">`。
  - 无 `data-sub-stages`：整页一次显示。
  - 有 `data-sub-stages="3"`：页内分 3 步，用 `.stage-only-1/2/3` 分区；按 `→` 在页内逐步揭示，再按才翻页。
- 页标题：`.moving-title` 在第 0 步居中放大，之后自动移到左上角（CSS transition，别手写位置）。
- 总步数 = 各页 `data-sub-stages` 之和，进度条自动算，**不要手改** `#step-indicator`。

## 播放 / 编辑快捷键

| 键 | 作用 |
|----|------|
| `→` `空格` `PageDown` | 下一步（含页内分步） |
| `←` `PageUp` | 上一步 |
| `F` | 全屏 |
| `E` | 进/退编辑模式 |
| 编辑中：拖动 / 八向手柄 | 移动 / 缩放；双击叶子元素改字；`Ctrl+Z/Y` 撤销重做 |
| 编辑中：工具栏「保存」 | 把当前 HTML 写回**源文件**（须通过 preview-server.js 打开；不经过服务器打开时此按钮会失败） |
| 编辑中：工具栏「导出HTML」/ `S` | 另存下载一份干净 HTML（不改源文件） |

## 常用任务 Recipe

### 1. 加一页
复制模板里任意 `.step` 块，改文字。结构骨架：
```html
<div class="step">
  <div class="build" data-build="0">
    <div class="v5-stage">
      <div class="chapter-tag">01 / 章节</div>
      <div class="moving-title"><span class="moving-title-inner">页标题</span></div>
      <!-- 内容放这里 -->
      <div class="footer-bar"><span>页脚</span></div>
    </div>
  </div>
</div>
```
要页内分步就把 `.build` 加 `data-sub-stages="N"`，内容拆进 `.stage-only-1..N`。
深色页给 `.step` 加 `dark`（文字自动反白）。

### 2. 改文案
直接改 HTML 文本即可。入场延迟用 `.d1…d9`，强调用 `.zoom-focus`、`.pulse-warn`。

### 3. 改主题
只改 `<style>` 顶部 `:root` 变量：`--indigo-deep / --porcelain / --gold / --warn / --fs-*`。不要改类名。

### 4. 用组件（直接套类，样式已存在）
- 四卡并列：`<div class="grid-4 anim-stagger"><div class="card"><div class="card-title">..</div><div class="card-desc">..</div></div>…`
- 对照/过渡：`.bridge > .bridge-node(.now) + .bridge-arrow + .bridge-node`
- 金句：`.quote-block`（居中）、`.stat-big`（大字）
- 数字：`.metrics > .metric(.warn) > .metric-val + .metric-cap`
- 分层块：`.layer.layer-l1..l4 > .layer-tag + .layer-sub`
- 标签：`.mono-tag.accent`（蓝）/ `.mono-tag.warn`（红）

### 5. 预览 / 保存 / 导出
- 预览：`cd assets && node preview-server.js` → http://127.0.0.1:8765/presentation.html
- **保存**：编辑模式下点工具栏「保存」，当前页面 HTML 由服务器 `POST /save` 写回源文件 `presentation.html`，顶部有成功/失败提示。这是唯一能直接改源文件的途径。
- 导出：按 `S` 或点「导出HTML」下载一份干净副本（不覆盖源文件），适合发给别人。

## 红线（踩过的坑，别再犯）

1. **不要改 CSS 类名**（`.v5-*`、`.step`、`.build`、`.moving-title` 等）——导航与编辑器按这些选择器工作。
2. **不要给新增页加 `.active`**——JS 只认第一页的初始 active。
3. **不要手算/手改进度数字**，它是脚本统计的。
4. **不要依赖 `file://` 外的本地资源**：保持单文件自包含；图标/字体 CDN 失败要能静默降级。
5. 编辑态导出后若要再编辑，重新打开导出的 html 按 `E` 即可（状态自愈）。
