---
name: presentation-editor
description: >-
  给「网页演示 / 动态 PPT」类 HTML 加上可视化编辑模式：点击选中元素、拖拽移动、
  八向手柄缩放、右侧属性面板（文字/样式/位置尺寸/外观/动画/关键帧）、撤销重做、
  双击改字、导出编辑后的 HTML。适用于任何 1920x1080 缩放舞台 + .step/.build 结构的
  演示页面。当用户说"编辑这个演示文稿 / 给 PPT 加编辑功能 / 拖动调整元素位置尺寸 /
  改文字改样式 / 把编辑模式做成可复用能力 / 让其它智能体也能编辑这个 HTML"时使用。
  也适用于给别的智能体分发"可编辑的 HTML 演示"作为交付物。
license: Proprietary — internal use only.
metadata:
  version: "1.1"
---

# Presentation Editor — 网页演示的可视化编辑模式

给一个已经做好的 HTML 演示（1920×1080 舞台缩放 + 分页 `.step`）注入一套**所见即所得
编辑器**：工具栏 + 属性面板 + 拖拽/缩放 + 撤销重做 + 导出。编辑结果写回元素的内联
样式；通过本地预览服务器访问时改动**直接写回源文件**，file:// 直开时退回浏览器本地
快照，不依赖任何远端后端。

本技能把 `assets/` 里三个资产（CSS / 标记 / 脚本）注入目标 HTML 即可，**不需要重写
演示本身的样式或结构**。

## 依赖的 DOM 契约（先检查，再注入）

编辑器假设目标页面具备下列结构。缺任何一项都别硬注入，先补结构或改造：

| 契约 | 作用 |
|------|------|
| `#stage-wrap`，其 `style.transform` 含 `scale(k)` | 舞台缩放容器；编辑器按 `k` 换算鼠标坐标 |
| `#stage` | 舞台根节点，面板坐标以它为基准 |
| `.step`，当前页为 `.step.active` | 分页容器；编辑器**只标记和编辑当前页**内元素 |
| `.edit-clickable` 由编辑器自动加 | 可编辑元素的筛选标记，不需要手写 |
| （可选）`.anim / .anim-fade / .anim-scale / .anim-slide-* / .anim-bounce / .anim-stagger` | 动画预设类；关键帧由演示自身 CSS 提供 |
| （可选）`.build`（含 `data-sub-stages`） | 配合 multi-stage-reveal 技能的分步显示 |

用注入器的前置检查先确认：`node inject-editor.mjs <目标.html> --check`。

## 快速开始

### 方式一：自动注入（推荐）

```bash
# 只检查前置元素
node scripts/inject-editor.mjs "演示.html" --check

# 注入后另存为 演示.edited.html（不碰原文件）
node scripts/inject-editor.mjs "演示.html"

# 就地注入（自动备份 演示.html.bak）
node scripts/inject-editor.mjs "演示.html" --inplace
```

注入器是**幂等**的：检测到 `id="presentation-editor-js"` 或 `window.__editor` 就跳过。
它把 `editor.css` 放到 `</head>` 前，把工具栏/面板标记 + `editor.js` 放到 `</body>` 前。

### 方式二：手工三步

1. `assets/editor.css` 的内容放进 `<style>`；
2. `assets/editor.html` 整段放进 `<body>` 末尾；
3. `assets/editor.js` 包进 `<script>`（放在标记之后），同理置于 `<body>` 末尾。

## 编辑交互

| 操作 | 效果 |
|------|------|
| 单击元素 | 选中（右侧面板显示其属性；四周出现 8 个缩放手柄） |
| 拖动元素 | 移动。**超过 3px 才算拖动**，单纯点击绝不改动元素 |
| 拖四角/四边手柄 | 缩放，改尺寸；对侧边固定不动 |
| 直接在选中元素边缘按下拖动 | 等同拖对应边手柄 |
| 双击元素 | 进入文字编辑（仅无子元素的叶子节点） |
| 方向键 / Shift+方向键 | 每次移动 10px / 1px |
| U / D | 选中父级 / 子级 |
| Ctrl+Z / Ctrl+Y | 撤销 / 重做 |
| E | 进入 / 退出编辑模式 |
| S | 导出编辑后的 HTML |
| Esc | 取消选中 |

