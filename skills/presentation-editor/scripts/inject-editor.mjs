#!/usr/bin/env node
// 把「可视化编辑模式」注入到任意兼容的网页演示 HTML。
//
// 用法:
//   node inject-editor.mjs <目标.html>                 # 输出 <目标>.edited.html
//   node inject-editor.mjs <目标.html> --inplace       # 直接改写目标文件（会先备份 .bak）
//   node inject-editor.mjs <目标.html> --out <路径>    # 指定输出路径
//   node inject-editor.mjs <目标.html> --check         # 只做前置检查，不写文件
//
// 幂等：已注入过（存在 id="presentation-editor-js"）则跳过。
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', 'assets');

const CSS_MARK = 'id="presentation-editor-css"';
const JS_MARK = 'id="presentation-editor-js"';

// 编辑器依赖的 DOM 契约：缺少这些说明该 HTML 不是兼容的演示结构
const REQUIRED = [
  { sel: '#stage-wrap', why: '舞台缩放容器（编辑器按它的 transform scale 换算坐标）' },
  { sel: '#stage', why: '舞台根节点（坐标基准）' },
  { sel: '.step', why: '页面/幻灯片容器（编辑器只作用于 .step.active）' },
];

function parseArgs(argv) {
  const args = { target: null, out: null, inplace: false, check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inplace') args.inplace = true;
    else if (a === '--check') args.check = true;
    else if (a === '--out') args.out = argv[++i];
    else if (!args.target) args.target = a;
  }
  return args;
}

function fail(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.target) fail('缺少目标文件。用法: node inject-editor.mjs <目标.html> [--inplace|--out <路径>|--check]');

const targetPath = resolve(args.target);
if (!existsSync(targetPath)) fail('文件不存在: ' + targetPath);

let html = readFileSync(targetPath, 'utf8');

// --- 前置检查 ---
const missingReal = REQUIRED.filter((r) => {
  const name = r.sel.slice(1);
  return r.sel[0] === '#'
    ? html.indexOf('id="' + name + '"') === -1
    : html.indexOf(name) === -1;
});
if (missingReal.length) {
  console.warn('⚠ 前置检查未通过，注入后编辑器可能无法工作：');
  for (const m of missingReal) console.warn('  缺少 ' + m.sel + ' — ' + m.why);
}
if (html.indexOf('</body>') === -1) fail('目标 HTML 中没有 </body>，无法注入。');

if (args.check) {
  console.log('检查完成：' + (missingReal.length ? '缺少 ' + missingReal.length + ' 项前置元素' : '前置元素齐全'));
  process.exit(missingReal.length ? 1 : 0);
}

// --- 幂等判断 ---
if (html.indexOf(JS_MARK) !== -1 || html.indexOf('window.__editor') !== -1) {
  console.log('已包含编辑模式（检测到 ' + JS_MARK + '），跳过注入。');
  process.exit(0);
}

function readAsset(name) {
  const p = join(ASSETS, name);
  if (!existsSync(p)) fail('缺少资产文件: ' + p);
  return readFileSync(p, 'utf8');
}

const css = readAsset('editor.css');
const markup = readAsset('editor.html');
const js = readAsset('editor.js');

const cssBlock = '<style ' + CSS_MARK + '>\n' + css + '\n</style>\n';
const jsBlock = '\n<script ' + JS_MARK + '>\n' + js + '\n</script>\n';
const markupBlock = '\n<!-- presentation-editor: 工具栏 + 属性面板 + 面包屑 -->\n' + markup + '\n';

// CSS 放在 </head> 前；无 head 则放 <body> 前
if (html.indexOf('</head>') !== -1) {
  html = html.replace('</head>', cssBlock + '</head>');
} else {
  html = html.replace('<body', cssBlock + '<body');
}

// 标记 + 脚本放在 </body> 前
html = html.replace('</body>', markupBlock + jsBlock + '\n</body>');

let outPath;
if (args.inplace) {
  const bak = targetPath + '.bak';
  copyFileSync(targetPath, bak);
  outPath = targetPath;
  writeFileSync(outPath, html, 'utf8');
  console.log('✓ 已就地注入: ' + outPath);
  console.log('  原文件备份: ' + bak);
} else {
  outPath = args.out ? resolve(args.out) : targetPath.replace(/\.html?$/i, '') + '.edited.html';
  writeFileSync(outPath, html, 'utf8');
  console.log('✓ 已注入: ' + outPath);
}

console.log('  进入编辑模式：页面右上角工具栏 / 快捷键 E；导出：S 或点「导出HTML」。');
if (missingReal.length) process.exitCode = 0;
