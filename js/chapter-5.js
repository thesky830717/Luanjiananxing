(() => {
  const root = document.querySelector('[data-chapter-five]');
  if (!root) return;

  const stage = root.querySelector('[data-chapter-five-stage]');
  const art = root.querySelector('[data-chapter-five-art]');
  const content = root.querySelector('[data-chapter-five-content]');
  const assets = {
    final: '../章节说明/第五章/最终背景.jpg',
    one: '../章节说明/第五章/选项一图片.jpg',
    two: '../章节说明/第五章/选项二图片.jpg',
    three: '../章节说明/第五章/选项三图片.jpg'
  };
  const endings = {
    one: {
      image: assets.one, title: '《盛世长卷》',
      paragraphs: [
        '你选择留下帝王巡视、城镇繁华与百姓迎銮的景象。',
        '后人展开画卷，看见的是河山锦绣、舟车繁盛，一派太平景象。',
        '这确实是南巡的一部分。',
        '只是那些为御舟牵纤的百姓、为接驾奔忙的官员，以及等待通行的普通船只，并没有成为这幅画卷的主角。',
        '你完成了一幅盛世长卷，也留下了一些未被讲述的故事。'
      ]
    },
    two: {
      image: assets.two, title: '《江南实录》',
      paragraphs: [
        '你选择把目光从帝王仪仗移向普通百姓。',
        '你记录了修河的工人、牵船的纤夫、等待通行的漕船，也留下了地方官员在皇命与民生之间的艰难抉择。',
        '这幅画卷少了几分迎銮的热闹，却多了一些日常生活的重量。',
        '后人从你的记录中看到，盛世的运转不仅依赖皇权与财富，也离不开无数普通人的劳动。',
        '你留下了另一种江南。'
      ]
    },
    three: {
      image: assets.three, title: '《中庸之道》',
      paragraphs: [
        '你没有舍弃南巡的功绩，也没有忽略盛典背后的人们。',
        '在你的画卷里，既有皇帝巡视河工、江南市井繁华，也有普通百姓的劳作和官员的困境。',
        '你试图呈现一场南巡所包含的不同立场，让后人看见同一段历史中并存的荣耀、利益、责任与代价。',
        '这幅画卷也许无法记录全部真相，却尽可能保留了历史的复杂面貌。'
      ]
    }
  };
  const opening = [
    '南巡一路，你既见过皇帝巡查河工，也见过河工治水的辛劳；见过御舟途经时船只避让、森严的回避制度，听过平望火警的往事；见过官员夹在民生与皇命间的为难，也知晓盐商借捐输、筹办迎銮博取朝廷看重。',
    '这些碎片拼凑出乾隆南巡的多面图景，但长卷装不下所有众生故事。请结合所见，选出该入画的内容，补全这幅未完的古卷。你的选择，就是画卷最终的模样。'
  ];
  const state = { phase: 'opening', selected: null };
  const paragraphs = (items) => items.map((text) => `<p>${text}</p>`).join('');
  function useArt(source, alt) { art.src = source; art.alt = alt; }
  function render() {
    stage.dataset.phase = state.phase;
    if (state.phase === 'opening') {
      useArt(assets.final, '第五章开场古画背景');
      content.innerHTML = `<article class="chapter-five__opening-copy"><p class="chapter-five__eyebrow">第五章｜画里江南·盛世之外</p>${paragraphs(opening)}<div class="chapter-five__opening-action"><button class="chapter-five__begin chapter-continue" data-chapter-five-begin type="button">补全画卷</button></div></article>`;
      return;
    }
    if (state.phase === 'choices') {
      useArt(assets.final, '等待补全的江南长卷');
      content.innerHTML = `<section class="chapter-five__choices"><p class="chapter-five__eyebrow">请为长卷落笔</p><h1>如果由你来完成这幅南巡长卷，你会选择记录什么？</h1><div class="chapter-five__choice-list"><button data-chapter-five-choice="one" type="button">记录皇帝所见的江南盛景</button><button data-chapter-five-choice="two" type="button">记录南巡背后的民生与劳作</button><button data-chapter-five-choice="three" type="button">既记录盛世，也保留画外的故事</button></div></section>`;
      return;
    }
    if (state.phase === 'ending') {
      const ending = endings[state.selected];
      useArt(ending.image, `${ending.title}背景古画`);
      content.innerHTML = `<article class="chapter-five__ending-copy chapter-five__ending-copy--${state.selected}"><h1>${ending.title}</h1>${paragraphs(ending.paragraphs)}<div class="chapter-five__ending-actions"><button class="chapter-five__quiet-button" data-chapter-five-rechoose type="button">重新选择入画内容</button><button class="chapter-five__final-button chapter-continue" data-chapter-five-final type="button">走向最终落幕</button></div></article>`;
      return;
    }
    useArt(assets.final, '画里江南最终背景');
    if (state.phase === 'final-title') {
      content.innerHTML = '<section class="chapter-five__final-title"><h1>《銮驾南行》</h1><p>一卷绘盛世，一眼见众生。</p></section>';
    } else {
      content.innerHTML = `<section class="chapter-five__final-copy"><h1>《銮驾南行》</h1>${paragraphs(['一幅画卷，有它描绘的内容，也有它未曾记录的部分。', '历史并不只有一种面貌。', '画中所见，是历史的一部分。', '画外未书，亦有万千人生。'])}</section>`;
    }
  }
  function enterChoices() { state.phase = 'choices'; render(); }
  function choose(id) { state.selected = id; state.phase = 'ending'; render(); }
  stage.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button?.matches('[data-chapter-five-begin]')) { enterChoices(); return; }
    if (button?.dataset.chapterFiveChoice) { choose(button.dataset.chapterFiveChoice); return; }
    if (button?.matches('[data-chapter-five-rechoose]')) { enterChoices(); return; }
    if (button?.matches('[data-chapter-five-final]')) { state.phase = 'final-title'; render(); return; }
    if (button || event.target.closest('.chapter-five__opening-copy, .chapter-five__ending-copy, .chapter-five__choices')) return;
    if (state.phase === 'final-title') { state.phase = 'final-copy'; render(); }
  });
  render();
})();