属性面板顶部有「▾ 折叠 / ▸ 展开」按钮，折叠状态存 `localStorage`，刷新后保持；
折叠时元素仍可正常选中、拖动、缩放。

## `window.__editor` API（供其它智能体脚本化调用）

所有方法作用于当前 `selected` 元素。在浏览器里用 `playwright.evaluate` 或控制台调用：

| 方法 | 作用 |
|------|------|
| `enter()` / `exit()` / `toggle()` | 开关编辑模式（`exit` 会还原为干净的可播放页面） |
| `setText(v)` | 文字内容（仅叶子元素） |
| `setFontFamily(v)` / `setFontSize(v)` / `setColor(v)` / `setFontWeight(v)` / `setTextAlign(v)` | 文字样式 |
| `setLineHeight(v)` / `setLetterSpacing(v)` | 行高 / 字间距，**语义为像素**（写 `Npx`，不会被当成字号倍数） |
| `setX(v)` / `setY(v)` | 位置，参数是**舞台坐标**（编辑器自动换算与锚定） |
| `setW(v)` / `setH(v)` | 尺寸，参数是**舞台坐标**下的宽高 |
| `setBg(v)` / `setBorder(v)` / `setBorderW(v)` / `setRadius(v)` / `setOpacity(v)` | 外观 |
| `setAnimType(v)` | 动画类型（取值见下表） |
| `setAnimDelay(v)` / `setAnimDuration(v)` | 延迟 / 时长，单位秒 |
| `setKeyframe('from'\|'to', v)` | 自定义关键帧，如 `'opacity:0; translateY(40px)'`；传空串清除 |
| `previewAnim()` | 重播当前元素的动画 |
| `addElement()` / `deleteElement()` | 在选中元素内新增子元素 / 删除选中元素 |
| `resetChanges()` | 把选中元素恢复成选中时的状态 |
| `undo()` / `redo()` | 撤销 / 重做（含关键的几何与关键帧状态） |
| `saveLocal()` | 立即保存（服务器模式下直接写回源文件；通常不必手动调用，已自动防抖保存） |
| `revertLocal()` | 恢复到原稿备份（服务器模式）/ 丢弃本地存档（file:// 模式），会重载页面 |
| `hasLocalSave()` | 是否存在本地存档 |
| `clearLocalSave(silent)` | 清空本地存档；`silent=true` 时同时关闭自动保存（避免被写回） |
| `markDirty()` | 手动标记为「有未保存修改」，触发防抖保存 |
| `export()` | 下载编辑后的 HTML（文件名带日期时间） |

## 持久化：写盘优先，本地快照兜底

**服务器模式（推荐，唯一入口）**：通过本地预览服务器（`http://127.0.0.1` /
`localhost`）访问时，编辑改动**直接写回当前源文件**（防抖 800ms 后把整页 HTML
经 `POST /save` 落盘）。磁盘文件本身就是存档，刷新、换浏览器、双击重开看到的
都是同一份最新内容，不需要也不使用 localStorage 快照。

- **自动保存时机**：撤销栈变化、面板输入（防抖 800ms）、拖拽/缩放结束、页面隐藏或关闭前、编辑模式下每 15 秒兜底。
- **原稿备份**：首次通过服务器打开时自动生成一份 `<文件名>.backup.html`（只生成一次），「还原」按钮从它恢复；想重设基线就删掉备份文件再刷新。
- **工具栏状态**：`自动保存：就绪（改动直接写入文件）/ 有未保存修改 / 已写入文件 HH:MM:SS / 写入失败`。
- **「导出HTML」**：仍然可用，用于产出一份可分发/可录屏的独立副本（不改源文件）。

**file:// 兜底模式**：直接双击打开、没有 `/save` 接口时，退回旧方案——差异快照存
`localStorage`（键 `pres-editor-autosave-v1:<fingerprint>`，只存真正改过的元素），
刷新后自动回放。

**两个注意点**：
1. **同一个文件只用一个打开方式**。localStorage 按源隔离：`http://127.0.0.1:8765`
   与 `file://` 各存一份快照，混着用会出现"同一页两边内容对不上"。服务器模式下
   编辑器不读写快照，正是为了杜绝这种分叉。
2. file:// 模式下清浏览器数据会清掉存档；重要版本请用「导出HTML」落成文件。

动画类型取值：`anim`(渐显上浮) `anim-fade` `anim-scale` `anim-slide-left`
`anim-slide-right` `anim-slide-up` `anim-bounce` `anim-stagger`。

