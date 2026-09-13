# html-edit-skill

两个互补的「网页演示 / HTML 编辑」技能，打包在一个仓库：

| 技能 | 作用 |
|------|------|
| [`skills/html-keynote-deck`](skills/html-keynote-deck/) | **自包含演示模板**：单文件 HTML 即完整可播放（1920×1080、20+ 动画原语、分步揭示），内建可视化编辑器 + 本地预览服务器，点「保存」直接写回源文件。 |
| [`skills/presentation-editor`](skills/presentation-editor/) | **注入式编辑器**：把一套所见即所得编辑器注入到**任意** 1920×1080 + `.step/.build` 结构的 HTML 演示里（点击/拖拽/缩放/属性面板/撤销重做/导出）。经本地预览服务器访问时改动**自动写回源文件**；file:// 直开时退回浏览器本地快照。 |

两者关系：`html-keynote-deck` 本身已内建编辑器，开箱即用；`presentation-editor` 是把同样的编辑能力移植到别人的演示上。

## 目录

```
.
├─ README.md
├─ LICENSE
└─ skills/
   ├─ html-keynote-deck/      # 自包含演示模板 + 预览服务器
   │  ├─ SKILL.md
   │  ├─ AGENT.md             # 其它 agent 快速上手
   │  ├─ assets/
   │  │  ├─ presentation.html
   │  │  ├─ preview-server.js
   │  │  └─ 启动预览服务器.bat
   │  └─ docs/screenshot-editor.png
   └─ presentation-editor/    # 注入式编辑器
      ├─ SKILL.md
      ├─ assets/  (editor.css / editor.html / editor.js)
      └─ scripts/ (inject-editor.mjs)
```

## 依赖

- **Node.js ≥ 14**：`html-keynote-deck` 的本地预览服务器与「保存写回」需要；`presentation-editor` 的注入脚本需要。
- **现代浏览器**（Chrome/Edge/Firefox）。
- 两个技能均**零 `npm install`、零构建**。

## 快速开始

**用模板做一份新演示：**
```powershell
cd skills/html-keynote-deck/assets
node preview-server.js     # 浏览器开 http://127.0.0.1:8765/presentation.html
```
按 `→` 翻页，按 `E` 进编辑，工具栏「保存」写回源文件，`S` 导出副本。

**给已有 HTML 注入编辑器：**
```bash
node skills/presentation-editor/scripts/inject-editor.mjs "你的演示.html"
```

各自的完整说明见其目录下的 `SKILL.md`。
