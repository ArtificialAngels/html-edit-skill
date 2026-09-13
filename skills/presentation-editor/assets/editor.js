(function() {
  var bar = document.getElementById('editor-bar');
  var panel = document.getElementById('prop-panel');
  var panelBody = document.getElementById('pp-body');
  var panelToggle = document.getElementById('pp-toggle');
  var breadcrumb = document.getElementById('edit-breadcrumb');
  var selectedTag = document.getElementById('eb-selected-tag');
  var editMode = false;
  var selected = null;
  var snapshot = null;
  var originalSnapshot = null;
  var undoStack = [];
  var redoStack = [];
  var MAX_HISTORY = 50;
  var dragging = false;
  var dragPending = false;
  var dragEl = null;
  var dragStartX = 0, dragStartY = 0;
  var dragOrigLeft = 0, dragOrigTop = 0;
  var dragStartState = null;
  var dragFactors = { x: 1, y: 1 };

  var ANIM_KEYFRAMES = {
    'anim': { from: 'opacity:0; translateY(20px)', to: 'opacity:1; translateY(0)' },
    'anim-fade': { from: 'opacity:0', to: 'opacity:1' },
    'anim-scale': { from: 'opacity:0; scale(0.88)', to: 'opacity:1; scale(1)' },
    'anim-slide-left': { from: 'opacity:0; translateX(-32px)', to: 'opacity:1; translateX(0)' },
    'anim-slide-right': { from: 'opacity:0; translateX(32px)', to: 'opacity:1; translateX(0)' },
    'anim-slide-up': { from: 'opacity:0; translateY(60px)', to: 'opacity:1; translateY(0)' },
    'anim-bounce': { from: 'opacity:0; scale(0.3)', to: 'opacity:1; scale(1)' },
    'anim-stagger': { from: 'opacity:0; translateY(16px)', to: 'opacity:1; translateY(0)' }
  };

  function getStageScale() {
    var wrap = document.getElementById('stage-wrap');
    if (!wrap) return 1;
    var t = wrap.style.transform;
    var m = t.match(/scale\(([\d.]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }

  function markClickable() {
    var old = document.querySelectorAll('.edit-clickable');
    for (var i = 0; i < old.length; i++) old[i].classList.remove('edit-clickable');
    var step = document.querySelector('.step.active');
    if (!step) return;
    var els = step.querySelectorAll('div, p, span, h1, h2, h3, h4, li, td, th, a, button, img, form, table, thead, tbody, tfoot, tr, ul, ol, label, section');
    for (var j = 0; j < els.length; j++) {
      var el = els[j];
      if (el.closest('#editor-bar') || el.closest('#prop-panel') || el.closest('#edit-breadcrumb')) continue;
      var cs = getComputedStyle(el);
      var hasContent = el.textContent.trim() || el.children.length > 0;
      var hasStyle = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.borderWidth !== '0px';
      if (hasContent || hasStyle) el.classList.add('edit-clickable');
    }
  }

  function takeSnapshot(el) {
    var cs = getComputedStyle(el);
    var animClass = '';
    var animClasses = ['anim','anim-fade','anim-scale','anim-slide-left','anim-slide-right','anim-slide-up','anim-bounce','anim-stagger'];
    for (var i = 0; i < animClasses.length; i++) {
      if (el.classList.contains(animClasses[i])) { animClass = animClasses[i]; break; }
    }
    return {
      text: el.children.length === 0 ? el.textContent : '',
      fontSize: cs.fontSize,
      color: cs.color,
      fontWeight: cs.fontWeight,
      left: el.style.left || '',
      top: el.style.top || '',
      right: el.style.right || '',
      bottom: el.style.bottom || '',
      position: el.style.position || '',
      display: el.style.display || '',
      marginLeft: el.style.marginLeft || '',
      marginTop: el.style.marginTop || '',
      width: el.style.width || '',
      height: el.style.height || '',
      backgroundColor: el.style.backgroundColor || '',
      borderColor: el.style.borderColor || '',
      borderWidth: el.style.borderWidth || '',
      borderRadius: el.style.borderRadius || '',
      opacity: el.style.opacity || '',
      fontFamily: el.style.fontFamily || '',
      textAlign: el.style.textAlign || '',
      lineHeight: el.style.lineHeight || '',
      letterSpacing: el.style.letterSpacing || '',
      animClass: animClass,
      animDelay: el.style.getPropertyValue('--delay') || '',
      animDuration: el.style.animationDuration || '',
      kfFrom: el.dataset.customFrom || '',
      kfTo: el.dataset.customTo || ''
    };
  }

  function fillPanel(el) {
    var cs = getComputedStyle(el);
    document.getElementById('pp-text').value = el.children.length === 0 ? el.textContent : '';
    document.getElementById('pp-fontsize').value = parseInt(cs.fontSize);
    document.getElementById('pp-color').value = cs.color;
    document.getElementById('pp-weight').value = cs.fontWeight;
    var rect = el.getBoundingClientRect();
    var stage = document.getElementById('stage');
    if (stage) {
      var sr = stage.getBoundingClientRect();
      var scale = getStageScale();
      document.getElementById('pp-x').value = Math.round((rect.left - sr.left) / scale);
      document.getElementById('pp-y').value = Math.round((rect.top - sr.top) / scale);
    }
    document.getElementById('pp-w').value = Math.round(rect.width / getStageScale());
    document.getElementById('pp-h').value = Math.round(rect.height / getStageScale());
    document.getElementById('pp-bg').value = cs.backgroundColor;
    document.getElementById('pp-border').value = cs.borderColor;
    document.getElementById('pp-borderw').value = parseInt(cs.borderWidth);
    document.getElementById('pp-radius').value = parseInt(cs.borderRadius);
    document.getElementById('pp-opacity').value = cs.opacity;
    // 动画
    var animClass = '';
    var animClasses = ['anim','anim-fade','anim-scale','anim-slide-left','anim-slide-right','anim-slide-up','anim-bounce','anim-stagger'];
    for (var i = 0; i < animClasses.length; i++) {
      if (el.classList.contains(animClasses[i])) { animClass = animClasses[i]; break; }
    }
    document.getElementById('pp-anim-type').value = animClass;
    document.getElementById('pp-anim-delay').value = parseFloat(el.style.getPropertyValue('--delay')) || 0;
    document.getElementById('pp-anim-duration').value = parseFloat(cs.animationDuration) || 0.55;
    updateKeyframeDisplay(animClass);
    // 填充新控件
    var ff = document.getElementById('pp-fontfamily');
    if (ff) ff.value = cs.fontFamily.includes('serif') ? 'Noto Serif SC, serif' : (cs.fontFamily.includes('mono') ? 'Noto Sans Mono, monospace' : (cs.fontFamily.includes('sans') ? 'Noto Sans SC, sans-serif' : ''));
    var al = document.getElementById('pp-align');
    if (al) al.value = cs.textAlign || '';
    var lh = document.getElementById('pp-lineheight');
    if (lh) lh.value = cs.lineHeight !== 'normal' ? parseFloat(cs.lineHeight) : '';
    var ls = document.getElementById('pp-letterspacing');
    if (ls) ls.value = cs.letterSpacing !== 'normal' ? parseInt(cs.letterSpacing) : '';
    // 填充关键帧输入框
    var kfFrom = document.getElementById('kf-from-input');
    var kfTo = document.getElementById('kf-to-input');
    if (kfFrom) kfFrom.value = el.dataset.customFrom || '';
    if (kfTo) kfTo.value = el.dataset.customTo || '';
  }

  function updateKeyframeDisplay(animClass) {
    var kfFromInput = document.getElementById('kf-from-input');
    var kfToInput = document.getElementById('kf-to-input');
    if (!kfFromInput || !kfToInput) return;
    var el = selected;
    var customFrom = el ? (el.dataset.customFrom || '') : '';
    var customTo = el ? (el.dataset.customTo || '') : '';
    var kf = ANIM_KEYFRAMES[animClass];
    // 有自定义值优先显示自定义；否则显示该动画类型的默认关键帧
    kfFromInput.value = customFrom || (kf ? kf.from : '');
    kfToInput.value = customTo || (kf ? kf.to : '');
  }

  function updateBreadcrumb() {
    if (!selected) { breadcrumb.innerHTML = ''; breadcrumb.classList.remove('show'); return; }
    breadcrumb.classList.add('show');
    var chain = [];
    var el = selected;
    var stage = document.getElementById('stage');
    while (el && el !== stage && el !== document.body) {
      var label = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        var cls = el.className.split(' ').filter(function(c){ return c && c !== 'edit-clickable' && c !== 'edit-selected' && c !== 'edit-dragging'; }).join('.');
        if (cls) label += '.' + cls.substring(0, 25);
      }
      chain.unshift({ el: el, label: label });
      el = el.parentElement;
    }
    var html = '';
    for (var i = 0; i < chain.length; i++) {
      if (i > 0) html += '<span class="bc-sep">›</span>';
      html += '<span class="bc-item" data-idx="' + i + '">' + chain[i].label + '</span>';
    }
    breadcrumb.innerHTML = html;
    var items = breadcrumb.querySelectorAll('.bc-item');
    for (var k = 0; k < items.length; k++) {
      items[k].addEventListener('click', function(e) {
        var idx = parseInt(e.target.getAttribute('data-idx'));
        if (chain[idx]) selectElement(chain[idx].el);
      });
    }
  }

  function selectElement(el) {
    if (selected) selected.classList.remove('edit-selected');
    selected = el;
    el.classList.add('edit-selected');
    snapshot = takeSnapshot(el);
    originalSnapshot = JSON.parse(JSON.stringify(snapshot));
    fillPanel(el);
    var tag = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      var cls = el.className.split(' ').filter(function(c){ return c && c !== 'edit-clickable' && c !== 'edit-selected'; }).join(' ');
      if (cls) tag += '.' + cls.substring(0, 20);
    }
    selectedTag.textContent = tag;
    panel.classList.add('show');
    // 表格内部元素不能独立定位/设尺寸，禁用相关输入避免破坏表格布局
    var tableInternal = isTableInternal(el);
    ['pp-x', 'pp-y', 'pp-w', 'pp-h'].forEach(function (id) {
      var inp = document.getElementById(id);
      if (inp) { inp.disabled = tableInternal; inp.title = tableInternal ? '表格内部元素不支持单独设置位置/尺寸' : ''; }
    });
    updateBreadcrumb();
    // 创建resize手柄
    removeResizeHandles();
    if (!tableInternal) createResizeHandles(el);
    var panelInputs = panel.querySelectorAll('input, textarea, select');
    for (var i = 0; i < panelInputs.length; i++) {
      panelInputs[i].onfocus = function() {
        if (selected) { inputStartState = takeSnapshot(selected); inputStartEl = selected; }
        clearTimeout(inputTimer);
      };
      panelInputs[i].onblur = function() {
        clearTimeout(inputTimer);
        inputTimer = setTimeout(recordInputUndo, 300);
      };
    }
  }

  function deselect() {
    if (selected) selected.classList.remove('edit-selected');
    selected = null;
    snapshot = null;
    selectedTag.textContent = '未选中';
    panel.classList.remove('show');
    breadcrumb.classList.remove('show');
    removeResizeHandles();
  }

  function selectParent() {
    if (!selected) return;
    var stage = document.getElementById('stage');
    var parent = selected.parentElement;
    if (parent && parent !== stage && parent !== document.body) selectElement(parent);
  }

  function selectChild() {
    if (!selected) return;
    if (selected.children.length > 0) selectElement(selected.children[0]);
  }

  var moveTimer = null;
  var moveStartState = null;
  function moveSelected(dx, dy) {
    if (!selected) return;
    if (moveStartState === null) moveStartState = takeSnapshot(selected);
    clearTimeout(moveTimer);
    moveTimer = setTimeout(function() {
      if (moveStartState && selected) {
        undoStack.push({ el: selected, state: moveStartState });
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
        if (typeof markDirty === 'function') markDirty();
      }
      moveStartState = null;
    }, 500);
    var cs = getComputedStyle(selected);
    if (cs.position === 'absolute' || cs.position === 'fixed') {
      var curX = parseInt(selected.style.left) || parseInt(cs.left) || 0;
      var curY = parseInt(selected.style.top) || parseInt(cs.top) || 0;
      selected.style.left = (curX + dx) + 'px';
      selected.style.top = (curY + dy) + 'px';
      document.getElementById('pp-x').value = curX + dx;
      document.getElementById('pp-y').value = curY + dy;
    } else {
      var curML = parseInt(selected.style.marginLeft) || 0;
      var curMT = parseInt(selected.style.marginTop) || 0;
      selected.style.marginLeft = (curML + dx) + 'px';
      selected.style.marginTop = (curMT + dy) + 'px';
    }
    updateResizeHandles();
  }

  // 内联元素(span等)设置宽高前转为inline-block，否则width/height无效
  function ensureInlineBlock(el) {
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
  }

  // 表格内部元素无法用 left/top/width 独立定位，写入会破坏表格布局
  function isTableInternal(el) {
    var t = el.tagName;
    return t === 'TR' || t === 'TD' || t === 'TH' || t === 'THEAD' || t === 'TBODY' || t === 'TFOOT' || t === 'CAPTION' || t === 'COLGROUP' || t === 'COL';
  }

  // 面板X/Y以舞台坐标显示，换算成style.left/top的增量后应用
  function moveElTo(axis, target) {
    var el = selected;
    var stage = document.getElementById('stage');
    if (!el || !stage) return;
    if (isTableInternal(el)) return;
    var sr = stage.getBoundingClientRect();
    var rect = el.getBoundingClientRect();
    var scale = getStageScale();
    var f = calibrateVisual(el);
    var cur = (axis === 'x' ? rect.left - sr.left : rect.top - sr.top) / scale;
    var delta = target - cur;
    var cs = getComputedStyle(el);
    // 基准必须用计算值：left/top 可能来自 CSS 而非内联样式，直接读 style.left 会得到空值
    if (axis === 'x') {
      var sf = f.x || scale;
      var baseX = parseFloat(el.style.left);
      if (isNaN(baseX)) baseX = parseFloat(cs.left);
      if (isNaN(baseX)) baseX = 0;
      el.style.right = 'auto';
      el.style.left = (baseX + delta * scale / sf) + 'px';
      document.getElementById('pp-x').value = Math.round(target);
    } else {
      var sfy = f.y || scale;
      var baseY = parseFloat(el.style.top);
      if (isNaN(baseY)) baseY = parseFloat(cs.top);
      if (isNaN(baseY)) baseY = 0;
      el.style.bottom = 'auto';
      el.style.top = (baseY + delta * scale / sfy) + 'px';
      document.getElementById('pp-y').value = Math.round(target);
    }
  }

  // 面板宽高按舞台坐标输入，换算成style宽度
  function setSizeAxis(axis, v) {
    var el = selected;
    if (!el) return;
    if (isTableInternal(el)) return;
    ensureInlineBlock(el);
    var scale = getStageScale();
    var f = calibrateVisual(el);
    var sf = (axis === 'w' ? f.w : f.h) || scale;
    var val = v * scale / sf;
    // 记录改前的视觉左上角，改后补偿，保证绕中心缩放的元素左上角不漂移
    var before = el.getBoundingClientRect();
    if (axis === 'w') el.style.width = val + 'px';
    else el.style.height = val + 'px';
    var after = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var baseL = parseFloat(el.style.left); if (isNaN(baseL)) baseL = parseFloat(cs.left) || 0;
    var baseT = parseFloat(el.style.top); if (isNaN(baseT)) baseT = parseFloat(cs.top) || 0;
    var dx = (after.left - before.left) / (f.x || scale);
    var dy = (after.top - before.top) / (f.y || scale);
    if (Math.abs(dx) > 0.01) el.style.left = (baseL - dx) + 'px';
    if (Math.abs(dy) > 0.01) el.style.top = (baseT - dy) + 'px';
  }

  // ===== 自定义关键帧：生成真正的 @keyframes 规则并绑定到元素 =====
  // 说明：CSS 自定义属性无法承载 "a;b" 这类含分号的值（setProperty 会拒绝），
  // 所以这里改为生成命名关键帧，通过 animation-name 覆盖类动画的 from/to。
  var kfStyleEl = null;
  // 从已存在的元素恢复编号，避免导出后重新打开时新元素与旧 id 冲突
  var kfSeq = (function () {
    var max = 0;
    var els = document.querySelectorAll('[data-kf-id]');
    for (var i = 0; i < els.length; i++) {
      var n = parseInt(els[i].dataset.kfId, 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max;
  })();
  function getKfStyleEl() {
    if (kfStyleEl && kfStyleEl.parentNode) return kfStyleEl;
    kfStyleEl = document.getElementById('kf-style');
    if (!kfStyleEl) {
      kfStyleEl = document.createElement('style');
      kfStyleEl.id = 'kf-style';
      document.head.appendChild(kfStyleEl);
    }
    return kfStyleEl;
  }
  function kfRuleName(el) {
    if (!el.dataset.kfId) el.dataset.kfId = String(++kfSeq);
    return 'kf-' + el.dataset.kfId;
  }
  // 把 "opacity:0; translateY(20px)" 规范化为合法声明
  // 同时兼容缺 transform 前缀的写法（如 "scale(1)" / "translateY(0)"）
  function normalizeKeyframeDecls(str) {
    var parts = String(str).split(';');
    var decls = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;
      if (p.indexOf(':') === -1) {
        // 只写了变换函数：补上 transform 前缀
        if (/^[a-zA-Z-]+\(/.test(p) || p === 'none') decls.push('transform:' + p);
        continue;
      }
      decls.push(p);
    }
    return decls.join('; ');
  }
  // 从 DOM 重新扫描所有带自定义关键帧的元素并重建样式表：
  // 依赖 dataset（会随导出序列化），因此导出的 HTML 再次打开也能自愈
  function rebuildKfStylesheet() {
    var sheet = getKfStyleEl();
    var els = document.querySelectorAll('[data-kf-id]');
    var css = '';
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var from = el.dataset.customFrom;
      var to = el.dataset.customTo;
      if (!from && !to) continue;
      var fromDecl = normalizeKeyframeDecls(from || '') || 'opacity:0';
      var toDecl = normalizeKeyframeDecls(to || '') || 'opacity:1';
      css += '@keyframes kf-' + el.dataset.kfId + ' { from { ' + fromDecl + '; } to { ' + toDecl + '; } }\n';
    }
    sheet.textContent = css;
  }
  function syncKeyframes(el) {
    if (!el) return;
    var from = el.dataset.customFrom;
    var to = el.dataset.customTo;
    // 先确保有 id（无自定义值时不生成，避免留下空规则）
    if (!from && !to) {
      if (el.dataset.kfId) {
        el.style.removeProperty('animation-name');
        rebuildKfStylesheet();
      }
      return;
    }
    var name = kfRuleName(el);
    rebuildKfStylesheet();
    el.style.setProperty('animation-name', name);
  }

  var inputTimer = null;
  var inputStartState = null;
  var inputStartEl = null;

  // ===== 属性栏折叠 / 展开 =====
  var PANEL_COLLAPSE_KEY = 'ai-gov-v5-panel-collapsed';
  var panelCollapsed = false;
  try { panelCollapsed = localStorage.getItem(PANEL_COLLAPSE_KEY) === '1'; } catch (e) {}

  function applyPanelCollapsed() {
    if (!panel) return;
    panel.classList.toggle('collapsed', panelCollapsed);
    if (panelToggle) panelToggle.textContent = panelCollapsed ? '▸ 展开' : '▾ 折叠';
    // 折叠后元素高度变化，手柄需重新定位（虽然通常位置不变）
    if (selected) updateResizeHandles();
  }

  function togglePanel() {
    panelCollapsed = !panelCollapsed;
    try { localStorage.setItem(PANEL_COLLAPSE_KEY, panelCollapsed ? '1' : '0'); } catch (e) {}
    applyPanelCollapsed();
  }

  if (panelToggle) {
    panelToggle.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    panelToggle.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); togglePanel(); });
  }
  applyPanelCollapsed();

  function recordInputUndo() {
    if (inputStartState && inputStartEl) {
      undoStack.push({ el: inputStartEl, state: inputStartState });
      if (typeof markDirty === 'function') markDirty();
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack = [];
    }
    inputStartState = null;
    inputStartEl = null;
  }
  var editor = {
    enter: function() {
      editMode = true;
      document.body.classList.add('edit-mode');
      bar.classList.add('show');
      applyPanelCollapsed();
      rebuildKfStylesheet();
      markClickable();
    },
    exit: function() {
      editMode = false;
      document.body.classList.remove('edit-mode');
      bar.classList.remove('show');
      panel.classList.remove('show');
      breadcrumb.classList.remove('show');
      deselect();
      var els = document.querySelectorAll('.edit-clickable');
      for (var i = 0; i < els.length; i++) els[i].classList.remove('edit-clickable');
    },
    toggle: function() { editMode ? this.exit() : this.enter(); },
    setText: function(v) { if (selected && selected.children.length === 0) selected.textContent = v; },
    setFontSize: function(v) { if (selected && v) selected.style.fontSize = v + 'px'; },
    setColor: function(v) { if (selected && v) selected.style.color = v; },
    setFontWeight: function(v) { if (selected && v) selected.style.fontWeight = v; },
    setX: function(v) { if (selected && v !== '' && !isNaN(v)) { makeAbsoluteIfNeeded(selected); moveElTo('x', parseFloat(v)); updateResizeHandles(); } },
    setY: function(v) { if (selected && v !== '' && !isNaN(v)) { makeAbsoluteIfNeeded(selected); moveElTo('y', parseFloat(v)); updateResizeHandles(); } },
    setW: function(v) { if (selected && v !== '' && !isNaN(v)) { setSizeAxis('w', parseFloat(v)); updateResizeHandles(); } },
    setH: function(v) { if (selected && v !== '' && !isNaN(v)) { setSizeAxis('h', parseFloat(v)); updateResizeHandles(); } },
    setBg: function(v) { if (selected && v) selected.style.backgroundColor = v; },
    setBorder: function(v) { if (selected && v) selected.style.borderColor = v; },
    setBorderW: function(v) { if (selected && v) { selected.style.borderWidth = v + 'px'; selected.style.borderStyle = 'solid'; } },
    setRadius: function(v) { if (selected && v) selected.style.borderRadius = v + 'px'; },
    setOpacity: function(v) { if (selected && v !== '' && !isNaN(v)) selected.style.opacity = v; },
    setAnimType: function(v) {
      if (!selected) return;
      var animClasses = ['anim','anim-fade','anim-scale','anim-slide-left','anim-slide-right','anim-slide-up','anim-bounce','anim-stagger'];
      for (var i = 0; i < animClasses.length; i++) selected.classList.remove(animClasses[i]);
      if (v) selected.classList.add(v);
      if (typeof updateKeyframeDisplay === 'function') updateKeyframeDisplay(v);
    },
    setAnimDelay: function(v) { if (selected && v) selected.style.setProperty('--delay', v + 's'); },
    setAnimDuration: function(v) { if (selected && v) selected.style.animationDuration = v + 's'; },
    applyChanges: function() {
      if (!selected) return;
      var el = selected;
      // 压入撤销栈
      undoStack.push({ el: el, state: takeSnapshot(el) });
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack = [];
      if (typeof markDirty === 'function') markDirty();
      var text = document.getElementById('pp-text').value;
      if (el.children.length === 0 && text !== '') el.textContent = text;
      var fs = document.getElementById('pp-fontsize').value;
      if (fs) el.style.fontSize = fs + 'px';
      var color = document.getElementById('pp-color').value;
      if (color) el.style.color = color;
      var fw = document.getElementById('pp-weight').value;
      if (fw) el.style.fontWeight = fw;
      var x = document.getElementById('pp-x').value;
      if (x !== '') el.style.left = x + 'px';
      var y = document.getElementById('pp-y').value;
      if (y !== '') el.style.top = y + 'px';
      var w = document.getElementById('pp-w').value;
      if (w) el.style.width = w + 'px';
      var h = document.getElementById('pp-h').value;
      if (h) el.style.height = h + 'px';
      var bg = document.getElementById('pp-bg').value;
      if (bg) el.style.backgroundColor = bg;
      var border = document.getElementById('pp-border').value;
      if (border) el.style.borderColor = border;
      var bw = document.getElementById('pp-borderw').value;
      if (bw) { el.style.borderWidth = bw + 'px'; el.style.borderStyle = 'solid'; }
      var radius = document.getElementById('pp-radius').value;
      if (radius) el.style.borderRadius = radius + 'px';
      var opacity = document.getElementById('pp-opacity').value;
      if (opacity) el.style.opacity = opacity;
      // 动画
      var animType = document.getElementById('pp-anim-type').value;
      var animClasses = ['anim','anim-fade','anim-scale','anim-slide-left','anim-slide-right','anim-slide-up','anim-bounce','anim-stagger'];
      for (var i = 0; i < animClasses.length; i++) el.classList.remove(animClasses[i]);
      if (animType) el.classList.add(animType);
      var delay = document.getElementById('pp-anim-delay').value;
      if (delay) el.style.setProperty('--delay', delay + 's');
      var dur = document.getElementById('pp-anim-duration').value;
      if (dur) el.style.animationDuration = dur + 's';
      snapshot = takeSnapshot(el);
      updateKeyframeDisplay(animType);
    },
    resetChanges: function() {
      if (!selected || !originalSnapshot) return;
      var el = selected;
      snapshot = JSON.parse(JSON.stringify(originalSnapshot));
      if (el.children.length === 0) el.textContent = originalSnapshot.text;
      el.style.fontSize = originalSnapshot.fontSize ? originalSnapshot.fontSize : '';
      el.style.color = originalSnapshot.color ? originalSnapshot.color : '';
      el.style.fontWeight = originalSnapshot.fontWeight ? originalSnapshot.fontWeight : '';
      el.style.left = originalSnapshot.left;
      el.style.top = originalSnapshot.top;
      el.style.right = originalSnapshot.right || '';
      el.style.bottom = originalSnapshot.bottom || '';
      el.style.position = originalSnapshot.position || '';
      el.style.display = originalSnapshot.display || '';
      el.style.marginLeft = originalSnapshot.marginLeft || '';
      el.style.marginTop = originalSnapshot.marginTop || '';
      el.style.width = originalSnapshot.width;
      el.style.height = originalSnapshot.height;
      el.style.backgroundColor = originalSnapshot.backgroundColor;
      el.style.borderColor = originalSnapshot.borderColor;
      el.style.borderWidth = originalSnapshot.borderWidth;
      el.style.borderRadius = originalSnapshot.borderRadius;
      el.style.opacity = originalSnapshot.opacity;
      el.style.fontFamily = originalSnapshot.fontFamily;
      el.style.textAlign = originalSnapshot.textAlign;
      el.style.lineHeight = originalSnapshot.lineHeight;
      el.style.letterSpacing = originalSnapshot.letterSpacing;
      var animClasses = ['anim','anim-fade','anim-scale','anim-slide-left','anim-slide-right','anim-slide-up','anim-bounce','anim-stagger'];
      for (var i = 0; i < animClasses.length; i++) el.classList.remove(animClasses[i]);
      if (originalSnapshot.animClass) el.classList.add(originalSnapshot.animClass);
      if (originalSnapshot.animDelay) el.style.setProperty('--delay', originalSnapshot.animDelay);
      else el.style.removeProperty('--delay');
      if (originalSnapshot.animDuration) el.style.animationDuration = originalSnapshot.animDuration;
      if (originalSnapshot.kfFrom) el.dataset.customFrom = originalSnapshot.kfFrom; else delete el.dataset.customFrom;
      if (originalSnapshot.kfTo) el.dataset.customTo = originalSnapshot.kfTo; else delete el.dataset.customTo;
      syncKeyframes(el);
      fillPanel(el);
    },
    setFontFamily: function(v) { if (selected && v) selected.style.fontFamily = v; },
    setTextAlign: function(v) { if (selected && v) selected.style.textAlign = v; },
    // 行高按像素语义，输入多少就是多少px，避免无单位值被当成font-size倍数
    setLineHeight: function(v) { if (selected && v !== '' && !isNaN(v)) selected.style.lineHeight = parseFloat(v) + 'px'; },
    setLetterSpacing: function(v) { if (selected && v !== '' && !isNaN(v)) selected.style.letterSpacing = parseFloat(v) + 'px'; },
    setKeyframe: function(which, val) {
      if (!selected) return;
      // 空值表示清除该端自定义关键帧
      if (val === '' || val == null) {
        if (which === 'from') delete selected.dataset.customFrom;
        else delete selected.dataset.customTo;
      } else if (which === 'from') {
        selected.dataset.customFrom = val;
      } else {
        selected.dataset.customTo = val;
      }
      syncKeyframes(selected);
      if (typeof markDirty === 'function') markDirty();
    },
    addElement: function() {
      if (!selected) return;
      var el = document.createElement('div');
      el.textContent = '新元素 - 双击编辑';
      el.style.cssText = 'position:absolute; left:100px; top:100px; padding:16px 24px; background:rgba(184,148,90,0.15); border:2px dashed #b8945a; border-radius:8px; font-size:20px; color:#16203a;';
      el.classList.add('anim');
      selected.appendChild(el);
      markClickable();
      selectElement(el);
      // 记录撤销
      undoStack.push({ el: selected, state: takeSnapshot(selected) });
      redoStack = [];
      if (typeof markDirty === 'function') markDirty();
    },
    deleteElement: function() {
      if (!selected) return;
      if (selected.classList.contains('step')) { showUndoStatus('不能删除整个页面', '#ff9800'); return; }
      undoStack.push({ el: selected.parentElement, state: takeSnapshot(selected.parentElement) });
      redoStack = [];
      if (typeof markDirty === 'function') markDirty();
      selected.remove();
      deselect();
      markClickable();
      showUndoStatus('元素已删除', '#e57373');
    },
    previewAnim: function() {
      if (!selected) return;
      var el = selected;
      var hasKf = el.dataset.customFrom || el.dataset.customTo;
      var savedName = hasKf ? el.style.getPropertyValue('animation-name') : '';
      // 强制重启动画
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
      // 清空 animation 内联会一并清掉自定义关键帧的 animation-name，这里恢复
      if (hasKf && savedName) el.style.setProperty('animation-name', savedName);
    },
    undo: function() {
      if (undoStack.length === 0) { showUndoStatus('撤销栈为空', '#ff9800'); return; }
      var record = undoStack.pop();
      var el = record.el;
      var s = record.state;
      redoStack.push({ el: el, state: takeSnapshot(el) });
      if (redoStack.length > MAX_HISTORY) redoStack.shift();
      showUndoStatus('已撤销 (' + undoStack.length + '步剩余)', '#4caf50');
      if (el.children.length === 0) el.textContent = s.text;
      el.style.fontSize = s.fontSize ? s.fontSize : '';
      el.style.color = s.color ? s.color : '';
      el.style.fontWeight = s.fontWeight ? s.fontWeight : '';
      el.style.position = s.position || '';
      el.style.display = s.display || '';
      el.style.left = s.left;
      el.style.top = s.top;
      el.style.right = s.right || '';
      el.style.bottom = s.bottom || '';
      el.style.marginLeft = s.marginLeft || '';
      el.style.marginTop = s.marginTop || '';
      el.style.width = s.width;
      el.style.height = s.height;
      el.style.backgroundColor = s.backgroundColor;
      el.style.borderColor = s.borderColor;
      el.style.borderWidth = s.borderWidth;
      el.style.borderRadius = s.borderRadius;
      el.style.opacity = s.opacity;
      el.style.fontFamily = s.fontFamily;
      el.style.textAlign = s.textAlign;
      el.style.lineHeight = s.lineHeight;
      el.style.letterSpacing = s.letterSpacing;
      var animClasses = ['anim','anim-fade','anim-scale','anim-slide-left','anim-slide-right','anim-slide-up','anim-bounce','anim-stagger'];
      for (var i = 0; i < animClasses.length; i++) el.classList.remove(animClasses[i]);
      if (s.animClass) el.classList.add(s.animClass);
      if (s.animDelay) el.style.setProperty('--delay', s.animDelay);
      else el.style.removeProperty('--delay');
      if (s.animDuration) el.style.animationDuration = s.animDuration;
      if (s.kfFrom) el.dataset.customFrom = s.kfFrom; else delete el.dataset.customFrom;
      if (s.kfTo) el.dataset.customTo = s.kfTo; else delete el.dataset.customTo;
      syncKeyframes(el);
      if (el === selected) fillPanel(el);
    },
    redo: function() {
      if (redoStack.length === 0) { showUndoStatus('重做栈为空', '#ff9800'); return; }
      showUndoStatus('已重做', '#2196f3');
      var record = redoStack.pop();
      undoStack.push({ el: record.el, state: takeSnapshot(record.el) });
      var el = record.el;
      var s = record.state;
      if (el.children.length === 0) el.textContent = s.text;
      el.style.fontSize = s.fontSize ? s.fontSize : '';
      el.style.color = s.color ? s.color : '';
      el.style.fontWeight = s.fontWeight ? s.fontWeight : '';
      el.style.position = s.position || '';
      el.style.display = s.display || '';
      el.style.left = s.left;
      el.style.top = s.top;
      el.style.right = s.right || '';
      el.style.bottom = s.bottom || '';
      el.style.marginLeft = s.marginLeft || '';
      el.style.marginTop = s.marginTop || '';
      el.style.width = s.width;
      el.style.height = s.height;
      el.style.backgroundColor = s.backgroundColor;
      el.style.borderColor = s.borderColor;
      el.style.borderWidth = s.borderWidth;
      el.style.borderRadius = s.borderRadius;
      el.style.opacity = s.opacity;
      el.style.fontFamily = s.fontFamily;
      el.style.textAlign = s.textAlign;
      el.style.lineHeight = s.lineHeight;
      el.style.letterSpacing = s.letterSpacing;
      var animClasses = ['anim','anim-fade','anim-scale','anim-slide-left','anim-slide-right','anim-slide-up','anim-bounce','anim-stagger'];
      for (var i = 0; i < animClasses.length; i++) el.classList.remove(animClasses[i]);
      if (s.animClass) el.classList.add(s.animClass);
      if (s.animDelay) el.style.setProperty('--delay', s.animDelay);
      else el.style.removeProperty('--delay');
      if (s.animDuration) el.style.animationDuration = s.animDuration;
      if (s.kfFrom) el.dataset.customFrom = s.kfFrom; else delete el.dataset.customFrom;
      if (s.kfTo) el.dataset.customTo = s.kfTo; else delete el.dataset.customTo;
      syncKeyframes(el);
      if (el === selected) fillPanel(el);
    },
    export: function() {
      saveNow();                       // 导出前先落盘本地
      bar.style.display = 'none';
      panel.style.display = 'none';
      breadcrumb.style.display = 'none';
      removeResizeHandles();
      if (selected) selected.classList.remove('edit-selected');
      var els = document.querySelectorAll('.edit-clickable');
      for (var i = 0; i < els.length; i++) els[i].classList.remove('edit-clickable');
      document.body.classList.remove('edit-mode');
      var html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      bar.style.display = '';
      breadcrumb.style.display = '';
      document.body.classList.add('edit-mode');
      markClickable();
      var blob = new Blob([html], {type: 'text/html;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var base = (document.title || 'presentation').replace(/[\/:*?"<>|s]+/g, '_').slice(0, 40);
      var d2 = new Date();
      var stamp = d2.getFullYear() + String(d2.getMonth() + 1).padStart(2, '0') + String(d2.getDate()).padStart(2, '0')
                + '_' + String(d2.getHours()).padStart(2, '0') + String(d2.getMinutes()).padStart(2, '0');
      a.download = base + '_' + stamp + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  function showUndoStatus(msg, color) {
    var el = document.getElementById('undo-status');
    if (el) {
      el.textContent = msg;
      el.style.color = color || '#4caf50';
      clearTimeout(el._timer);
      el._timer = setTimeout(function() { el.textContent = ''; }, 2000);
    }
  }

  // ===== Resize 拖拽 =====
  var resizing = false;
  var resizeDir = '';
  var resizeStartX = 0, resizeStartY = 0;
  var resizeStartState = null;
  var resizeStartRect = null;   // 起始视觉矩形
  var resizeStartStyle = null;  // 起始 style 数值(width/height/left/top)
  var resizeFactors = null;     // 视觉响应系数
  var resizeAnchor = null;      // 需要固定的边

  // 解析单个 transform 的缩放分量（不含位移）
  function parseScale(transform) {
    if (!transform || transform === 'none') return { sx: 1, sy: 1 };
    var m = transform.match(/matrix\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(',').map(parseFloat);
      return { sx: Math.sqrt(p[0] * p[0] + p[1] * p[1]) || 1, sy: Math.sqrt(p[2] * p[2] + p[3] * p[3]) || 1 };
    }
    var m3 = transform.match(/matrix3d\(([^)]+)\)/);
    if (m3) {
      var q = m3[1].split(',').map(parseFloat);
      return { sx: Math.sqrt(q[0] * q[0] + q[1] * q[1]) || 1, sy: Math.sqrt(q[4] * q[4] + q[5] * q[5]) || 1 };
    }
    return { sx: 1, sy: 1 };
  }

  // 祖先缩放乘积：决定元素的“样式位移”(left/top) 换算成视觉位移的比例
  // 注意：元素自身的 transform 不会放大自身位移，只会放大自身尺寸
  function getAncestorScale(el) {
    var sx = 1, sy = 1;
    var node = el ? el.parentElement : null;
    while (node && node.nodeType === 1) {
      var s = parseScale(getComputedStyle(node).transform);
      sx *= s.sx; sy *= s.sy;
      node = node.parentElement;
    }
    return { sx: sx, sy: sy };
  }

  // 测量“style 数值 → 视觉像素”的响应系数
  // 位移(x/y)只用祖先缩放；尺寸(w/h)要再乘上元素自身缩放
  function calibrateVisual(el) {
    var anc = getAncestorScale(el);
    var own = parseScale(getComputedStyle(el).transform);
    return {
      x: anc.sx || 1,
      y: anc.sy || 1,
      w: (anc.sx || 1) * (own.sx || 1),
      h: (anc.sy || 1) * (own.sy || 1)
    };
  }

  // ===== 边缘检测：选中元素后，鼠标移到边缘自动变resize光标 =====
  var EDGE_SIZE = 10; // 边缘热区宽度(px)

  function getEdgeDir(e) {
    if (!selected) return null;
    var rect = selected.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var w = rect.width;
    var h = rect.height;
    // 元素在该轴过小时不启用边缘缩放，否则整块都是热区、元素将无法被拖动
    var useX = w >= EDGE_SIZE * 3;
    var useY = h >= EDGE_SIZE * 3;
    var nearLeft = useX && x < EDGE_SIZE;
    var nearRight = useX && x > w - EDGE_SIZE;
    var nearTop = useY && y < EDGE_SIZE;
    var nearBottom = useY && y > h - EDGE_SIZE;
    if (nearLeft && nearTop) return 'nw';
    if (nearRight && nearBottom) return 'se';
    if (nearLeft && nearBottom) return 'sw';
    if (nearRight && nearTop) return 'ne';
    if (nearLeft) return 'w';
    if (nearRight) return 'e';
    if (nearTop) return 'n';
    if (nearBottom) return 's';
    return null;
  }

  // ===== Resize 手柄：选中元素四周8个控制点，拖动改变尺寸 =====
  var HANDLE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  function createResizeHandles(el) {
    removeResizeHandles();
    if (!el) return;
    for (var i = 0; i < HANDLE_DIRS.length; i++) {
      var h = document.createElement('div');
      h.className = 'edit-rh';
      h.setAttribute('data-dir', HANDLE_DIRS[i]);
      h.addEventListener('mousedown', function(e) {
        if (e.button !== 0 || !selected) return;
        e.stopPropagation();
        e.preventDefault();
        startResize(this.getAttribute('data-dir'), e);
      });
      document.body.appendChild(h);
    }
    updateResizeHandles();
  }

  function removeResizeHandles() {
    var hs = document.querySelectorAll('.edit-rh');
    for (var i = 0; i < hs.length; i++) {
      if (hs[i].parentNode) hs[i].parentNode.removeChild(hs[i]);
    }
  }

  function updateResizeHandles() {
    if (!selected) return;
    var hs = document.querySelectorAll('.edit-rh');
    if (!hs.length) return;
    var r = selected.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var pos = {
      nw: [r.left, r.top], n: [cx, r.top], ne: [r.right, r.top],
      e: [r.right, cy], se: [r.right, r.bottom], s: [cx, r.bottom],
      sw: [r.left, r.bottom], w: [r.left, cy]
    };
    for (var i = 0; i < hs.length; i++) {
      var p = pos[hs[i].getAttribute('data-dir')];
      if (p) {
        hs[i].style.left = Math.round(p[0] - 5) + 'px';
        hs[i].style.top = Math.round(p[1] - 5) + 'px';
      }
    }
  }

  function startResize(dir, e) {
    if (!selected) return;
    // static元素先转为absolute，内联元素先转inline-block，否则left/top/width写入无效
    makeAbsoluteIfNeeded(selected);
    ensureInlineBlock(selected);
    selected.classList.add('edit-no-transition');
    resizing = true;
    resizeDir = dir;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartState = takeSnapshot(selected);
    var r = selected.getBoundingClientRect();
    resizeStartRect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    resizeFactors = calibrateVisual(selected);
    var cs = getComputedStyle(selected);
    resizeStartStyle = { w: parseFloat(cs.width) || 0, h: parseFloat(cs.height) || 0, l: parseFloat(cs.left) || 0, t: parseFloat(cs.top) || 0 };
    // 拖动哪条边，就固定它对面那条边
    resizeAnchor = {
      h: dir.indexOf('e') > -1 ? 'left' : (dir.indexOf('w') > -1 ? 'right' : null),
      v: dir.indexOf('s') > -1 ? 'top' : (dir.indexOf('n') > -1 ? 'bottom' : null)
    };
  }

  document.addEventListener('mousemove', function(e) {
    if (!resizing || !selected) return;
    e.preventDefault();
    var scale = getStageScale();
    // 鼠标位移换算回样式数值空间：校准系数已含元素自身缩放与舞台缩放
    var f = resizeFactors || { w: scale, h: scale, x: scale, y: scale };
    var dxStyle = (e.clientX - resizeStartX) / (f.w || scale);
    var dyStyle = (e.clientY - resizeStartY) / (f.h || scale);
    var minW = 24, minH = 16;
    var newW = resizeStartStyle.w, newH = resizeStartStyle.h;
    var newL = resizeStartStyle.l, newT = resizeStartStyle.t;

    var growsRight = resizeDir.indexOf('e') > -1;
    var growsLeft = resizeDir.indexOf('w') > -1;
    var growsBottom = resizeDir.indexOf('s') > -1;
    var growsTop = resizeDir.indexOf('n') > -1;

    if (growsRight) newW = Math.max(minW, resizeStartStyle.w + dxStyle);
    else if (growsLeft) newW = Math.max(minW, resizeStartStyle.w - dxStyle);
    if (growsBottom) newH = Math.max(minH, resizeStartStyle.h + dyStyle);
    else if (growsTop) newH = Math.max(minH, resizeStartStyle.h - dyStyle);

    // 锚定对边：改尺寸后测量视觉偏移，反向补偿 left/top，保证不动的那条边保持不动
    if (growsRight || growsLeft) selected.style.width = newW + 'px';
    if (growsBottom || growsTop) selected.style.height = newH + 'px';
    var afterRect = selected.getBoundingClientRect();
    var anchor = resizeAnchor || { h: null, v: null };

    if (anchor.h === 'left') {
      newL = resizeStartStyle.l + (resizeStartRect.left - afterRect.left) / (f.x || scale);
      selected.style.left = newL + 'px';
    } else if (anchor.h === 'right') {
      newL = resizeStartStyle.l + (resizeStartRect.right - afterRect.right) / (f.x || scale);
      selected.style.left = newL + 'px';
    }
    if (anchor.v === 'top') {
      newT = resizeStartStyle.t + (resizeStartRect.top - afterRect.top) / (f.y || scale);
      selected.style.top = newT + 'px';
    } else if (anchor.v === 'bottom') {
      newT = resizeStartStyle.t + (resizeStartRect.bottom - afterRect.bottom) / (f.y || scale);
      selected.style.top = newT + 'px';
    }

    document.getElementById('pp-w').value = Math.round(parseFloat(selected.style.width) || 0);
    document.getElementById('pp-h').value = Math.round(parseFloat(selected.style.height) || 0);
    if (anchor.h) document.getElementById('pp-x').value = Math.round(parseFloat(selected.style.left) || 0);
    if (anchor.v) document.getElementById('pp-y').value = Math.round(parseFloat(selected.style.top) || 0);
    updateResizeHandles();
  }, true);

  document.addEventListener('mouseup', function() {
    if (!resizing) return;
    resizing = false;
    if (selected) selected.classList.remove('edit-no-transition');
    if (selected && resizeStartState) {
      undoStack.push({ el: selected, state: resizeStartState });
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack = [];
      if (typeof markDirty === 'function') markDirty();
    }
    resizeStartState = null;
    resizeStartRect = null;
    resizeStartStyle = null;
    resizeFactors = null;
    resizeAnchor = null;
  }, true);

  // ===== 拖拽/缩放前把元素几何固化为当前视觉结果，防止进入绝对定位后跳位 =====
  var wasPositionStatic = false;
  var origMarginLeft = '', origMarginTop = '';

  // 拖拽/缩放前把元素几何固化为当前视觉结果，防止进入定位后跳位
  function makeAbsoluteIfNeeded(el) {
    var cs = getComputedStyle(el);
    if (isTableInternal(el)) { wasPositionStatic = false; return false; }
    var pos = cs.position;

    // 已是相对定位：left/top 本身就是相对偏移，保持原值，不能用 offset* 覆盖
    if (pos === 'relative') {
      wasPositionStatic = false;
      if (cs.right !== 'auto') el.style.right = 'auto';
      if (cs.bottom !== 'auto') el.style.bottom = 'auto';
      return false;
    }

    if (pos === 'static') {
      wasPositionStatic = true;
      origMarginLeft = el.style.marginLeft || '';
      origMarginTop = el.style.marginTop || '';
      var rectBefore = el.getBoundingClientRect();
      // 改 position 前读取布局几何
      var offL = el.offsetLeft, offT = el.offsetTop;
      var ow = el.offsetWidth, oh = el.offsetHeight;
      el.style.position = 'absolute';
      el.style.marginLeft = '0';
      el.style.marginTop = '0';
      el.style.left = offL + 'px';
      el.style.top = offT + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      if (cs.display === 'inline') el.style.display = 'inline-block';
      // 冻结当前盒尺寸，避免脱离原布局后因 width:auto 重新收缩/换行
      if (ow) el.style.width = ow + 'px';
      if (oh) el.style.height = oh + 'px';
      // 父级（宽度由内容撑开的）会因子元素脱离文档流而收缩重排，这里测量偏差并反向补偿
      var rectAfter = el.getBoundingClientRect();
      var anc = getAncestorScale(el);
      var dL = (rectAfter.left - rectBefore.left) / (anc.sx || 1);
      var dT = (rectAfter.top - rectBefore.top) / (anc.sy || 1);
      if (Math.abs(dL) > 0.01) el.style.left = ((parseFloat(el.style.left) || 0) - dL) + 'px';
      if (Math.abs(dT) > 0.01) el.style.top = ((parseFloat(el.style.top) || 0) - dT) + 'px';
      return true;
    }

    // absolute / fixed：left/top 为 auto 或存在 right/bottom 锚定时需要固化并补偿
    wasPositionStatic = false;
    if (cs.left === 'auto' || cs.top === 'auto' || cs.right !== 'auto' || cs.bottom !== 'auto') {
      // 先取计算尺寸：把 right/bottom 换成 left/top 后，width:auto 会重新收缩
      var csW2 = cs.width, csH2 = cs.height;
      var rectB = el.getBoundingClientRect();
      var oL = el.offsetLeft, oT = el.offsetTop;
      var oW = el.offsetWidth, oH = el.offsetHeight;
      el.style.left = oL + 'px';
      el.style.top = oT + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      if (csW2 && csW2 !== 'auto') el.style.width = csW2;
      else if (oW) el.style.width = oW + 'px';
      if (csH2 && csH2 !== 'auto') el.style.height = csH2;
      else if (oH) el.style.height = oH + 'px';
      var rectA = el.getBoundingClientRect();
      var anc2 = getAncestorScale(el);
      var dL2 = (rectA.left - rectB.left) / (anc2.sx || 1);
      var dT2 = (rectA.top - rectB.top) / (anc2.sy || 1);
      if (Math.abs(dL2) > 0.01) el.style.left = ((parseFloat(el.style.left) || 0) - dL2) + 'px';
      if (Math.abs(dT2) > 0.01) el.style.top = ((parseFloat(el.style.top) || 0) - dT2) + 'px';
    }
    return false;
  }

  window.__editor = editor;

  /* ==========================================================================
     自动保存：写盘优先，本地快照兜底
     --------------------------------------------------------------------------
     通过本地预览服务器（http://127.0.0.1 或 localhost）访问时：编辑改动防抖后
     把整页 HTML 经 POST /save 直接写回当前源文件——磁盘文件本身就是存档，
     刷新、换浏览器看到的都是同一份最新内容，不依赖 localStorage。
     教训：此前把快照存 localStorage，而 http:// 与 file:// 是互相隔离的源、
     各存一份快照，同一个文件两种打开方式的内容会对不上。
     仅当 file:// 直开（没有 /save 接口）时，才退回 localStorage 差异快照。
     ========================================================================== */
  // 用页面身份（标题+页数）做命名空间，避免同一浏览器打开不同 deck 时串数据
  function deckFingerprint() {
    var t = (document.title || '').replace(/s+/g, '');
    var n = document.querySelectorAll('.step').length;
    var h = 5381;
    var seed = t + '|' + n;
    for (var i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) & 0x7fffffff;
    return h.toString(36);
  }
  var AUTOSAVE_KEY = 'pres-editor-autosave-v1:' + deckFingerprint();
  var DRAFT_KEY = AUTOSAVE_KEY + ':draft';
  // 基线：记录文件原始的内联样式与文本，用于判断哪些元素真正被改过。
  // 只存「差异」有两个好处：①存档体积小 ②HTML 源码后续更新时，
  // 未被编辑过的元素不会被旧存档覆盖。
  var styleBaseline = new WeakMap();
  var textBaseline = new WeakMap();
  function captureBaseline() {
    var els = document.querySelectorAll('.step *');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      styleBaseline.set(el, el.getAttribute('style') || '');
      if (el.children.length === 0) textBaseline.set(el, el.textContent);
    }
  }
  var autosaveStatusEl = document.getElementById('autosave-status');
  var autosaveTimer = null;
  var autosaveEnabled = true;

  function setAutosaveStatus(state, text) {
    if (!autosaveStatusEl) return;
    autosaveStatusEl.className = state || '';
    autosaveStatusEl.textContent = '自动保存：' + text;
  }

  var canWriteDisk = location.protocol === 'http:' &&
    (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  var pendingHtml = null;     // 待写盘的最新内容；高频保存合并，只写最后一份
  var writingDisk = false;
  var lastSavedHtml = null;   // 与磁盘一致的最新内容，用于跳过无变化的写入
  var backupReady = false;

  function currentFileName() {
    return decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  }
  var BACKUP_PATH = currentFileName().replace(/\.html?$/i, '') + '.backup.html';

  // 磁盘模式：序列化整页 HTML（同步执行不会渲染中间状态，无闪烁），并恢复编辑态
  function buildPageHTML() {
    var panelShown = panel.style.display;
    bar.style.display = 'none';
    panel.style.display = 'none';
    breadcrumb.style.display = 'none';
    removeResizeHandles();
    if (selected) selected.classList.remove('edit-selected');
    var els = document.querySelectorAll('.edit-clickable');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('edit-clickable');
    document.body.classList.remove('edit-mode');
    var html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    bar.style.display = '';
    panel.style.display = panelShown;
    breadcrumb.style.display = '';
    document.body.classList.add('edit-mode');
    markClickable();
    // 恢复选中态（removeResizeHandles 会连选中高亮一起摘掉）
    if (selected) {
      selected.classList.add('edit-selected');
      updateResizeHandles();
    }
    return html;
  }

  function flushToDisk() {
    if (writingDisk || pendingHtml === null) return;
    var payload = pendingHtml;
    pendingHtml = null;
    writingDisk = true;
    // 同时带 file / path 两个参数名，兼容两种服务器实现
    fetch('/save?file=' + encodeURIComponent(currentFileName()) +
          '&path=' + encodeURIComponent(currentFileName()),
          { method: 'POST', body: payload })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function () {
        writingDisk = false;
        lastSavedHtml = payload;
        setAutosaveStatus('saved', '已写入文件 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }));
        flushToDisk();
      })
      .catch(function (err) {
        writingDisk = false;
        setAutosaveStatus('error', '写入失败');
        showUndoStatus('写盘失败：' + err.message + '，请通过本地预览服务器打开', '#e57373');
      });
  }

  // 首次使用前准备原稿备份（供「还原」）；备份只生成一次，删除该文件可重设基线
  if (canWriteDisk) {
    fetch(BACKUP_PATH).then(function (r) {
      if (r.ok) { backupReady = true; return null; }
      return fetch(currentFileName()).then(function (r2) {
        if (!r2.ok) throw new Error('HTTP ' + r2.status);
        return r2.text();
      }).then(function (text) {
        return fetch('/save?file=' + encodeURIComponent(BACKUP_PATH) +
                     '&path=' + encodeURIComponent(BACKUP_PATH),
                     { method: 'POST', body: text });
      }).then(function (r3) { backupReady = r3.ok; });
    }).catch(function () {});
  }

  // 收集需要持久化的内容节点（含动画关键帧元数据）
  function collectState() {
    var nodes = [];
    // 只遍历 .step 内部的元素：.step 自身是分页容器，不参与编辑，
    // 纳入它会让路径随分页状态（active/build 变化）漂移，导致恢复错位。
    var targets = document.querySelectorAll('.step *');
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      if (el.closest('#editor-bar') || el.closest('#prop-panel') || el.closest('#edit-breadcrumb')) continue;
      if (el.classList.contains('edit-rh')) continue;
      var style = el.getAttribute('style') || '';
      var hasKf = el.dataset && (el.dataset.customFrom || el.dataset.customTo || el.dataset.kfId);
      var isLeaf = el.children.length === 0;
      var baseStyle = styleBaseline.get(el);
      var styleChanged = baseStyle !== undefined && style !== baseStyle;
      var baseText = isLeaf ? textBaseline.get(el) : undefined;
      var textChanged = isLeaf && baseText !== undefined && el.textContent !== baseText;
      // 只记录真实差异（样式或文本被改过），或带关键帧元数据的元素
      if (!styleChanged && !textChanged && !hasKf) continue;
      var rec = { p: pathOf(el) };
      if (styleChanged) rec.s = style;
      if (textChanged) rec.t = el.textContent;
      if (hasKf) rec.k = { f: el.dataset.customFrom || '', o: el.dataset.customTo || '', i: el.dataset.kfId || '' };
      nodes.push(rec);
    }
    return { v: 1, nodes: nodes, ts: Date.now() };
  }

  // 用「同标签同级序号」生成稳定路径，避免依赖动态生成的 id
  // 路径 = 所属 step 的序号 + 该 step 内的元素层级路径
  // （step 序号用「所有 .step 中的位置」，与分页状态无关，稳定）
  function pathOf(el) {
    var step = el.closest ? el.closest('.step') : null;
    if (!step) return '';
    var all = document.querySelectorAll('.step');
    var stepIdx = 0;
    for (var i = 0; i < all.length; i++) { if (all[i] === step) { stepIdx = i; break; } }
    var parts = [];
    var node = el;
    while (node && node !== step) {
      var parent = node.parentNode;
      if (!parent) break;
      var idx = 0, sib = parent.firstElementChild;
      while (sib && sib !== node) { if (sib.tagName === node.tagName) idx++; sib = sib.nextElementSibling; }
      parts.unshift(node.tagName + ':' + idx);
      node = parent;
    }
    return 'S' + stepIdx + '|' + parts.join('>');
  }

  function findByPath(path) {
    if (!path) return null;
    var bar = path.indexOf('|');
    var stepIdx = parseInt(path.slice(1, bar), 10);
    var body = path.slice(bar + 1);
    var all = document.querySelectorAll('.step');
    var node = all[stepIdx];
    if (!node) return null;
    if (!body) return node;
    var parts = body.split('>');
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i].split(':');
      var tag = seg[0], want = parseInt(seg[1], 10);
      var found = null, idx = 0, c = node.firstElementChild;
      while (c) {
        if (c.tagName === tag) { if (idx === want) { found = c; break; } idx++; }
        c = c.nextElementSibling;
      }
      if (!found) return null;
      node = found;
    }
    return node;
  }

  function applyState(data) {
    if (!data || !data.nodes) return 0;
    var applied = 0;
    for (var i = 0; i < data.nodes.length; i++) {
      var rec = data.nodes[i];
      var el = findByPath(rec.p);
      if (!el) continue;
      if (rec.s !== undefined) { if (rec.s) el.setAttribute('style', rec.s); else el.removeAttribute('style'); }
      if (rec.t !== undefined && el.children.length === 0) el.textContent = rec.t;
      if (rec.d !== undefined) el.style.display = rec.d;
      if (rec.k) {
        if (rec.k.f) el.dataset.customFrom = rec.k.f; else delete el.dataset.customFrom;
        if (rec.k.o) el.dataset.customTo = rec.k.o; else delete el.dataset.customTo;
        if (rec.k.i) el.dataset.kfId = rec.k.i;
        if (typeof syncKeyframes === 'function') syncKeyframes(el);
      }
      applied++;
    }
    return applied;
  }

  function saveLocal(showMsg) {
    if (!autosaveEnabled) return;
    if (canWriteDisk) {
      var html = buildPageHTML();
      // 无变化不重复写盘（序列化含分页状态，翻页后会自然重新写入）
      if (html === lastSavedHtml && !showMsg) {
        setAutosaveStatus('saved', '无新的修改');
        return;
      }
      pendingHtml = html;
      flushToDisk();
      if (showMsg) showUndoStatus('已直接写入本地文件', '#4caf50');
      return;
    }
    // file:// 兜底：无 /save 接口，退回 localStorage 差异快照
    try {
      var data = collectState();
      // 无差异时不覆盖已有存档：避免撤销回原样或状态抖动导致存档被清空。
      // 需要真正清空请用「还原」按钮。
      if (data.nodes.length === 0 && !showMsg) {
        try { if (localStorage.getItem(AUTOSAVE_KEY)) { setAutosaveStatus('saved', '无新的修改'); return; } } catch (e) {}
      }
      var json = JSON.stringify(data);
      localStorage.setItem(AUTOSAVE_KEY, json);
      // 同步一份草稿，用于关闭页面前抢救
      try { localStorage.setItem(DRAFT_KEY, json); } catch (e) {}
      setAutosaveStatus('saved', '已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      if (showMsg) showUndoStatus('已保存到浏览器本地（建议用预览服务器打开以直接写盘）', '#4caf50');
    } catch (e) {
      setAutosaveStatus('error', '保存失败');
      if (showMsg) showUndoStatus('本地保存失败：' + (e.name === 'QuotaExceededError' ? '超出容量' : '浏览器限制') + '，请用「导出HTML」', '#e57373');
    }
  }

  function queueAutosave() {
    if (!autosaveEnabled) return;
    setAutosaveStatus('dirty', '有未保存修改');
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () { saveLocal(false); }, 800);
  }

  function saveNow() {
    clearTimeout(autosaveTimer);
    saveLocal(false);
  }

  editor.saveLocal = function () { saveLocal(true); };

  editor.revertLocal = function () {
    // 关键：先关闭自动保存，否则 reload 触发的 beforeunload 会把修改重新写回
    autosaveEnabled = false;
    clearTimeout(autosaveTimer);
    if (canWriteDisk) {
      if (!backupReady) { alert('没有可用的原稿备份（' + BACKUP_PATH + '），无法还原。'); autosaveEnabled = true; return; }
      if (!confirm('确定丢弃所有编辑，恢复到原稿备份？此操作不可撤销')) { autosaveEnabled = true; return; }
      fetch(BACKUP_PATH)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (text) {
          return fetch('/save?file=' + encodeURIComponent(currentFileName()) +
                       '&path=' + encodeURIComponent(currentFileName()),
                       { method: 'POST', body: text });
        })
        .then(function () { location.reload(); })
        .catch(function (err) {
          autosaveEnabled = true;
          alert('还原失败：' + err.message);
        });
      return;
    }
    if (!confirm('确定丢弃所有本地编辑，恢复到文件原始状态？此操作不可撤销')) { autosaveEnabled = true; return; }
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
    location.reload();
  };

  editor.hasLocalSave = function () {
    try { return !!localStorage.getItem(AUTOSAVE_KEY); } catch (e) { return false; }
  };

  // 清空本地存档。silent=true 时同时关闭自动保存（用于「还原」流程，避免被写回）
  editor.clearLocalSave = function (silent) {
    if (silent) { autosaveEnabled = false; clearTimeout(autosaveTimer); }
    try { localStorage.removeItem(AUTOSAVE_KEY); localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  };

  // 启动时：磁盘模式以文件为准（不回放任何快照），file:// 模式回放本地快照
  (function restoreOnLoad() {
    if (canWriteDisk) { setAutosaveStatus('', '就绪（改动直接写入文件）'); return; }
    captureBaseline();              // 先记录原稿文本，再回放修改
    var raw = null;
    try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch (e) {}
    if (!raw) { setAutosaveStatus('', '就绪'); return; }
    try {
      var data = JSON.parse(raw);
      var n = applyState(data);
      // 注意：不要把基线重设为「恢复后的状态」——基线必须始终锚定文件原始状态，
      // 否则周期保存会因「无差异」而把存档清空。
      setAutosaveStatus('saved', '已恢复 ' + n + ' 处修改');
      showUndoStatus('已从本地恢复 ' + n + ' 处修改（点「还原」可丢弃）', '#4caf50');
    } catch (e) {
      setAutosaveStatus('error', '恢复失败');
    }
  })();

  // 各种修改动作后触发防抖保存
  var _origTakeSnapshotHook = null;
  function markDirty() { queueAutosave(); }
  editor.markDirty = markDirty;

  // 拦截内部记录撤销的时机（撤销栈有变化即说明发生了编辑）
  var _pushUndo = null;

  // 退出编辑前落盘；页面隐藏/卸载前抢救
  window.addEventListener('beforeunload', saveNow);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') saveNow();
  });
  // 兜底：周期性保存（防止某些修改路径未触发 markDirty）
  setInterval(function () {
    if (editMode) saveLocal(false);
  }, 15000);

  // 面板输入即时标脏（覆盖「改完未失焦就刷新」的场景）
  (function () {
    var p = document.getElementById('prop-panel');
    if (!p) return;
    var onEdit = function () { if (editMode) queueAutosave(); };
    p.addEventListener('input', onEdit, true);
    p.addEventListener('change', onEdit, true);
  })();

  // 动画类型切换时更新关键帧显示
  document.getElementById('pp-anim-type').addEventListener('change', function() {
    updateKeyframeDisplay(this.value);
  });

  // 点击选中
  document.addEventListener('click', function(e) {
    if (!editMode || dragging) return;
    if (e.target.closest('#editor-bar') || e.target.closest('#prop-panel') || e.target.closest('#edit-breadcrumb') || e.target.closest('.edit-rh')) return;
    e.stopPropagation();
    e.preventDefault();
    var el = e.target.closest('.edit-clickable');
    if (el) { selectElement(el); }
    else { deselect(); }
  }, true);

  // 拖拽移动
  document.addEventListener('mousedown', function(e) {
    if (!editMode) return;
    // 清理上一次可能残留的拖动/缩放临时状态（鼠标在窗口外松开时不会触发mouseup）
    var stuck = document.querySelectorAll('.edit-no-transition');
    for (var s = 0; s < stuck.length; s++) stuck[s].classList.remove('edit-no-transition');
    if (e.target.closest('#editor-bar') || e.target.closest('#prop-panel') || e.target.closest('#edit-breadcrumb') || e.target.closest('.edit-rh')) return;
    var el = e.target.closest('.edit-clickable');
    if (!el || e.button !== 0) return;
    // 如果是双击编辑文字，不拖拽
    if (e.target.isContentEditable) return;
    e.stopPropagation();
    e.preventDefault();
    // 已选中元素的边缘按下 → 进入resize而非拖动
    if (el === selected) {
      var edge = getEdgeDir(e);
      if (edge) { startResize(edge, e); return; }
    }
    // 仅选中，不修改任何布局属性；拖动要等真正移动后才开始
    selectElement(el);
    dragging = false;
    dragPending = true;
    dragEl = el;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    // 记录转换前的原始状态，供撤销时完整还原
    dragStartState = takeSnapshot(el);
  }, true);

  document.addEventListener('mousemove', function(e) {
    if (!dragEl || (!dragPending && !dragging)) return;
    // 移动超过阈值才认定为拖动，避免单纯点击就改动元素
    if (!dragging && Math.abs(e.clientX - dragStartX) < 3 && Math.abs(e.clientY - dragStartY) < 3) return;
    if (!dragging) {
      // 此刻才把 static 元素转为 absolute（保留原位置与尺寸），并冻结过渡
      dragPending = false;
      var el0 = dragEl;
      el0.classList.add('edit-no-transition');
      makeAbsoluteIfNeeded(el0);
      dragFactors = calibrateVisual(el0);
      var cs0 = getComputedStyle(el0);
      if (cs0.position !== 'static') {
        // 相对/绝对/固定定位都用 left/top 移动；relative 的 left/top 本身就是偏移量
        var bl = parseFloat(el0.style.left); if (isNaN(bl)) bl = parseFloat(cs0.left); if (isNaN(bl)) bl = 0;
        var bt = parseFloat(el0.style.top); if (isNaN(bt)) bt = parseFloat(cs0.top); if (isNaN(bt)) bt = 0;
        dragOrigLeft = bl;
        dragOrigTop = bt;
      } else {
        dragOrigLeft = parseFloat(el0.style.marginLeft) || 0;
        dragOrigTop = parseFloat(el0.style.marginTop) || 0;
      }
      dragging = true;
      el0.classList.add('edit-dragging');
    }
    if (!selected) return;
    var scale = getStageScale();
    var f = dragFactors || { x: scale, y: scale };
    // 按校准系数换算，保证视觉位移严格等于鼠标位移（系数已含元素自身缩放与舞台缩放）
    var dx = Math.round((e.clientX - dragStartX) / (f.x || scale));
    var dy = Math.round((e.clientY - dragStartY) / (f.y || scale));
    var cs = getComputedStyle(selected);
    if (cs.position !== 'static') {
      selected.style.left = (dragOrigLeft + dx) + 'px';
      selected.style.top = (dragOrigTop + dy) + 'px';
      document.getElementById('pp-x').value = dragOrigLeft + dx;
      document.getElementById('pp-y').value = dragOrigTop + dy;
    } else {
      selected.style.marginLeft = (dragOrigLeft + dx) + 'px';
      selected.style.marginTop = (dragOrigTop + dy) + 'px';
    }
    updateResizeHandles();
  }, true);

  document.addEventListener('mouseup', function(e) {
    dragPending = false;
    dragEl = null;
    if (!dragging) { dragStartState = null; return; }
    dragging = false;
    if (selected) {
      selected.classList.remove('edit-dragging');
      selected.classList.remove('edit-no-transition');
      // 拖拽结束后记录撤销历史（记录拖拽前的状态）
      if (dragStartState && (dragOrigLeft !== parseInt(selected.style.left) || dragOrigTop !== parseInt(selected.style.top))) {
        undoStack.push({ el: selected, state: dragStartState });
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
        if (typeof markDirty === 'function') markDirty();
      }
      dragStartState = null;
      dragFactors = null;
    }
  }, true);

  // 双击编辑文字
  document.addEventListener('dblclick', function(e) {
    if (!editMode) return;
    var el = e.target.closest('.edit-clickable');
    if (el && el.children.length === 0) {
      e.stopPropagation();
      e.preventDefault();
      var textEditStartState = takeSnapshot(el);
      el.contentEditable = 'true';
      el.focus();
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      el.addEventListener('blur', function() {
        el.contentEditable = 'false';
        document.getElementById('pp-text').value = el.textContent;
        // 文字编辑后记录撤销历史（记录编辑前的状态）
        if (el.textContent !== textEditStartState.text) {
          undoStack.push({ el: el, state: textEditStartState });
          if (undoStack.length > MAX_HISTORY) undoStack.shift();
          redoStack = [];
          if (typeof markDirty === 'function') markDirty();
        }
      }, { once: true });
    }
  }, true);

  // 键盘
  document.addEventListener('keydown', function(e) {
    var tag = document.activeElement.tagName;
    var isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement.isContentEditable;
    // Ctrl+Z / Ctrl+Y 全局生效，不受输入框焦点限制
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      e.preventDefault(); e.stopPropagation();
      // 强制flush方向键移动的待记录修改（不等500ms防抖）
      clearTimeout(moveTimer);
      if (moveStartState && selected) {
        undoStack.push({ el: selected, state: moveStartState });
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
        moveStartState = null;
      }
      // 强制flush输入框的待记录修改
      clearTimeout(inputTimer);
      recordInputUndo();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      editor.undo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) {
      e.preventDefault(); e.stopPropagation();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      editor.redo(); return;
    }
    if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.metaKey && !e.altKey && !isInput) {
      e.preventDefault(); e.stopPropagation(); editor.toggle(); return;
    }
    if (!editMode || dragging) return;
    if (isInput) return;
    e.preventDefault(); e.stopPropagation();
    var step = e.shiftKey ? 1 : 10;
    if (e.key === 'ArrowUp') moveSelected(0, -step);
    else if (e.key === 'ArrowDown') moveSelected(0, step);
    else if (e.key === 'ArrowLeft') moveSelected(-step, 0);
    else if (e.key === 'ArrowRight') moveSelected(step, 0);
    else if (e.key === 'u' || e.key === 'U') selectParent();
    else if (e.key === 'd' || e.key === 'D') selectChild();
    else if (e.key === 'Escape') deselect();
    else if (e.key === 's' || e.key === 'S') editor.export();
  }, true);

  // 阻止滚轮翻页
  window.addEventListener('wheel', function(e) {
    if (editMode) { e.preventDefault(); e.stopPropagation(); }
  }, { passive: false, capture: true });

  // 定时刷新
  var lastActive = null;
  setInterval(function() {
    if (!editMode) return;
    var active = document.querySelector('.step.active');
    if (active !== lastActive) {
      lastActive = active;
      markClickable();
    }
    if (selected) updateResizeHandles();
  }, 200);
})();
