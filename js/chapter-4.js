(() => {
  const root = document.querySelector('[data-chapter-four]');
  if (!root) return;

  const scene = root.querySelector('[data-chapter-four-scene]');
  const track = root.querySelector('[data-chapter-four-track]');
  const art = root.querySelector('[data-chapter-four-art]');
  const hotspotLayer = root.querySelector('[data-chapter-four-hotspots]');
  const dim = root.querySelector('[data-chapter-four-dim]');
  const note = root.querySelector('[data-chapter-four-note]');
  const story = root.querySelector('[data-chapter-four-story]');
  const guide = root.querySelector('[data-chapter-four-guide]');
  const nextButton = root.querySelector('[data-chapter-four-next]');

  const assets = {
    merchant: '../章节说明/第四章/盐商抠图.png',
    official: '../章节说明/第四章/官员抠图.png',
    scholar: '../章节说明/第四章/和尚抠图.png'
  };

  // 坐标直接来自与背景图同尺寸的「热点位置参考.jpg」。
  // 文件夹未提供对应史料文字，故仅显示明确的待补资料状态。
  const points = [
    { id: 'pagoda', label: '宝塔与寺院群', x: 1275, y: 585, rx: 500, ry: 480, story: 'robe-mystery' },
    { id: 'archway', label: '牌楼与街市建筑群', x: 8175, y: 900, rx: 600, ry: 500, scene: 'street-market' }
  ];
  const state = { offset: 0, maxOffset: 0, playback: 'auto', held: false, drag: null, moved: false, active: null, story: null, transitionTimer: 0, lastTime: 0, frame: 0 };
  const normalSpeed = 18;
  const fastSpeed = 72;

  function metrics() {
    const height = scene.clientHeight;
    const scale = height / art.naturalHeight;
    const width = art.naturalWidth * scale;
    return { height, scale, width, maxOffset: Math.max(0, width - scene.clientWidth) };
  }
  function layout() {
    if (!art.naturalWidth || !scene.clientHeight) return;
    const { height, scale, width, maxOffset } = metrics();
    state.maxOffset = maxOffset;
    state.offset = Math.max(0, Math.min(maxOffset, state.offset));
    track.style.width = `${width}px`;
    track.style.height = `${height}px`;
    track.style.transform = `translate3d(${-state.offset}px,0,0)`;
    if (state.active) {
      dim.style.setProperty('--chapter-four-focus-x', `${state.active.x * scale - state.offset}px`);
      dim.style.setProperty('--chapter-four-focus-y', `${state.active.y * scale}px`);
      dim.style.setProperty('--chapter-four-focus-rx', `${Math.max(100, state.active.rx * scale)}px`);
      dim.style.setProperty('--chapter-four-focus-ry', `${Math.max(90, state.active.ry * scale)}px`);
    }
  }
  function renderHotspots() {
    hotspotLayer.replaceChildren();
    points.forEach((point) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chapter-four__hotspot${point.story ? ' chapter-four__hotspot--temple' : ''}`;
      button.dataset.pointId = point.id;
      button.style.left = `${point.x / art.naturalWidth * 100}%`;
      button.style.top = `${point.y / art.naturalHeight * 100}%`;
      button.setAttribute('aria-label', point.label);
      button.innerHTML = '<span></span>';
      button.addEventListener('pointerdown', (event) => event.stopPropagation());
      button.addEventListener('click', (event) => { event.stopPropagation(); if (!state.moved) openPoint(point); });
      hotspotLayer.append(button);
      if (point.story) {
        const tooltip = document.createElement('p');
        tooltip.className = 'chapter-four__hotspot-tooltip';
        tooltip.style.left = `${point.x / art.naturalWidth * 100}%`;
        tooltip.style.top = `${point.y / art.naturalHeight * 100}%`;
        tooltip.textContent = '佛塔之下，似乎有八人在密议一件不寻常的事。';
        hotspotLayer.append(tooltip);
      }
    });
  }
  function setSelectedHotspot(id) {
    hotspotLayer.querySelectorAll('.chapter-four__hotspot').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.pointId === id);
    });
  }
  const secretDialogues = {
    officials: [
      { speaker: 'merchant', name: '盐商', text: '“听说皇上南巡，还想找懂佛法的高僧聊一聊。可要找到既熟悉佛经、又能应对御前问答的人，也不容易。”' },
      { speaker: 'official', name: '官员', text: '“这事可不能随便应付。若是皇上问起佛法，对方答不上来，谁来担这个责任？”' },
      { speaker: 'merchant', name: '盐商', text: '“我倒有个主意。有些读书人熟读佛经，只是没有出家。若请他们暂时扮作僧人，或许也能应对。”' },
      { speaker: 'official', name: '官员', text: '“让读书人扮作僧人？此事若要安排，务必周全，千万不能在御前露出破绽。”' }
    ],
    scholar: [
      { speaker: 'scholar', name: '文人', text: '“让我穿上僧衣去见皇上？这可不是闹着玩的，万一露了馅，我这身僧衣怕是脱得下来，人可就走不了了。”' },
      { speaker: 'merchant', name: '盐商', text: '“先生熟读佛经，只需将平日所学从容道来，想必难不倒你。”' },
      { speaker: 'merchant', name: '盐商', text: '“事若办成，酬劳自不会少。先生只管安心，其他的我们自会安排妥当。”' },
      { speaker: 'scholar', name: '文人', text: '“话虽如此，可万一皇上听得高兴，当场赐我法号，还要留我在寺里修行，那我岂不是连还俗的机会都没了？”' },
      { speaker: 'merchant', name: '盐商', text: '“先生多虑了。我们既然请你来，自然会事先安排周全，绝不会让先生平白担下这份风险。”' }
    ]
  };
  function portraitMarkup(type, activeSpeaker) {
    const characters = type === 'officials'
      ? [{ id: 'merchant', alt: '盐商', src: assets.merchant }, { id: 'official', alt: '官员', src: assets.official }]
      : [{ id: 'merchant', alt: '盐商', src: assets.merchant }, { id: 'scholar', alt: '文人', src: assets.scholar }];
    return characters.map(({ id, alt, src }) => `<img class="chapter-four__story-portrait chapter-four__story-portrait--${id}${id === activeSpeaker ? ' is-speaking' : ''}" src="${src}" alt="${alt}">`).join('');
  }
  function renderStory() {
    const current = state.story;
    if (!current) return;
    let content = '';
    if (current.phase === 'officials' || current.phase === 'scholar') {
      const line = secretDialogues[current.phase][current.index];
      if (story.dataset.phase === current.phase) {
        story.querySelectorAll('.chapter-four__story-portrait').forEach((portrait) => portrait.classList.toggle('is-speaking', portrait.classList.contains(`chapter-four__story-portrait--${line.speaker}`)));
        story.querySelector('.chapter-four__story-copy').innerHTML = `<p class="chapter-four__story-speaker">${line.name}</p><p>${line.text}</p>`;
        story.querySelector('.chapter-four__story-copy').classList.add('is-updating');
        window.setTimeout(() => story.querySelector('.chapter-four__story-copy')?.classList.remove('is-updating'), 260);
        return;
      }
      content = `<div class="chapter-four__story-portraits chapter-four__story-portraits--${current.phase}">${portraitMarkup(current.phase, line.speaker)}</div><div class="chapter-four__story-copy"><p class="chapter-four__story-speaker">${line.name}</p><p>${line.text}</p></div>`;
    } else if (current.phase === 'handoff') {
      content = '<div class="chapter-four__story-copy chapter-four__story-copy--reveal"><p>那么，这位即将穿上僧衣的人，又在担心什么？</p></div>';
    } else if (current.phase === 'reveal') {
      const entries = [
        '僧衣之下，未必是真正的出家人。',
        '迎接皇帝南巡，不只是沿途布置与仪仗安排。地方商人也可能借助财富、人脉和文化资源，参与迎銮活动，争取朝廷的信任与赏识。',
        '假剃度的故事，呈现出盛大迎銮背后的另一面：财富、文化与政治利益，彼此交织。'
      ];
      content = `<div class="chapter-four__story-copy chapter-four__story-copy--reveal"><p>${entries[current.index]}</p></div>`;
    }
    story.innerHTML = content;
    story.dataset.phase = current.phase;
    story.hidden = false;
  }
  function startStory(point) {
    window.clearTimeout(state.transitionTimer);
    story.classList.remove('is-fading');
    state.active = point;
    state.story = { phase: 'officials', index: 0 };
    state.held = false;
    state.playback = 'manual';
    note.hidden = true;
    guide.hidden = true;
    dim.hidden = false;
    setSelectedHotspot(point.id);
    renderStory();
    layout();
  }
  function advanceStory() {
    const current = state.story;
    if (!current) return;
    if (current.phase === 'officials') {
      if (current.index < secretDialogues.officials.length - 1) { current.index += 1; renderStory(); return; }
      if (current.transitioning) return;
      current.transitioning = true;
      story.classList.add('is-fading');
      state.transitionTimer = window.setTimeout(() => {
        story.classList.remove('is-fading');
        state.story = { phase: 'handoff' };
        renderStory();
      }, 650);
      return;
    }
    if (current.phase === 'handoff') {
      state.story = { phase: 'scholar', index: 0 };
      renderStory();
      return;
    }
    if (current.phase === 'scholar') {
      if (current.index < secretDialogues.scholar.length - 1) { current.index += 1; renderStory(); return; }
      state.story = { phase: 'reveal', index: 0 };
      renderStory();
      return;
    }
    if (current.index < 2) { current.index += 1; renderStory(); return; }
    closePoint();
    guide.textContent = '僧衣之谜已揭开，继续浏览画卷。';
    guide.hidden = false;
    if (nextButton) nextButton.hidden = false;
  }
  function openPoint(point) {
    if (point.story) { startStory(point); return; }
    if (point.scene === 'street-market') {
      state.held = false;
      state.playback = 'manual';
      setSelectedHotspot(point.id);
      window.dispatchEvent(new CustomEvent('street-market:open', { detail: { source: point.id, offset: state.offset } }));
      return;
    }
    if (state.playback === 'auto') state.playback = 'manual';
    state.active = point;
    state.held = false;
    note.innerHTML = '<h2>资料待补</h2><p>此处热点已依据第四章「热点位置参考」图定位。当前素材文件夹未提供对应的历史说明文字，待补充资料后可在此展示。</p>';
    note.hidden = false;
    dim.hidden = false;
    setSelectedHotspot(point.id);
    layout();
  }
  function closePoint() {
    const wasStory = Boolean(state.story);
    window.clearTimeout(state.transitionTimer);
    story.classList.remove('is-fading');
    state.active = null;
    state.story = null;
    note.hidden = true;
    story.hidden = true;
    story.replaceChildren();
    delete story.dataset.phase;
    dim.hidden = true;
    setSelectedHotspot('');
    if (wasStory) guide.hidden = true;
    layout();
  }
  window.addEventListener('street-market:close', () => {
    // 漫游层关闭后回到原有画卷偏移；不恢复自动播放，也不保留误导性的选中态。
    setSelectedHotspot('');
    layout();
  });
  function tick(now) {
    const elapsed = state.lastTime ? Math.min(48, now - state.lastTime) : 0;
    state.lastTime = now;
    if (state.playback === 'auto' && !state.active && !state.drag?.moving && !document.hidden && state.offset > 0) {
      state.offset = Math.max(0, state.offset - (state.held ? fastSpeed : normalSpeed) * elapsed / 1000);
      if (state.offset === 0) { state.playback = 'completed'; state.held = false; }
      layout();
    }
    state.frame = requestAnimationFrame(tick);
  }
  function beginPointer(event) {
    state.moved = false;
    scene.setPointerCapture(event.pointerId);
    state.held = state.playback === 'auto';
    state.drag = { id: event.pointerId, x: event.clientX, offset: state.offset, moving: false };
  }
  scene.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || state.active || event.target.closest('button, .chapter-four__note')) return;
    event.preventDefault();
    beginPointer(event);
  });
  scene.addEventListener('pointermove', (event) => {
    const drag = state.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const distance = event.clientX - drag.x;
    if (!drag.moving && Math.abs(distance) > 4) {
      drag.moving = true;
      state.moved = true;
      state.held = false;
      if (state.playback === 'auto') state.playback = 'manual';
    }
    if (drag.moving) {
      state.offset = Math.max(0, Math.min(state.maxOffset, drag.offset - distance));
      layout();
    }
  });
  const endPointer = (event) => {
    if (!state.drag || state.drag.id !== event.pointerId) return;
    if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
    state.held = false;
    state.drag = null;
    window.setTimeout(() => { state.moved = false; }, 0);
  };
  scene.addEventListener('pointerup', endPointer);
  scene.addEventListener('pointercancel', endPointer);
  scene.addEventListener('lostpointercapture', () => { state.held = false; state.drag = null; });
  scene.addEventListener('dragstart', (event) => event.preventDefault());
  scene.addEventListener('contextmenu', (event) => event.preventDefault());
  dim.addEventListener('click', () => {
    if (state.story) advanceStory();
    else closePoint();
  });
  if (nextButton) nextButton.addEventListener('click', () => { window.location.href = '../pages/chapter-5.html'; });
  window.addEventListener('blur', () => { state.held = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) state.held = false; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.active) closePoint(); });
  new ResizeObserver(layout).observe(scene);
  art.addEventListener('load', () => {
    state.offset = metrics().maxOffset;
    renderHotspots();
    layout();
    state.frame = requestAnimationFrame(tick);
  }, { once: true });
  if (art.complete) art.dispatchEvent(new Event('load'));
  window.addEventListener('pagehide', () => cancelAnimationFrame(state.frame), { once: true });
})();
