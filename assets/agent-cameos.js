(() => {
  'use strict';
  // Avatar geometry and colors match Jait's AgentAvatar component.
  const colors = ['#a78bfa', '#60a5fa', '#fb7185', '#2dd4bf', '#fbbf24', '#86efac', '#fb923c', '#e879f9', '#38bdf8', '#c4b5fd'];
  const bodies = [
    'M18 42 Q12 20 32 20 Q35 8 45 19 Q68 9 76 31 Q89 51 73 72 Q49 85 26 72 Q13 63 18 42Z',
    'M22 30 Q20 12 32 17 L41 25 Q50 21 59 25 L69 15 Q81 12 76 33 Q90 68 69 77 Q48 86 28 75 Q10 64 22 30Z',
    'M19 43 Q10 27 26 23 Q26 9 40 17 Q51 6 61 20 Q83 15 80 39 Q94 58 76 75 Q51 87 27 74 Q9 62 19 43Z',
    'M17 51 Q15 28 33 24 Q45 10 59 23 Q84 23 82 51 Q82 80 50 81 Q18 81 17 51Z',
    'M22 35 L25 15 Q37 15 40 28 Q49 24 58 28 Q62 13 74 16 L77 38 Q86 66 68 77 Q47 86 29 75 Q14 61 22 35Z',
  ];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const layer = document.createElement('div');
  layer.className = 'cameo-layer'; layer.setAttribute('aria-hidden', 'true'); layer.setAttribute('inert', '');
  document.body.append(layer);
  const spots = [
    { selector: '.github-link', size: 42, align: .48 },
    { selector: '[data-step="0"]', size: 62, side: 'left' },
    { selector: '[data-step="3"]', size: 62, side: 'right' },
    { selector: '.text-link', size: 58, side: 'right' },
    { selector: '.providers', size: 56, align: .82 },
    { selector: '.workspace-section', size: 60, align: .78 },
    { selector: '.install', size: 54, align: .80 },
    { selector: '.footer', size: 48, align: .72 },
  ];
  const random = (min, max) => min + Math.random() * (max - min);
  let active = null, timer = null, lastSpot = null, lastColor = -1, first = true;
  let pointer = null, dirty = false;
  let paused = false;
  try { paused = localStorage.getItem('jait-cameos-paused') === 'true'; } catch {}
  const toggle = document.createElement('button'); toggle.className = 'cameo-toggle'; toggle.type = 'button';
  function updateToggle() { toggle.hidden = motion.matches; toggle.textContent = paused ? 'Resume cameos' : 'Pause cameos'; toggle.setAttribute('aria-label', paused ? 'Resume decorative agent animations' : 'Pause decorative agent animations'); }
  document.querySelector('.footer-links').append(toggle); updateToggle();
  const unavailable = () => paused || motion.matches || document.hidden || document.getElementById('image-dialog')?.open;
  function sprite(index) {
    const color = colors[index], dx = index % 2 ? 1 : -1;
    return `<svg class="agent-creature" viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="87" rx="24" ry="4" fill="${color}" opacity=".14"/><g class="agent-creature-body"><path d="${bodies[index % bodies.length]}" fill="${color}"/><path class="agent-creature-paws" d="M25 57 Q18 51 17 60 M75 57 Q83 51 84 60" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/><ellipse cx="29" cy="59" rx="5" ry="3" fill="#fff" opacity=".25"/><ellipse cx="71" cy="59" rx="5" ry="3" fill="#fff" opacity=".25"/><g class="agent-creature-eyes"><ellipse cx="38" cy="46" rx="7" ry="9" fill="#fff"/><ellipse cx="62" cy="46" rx="7" ry="9" fill="#fff"/><g class="agent-creature-pupils"><ellipse cx="${38 + dx}" cy="47" rx="3" ry="4.5" fill="#243047"/><ellipse cx="${62 + dx}" cy="47" rx="3" ry="4.5" fill="#243047"/></g></g><path d="${index % 3 === 0 ? 'M43 62 Q50 69 57 62' : index % 3 === 1 ? 'M46 63 Q50 66 54 63' : 'M44 62 Q50 66 56 62'}" fill="none" stroke="#243047" stroke-width="2.5" stroke-linecap="round"/>${index >= 5 ? '<path d="M44 25 Q49 17 55 25" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>' : ''}</g></svg>`;
  }
  function measure(spot) {
    const anchor = document.querySelector(spot.selector);
    if (!anchor) return null;
    const rect = anchor.getBoundingClientRect();
    if (!rect.width || rect.top < 12 || rect.top > innerHeight - 35 || rect.bottom < 0) return null;
    const size = innerWidth <= 640 ? Math.min(spot.size, 46) : spot.size;
    if (spot.side) {
      const x = spot.side === 'left' ? rect.left - size : rect.right;
      if (x < 8 || x + size > innerWidth - 8) return null;
      const y = rect.top + rect.height / 2 - size / 2;
      if (y < 6 || y + size > innerHeight - 6) return null;
      return { spot, anchor, size, width: size, height: size, x, y };
    }
    const height = Math.min(size, rect.top - 3);
    const x = Math.max(8, Math.min(innerWidth - size - 8, rect.left + rect.width * spot.align - size / 2));
    return { spot, anchor, size, width: size, height, x, y: rect.top - height };
  }
  function position(item, measured) {
    item.node.style.width = measured.width + 'px'; item.node.style.height = measured.height + 'px';
    item.node.style.left = measured.x + scrollX + 'px'; item.node.style.top = measured.y + scrollY + 'px';
    item.geometry = measured;
  }
  function schedule(delay = random(6500, 14500)) {
    clearTimeout(timer); timer = null;
    if (!unavailable()) timer = setTimeout(appear, delay);
  }
  function dismiss(reschedule = true) {
    if (active) {
      clearTimeout(active.blinkTimer); clearTimeout(active.reactionTimer); cancelAnimationFrame(active.raf);
      active.animations.forEach(animation => animation.cancel()); active.node.remove(); active = null;
    }
    if (reschedule) schedule();
  }
  function blink(item, double = false) {
    if (active !== item) return;
    const animation = item.eyes.animate([
      { transform: 'scaleY(1)', offset: 0 }, { transform: 'scaleY(.08)', offset: .42 },
      { transform: 'scaleY(.08)', offset: .55 }, { transform: 'scaleY(1)', offset: 1 },
    ], { duration: double ? 170 : 220, easing: 'ease-in-out' });
    item.animations.push(animation);
  }
  function nextBlink(item) {
    item.blinkTimer = setTimeout(() => {
      if (active !== item) return;
      blink(item); nextBlink(item);
    }, random(1800, 3400));
  }
  function watch(item) {
    if (active !== item) return;
    if (unavailable()) { dismiss(); return; }
    if (dirty) {
      const current = measure(item.spot); dirty = false;
      if (!current) { dismiss(); return; }
      // A large layout change gets a fresh entrance rather than a jumping face.
      if (Math.abs(current.height - item.geometry.height) > 2) { dismiss(); return; }
      position(item, current);
    }
    const now = performance.now();
    if (now > item.nextLook) {
      item.look = { x: random(-2.3, 2.3), y: random(-1, 1) }; item.nextLook = now + random(900, 1900);
    }
    let look = item.look;
    if (pointer && now - pointer.time < 2500) {
      const { x, y, size } = item.geometry;
      const dx = pointer.x - (x + size / 2), dy = pointer.y - (y + item.geometry.height / 2);
      const side = item.spot.side;
      const localX = side === 'right' ? dy : side === 'left' ? -dy : dx;
      const localY = side === 'right' ? -dx : side === 'left' ? dx : dy;
      look = { x: Math.max(-2.8, Math.min(2.8, localX / 65)), y: Math.max(-1.8, Math.min(1.8, localY / 100)) };
      if (!item.caught && Math.hypot(dx, dy) < size * 1.6) {
        item.caught = true; item.node.classList.add('is-caught'); blink(item, true);
        item.reactionTimer = setTimeout(() => { if (active === item) { item.node.classList.remove('is-caught'); blink(item); } }, 1500);
      }
    }
    item.gaze.x += (look.x - item.gaze.x) * .09; item.gaze.y += (look.y - item.gaze.y) * .09;
    item.pupils.setAttribute('transform', `translate(${item.gaze.x.toFixed(2)} ${item.gaze.y.toFixed(2)})`);
    item.raf = requestAnimationFrame(() => watch(item));
  }
  function appear() {
    if (unavailable()) { schedule(); return; }
    let choices = spots.map(measure).filter(Boolean);
    if (choices.length > 1) choices = choices.filter(candidate => candidate.spot.selector !== lastSpot);
    if (!choices.length) { schedule(2500); return; }
    const geometry = first && choices.some(candidate => candidate.spot.selector === '.github-link')
      ? choices.find(candidate => candidate.spot.selector === '.github-link') : choices[Math.floor(random(0, choices.length))];
    first = false; lastSpot = geometry.spot.selector;
    let color = Math.floor(random(0, colors.length)); if (color === lastColor) color = (color + 1) % colors.length; lastColor = color;
    const node = document.createElement('span'); node.className = 'agent-cameo' + (geometry.spot.side ? ' is-side' : '');
    node.dataset.side = geometry.spot.side || 'top';
    node.dataset.spot = geometry.spot.selector; node.dataset.agent = String(color); node.setAttribute('aria-hidden', 'true');
    node.innerHTML = `<span class="cameo-reaction"><span class="cameo-pose"><span class="cameo-orient">${sprite(color)}</span></span></span>`;
    layer.append(node);
    const item = { node, spot: geometry.spot, geometry, animations: [], eyes: node.querySelector('.agent-creature-eyes'), pupils: node.querySelector('.agent-creature-pupils'), gaze: { x: 0, y: 0 }, look: { x: -1.5, y: 0 }, nextLook: performance.now() + 1200 };
    active = item; position(item, geometry);
    const side = geometry.spot.side, size = geometry.size, height = geometry.height;
    const direction = side === 'left' ? 1 : -1;
    const pose = (depth, scoot = 0) => side
      ? `translate(${direction * depth}px, ${scoot}px)` : `translate(${scoot}px, ${depth}px)`;
    const hidden = side ? size + 8 : height + 8;
    const depth = visible => side ? size * (1 - visible) : height - size * visible;
    const bouncy = Math.random() < .55;
    node.dataset.mood = bouncy ? 'bouncy' : 'shy';
    // Anticipation, a quick spring, and a softer landing give each peek weight.
    // Pauses between gestures let the eyes lead before the body follows.
    const beats = [
      [0, hidden, 0, 0, 1, 1],
      [.07, depth(.58), -1, -7, .92, 1.10],
      [.11, depth(.53), 0, 3, 1.06, .94],
      [.15, depth(.55), 0, 0, 1, 1],
      [.24, depth(.55), 0, -3, 1, 1],
      [.29, depth(.32), 1, -9, 1.16, .82],
      [.34, depth(bouncy ? .94 : .82), -2, 8, .87, 1.14],
      [.38, depth(.74), 0, -5, 1.12, .90],
      [.42, depth(.78), 0, 2, .97, 1.03],
      [.47, depth(.77), 0, 0, 1, 1],
      [.56, depth(.77), 0, 0, 1.015, .985],
      [.60, depth(.79), 2, 10, .98, 1.025],
      [.65, depth(.77), -2, -8, 1.025, .98],
      [.70, depth(.77), 0, 2, 1, 1],
      [.76, depth(.56), 1, -5, 1.06, .94],
      [.84, depth(.56), 1, -3, 1, 1],
      [.88, depth(.60), -1, 8, .95, 1.06],
      [.94, hidden, 0, -10, .9, 1.1],
      [1, hidden, 0, 0, 1, 1],
    ];
    const duration = random(7800, 9400);
    const timing = { duration, easing: 'linear', fill: 'both' };
    const animation = node.querySelector('.cameo-pose').animate(beats.map(([offset, value, scoot]) => ({
      offset, transform: pose(value, scoot), easing: 'cubic-bezier(.22,.65,.35,1)',
    })), timing);
    item.animations.push(animation);
    item.animations.push(node.querySelector('.agent-creature-body').animate(beats.map(([offset, , , tilt, sx, sy]) => ({
      offset, transform: `rotate(${tilt}deg) scale(${sx},${sy})`, easing: 'cubic-bezier(.3,0,.3,1)',
    })), timing));
    item.animations.push(node.querySelector('.agent-creature-paws').animate([
      { transform: 'translateY(0) rotate(0deg)' },
      { transform: 'translateY(-2px) rotate(-3deg)' },
      { transform: 'translateY(1px) rotate(2deg)' },
      { transform: 'translateY(0) rotate(0deg)' },
    ], { duration: random(1300, 1800), iterations: Infinity, easing: 'ease-in-out' }));
    animation.onfinish = () => { if (active === item) dismiss(); };
    nextBlink(item); item.raf = requestAnimationFrame(() => watch(item));
  }
  window.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') pointer = { x: event.clientX, y: event.clientY, time: performance.now() }; }, { passive: true });
  window.addEventListener('scroll', () => { dirty = true; }, { passive: true });
  window.addEventListener('resize', () => { dirty = true; });
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); dismiss(false); if (!unavailable()) schedule(random(2000, 4000)); });
  toggle.addEventListener('click', () => { paused = !paused; try { localStorage.setItem('jait-cameos-paused', String(paused)); } catch {} clearTimeout(timer); dismiss(false); updateToggle(); if (!unavailable()) schedule(random(1200, 2400)); });
  document.getElementById('image-dialog').addEventListener('close', () => { if (!active && !unavailable()) schedule(random(1800, 3200)); });
  motion.addEventListener('change', () => { updateToggle(); clearTimeout(timer); dismiss(false); if (!unavailable()) schedule(); });
  schedule(random(1600, 2800));
})();
