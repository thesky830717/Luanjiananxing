(() => {
  const header = document.querySelector('[data-site-header]');
  if (!header) return;

  const root = document.body.dataset.root || '.';
  const currentPage = document.body.dataset.page;
  const links = [
    { id: 'home', label: '首页', href: 'pages/home.html' },
    { id: 'catalog', label: '目录', href: 'pages/catalog.html' },
    { id: 'chapter-1', label: '壹', href: 'pages/chapter-1.html' },
    { id: 'chapter-2', label: '贰', href: 'pages/chapter-2.html' },
    { id: 'chapter-3', label: '叁', href: 'pages/chapter-3.html' },
    { id: 'chapter-4', label: '肆', href: 'pages/chapter-4.html' },
    { id: 'chapter-5', label: '伍', href: 'pages/chapter-5.html' }
  ];

  const navItems = links.map((link) => {
    const unavailable = link.href === '#';
    if (unavailable) {
      return `<span class="nav-placeholder" aria-label="${link.label}，待开发">${link.label}</span>`;
    }
    const href = `${root}/${link.href}`;
    const active = link.id === currentPage ? ' aria-current="page"' : '';
    return `<a href="${href}"${active}>${link.label}</a>`;
  }).join('');

  header.innerHTML = `
    <a class="brand" href="${root}/pages/home.html" aria-label="返回首页">
      <p class="brand-meta">DIGITAL CURATING PROJECT</p>
      <p class="brand-title">乾隆南巡图</p>
    </a>
    <nav class="site-nav" aria-label="主导航">${navItems}</nav>
    <button class="audio-control" data-audio-control type="button" aria-pressed="false" aria-label="开启背景音乐">
      <span aria-hidden="true">♪</span><span data-audio-control-label>音乐</span>
    </button>
  `;

  // 多页面项目无法跨文档保留同一 Audio 实例；统一由本共享脚本创建，
  // 并在跳页前保存播放位置，下一页只恢复这一条曲目，避免叠音或从头开始。
  const musicStateKey = 'nanxun-background-music-v1';
  const musicSource = `${root}/audio/rainstreetcat-whisper-of-empty-mountains-428655.mp3`;
  const musicControl = header.querySelector('[data-audio-control]');
  const musicLabel = header.querySelector('[data-audio-control-label]');
  const storedMusic = (() => {
    try { return JSON.parse(sessionStorage.getItem(musicStateKey) || '{}'); } catch { return {}; }
  })();
  const music = new Audio(musicSource);
  music.loop = true;
  music.preload = 'auto';
  music.volume = .25;
  let musicStarted = false;
  let userPaused = Boolean(storedMusic.userPaused);
  let restorePosition = Number.isFinite(storedMusic.time) ? storedMusic.time : 0;

  function saveMusicState() {
    try {
      sessionStorage.setItem(musicStateKey, JSON.stringify({
        time: Number.isFinite(music.currentTime) ? music.currentTime : restorePosition,
        userPaused,
        requested: musicStarted || Boolean(storedMusic.requested)
      }));
    } catch (error) { console.warn('背景音乐播放位置无法保存。', error); }
  }
  function syncMusicControl() {
    const playing = !music.paused && !music.ended;
    musicControl.setAttribute('aria-pressed', String(playing));
    musicControl.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
    musicLabel.textContent = playing ? '暂停' : '音乐';
    musicControl.classList.toggle('is-playing', playing);
  }
  function restoreMusicTime() {
    if (!restorePosition || !Number.isFinite(music.duration)) return;
    music.currentTime = Math.min(restorePosition, Math.max(0, music.duration - .1));
    restorePosition = 0;
  }
  async function startMusic() {
    if (userPaused) return;
    restoreMusicTime();
    try {
      await music.play();
      musicStarted = true;
      syncMusicControl();
      saveMusicState();
    } catch (error) {
      // 浏览器禁止无手势播放时不循环重试，下一次用户点击会再次尝试。
      console.info('背景音乐等待用户下一次操作后播放。', error);
      syncMusicControl();
    }
  }
  music.addEventListener('loadedmetadata', () => { restoreMusicTime(); });
  music.addEventListener('timeupdate', saveMusicState);
  music.addEventListener('play', syncMusicControl);
  music.addEventListener('pause', syncMusicControl);
  music.addEventListener('error', () => console.error(`背景音乐加载失败：${musicSource}`, music.error));
  musicControl.addEventListener('click', () => {
    if (!music.paused) {
      userPaused = true;
      music.pause();
      saveMusicState();
      return;
    }
    userPaused = false;
    startMusic();
  });
  // 首页「进入画卷」、导航与章节内所有明确按钮均可作为首个播放手势。
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-audio-control]') || userPaused || !event.target.closest('a, button')) return;
    startMusic();
  }, { capture: true });
  window.addEventListener('pagehide', saveMusicState);
  if (storedMusic.requested && !userPaused) startMusic();
  syncMusicControl();

  const interaction = document.querySelector('[data-chapter-interaction]');
  if (!interaction) return;

  const stage = interaction.querySelector('[data-painting-stage]');
  const artwork = interaction.querySelector('[data-artwork]');
  const hotspots = [...interaction.querySelectorAll('[data-hotspot]')];
  const dim = interaction.querySelector('[data-empty-close]');
  const characterPanel = interaction.querySelector('[data-character-panel]');
  const characterCopy = interaction.querySelector('[data-character-copy]');
  const unlockNotice = interaction.querySelector('[data-unlock-notice]');
  const continueButton = interaction.querySelector('[data-chapter-continue]');

  const people = {
    emperor: {
      x: 64, y: 51, focusX: 8.5, focusY: 13,
      paragraphs: ['朕此次南巡，有三件要事。', '祭明孝陵，以追念前朝；巡视河工，以察治水之实；笼络江南士民，以察地方人心。']
    },
    official: {
      x: 26, y: 51.5, focusX: 8, focusY: 13,
      paragraphs: ['我随驾南行，所见所察，皆关乎地方治理。', '南巡非游幸，亦为察地方之治。']
    },
    commoner: {
      x: 11, y: 82, focusX: 10, focusY: 14,
      paragraphs: ['皇上南巡，对我而言，既是荣耀，也是负担。', '眼前是盛世仪仗，而我的日子，仍要照常过下去。']
    },
    archive: {
      x: 64.5, y: 43, focusX: 8.5, focusY: 11,
      paragraphs: [
        '此为乾隆南巡骑驾卤簿，乃帝王远巡之仪仗，归銮仪卫掌之。',
        '明黄华盖，皇权之表。黄马褂侍卫扈从御驾，百官随行，士卒列岸。',
        '卤簿者，盾卫扈从，载于册籍。帝南巡，察河工，观民风。',
        '浩荡仪卫，为护驾，亦为礼制之显，流动之王朝秩序也。'
      ]
    }
  };

  const state = {
    phase: 'explore',
    explored: new Set(),
    activeId: null,
    equipmentUnlocked: false,
    archiveViewed: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    drag: null
  };

  const paragraphs = (items) => items.map((item) => `<p>${item}</p>`).join('');

  function constrainPan(renderedWidth, renderedHeight, stageWidth, stageHeight) {
    const maxX = Math.max(0, (renderedWidth - stageWidth) / 2);
    const maxY = Math.max(0, (renderedHeight - stageHeight) / 2);
    state.panX = Math.max(-maxX, Math.min(maxX, state.panX));
    state.panY = Math.max(-maxY, Math.min(maxY, state.panY));
  }

  function layoutArtwork() {
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    if (!stageWidth || !stageHeight || !artwork.naturalWidth) return;
    const scale = Math.min(stageWidth / artwork.naturalWidth, stageHeight / artwork.naturalHeight) * state.zoom;
    const width = artwork.naturalWidth * scale;
    const height = artwork.naturalHeight * scale;
    constrainPan(width, height, stageWidth, stageHeight);
    const left = (stageWidth - width) / 2 + state.panX;
    const top = (stageHeight - height) / 2 + state.panY;
    artwork.style.width = `${width}px`;
    artwork.style.height = `${height}px`;
    artwork.style.left = `${left}px`;
    artwork.style.top = `${top}px`;

    hotspots.forEach((hotspot) => {
      const id = hotspot.dataset.hotspot;
      const point = people[id];
      hotspot.style.left = `${left + (width * point.x / 100)}px`;
      hotspot.style.top = `${top + (height * point.y / 100)}px`;
    });

    if (state.activeId && people[state.activeId]) {
      const point = people[state.activeId];
      const focusX = left + (width * point.x / 100);
      const focusY = top + (height * point.y / 100);
      const radiusX = Math.max(56, width * point.focusX / 100);
      const radiusY = Math.max(72, height * point.focusY / 100);
      dim.style.setProperty('--focus-x', `${focusX}px`);
      dim.style.setProperty('--focus-y', `${focusY}px`);
      dim.style.setProperty('--focus-rx', `${radiusX}px`);
      dim.style.setProperty('--focus-ry', `${radiusY}px`);
      positionCharacterCopy(focusX, focusY, radiusX, stageWidth, stageHeight);
    }
  }

  function positionCharacterCopy(focusX, focusY, radiusX, stageWidth, stageHeight) {
    const panelWidth = Math.min(330, Math.max(220, stageWidth - 52));
    const showOnRight = focusX < stageWidth * .54;
    const requestedLeft = showOnRight
      ? focusX + radiusX + 28
      : focusX - radiusX - panelWidth - 28;
    const left = Math.max(26, Math.min(stageWidth - panelWidth - 26, requestedLeft));
    const panelHeight = characterPanel.offsetHeight || 210;
    const top = Math.max(34, Math.min(stageHeight - panelHeight - 34, focusY - (panelHeight / 2)));
    characterPanel.style.width = `${panelWidth}px`;
    characterPanel.style.left = `${left}px`;
    characterPanel.style.top = `${top}px`;
  }

  function syncUI() {
    stage.dataset.phase = state.phase;
    hotspots.forEach((hotspot) => {
      const id = hotspot.dataset.hotspot;
      hotspot.classList.toggle('is-explored', state.explored.has(id));
      hotspot.disabled = state.phase !== 'explore' || (id === 'archive' && !state.equipmentUnlocked);
    });

    const archiveHotspot = interaction.querySelector('[data-hotspot="archive"]');
    archiveHotspot.hidden = !state.equipmentUnlocked;
    if (continueButton) continueButton.hidden = !(state.equipmentUnlocked && state.archiveViewed && state.phase === 'explore');
    dim.hidden = state.phase !== 'character';
    characterPanel.hidden = state.phase !== 'character';
    layoutArtwork();
  }

  function unlockArchiveIfReady() {
    if (state.equipmentUnlocked || state.explored.size !== 3) return;
    state.equipmentUnlocked = true;
    unlockNotice.hidden = false;
    window.setTimeout(() => { unlockNotice.hidden = true; }, 3200);
  }

  function closeCharacter() {
    if (state.phase !== 'character') return;
    if (state.activeId === 'archive') state.archiveViewed = true;
    else state.explored.add(state.activeId);
    state.activeId = null;
    state.phase = 'explore';
    unlockArchiveIfReady();
    syncUI();
  }

  function openCharacter(id) {
    state.phase = 'character';
    state.activeId = id;
    characterCopy.innerHTML = paragraphs(people[id].paragraphs);
    syncUI();
    characterPanel.focus({ preventScroll: true });
  }

  hotspots.forEach((hotspot) => {
    hotspot.addEventListener('click', () => {
      const id = hotspot.dataset.hotspot;
      openCharacter(id);
    });
  });
  dim.addEventListener('click', closeCharacter);
  if (continueButton) {
    continueButton.addEventListener('click', () => { window.location.href = '../pages/chapter-2.html'; });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (state.phase === 'character') closeCharacter();
  });

  stage.addEventListener('wheel', (event) => {
    if (state.phase !== 'explore') return;
    event.preventDefault();
    const nextZoom = state.zoom + (event.deltaY < 0 ? .12 : -.12);
    state.zoom = Math.max(1, Math.min(2.25, nextZoom));
    if (state.zoom === 1) { state.panX = 0; state.panY = 0; }
    layoutArtwork();
  }, { passive: false });

  stage.addEventListener('pointerdown', (event) => {
    if (state.phase !== 'explore' || event.target.closest('button')) return;
    state.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', (event) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    state.panX = state.drag.panX + event.clientX - state.drag.x;
    state.panY = state.drag.panY + event.clientY - state.drag.y;
    layoutArtwork();
  });
  const endDrag = (event) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    state.drag = null;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  new ResizeObserver(layoutArtwork).observe(stage);
  artwork.addEventListener('load', () => { layoutArtwork(); syncUI(); }, { once: true });
  if (artwork.complete) { layoutArtwork(); syncUI(); }

})();
