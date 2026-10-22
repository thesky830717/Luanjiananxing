(() => {
  const root = document.querySelector('[data-chapter-three]');
  if (!root) return;

  const scene = root.querySelector('[data-chapter-three-scene]');
  const track = root.querySelector('[data-chapter-three-track]');
  const art = root.querySelector('[data-chapter-three-art]');
  const hotspotLayer = root.querySelector('[data-chapter-three-hotspots]');
  const dim = root.querySelector('[data-chapter-three-dim]');
  const note = root.querySelector('[data-chapter-three-note]');
  const videoWrap = root.querySelector('[data-chapter-three-video]');
  const video = root.querySelector('[data-chapter-three-video-player]');
  const videoStatus = root.querySelector('[data-chapter-three-video-status]');
  const nextButton = root.querySelector('[data-chapter-three-next]');
  const towpathModal = root.querySelector('[data-towpath-modal]');
  const towpathProgress = root.querySelector('[data-towpath-progress]');
  const towpathContent = root.querySelector('[data-towpath-content]');

  // 「热点位置.jpg」红圈按 5683×937 → 原画 2.jpg 11764×1944 换算。
  const points = [
    { id: 'towpath-workers', label: '御舟纤夫', x: 1677, y: 1210, rx: 118, ry: 95, modal: true },
    { id: 'imperial-boat', label: '皇船', x: 5253, y: 1216, rx: 236, ry: 176, video: true,
      texts: ['圣驾经过，地方需提前清理航道。民船暂停通行。', '一条属于所有人的河，在此刻成为一条属于皇权的道路。'] },
    { id: 'blue-curtain', label: '蓝色帷幕', x: 2633, y: 1220, rx: 118, ry: 95, title: '《平望火警》',
      texts: [
        '平望镇，今属苏州市吴江区，自明清以来便是运河上十分繁华的商埠。运河两岸商铺鳞次栉比，南来北往车船交汇，昼夜喧嚣不息。\n\n乾隆皇帝的御舟途经平望时，正值百姓炊烟四起、生火做饭之时。随驾御前侍卫忽见前方楼阁上有飘忽闪烁的火光，误以为有刺客潜藏，意图危及圣驾，立刻从舟中放箭。火光处的人应声倒地。',
        '地方官吏赶到现场查验，才发现中箭身亡的是一名普通女子。她开窗生火，只是打算烧饭，并没有刻意回避御舟，却被侍卫误认成刺驾之人，平白枉送性命。\n\n这般盛世繁华的背后，藏着一段无人知晓、令人叹惋的悲情往事。'
      ] },
    { id: 'kneeling-woman', label: '岸边跪着的妇女', x: 4649, y: 1759, rx: 147, ry: 117, title: '《帷幕后影》', image: '../章节说明/第三章/蓝色帷幕示意图.png',
      texts: [
        '皇帝的车驾穿州过府，所到之处都会预先架设起一道蓝色的帷幕，示意闲杂人等回避。\n\n同理，皇帝经由水路行进时，地方官办皇差者要在运河两岸之支港汊河、桥头以及村口设立卡兵，禁止民船出入。御舟行时，塘河两岸，左右打纤。每纤道一里，设有值守兵丁。',
        '御驾行经之处，男子须依规定回避。沿途警戒严格，擅自接近御驾可能以惊扰圣驾论处。\n\n但后来特许包括民妇、命妇在内的女子跪伏瞻仰圣驾，不必完全回避。但能够留在沿途观看，并不意味着可以自由行动，仍须遵守御驾警戒要求。\n\n但此种安排，却引发了“平望火警血案”。'
      ] }
  ];
  const state = {
    offset: 0, maxOffset: 0, held: false, drag: null, suppressHotspotClick: false,
    playback: 'auto', currentHotspot: null, currentTextIndex: 0,
    isVideoPlaying: false, isVideoAwaitingAdvance: false, isNarrativeActive: false,
    explored: new Set(), lastTime: 0, frame: 0
  };
  const normalSpeed = 18;
  const fastSpeed = 72;
  const towpath = { step: 1, choice: null, dialogueIndex: 0 };
  const dialogue = [
    ['下属', '大人，这次御舟经过吴江，沿途要不要再多安排一些纤夫？'],
    ['邵大业', '现在安排的人手，应该还能再仔细调配一下。'],
    ['邵大业', '如果只为稳妥就不断加人，沿岸百姓得耽误多少生计？'],
    ['下属', '可人手少了，万一船行缓慢，耽误皇上的行程怎么办？'],
    ['邵大业', '百姓也有自己的日子要过，不能什么重担都压在他们身上。'],
    ['下属', '道理诚然如此，可接驾一旦出了差错，追责下来，是大人您担罪。'],
    ['邵大业', '我明白。先尽力调配好现有的人手吧。']
  ];

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
    track.style.transform = `translate3d(${-state.offset}px, 0, 0)`;
    if (state.currentHotspot) {
      const point = state.currentHotspot;
      dim.style.setProperty('--chapter-three-focus-x', `${(point.x * scale) - state.offset}px`);
      dim.style.setProperty('--chapter-three-focus-y', `${point.y * scale}px`);
      dim.style.setProperty('--chapter-three-focus-rx', `${Math.max(90, point.rx * scale)}px`);
      dim.style.setProperty('--chapter-three-focus-ry', `${Math.max(85, point.ry * scale)}px`);
      if (state.isNarrativeActive) positionNote(point, scale);
    }
  }
  function positionNote(point, scale) {
    const sceneWidth = scene.clientWidth;
    const sceneHeight = scene.clientHeight;
    const noteWidth = point.image ? Math.min(sceneWidth * 0.72, 1150) : Math.min(sceneWidth * 0.4, 500);
    const margin = 24;
    const screenX = (point.x * scale) - state.offset;
    const screenY = point.y * scale;
    const radiusX = Math.max(90, point.rx * scale);
    const radiusY = Math.max(85, point.ry * scale);
    const rightSide = screenX < sceneWidth * 0.56;
    const desiredLeft = point.image
      ? screenX - noteWidth * 0.5
      : rightSide ? screenX + radiusX + 26 : screenX - radiusX - noteWidth - 26;
    const noteHeight = note.offsetHeight || 220;
    const desiredTop = point.image
      ? screenY - noteHeight - 64
      : point.id === 'blue-curtain'
        ? screenY - 22
      : screenY > sceneHeight * 0.64 ? screenY - noteHeight - radiusY - 18 : screenY + radiusY + 18;
    note.style.left = `${Math.max(margin, Math.min(sceneWidth - noteWidth - margin, desiredLeft))}px`;
    note.style.top = `${Math.max(margin, Math.min(sceneHeight - noteHeight - margin, desiredTop))}px`;
  }
  function syncHotspots() {
    hotspotLayer.querySelectorAll('button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.pointId === state.currentHotspot?.id);
      button.classList.toggle('is-explored', state.explored.has(button.dataset.pointId));
    });
    if (nextButton) nextButton.hidden = !(state.explored.size === points.length && !state.currentHotspot);
  }
  function renderHotspots() {
    hotspotLayer.replaceChildren();
    points.forEach((point) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.pointId = point.id;
      button.className = 'chapter-three__hotspot';
      button.style.left = `${(point.x / art.naturalWidth) * 100}%`;
      button.style.top = `${(point.y / art.naturalHeight) * 100}%`;
      button.setAttribute('aria-label', point.label);
      button.innerHTML = '<span></span>';
      button.addEventListener('pointerdown', (event) => { if (event.button === 0) event.stopPropagation(); });
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (state.suppressHotspotClick) { state.suppressHotspotClick = false; return; }
        openHotspot(point);
      });
      hotspotLayer.append(button);
    });
    syncHotspots();
  }
  function setTowpathStep(step) {
    towpath.step = step;
    if (step === 4) towpath.dialogueIndex = 0;
    renderTowpath();
  }
  function renderTowpath() {
    towpathProgress.replaceChildren();
    [1, 2, 3, 4, 5].forEach((number) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.towpathStep = number;
      button.textContent = number;
      button.className = number === towpath.step ? 'is-current' : number < towpath.step ? 'is-complete' : number === towpath.step + 1 ? 'is-next' : '';
      button.setAttribute('aria-label', `查看节点 ${number}`);
      towpathProgress.append(button);
    });
    const choiceName = towpath.choice === 'more' ? '增派纤夫，保障御舟行程。' : '双纤改单纤，减轻百姓负担。';
    const branch = towpath.choice === 'more'
      ? '<h3>✅ 对皇帝与随行官员</h3><ul><li>御舟行程更稳妥，行进速度有保障。</li><li>接驾筹备工作更容易按期完成。</li></ul><h3>⚠️ 对沿岸普通百姓</h3><ul><li>更多百姓被征调，承担拉纤劳役。</li><li>农户被迫放下农耕，生意人中断营生。</li><li>地方徭役加重，很多家庭生计受影响。</li></ul>'
      : '<h3>✅ 对沿岸普通百姓</h3><ul><li>需要服役拉纤的人数变少。</li><li>大部分百姓可以照常耕作、维持生计。</li><li>临时征调民力带来的压力得到缓解。</li></ul><h3>⚠️ 对承办的地方官员</h3><ul><li>可用人手变少，行程调度难度上升。</li><li>遇到大风、浅滩、河道阻滞，极易延误行程。</li><li>一旦耽误御驾日程，主事官员会被追责问罪。</li></ul>';
    const [speaker, line] = dialogue[towpath.dialogueIndex];
    const isShao = speaker === '邵大业';
    const views = {
      1: `<div class="towpath-modal__intro"><img src="../章节说明/第三章/纤夫拉船抠图.png" alt="运河纤夫拉纤插画"><div><h3>嘏须纤 历史解释</h3><p>南巡队伍抵达江南水乡之后，乾隆皇帝自江苏宿迁弃马登舟，沿大运河南下苏州、杭州。御舟体量巨大，在运河中航行，依靠两岸纤夫牵拉前行，这种牵拉御舟的劳役，名为“嘏须纤”。</p><p>南巡沿途一共征调纤夫三千六百人，分班轮流拉纤。征调纤夫，就要从沿岸民间抽调劳动力，给百姓带来沉重劳役负担。</p><small>拨动进度节点，看一看地方官的两难抉择 ↓</small></div></div>`,
      2: `<div class="towpath-modal__center"><h3>两难抉择</h3><p>如果由你负责安排御舟行程，你会怎么选择？</p><div class="towpath-modal__choices"><button data-towpath-choice="more" class="${towpath.choice === 'more' ? 'is-selected' : ''}">增派纤夫，保障御舟行程。</button><button data-towpath-choice="less" class="${towpath.choice === 'less' ? 'is-selected' : ''}">双纤改单纤，减轻百姓负担。</button></div></div>`,
      3: towpath.choice ? `<div class="towpath-modal__branch"><h3>抉择的代价</h3><p class="towpath-modal__choice-name">你的选择：${choiceName}</p>${branch}<small>继续点击节点，看看历史里邵大业做出了怎样的选择。</small></div>` : '<div class="towpath-modal__center"><h3>抉择的代价</h3><p>请先完成节点 2 的选择，再查看对应的历史代价。</p><button class="towpath-modal__action" data-towpath-go="2">返回选择</button></div>',
      4: `<div class="towpath-modal__dialogue"><img class="${isShao ? 'is-speaking' : ''}" src="../章节说明/第三章/邵大业抠图.png" alt="邵大业立绘"><div data-towpath-dialogue><p class="towpath-modal__speaker">${speaker}</p><p class="towpath-modal__line">${line}</p><button class="towpath-modal__action" data-towpath-continue>${towpath.dialogueIndex === dialogue.length - 1 ? '查看史实小结' : '继续'}</button></div><img class="${!isShao ? 'is-speaking' : ''}" src="../章节说明/第三章/下属抠图.png" alt="下属立绘"></div>`,
      5: '<div class="towpath-modal__center towpath-modal__summary"><h3>史实小结</h3><p>邵大业筹办南巡接驾事务时，有意缩减拉纤人力，体恤江南百姓。但他负责修建的吴江帐殿恰逢连日阴雨，没能按时完工，遭到弹劾，最终被降职。</p><div class="towpath-modal__actions"><button class="towpath-modal__action" data-towpath-go="2">重新选择</button><button class="towpath-modal__action" data-towpath-close>完成阅读</button></div></div>'
    };
    towpathContent.innerHTML = views[towpath.step];
  }
  function openTowpathModal() {
    if (state.playback === 'auto') state.playback = 'manual';
    resetInteraction();
    towpathModal.hidden = false;
    setTowpathStep(1);
  }
  function closeTowpathModal() {
    towpathModal.hidden = true;
  }
  function showNarrative() {
    const point = state.currentHotspot;
    if (!point) return;
    note.replaceChildren();
    const copy = document.createElement('div');
    copy.className = 'chapter-three__note-copy';
    if (point.image) {
      const image = document.createElement('img');
      image.className = 'chapter-three__note-image';
      image.src = point.image;
      image.alt = '蓝色帷幕示意图';
      note.classList.add('chapter-three__note--with-image');
      note.append(image);
    } else {
      note.classList.remove('chapter-three__note--with-image');
    }
    if (point.title) {
      const title = document.createElement('h2');
      title.textContent = point.title;
      copy.append(title);
    }
    const paragraph = document.createElement('p');
    paragraph.textContent = point.texts[state.currentTextIndex];
    copy.append(paragraph);
    note.append(copy);
    state.isNarrativeActive = true;
    note.hidden = false;
    dim.hidden = false;
    layout();
    window.requestAnimationFrame(() => positionNote(point, metrics().scale));
  }
  function resetInteraction() {
    state.currentHotspot = null;
    state.currentTextIndex = 0;
    state.isVideoPlaying = false;
    state.isVideoAwaitingAdvance = false;
    state.isNarrativeActive = false;
    video.pause();
    video.currentTime = 0;
    videoWrap.hidden = true;
    videoStatus.hidden = true;
    note.hidden = true;
    dim.hidden = true;
    syncHotspots();
    layout();
  }
  function openHotspot(point) {
    if (point.modal) {
      state.explored.add(point.id);
      syncHotspots();
      openTowpathModal();
      return;
    }
    if (state.playback === 'auto') state.playback = 'manual';
    resetInteraction();
    state.currentHotspot = point;
    state.explored.add(point.id);
    state.held = false;
    syncHotspots();
    layout();
    if (!point.video) { showNarrative(); return; }
    state.isVideoPlaying = true;
    videoWrap.hidden = false;
    videoStatus.hidden = true;
    const promise = video.play();
    if (promise) promise.catch(() => {
      state.isVideoPlaying = false;
      videoStatus.textContent = '视频未能自动开始播放，请使用画面控制条播放；播放结束后点击画面继续。';
      videoStatus.hidden = false;
    });
  }
  function advanceNarrative() {
    const point = state.currentHotspot;
    if (!point || state.isVideoPlaying) return;
    if (state.isVideoAwaitingAdvance) {
      state.isVideoAwaitingAdvance = false;
      videoWrap.hidden = true;
      state.currentTextIndex = 0;
      showNarrative();
      return;
    }
    if (!state.isNarrativeActive) return;
    if (state.currentTextIndex < point.texts.length - 1) {
      state.currentTextIndex += 1;
      showNarrative();
      return;
    }
    resetInteraction();
  }
  function releaseHold() { state.held = false; state.drag = null; }
  function tick(now) {
    const elapsed = state.lastTime ? Math.min(48, now - state.lastTime) : 0;
    state.lastTime = now;
    if (state.playback === 'auto' && !state.currentHotspot && !state.drag?.moving && !document.hidden && state.offset > 0) {
      state.offset = Math.max(0, state.offset - (state.held ? fastSpeed : normalSpeed) * (elapsed / 1000));
      if (state.offset === 0) { state.playback = 'completed'; state.held = false; }
      layout();
    }
    state.frame = window.requestAnimationFrame(tick);
  }
  function beginPointer(event) {
    state.suppressHotspotClick = false;
    scene.setPointerCapture(event.pointerId);
    state.held = state.playback === 'auto';
    state.drag = { id: event.pointerId, startX: event.clientX, startOffset: state.offset, moving: false };
  }
  scene.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button, video, .chapter-three__note, .chapter-three__video')) return;
    if (state.currentHotspot) return;
    event.preventDefault();
    beginPointer(event);
  });
  scene.addEventListener('click', (event) => {
    if (state.isVideoAwaitingAdvance && !event.target.closest('button, video, .chapter-three__video')) advanceNarrative();
  });
  scene.addEventListener('pointermove', (event) => {
    const drag = state.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moving && Math.abs(distance) > 4) {
      drag.moving = true;
      state.held = false;
      state.suppressHotspotClick = true;
      if (state.playback === 'auto') state.playback = 'manual';
    }
    if (!drag.moving) return;
    event.preventDefault();
    state.offset = Math.max(0, Math.min(state.maxOffset, drag.startOffset - distance));
    layout();
  });
  const endPointer = (event) => {
    if (!state.drag || state.drag.id !== event.pointerId) return;
    if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
    releaseHold();
  };
  scene.addEventListener('pointerup', endPointer);
  scene.addEventListener('pointercancel', endPointer);
  scene.addEventListener('lostpointercapture', releaseHold);
  scene.addEventListener('dragstart', (event) => event.preventDefault());
  scene.addEventListener('contextmenu', (event) => event.preventDefault());
  dim.addEventListener('click', advanceNarrative);
  towpathModal.addEventListener('click', (event) => {
    const close = event.target.closest('[data-towpath-close]');
    if (close) { closeTowpathModal(); return; }
    const stepButton = event.target.closest('[data-towpath-step]');
    if (stepButton) { setTowpathStep(Number(stepButton.dataset.towpathStep)); return; }
    const choice = event.target.closest('[data-towpath-choice]');
    if (choice) { towpath.choice = choice.dataset.towpathChoice; setTowpathStep(3); return; }
    const go = event.target.closest('[data-towpath-go]');
    if (go) { setTowpathStep(Number(go.dataset.towpathGo)); return; }
    if (event.target.closest('[data-towpath-continue], [data-towpath-dialogue]')) {
      if (towpath.dialogueIndex < dialogue.length - 1) { towpath.dialogueIndex += 1; renderTowpath(); } else { setTowpathStep(5); }
    }
  });
  video.addEventListener('ended', () => {
    if (!state.currentHotspot?.video) return;
    state.isVideoPlaying = false;
    state.isVideoAwaitingAdvance = true;
    videoStatus.textContent = '视频播放结束，点击画面继续。';
    videoStatus.hidden = false;
  });
  video.addEventListener('error', () => {
    if (!state.currentHotspot?.video) return;
    state.isVideoPlaying = false;
    state.isVideoAwaitingAdvance = true;
    videoStatus.textContent = '视频无法播放，请检查浏览器对 MP4 格式的支持。';
    videoStatus.hidden = false;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseHold(); });
  window.addEventListener('blur', releaseHold);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.currentHotspot) resetInteraction(); });
  if (nextButton) nextButton.addEventListener('click', () => { window.location.href = '../pages/chapter-4.html'; });
  new ResizeObserver(layout).observe(scene);
  art.addEventListener('load', () => {
    state.offset = metrics().maxOffset;
    state.playback = 'auto';
    renderHotspots();
    layout();
    state.frame = window.requestAnimationFrame(tick);
  }, { once: true });
  if (art.complete) art.dispatchEvent(new Event('load'));
  window.addEventListener('pagehide', () => { window.cancelAnimationFrame(state.frame); releaseHold(); }, { once: true });
})();