## 实现不变量（必读 —— 每一条都是踩过的坑）

改造或移植这套编辑器时，下列规则必须保持，否则会出现"点一下就跳位""拖动不跟手"
"缩放爆炸"等已在生产中出现过的问题。

1. **点击只选中，绝不修改 DOM。** 绝不能在 `mousedown` 里就把元素改成
   `position:absolute`——脱离 flex/grid 后宽度会塌缩、位置会跳到 0,0，父级还会跟着
   重排。转换定位必须等到**真正拖动（位移超过阈值）**时才发生。

2. **转换定位前先读 `offsetLeft/offsetTop/offsetWidth/offsetHeight`。**
   `offset*` 是布局值，不含 `transform`（不会被入场动画的 translateY 污染），也必须在
   改 `position` **之前**读取——flex 子项一旦脱离文档流，其静态位置就变了。

3. **必须清除 `right` / `bottom`。** `left` 与 `right` 同时存在会互相约束，拖动或改宽
   时宽度会被反向改变（表现为"移动 54px，宽度正好少 54px"）。同时要**冻结当前
   `width`/`height`**，否则 `width:auto` 在脱离布局后会重新收缩/换行。

4. **转换后测量视觉矩形并反向补偿 `left`/`top`。** 元素脱离文档流后，宽度由内容撑开
   的父级可能收缩重排，把子元素带偏。比较转换前后的 `getBoundingClientRect()`，把偏差
   除掉缩放系数后反补回去，才能保证视觉上纹丝不动。

5. **`position:relative` 元素不能用 `offset*` 覆盖 `left/top`。** relative 的
   `left/top` 本身就是偏移量，直接保留原值即可（只清 `right/bottom`）。

6. **区分"位移系数"和"尺寸系数"。**
   - 位移：`left` 变化 Δ → 视觉位移 = Δ × **祖先**缩放之和。元素**自身**的
     `transform:scale()` **不会**放大自己的位移。
   - 尺寸：`width` 变化 Δ → 视觉变化 = Δ × 祖先缩放 × **自身**缩放。
   把所有缩放混成一个系数会让拖动变慢/变快（曾出现 0.4 倍、1.5 倍、10 倍等偏差）。
   祖先缩放也包含舞台的 `scale(k)`。

7. **`transform-origin` 不在左上角时，改尺寸会带动左上角漂移。** 例如
   `.moving-title { transform-origin:center; scale(3.5) }` 改宽度会向两侧扩展。面板改
   宽高时需记录改动前的视觉左上角，改后补偿 `left/top`。

8. **表格内部元素（`tr/td/th/thead/tbody/tfoot/caption`）不支持独立定位与尺寸。**
   写入 `left/top/width` 会破坏表格布局。编辑器对其禁用位置/尺寸输入、不创建手柄，
   并且在置为 absolute 的逻辑里直接跳过。

9. **缩放边缘热区要随元素大小退化。** 热区宽 `EDGE_SIZE=10`；当元素某轴尺寸
   `< EDGE_SIZE*3` 时，该轴禁用边缘缩放，否则整个元素都是热区，小元素永远拖不动。

10. **拖动/缩放期间禁用过渡动画。** 给元素临时加 `.edit-no-transition`（`transition:none
    !important`），否则带 `transition: left/top 0.8s` 的元素会明显滞后于鼠标。松开即
    移除；下次 `mousedown` 时也要清理残留，防止鼠标在窗口外松开导致过渡被永久禁用。

11. **CSS 自定义属性不能承载含分号的值。** `el.style.setProperty('--kf-from',
    'opacity:0; translateY(20px)')` 会被浏览器**静默丢弃**。自定义关键帧不要走 CSS
    变量，要生成真正的 `@keyframes` 规则并设 `animation-name`；规则名按元素
    `data-kf-id` 编号，导出后按已有 id 续号避免冲突。

12. **面板读数与写回要用"舞台坐标 + 计算值兜底"。** 面板显示的 X/Y/W/H 是舞台坐标；
    写回时基准 `left/top` 可能来自 CSS 而非内联样式，必须 `el.style.left` 取不到时回退
    到 `getComputedStyle(el).left`，否则会把面板值当成从 0 起的增量，造成大幅跳位。

