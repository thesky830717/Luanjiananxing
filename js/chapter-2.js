(() => {
  const root = document.querySelector('[data-chapter-two]');
  if (!root) return;

  const scene = root.querySelector('[data-scene]');
  const art = root.querySelector('[data-scene-art]');
  const hotspotLayer = root.querySelector('[data-scene-hotspots]');
  const dim = root.querySelector('[data-scene-dim]');
  const reading = root.querySelector('[data-reading]');
  const knowledge = root.querySelector('[data-knowledge]');
  const hint = root.querySelector('[data-scene-hint]');
  const nextButton = root.querySelector('[data-chapter-two-next]');

  const assets = {
    inspection: '../章节说明/第二章/皇帝巡查背景图.jpg',
    workers: '../章节说明/第二章/河工背景图.jpg',
    emperor: '../章节说明/第二章/10月21日(1).gif',
    official: '../章节说明/第二章/10月21日(2).gif',
    carrier: '../章节说明/第二章/河工搬运泥土单人.png',
    eightWorkers: '../章节说明/第二章/八人打夯视频.mp4',
    pairWorkers: '../章节说明/第二章/寸土须实.png'
  };

  const inspectionSteps = [
    { actor: 'emperor', label: '皇帝', point: { x: 43.2, y: 42.4, rx: 6, ry: 20 }, portrait: assets.emperor, pages: [
      '此处河道绵延，堤防修筑，耗费人力物力不在少数。朕今日亲临，不只为观其形，更要察其效。',
      '河水涨落如何？堤岸可曾稳固？若遇汛期，可有应对之策？'
    ] },
    { actor: 'official', label: '官员', point: { x: 47.3, y: 48, rx: 6, ry: 20 }, portrait: assets.official, pages: [
      '回禀皇上，沿河各处正依次修整，堤岸亦在加固。臣等已命人巡查险要之处，务求防患于未然。',
      '只是河道水势多变，土石冲刷日久，部分堤段仍须持续修护，不敢稍有懈怠。'
    ] },
    { actor: 'emperor', label: '皇帝', point: { x: 43.2, y: 42.4, rx: 6, ry: 20 }, portrait: assets.emperor, pages: [
      '修堤之要，不在册上写了多少，也不在眼前看着多么齐整。若一场大水过后，堤岸依旧难保，今日所费又有何益？',
      '治河之事，既要看河，也要看人。工程是否扎实，百姓是否安稳，都须查明。'
    ] },
    { actor: 'official', label: '官员', point: { x: 47.3, y: 48, rx: 6, ry: 20 }, portrait: assets.official, pages: [
      '皇上所言甚是。臣即刻再查各处堤段，核验工料与修筑情形，不敢只凭文册回奏。',
      '河工能否长久，终究要落在每一锹土、每一处堤岸之上。'
    ] }
  ];

  const workerHotspots = [
    { id: 'eight', label: '八人打夯', x: 49.6, y: 59, rx: 5.8, ry: 14, portrait: assets.eightWorkers, title: '众力成堤', body: '夯土筑堤，讲究层层压实。工人协同举夯、落夯，将松散的土料逐步夯紧，使堤身更加密实。多人共同作业，不仅能提高施工效率，也需要统一节奏与相互配合。' },
    { id: 'pair', label: '两人打夯', x: 36.2, y: 49.6, rx: 5.5, ry: 12, portrait: assets.pairWorkers, title: '寸土须实', body: '与多人协作的夯筑相比，两人打夯呈现出规模较小、配合紧密的劳动方式。工人根据施工位置调整动作，对局部土层进行反复夯实。' },
    { id: 'carrier', label: '运送材料的工人', x: 19.8, y: 72.7, rx: 6.8, ry: 26.5, portrait: assets.carrier, title: '土石之间', body: '一段堤防的修筑，离不开土料的持续供应。运送泥土与施工夯筑相互衔接：有人搬运材料，有人铺设土层，有人负责夯实与修整，各道工序共同维持工程运转。这些看似不起眼的运输劳动，决定着施工能否持续推进。' },
    { id: 'water', label: '河水波纹', x: 51.5, y: 35, rx: 13, ry: 17, title: '河水之间', subtitle: '河工与民生', sections: [
      ['为何治河？', '黄河泥沙淤积、河道变迁与洪水泛滥，长期威胁沿岸农田、村镇与百姓生计。清代黄河、淮河与大运河之间的水系关系又十分复杂，河道治理不仅关乎防洪，也关系到运河漕运能否畅通。\n\n因此，治理黄河与淮河并非孤立的工程，而是牵涉地方民生、农业生产和国家运输的重要政务。'],
      ['堤防有何作用？', '堤防是约束洪水、保护沿岸土地的重要工程设施。通过修筑与加固堤岸，可以降低河水漫溢的风险，保护农田、村落及沿河交通。\n\n但堤防并非一劳永逸。水流冲刷、泥沙淤积与水位变化都会影响河道及堤身状况，因此还需要持续巡查、修补和维护。筑土、夯实、运料等工序，正是工程得以实施的基础。']]
    }
  ];

  const state = { part: 'inspection', step: 0, page: 0, active: null, explored: new Set(), pan: 0, drag: null };
  let buttons = [];

  function currentInspection() { return inspectionSteps[state.step]; }
  function renderedMetrics() {
    const height = scene.clientHeight;
    const width = art.naturalWidth ? art.naturalWidth * (height / art.naturalHeight) : 0;
    return { width, height, maxPan: Math.max(0, width - scene.clientWidth) };
  }
  function clampPan() { const { maxPan } = renderedMetrics(); state.pan = Math.max(0, Math.min(maxPan, state.pan)); }
  function layout() {
    if (!art.naturalWidth || !scene.clientHeight) return;
    const { width, height } = renderedMetrics();
    clampPan();
    art.style.width = `${width}px`;
    art.style.height = `${height}px`;
    art.style.left = `${-state.pan}px`;
    buttons.forEach(({ element, data }) => {
      element.style.left = `${(width * data.x / 100) - state.pan}px`;
      element.style.top = `${height * data.y / 100}px`;
    });
    if (state.active) applyFocus(state.active);
  }
  function applyFocus(data) {
    const { width, height } = renderedMetrics();
    const x = (width * data.x / 100) - state.pan;
    const y = height * data.y / 100;
    dim.style.setProperty('--chapter-two-focus-x', `${x}px`);
    dim.style.setProperty('--chapter-two-focus-y', `${y}px`);
    dim.style.setProperty('--chapter-two-focus-rx', `${Math.max(95, width * data.rx / 100)}px`);
    dim.style.setProperty('--chapter-two-focus-ry', `${Math.max(105, height * data.ry / 100)}px`);
  }
  function makeHotspot(data, click) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'chapter-two__hotspot';
    element.setAttribute('aria-label', data.label);
    element.innerHTML = '<span></span>';
    element.addEventListener('click', (event) => { event.stopPropagation(); click(data); });
    hotspotLayer.append(element);
    buttons.push({ element, data });
    return element;
  }
  function clearHotspots() { hotspotLayer.replaceChildren(); buttons = []; }
  function showReading({ title, body, portrait, actor }) {
    const portraitMarkup = portrait
      ? actor === 'eight'
        ? `<video src="${portrait}" poster="../章节说明/第二章/八个人抠图拉硪打夯.png" class="chapter-two__portrait chapter-two__portrait--tamping" autoplay muted loop playsinline preload="auto" aria-label="八人打夯动态展示"></video>`
        : `<img src="${portrait}" alt="" class="chapter-two__portrait">`
      : '';
    const sameActor = !reading.hidden && reading.dataset.actor === (actor || '');
    if (sameActor) {
      const copy = reading.querySelector('.chapter-two__paper-content');
      copy.classList.remove('is-swapping');
      copy.innerHTML = `<h2>${title}</h2><p>${body}</p>`;
      void copy.offsetWidth;
      copy.classList.add('is-swapping');
      return;
    }
    reading.className = `chapter-two__reading${actor ? ` chapter-two__reading--${actor}` : ''}`;
    reading.dataset.actor = actor || '';
    reading.innerHTML = `<div class="chapter-two__narrative">${portraitMarkup}<div class="chapter-two__paper"><div class="chapter-two__paper-content"><h2>${title}</h2><p>${body}</p></div></div></div>`;
    reading.hidden = false;
  }
  function closeOverlay() {
    if (state.part === 'workers' && state.active && state.active.id) state.explored.add(state.active.id);
    state.active = null;
    dim.hidden = true;
    reading.hidden = true;
    knowledge.hidden = true;
    buttons.forEach(({ element, data }) => element.classList.toggle('is-explored', state.explored.has(data.id)));
    if (nextButton) nextButton.hidden = !(state.part === 'workers' && state.explored.size === workerHotspots.length);
    layout();
  }
  function showInspectionPage() {
    const step = currentInspection();
    state.active = { ...step.point, kind: 'inspection', id: `inspection-${state.step}` };
    dim.hidden = false;
    showReading({ title: step.label, body: step.pages[state.page], portrait: step.portrait, actor: step.actor });
    layout();
  }
  function beginInspection() {
    state.page = 0;
    showInspectionPage();
  }
  function advanceInspection() {
    const step = currentInspection();
    if (state.page < step.pages.length - 1) { state.page += 1; showInspectionPage(); return; }
    state.step += 1;
    closeOverlay();
    if (state.step < inspectionSteps.length) renderInspection(); else renderTransition();
  }
  function renderInspection() {
    clearHotspots();
    const step = currentInspection();
    makeHotspot(step.point, beginInspection).classList.add('is-ready');
    hint.textContent = `点击${step.label}，查看河工`;
    layout();
  }
  function renderTransition() {
    clearHotspots();
    const gateway = { label: '查看堤上众生', x: 60, y: 60 };
    const button = makeHotspot(gateway, enterWorkers);
    button.classList.add('chapter-two__hotspot--gateway');
    button.innerHTML = '<span>查看堤上众生</span>';
    hint.textContent = '御览河工已完成';
    layout();
  }
  function enterWorkers() {
    state.part = 'workers'; state.active = null; state.pan = 0;
    art.src = assets.workers;
    art.alt = '乾隆南巡图第二章河工劳作场景';
    art.addEventListener('load', () => { state.pan = renderedMetrics().maxPan; renderWorkers(); }, { once: true });
  }
  function showWorker(data) {
    state.active = data;
    dim.hidden = false;
    if (data.id === 'water') {
      knowledge.innerHTML = `<h2>${data.title}</h2><p class="chapter-two__subtitle">${data.subtitle}</p>${data.sections.map(([heading, text]) => `<section><h3>${heading}</h3>${text.split('\n\n').map((p) => `<p>${p}</p>`).join('')}</section>`).join('')}`;
      knowledge.hidden = false;
    } else {
      showReading({ title: data.title, body: data.body, portrait: data.portrait, actor: data.id });
    }
    layout();
  }
  function renderWorkers() {
    clearHotspots();
    workerHotspots.forEach((data) => {
      const button = makeHotspot(data, showWorker);
      button.classList.toggle('is-explored', state.explored.has(data.id));
    });
    hint.textContent = '从最右端开始，向左拖动或滚动浏览河工长卷';
    layout();
  }
  function start() { state.pan = renderedMetrics().maxPan; renderInspection(); }

  dim.addEventListener('click', () => {
    if (state.active && state.active.kind === 'inspection') {
      const step = currentInspection();
      if (state.page < step.pages.length - 1) {
        state.page += 1;
        showInspectionPage();
        return;
      }
      advanceInspection();
      return;
    }
    closeOverlay();
  });
  scene.addEventListener('pointerdown', (event) => {
    if (state.active || event.target.closest('button, .chapter-two__reading, .chapter-two__knowledge')) return;
    state.drag = { id: event.pointerId, x: event.clientX, pan: state.pan };
    scene.setPointerCapture(event.pointerId);
  });
  scene.addEventListener('pointermove', (event) => {
    if (!state.drag || state.drag.id !== event.pointerId) return;
    state.pan = state.drag.pan - (event.clientX - state.drag.x); layout();
  });
  function endDrag(event) {
    if (!state.drag || state.drag.id !== event.pointerId) return;
    state.drag = null;
    if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
  }
  scene.addEventListener('pointerup', endDrag); scene.addEventListener('pointercancel', endDrag);
  scene.addEventListener('wheel', (event) => {
    if (state.active) return;
    event.preventDefault(); state.pan += event.deltaY || event.deltaX; layout();
  }, { passive: false });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.active) closeOverlay();
    if (!state.active && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { state.pan += event.key === 'ArrowLeft' ? -90 : 90; layout(); }
  });
  if (nextButton) nextButton.addEventListener('click', () => { window.location.href = '../pages/chapter-3.html'; });
  new ResizeObserver(layout).observe(scene);
  art.addEventListener('load', start, { once: true });
  if (art.complete) start();
})();
