(() => {
  const root = document.querySelector('[data-street-market]');
  if (!root) return;

  const canvas = root.querySelector('[data-street-market-canvas]');
  const context = canvas.getContext('2d');
  const prompt = root.querySelector('[data-street-market-prompt]');
  const help = root.querySelector('[data-street-market-help]');
  const dialogue = root.querySelector('[data-street-market-dialogue]');
  const recordsButton = root.querySelector('[data-street-market-records]');
  const recordsPanel = root.querySelector('[data-street-market-records-panel]');
  const recordCount = root.querySelector('[data-street-market-record-count]');

  const assets = {
    // 戏台热点打开后的原画局部：固定展示，不作为可拖拽长卷。
    background: '../章节说明/第四章/戏台热点点击后的图片.png',
    player: '../章节说明/第四章/玩家角色.png'
  };

  // 所有值均为「戏台热点点击后的图片.png」（2556 × 1384）中的原画像素坐标。
  // ?debug=1 可显示道路与交互半径，正式展示默认关闭。
  const config = {
    speed: 285,
    start: { x: 340, y: 1015 },
    player: {
      visibleHeight: 168,
      minScale: .84,
      maxScale: 1.13,
      farY: 930,
      nearY: 1085,
      filter: 'saturate(.84) brightness(.93) contrast(.94)'
    },
    road: [[78, 930], [2475, 918], [2475, 1082], [78, 1092]],
    obstacles: [
      [[1030, 924], [1475, 922], [1475, 950], [1030, 956]],
      [[1850, 920], [2225, 918], [2225, 946], [1850, 950]]
    ],
    objects: [
      { id: 'stage', name: '戏台', x: 1275, y: 940, radius: 225, record: '街市观戏' },
      { id: 'vendor', name: '街边商贩', x: 254, y: 1000, radius: 128, record: '商贩闲谈' },
      { id: 'official', name: '随行官员', x: 1995, y: 995, radius: 138, record: '随行见闻' }
    ]
  };

  const background = new Image();
  const playerImage = new Image();
  background.src = assets.background;
  playerImage.src = assets.player;
  const debug = new URLSearchParams(window.location.search).has('debug');

  const state = {
    open: false, player: { ...config.start }, keys: new Set(), current: null,
    unlocked: new Set(), dialogue: null, recordsOpen: false, frame: 0, last: 0,
    direction: 1, playerBounds: null, assetsReady: false, assetsChecked: false
  };

  const vendorLines = [
    { name: '百姓甲', text: '听说皇上南巡，沿途张灯结彩，还搭了好些戏台，真是热闹非凡！这些银钱，都是朝廷出的吗？' },
    { name: '百姓乙', text: '朝廷拨了银两，可三千多人的吃穿用度，加上沿途修建行在，花销可不小。听说两淮盐商也捐了不少银子，皇上还给了他们赏赐。' },
    { name: '百姓甲', text: '难怪运河里有灯船，街巷里有彩灯，戏台上还唱着祝寿的戏！这阵仗，可真够气派。' },
    { name: '百姓乙', text: '可不是嘛！盐商出钱张罗场面，皇上得了体面，他们也得了恩遇。只是这热闹背后的银钱往来，咱们寻常百姓可未必看得明白。' }
  ];
  const officialLines = [
    { name: '随行官员', text: '沿途事务繁杂，接待、物资与日常调度都要逐项照看。' }
  ];

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j];
      const crosses = ((yi > point.y) !== (yj > point.y)) && point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi;
      if (crosses) inside = !inside;
    }
    return inside;
  }
  function canWalk(position) {
    return pointInPolygon(position, config.road) && !config.obstacles.some((obstacle) => pointInPolygon(position, obstacle));
  }
  function metrics() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / background.naturalWidth, rect.height / background.naturalHeight);
    return {
      rect, scale,
      offsetX: (rect.width - background.naturalWidth * scale) / 2,
      offsetY: (rect.height - background.naturalHeight * scale) / 2
    };
  }
  function screenPoint(point, scene = metrics()) {
    return { x: scene.offsetX + point.x * scene.scale, y: scene.offsetY + point.y * scene.scale };
  }
  function updateCurrent() {
    if (state.dialogue || state.recordsOpen) return;
    let closest = null; let distance = Infinity;
    config.objects.forEach((object) => {
      const nextDistance = Math.hypot(object.x - state.player.x, object.y - state.player.y);
      if (nextDistance <= object.radius && nextDistance < distance) { closest = object; distance = nextDistance; }
    });
    state.current = closest;
    prompt.hidden = !closest;
    if (closest) prompt.textContent = `按 E 交谈 · ${closest.name}`;
  }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function alphaBounds(image) {
    const scratch = document.createElement('canvas');
    scratch.width = image.naturalWidth; scratch.height = image.naturalHeight;
    const scratchContext = scratch.getContext('2d', { willReadFrequently: true });
    scratchContext.drawImage(image, 0, 0);
    const { data } = scratchContext.getImageData(0, 0, scratch.width, scratch.height);
    let left = scratch.width; let top = scratch.height; let right = -1; let bottom = -1;
    for (let y = 0; y < scratch.height; y += 1) for (let x = 0; x < scratch.width; x += 1) {
      if (data[(y * scratch.width + x) * 4 + 3] > 12) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
    }
    return right < 0 ? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight } : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  }
  function perspectiveScale(y) {
    const progress = Math.max(0, Math.min(1, (y - config.player.farY) / (config.player.nearY - config.player.farY)));
    return config.player.minScale + (config.player.maxScale - config.player.minScale) * progress;
  }
  function drawPlayer(time, scene) {
    if (!state.playerBounds || !playerImage.naturalWidth) return;
    const bounds = state.playerBounds;
    const targetHeight = config.player.visibleHeight * perspectiveScale(state.player.y) * scene.scale;
    const targetWidth = targetHeight * bounds.width / bounds.height;
    const foot = screenPoint(state.player, scene);
    const moving = state.keys.size > 0 && !state.dialogue && !state.recordsOpen;
    const bob = moving ? Math.sin(time / 105) * 1.4 : 0;
    context.save();
    context.filter = config.player.filter;
    context.translate(foot.x, foot.y + bob);
    if (state.direction < 0) context.scale(-1, 1);
    context.drawImage(playerImage, bounds.x, bounds.y, bounds.width, bounds.height, -targetWidth / 2, -targetHeight, targetWidth, targetHeight);
    context.restore();
  }
  function drawDebug(scene) {
    if (!debug) return;
    const drawPolygon = (polygon, fill, stroke) => {
      context.beginPath();
      polygon.forEach((point, index) => {
        const screen = screenPoint({ x: point[0], y: point[1] }, scene);
        if (index) context.lineTo(screen.x, screen.y); else context.moveTo(screen.x, screen.y);
      });
      context.closePath(); context.fillStyle = fill; context.fill(); context.strokeStyle = stroke; context.lineWidth = 1; context.stroke();
    };
    drawPolygon(config.road, 'rgba(90,150,105,.15)', 'rgba(50,112,69,.86)');
    config.obstacles.forEach((obstacle) => drawPolygon(obstacle, 'rgba(156,60,44,.18)', 'rgba(130,47,35,.88)'));
    config.objects.forEach((object) => {
      const point = screenPoint(object, scene);
      context.beginPath(); context.arc(point.x, point.y, object.radius * scene.scale, 0, Math.PI * 2); context.strokeStyle = 'rgba(199,134,54,.9)'; context.stroke();
    });
  }
  function draw(time) {
    if (!state.open || !background.naturalWidth) return;
    const scene = metrics();
    context.clearRect(0, 0, scene.rect.width, scene.rect.height);
    context.drawImage(background, scene.offsetX, scene.offsetY, background.naturalWidth * scene.scale, background.naturalHeight * scene.scale);
    drawPlayer(time, scene); drawDebug(scene);
  }
  function advanceMovement(elapsed) {
    if (state.dialogue || state.recordsOpen) return;
    const horizontal = (state.keys.has('ArrowRight') || state.keys.has('KeyD') ? 1 : 0) - (state.keys.has('ArrowLeft') || state.keys.has('KeyA') ? 1 : 0);
    const vertical = (state.keys.has('ArrowDown') || state.keys.has('KeyS') ? 1 : 0) - (state.keys.has('ArrowUp') || state.keys.has('KeyW') ? 1 : 0);
    if (!horizontal && !vertical) return;
    const length = Math.hypot(horizontal, vertical);
    const next = { x: state.player.x + horizontal / length * config.speed * elapsed, y: state.player.y + vertical / length * config.speed * elapsed };
    if (canWalk(next)) state.player = next;
    else {
      const alongX = { x: next.x, y: state.player.y }; const alongY = { x: state.player.x, y: next.y };
      if (canWalk(alongX)) state.player = alongX; else if (canWalk(alongY)) state.player = alongY;
    }
    if (horizontal) state.direction = horizontal;
    updateCurrent();
  }
  function loop(time) {
    const elapsed = state.last ? Math.min(.04, (time - state.last) / 1000) : 0;
    state.last = time; advanceMovement(elapsed); draw(time);
    if (state.open) state.frame = requestAnimationFrame(loop);
  }
  function unlock(object) { state.unlocked.add(object.id); recordCount.textContent = String(state.unlocked.size); renderRecords(); }
  function recordText(id) {
    if (id === 'stage') return '街市观戏：南巡期间，盐商曾组织戏曲演出，以迎銮承应的形式营造沿途仪典。具体剧目与组织细节仍待补充可核实资料。';
    if (id === 'vendor') return '商贩闲谈：灯船、彩灯与戏台背后，既有朝廷经费，也有盐商捐助与地方经营。';
    return '随行见闻：围绕接待、物资供应与地方事务的叙述，需区分经核实史料与情境化表达。';
  }
  function renderRecords() {
    const items = config.objects.filter((object) => state.unlocked.has(object.id));
    recordsPanel.innerHTML = `<header><p>探索记录</p><button type="button" data-record-close aria-label="关闭街市见闻">×</button></header>${items.length ? `<ul>${items.map((object) => `<li><strong>${object.record}</strong><span>${recordText(object.id)}</span></li>`).join('')}</ul>` : '<p class="street-market__records-empty">尚未留下见闻。靠近戏台、商贩或随行官员，按 E 开始探索。</p>'}`;
  }
  function showDialogue(object, index = 0) { state.dialogue = { object, index }; state.current = null; prompt.hidden = true; unlock(object); dialogue.hidden = false; renderDialogue(); }
  function renderDialogue() {
    const active = state.dialogue; if (!active) return;
    const { object, index } = active;
    if (object.id === 'stage') {
      dialogue.innerHTML = '<p class="street-market__dialogue-kicker">街市见闻</p><h2>街市观戏</h2><p class="street-market__dialogue-body">南巡期间，盐商曾组织戏曲演出，以迎銮承应的形式营造沿途仪典。具体剧目、地点与组织细节仍待补充经核实的史料。</p><div class="street-market__dialogue-actions"><button data-dialogue-close type="button">继续漫游</button></div>';
      return;
    }
    const lines = object.id === 'vendor' ? vendorLines : officialLines;
    if (index < lines.length) {
      const line = lines[index];
      dialogue.innerHTML = `<p class="street-market__dialogue-kicker">${object.name}</p><h2>${line.name}</h2><p class="street-market__dialogue-body">${line.text}</p><p class="street-market__dialogue-next">点击此处继续</p>`;
      return;
    }
    dialogue.innerHTML = object.id === 'vendor'
      ? '<p class="street-market__dialogue-kicker">商贩闲谈</p><h2>对话结束</h2><p class="street-market__dialogue-body">热闹背后的银钱往来，仍留在街巷的闲谈之中。</p><div class="street-market__dialogue-actions"><button data-dialogue-replay type="button">再听一遍</button><button data-dialogue-close type="button">继续漫游</button></div>'
      : '<p class="street-market__dialogue-kicker">随行见闻</p><h2>对话结束</h2><div class="street-market__dialogue-actions"><button data-dialogue-close type="button">继续漫游</button></div>';
  }
  function advanceDialogue() { if (!state.dialogue) return; if (state.dialogue.object.id === 'stage') { closeDialogue(); return; } state.dialogue.index += 1; renderDialogue(); }
  function closeDialogue() { state.dialogue = null; dialogue.hidden = true; dialogue.replaceChildren(); updateCurrent(); }
  function open() {
    state.open = true; state.keys.clear(); state.player = { ...config.start }; state.current = null; state.last = 0;
    root.hidden = false; root.classList.add('is-open'); help.hidden = false;
    help.textContent = state.assetsChecked && !state.assetsReady ? '场景素材加载失败，请返回原画后重试。' : 'WASD / 方向键移动 · 靠近对象后按 E 交谈 · Esc 返回';
    resizeCanvas(); updateCurrent(); cancelAnimationFrame(state.frame); state.frame = requestAnimationFrame(loop);
  }
  function close() {
    state.open = false; state.keys.clear(); state.current = null; state.recordsOpen = false; closeDialogue(); recordsPanel.hidden = true; prompt.hidden = true;
    root.classList.remove('is-open'); root.hidden = true; cancelAnimationFrame(state.frame); window.dispatchEvent(new CustomEvent('street-market:close'));
  }

  window.addEventListener('street-market:open', open);
  root.querySelector('[data-street-market-exit]').addEventListener('click', close);
  recordsButton.addEventListener('click', () => { state.recordsOpen = !state.recordsOpen; recordsPanel.hidden = !state.recordsOpen; if (state.recordsOpen) renderRecords(); });
  recordsPanel.addEventListener('click', (event) => { if (event.target.closest('[data-record-close]')) { state.recordsOpen = false; recordsPanel.hidden = true; updateCurrent(); } });
  dialogue.addEventListener('click', (event) => { if (event.target.closest('[data-dialogue-close]')) { closeDialogue(); return; } if (event.target.closest('[data-dialogue-replay]')) { state.dialogue.index = 0; renderDialogue(); return; } if (!event.target.closest('button')) advanceDialogue(); });
  window.addEventListener('keydown', (event) => {
    if (!state.open) return;
    const key = event.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Escape'].includes(key)) event.preventDefault();
    if (key === 'Escape') { if (state.recordsOpen) { state.recordsOpen = false; recordsPanel.hidden = true; updateCurrent(); } else if (state.dialogue) closeDialogue(); else close(); return; }
    if (key === 'KeyE' && !event.repeat && !state.dialogue && !state.recordsOpen && state.current) showDialogue(state.current);
    if (!event.repeat && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(key)) state.keys.add(key);
  });
  window.addEventListener('keyup', (event) => state.keys.delete(event.code));
  window.addEventListener('blur', () => state.keys.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) state.keys.clear(); });
  new ResizeObserver(() => { if (state.open) resizeCanvas(); }).observe(root);
  Promise.all([background, playerImage].map((image) => new Promise((resolve) => { if (image.complete) resolve(); else { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); } }))).then(() => {
    state.assetsChecked = true; state.assetsReady = Boolean(background.naturalWidth && playerImage.naturalWidth);
    if (state.assetsReady) { try { state.playerBounds = alphaBounds(playerImage); } catch { state.playerBounds = { x: 0, y: 0, width: playerImage.naturalWidth, height: playerImage.naturalHeight }; } }
    if (state.open && !state.assetsReady) help.textContent = '场景素材加载失败，请返回原画后重试。';
  });
})();