13. **手柄光标需要 `!important` 覆盖。** 编辑器有 `body.edit-mode * { cursor: default
    !important }`，手柄的光标规则必须写成 `body.edit-mode .edit-rh[data-dir=...]
    { cursor: ... !important }` 才生效。

14. **导出前要清理编辑态痕迹**：移除 `.edit-selected`、`.edit-clickable`、缩放手柄
    DOM、`edit-mode` 类，并显示被隐藏的工具栏/面板，导出的 HTML 直接可播放。

15. **稳定性兜底**：窗口失焦时重置 `dragging/resizing` 状态；定时器周期性刷新
    `markClickable()` 与手柄位置，适配分页/分步切换。

16. **持久化分两档：写盘优先，快照兜底**。有本地预览服务器（`/save` 接口）时，
    自动保存把整页 HTML 写回源文件，**不要**再读写 localStorage 快照——http 与
    file:// 是隔离的源、各存一份快照，混用必然导致"同一文件两种打开方式内容对不上"。
    file:// 兜底模式才存差异快照，且基线不可重设（恢复存档后重设基线，周期保存会
    因「无差异」把存档清空：第一次刷新能恢复，第二次就丢了）。

17. **路径要锚定分页容器**：元素定位路径以所属 `.step` 的序号为前缀，
    不要用 `document.body` 起点——`.step` 的 `active`/`build` 状态会变化，
    以 body 为起点会让路径漂移、恢复错位。同时不要把 `.step` 自身纳入存档。

18. **「还原」要先关闭自动保存**：置 `autosaveEnabled = false` 并清掉待执行的
    防抖定时器，再 `reload` 或写回备份——否则 `beforeunload` 抢救性保存会把
    内存中的修改重新写回，导致还原失效。写盘模式下这一步尤其致命：写的是磁盘文件。

19. **存档键按 deck 身份隔离**：用「标题 + 页数」的哈希做命名空间，
    避免同一浏览器打开不同演示时互相覆盖。

## 导出与持久化

- 编辑结果全部落在元素的**内联样式**与 `data-*` 上，导出即 `document.documentElement.outerHTML`。
- 自定义关键帧以 `data-custom-from` / `data-custom-to` / `data-kf-id` 形式随 HTML 保存；
  重新打开时 `enter()` 会依据这些属性重建 `@keyframes`，即**自愈**，无需额外文件。
- 折叠状态等 UI 偏好存 `localStorage`，不进入导出产物。

## 与其它技能的配合

- **multi-stage-reveal**：`.build` / `stage-0..N` 的分步显示由它提供；编辑器负责在
  编辑态把 `data-sub-stages` 的所有阶段展开（给 `.build` 加 `.visible`）以便编辑。
- **web-video-presentation**：负责从口播稿生成 outline 与整页演示；本技能是它的
  "后期可视化微调"环节，用来对齐位置、改文案、微调动效。

## 自检清单

- [ ] 目标 HTML 具备 `#stage-wrap`（带 scale）/ `#stage` / `.step` 结构
- [ ] 注入后进入编辑模式，点击元素**不产生任何样式变化**
- [ ] 拖动元素时视觉位移严格等于鼠标位移，元素尺寸不变
- [ ] 拖手柄缩放时对侧边固定，尺寸增减等于鼠标位移
- [ ] 属性面板 X/Y/W/H 原值写回不产生跳动
- [ ] 行高输入 `N` 得到 `Npx`，不是字号倍数
- [ ] 自定义关键帧能重播生效，且导出后重新打开仍生效
- [ ] 表格单元格不可拖动、不破坏表格
- [ ] 撤销/重做能还原位置、尺寸、文字、样式、关键帧
- [ ] 导出 HTML 面板/工具栏/手柄均已清理，页面可直接播放
- [ ] 服务器模式下编辑后源文件已更新，刷新/重开内容一致；序列化期间选中态与手柄不丢失
- [ ] 折叠按钮可用，折叠后仍能选中与拖动元素

## 资产说明

- `assets/editor.css` — 工具栏、属性面板（含折叠态）、缩放手柄、编辑态光标与高亮样式
- `assets/editor.html` — 工具栏 + 属性面板 + 面包屑的标记
- `assets/editor.js` — 编辑器主逻辑（IIFE，暴露 `window.__editor`）
- `scripts/inject-editor.mjs` — 幂等注入器，含前置检查与备份
