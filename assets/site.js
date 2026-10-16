(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 640px)');
  const files = ['01-engine', ...Array.from({ length: 13 }, (_, i) => `type-${String(i).padStart(2, '0')}`), '02-chat', '03-chat', '04-chat', '05-chat', '06-expanded'];
  const starts = [0, 2500, 5500, 7500, 10000, 13000, 15500, 19000];
  const steps = [0, 1, 2, 2, 2, 3, 3];
  const titles = ['Choose an engine.', 'Describe what you want.', 'Jait writes the page.', 'Open the preview.', 'Capture the result.', 'See it in the chat.', 'Inspect your app.'];
  const captions = ['Pick the provider inside Jait.', 'One request starts the workflow.', 'Creates the project files.', 'The browser tool opens your preview.', 'A screenshot, without leaving Jait.', 'The image tool displays the capture.', 'Expand the image to inspect your app.'];
  const notes = ['One workspace.', 'Your project.', 'Follow the work.', 'Your tools, connected.', 'Make the result visible.', 'The result, in context.', 'Keep building.'];
  const noteCopy = ['Models · files · browser · images', 'Build a page. Preview it. Show me.', 'Visible file and browser tool calls.', 'Code → browser → screenshot', 'See the page your code produced.', 'Review it in the same conversation.', 'Ask for a change in the same chat.'];
  const alts = ['Jait provider picker with Codex and Claude Code', 'A request being typed into Jait to build and preview a launch page', 'Jait creates index.html using its file tool', 'Jait opens the local launch page using its browser tool', 'The browser tool captures the launch page and displays its screenshot', 'The image tool displays the launch page in the Jait conversation', 'The launch page in Jait’s enlarged image viewer'];
  const targets = [[410, 45], [650, 262], [315, 80], [360, 165], [480, 230], [500, 215], [800, 30]];
  const tour = { time: 0, playing: !motion.matches, visible: false, file: null, scene: -1 };
  const agents = { time: 0, playing: !motion.matches, visible: false, view: 'graph' };
  const tabs = [...document.querySelectorAll('[data-step]')];
  const agentTabs = [...document.querySelectorAll('[data-agent-view]')];
  const preloaded = new Set();
  function preload(prefix) {
    if (preloaded.has(prefix)) return;
    preloaded.add(prefix);
    files.forEach(file => { const im = new Image(); im.src = `/assets/walkthrough/${prefix}-${file}.webp`; });
    ['graph', 'list'].forEach(view => { const im = new Image(); im.src = `/assets/agents/${prefix === 'mobile' ? 'mobile' : 'wide'}-${view}.webp`; });
  }
  function playback(state, button, demo, label) {
    button.innerHTML = state.playing ? 'Ⅱ <span>Pause tour</span>' : '▷ <span>Play tour</span>';
    button.setAttribute('aria-label', `${state.playing ? 'Pause' : 'Play'} ${label}`);
    demo.classList.toggle('is-playing', state.playing);
  }
  function renderTour() {
    const t = tour.time % 19000;
    const scene = starts.findIndex((n, i) => i < 7 && t >= n && t < starts[i + 1]);
    const p = (t - starts[scene]) / (starts[scene + 1] - starts[scene]);
    const file = scene === 0 ? files[0] : scene === 1 ? files[1 + Math.min(12, Math.floor(p * 18))] : files[12 + scene];
    if (file !== tour.file) {
      $('tour-mobile').srcset = `/assets/walkthrough/mobile-${file}.webp`;
      $('tour-image').src = `/assets/walkthrough/desktop-${file}.webp`;
      tour.file = file;
    }
    if (scene !== tour.scene) {
      $('tour-image').alt = alts[scene];
      $('tour-caption-title').textContent = titles[scene];
      $('tour-caption').textContent = captions[scene];
      $('tour-note-title').textContent = notes[scene];
      $('tour-note').textContent = noteCopy[scene];
      tabs.forEach((tab, i) => { const active = i === steps[scene]; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
      $('tour-panel').setAttribute('aria-labelledby', `tour-step-${steps[scene]}`);
      tour.scene = scene;
    }
    if (!mobile.matches) {
      const a = targets[(scene + 6) % 7], b = targets[scene], u = 1 - (1 - Math.min(1, p * 5)) ** 3;
      const scale = $('tour-image').clientWidth / 1032;
      document.querySelector('.demo-pointer').style.transform = `translate(${(a[0] + (b[0] - a[0]) * u) * scale}px,${(a[1] + (b[1] - a[1]) * u) * scale}px)`;
    }
  }
  function renderAgents(view) {
    if (agents.view === view && agents.rendered) return;
    agents.rendered = true;
    if (agents.view !== view) {
      agents.view = view;
      $('agents-mobile').srcset = `/assets/agents/mobile-${view}.webp`;
      $('agents-image').src = `/assets/agents/wide-${view}.webp`;
    }
    const graph = view === 'graph';
    $('agents-image').alt = graph ? 'Jait agent graph with five agents and their team relationships' : 'Jait agent list with names, avatars, roles, and providers';
    $('agents-expand').setAttribute('aria-label', `Enlarge the Jait agent ${view}`);
    $('agents-panel').setAttribute('aria-labelledby', `agents-${view}`);
    agentTabs.forEach(tab => { const active = tab.dataset.agentView === view; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
  }
  function wireTabs(buttons, select) {
    buttons.forEach((button, i) => {
      button.addEventListener('click', () => select(i));
      button.addEventListener('keydown', e => {
        const index = e.key === 'ArrowRight' ? (i + 1) % buttons.length : e.key === 'ArrowLeft' ? (i + buttons.length - 1) % buttons.length : e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : -1;
        if (index < 0) return;
        e.preventDefault(); select(index); buttons[index].focus();
      });
    });
  }
  wireTabs(tabs, i => { tour.playing = false; tour.time = [500, 4300, 8000, 13500][i]; renderTour(); playback(tour, $('tour-play'), $('tour-panel'), 'walkthrough'); preload(mobile.matches ? 'mobile' : 'desktop'); });
  wireTabs(agentTabs, i => { agents.playing = false; agents.time = i ? 8500 : 0; renderAgents(i ? 'list' : 'graph'); playback(agents, $('agents-play'), $('agents-panel'), 'agent tour'); });
  $('tour-play').addEventListener('click', () => { tour.playing = !tour.playing; playback(tour, $('tour-play'), $('tour-panel'), 'walkthrough'); preload(mobile.matches ? 'mobile' : 'desktop'); });
  $('agents-play').addEventListener('click', () => { agents.playing = !agents.playing; playback(agents, $('agents-play'), $('agents-panel'), 'agent tour'); });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    const state = entry.target.id === 'tour-panel' ? tour : agents;
    state.visible = entry.isIntersecting;
    entry.target.classList.toggle('in-view', entry.isIntersecting);
    if (entry.isIntersecting) preload(mobile.matches ? 'mobile' : 'desktop');
  }), { threshold: 0.15 });
  observer.observe($('tour-panel')); observer.observe($('agents-panel'));
  let last = performance.now();
  function frame(now) {
    const delta = Math.min(now - last, 100); last = now;
    if (!document.hidden && !$('image-dialog').open) {
      if (tour.playing && tour.visible) { tour.time = (tour.time + delta) % 19000; renderTour(); }
      if (agents.playing && agents.visible) { agents.time = (agents.time + delta) % 12000; renderAgents(agents.time < 7500 || agents.time > 11500 ? 'graph' : 'list'); }
    }
    requestAnimationFrame(frame);
  }
  motion.addEventListener('change', e => { if (e.matches) { tour.playing = false; agents.playing = false; playback(tour, $('tour-play'), $('tour-panel'), 'walkthrough'); playback(agents, $('agents-play'), $('agents-panel'), 'agent tour'); } });
  mobile.addEventListener('change', () => { preload(mobile.matches ? 'mobile' : 'desktop'); renderTour(); });
  window.addEventListener('resize', renderTour);
  function enlarge(source, title) {
    tour.playing = false; agents.playing = false;
    playback(tour, $('tour-play'), $('tour-panel'), 'walkthrough'); playback(agents, $('agents-play'), $('agents-panel'), 'agent tour');
    $('dialog-title').textContent = title; $('dialog-image').src = source.currentSrc; $('dialog-image').alt = source.alt;
    $('image-dialog').showModal(); document.body.style.overflow = 'hidden';
  }
  $('tour-expand').addEventListener('click', () => enlarge($('tour-image'), 'Jait walkthrough'));
  $('agents-expand').addEventListener('click', () => enlarge($('agents-image'), 'Jait agents'));
  $('dialog-close').addEventListener('click', () => $('image-dialog').close());
  $('image-dialog').addEventListener('close', () => { document.body.style.overflow = ''; });
  $('image-dialog').addEventListener('click', e => { if (e.target === $('image-dialog')) $('image-dialog').close(); });
  $('copy-install').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('npm install -g @jait/gateway\njait start');
      $('copy-install').textContent = 'Copied ✓'; $('copy-status').textContent = 'Setup commands copied';
      setTimeout(() => { $('copy-install').textContent = 'Copy commands'; }, 2000);
    } catch { $('copy-status').textContent = 'Select the commands to copy them.'; $('copy-install').textContent = 'Select to copy'; }
  });
  playback(tour, $('tour-play'), $('tour-panel'), 'walkthrough'); playback(agents, $('agents-play'), $('agents-panel'), 'agent tour');
  renderTour(); renderAgents('graph'); requestAnimationFrame(frame);
})();
