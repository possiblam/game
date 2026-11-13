import { createStageShell } from '../stage-shell.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountNightStage6(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const GRAV_LABELS = {
    down: 'پایین ▼',
    up: 'بالا ▲',
    right: 'راست ▶',
    left: 'چپ ◀',
  };

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-cyan-200 px-1">
      <span>به تابلوهای جهت‌دار دیوار دقت کنید و جهت گرانش را برای عبور از ۳ اتاقک تونل تغییر دهید</span>
      <span id="n6-grav-label" class="font-bold text-cyan-300">گرانش فعلی: پایین ▼</span>
    </div>
    <div class="game-canvas-frame">
      <canvas id="n6-canvas" width="800" height="420" data-testid="nighttime-6-canvas"></canvas>
    </div>
    <div class="touch-controls-bar" aria-label="پنل تغییر گرانش">
      <button type="button" class="touch-btn btn-night-accent" data-grav="right" data-testid="grav-right">▶ گرانش راست</button>
      <button type="button" class="touch-btn btn-night-accent" data-grav="up" data-testid="grav-up">▲ گرانش بالا</button>
      <button type="button" class="touch-btn btn-night-accent" data-grav="down" data-testid="grav-down">▼ گرانش پایین</button>
      <button type="button" class="touch-btn btn-night-accent" data-grav="left" data-testid="grav-left">◀ گرانش چپ</button>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#n6-canvas');
  const ctx2d = canvas.getContext('2d');
  const gravLabel = shell.playArea.querySelector('#n6-grav-label');

  // Tunnel walls & chamber dividers
  const walls = [
    { x: 0, y: 0, w: 800, h: 18 },
    { x: 0, y: 402, w: 800, h: 18 },
    { x: 0, y: 0, w: 18, h: 420 },
    { x: 782, y: 0, w: 18, h: 420 },
    // Chamber 1 -> Chamber 2 gate at x=260 (gap at top y=18..145)
    { x: 260, y: 145, w: 22, h: 257 },
    // Chamber 2 -> Chamber 3 gate at x=520 (gap at bottom y=275..402)
    { x: 520, y: 18, w: 22, h: 257 },
  ];

  // Energy spike hazards
  const spikes = [
    { x: 135, y: 386, w: 110, h: 16 }, // Chamber 1 floor hazard (avoid by going UP)
    { x: 350, y: 18, w: 120, h: 16 },  // Chamber 2 ceiling hazard (avoid by going DOWN)
    { x: 585, y: 386, w: 130, h: 16 }, // Chamber 3 floor hazard (avoid by going UP)
  ];

  // Wall signs guiding player inside each chamber
  const wallSigns = [
    { x: 80, y: 205, arrow: '▲', text: 'بالا' },
    { x: 330, y: 205, arrow: '▼', text: 'پایین' },
    { x: 590, y: 205, arrow: '▲', text: 'بالا' },
  ];

  const exitPortal = { x: 735, y: 78, r: 28 };
  const player = { x: 60, y: 355, vx: 0, vy: 0, r: 15 };
  let gravity = 'down';
  let completed = false;
  let rafId = null;
  let lastTs = performance.now();

  function setGravity(dir) {
    if (gravity !== dir) {
      gravity = dir;
      audio.playMechanism();
      gravLabel.textContent = `گرانش فعلی: ${GRAV_LABELS[dir]}`;
      updateHintHighlights();
    }
  }

  function resetStage() {
    player.x = 60;
    player.y = 355;
    player.vx = 0;
    player.vy = 0;
    gravity = 'down';
    gravLabel.textContent = `گرانش فعلی: ${GRAV_LABELS.down}`;
    updateHintHighlights();
  }
  shell.onRetry(resetStage);
  shell.onHint(() => updateHintHighlights());

  function getRecommendedGravity() {
    if (player.x < 260) {
      return player.y > 130 ? 'up' : 'right';
    }
    if (player.x < 520) {
      return player.y < 290 ? 'down' : 'right';
    }
    return player.y > 130 ? 'up' : 'right';
  }

  function updateHintHighlights() {
    const rec = shell.getHintLevel() >= 3 ? getRecommendedGravity() : null;
    shell.playArea.querySelectorAll('[data-grav]').forEach((btn) => {
      const isRec = btn.dataset.grav === rec;
      btn.classList.toggle('ring-4', isRec);
      btn.classList.toggle('ring-amber-300', isRec);
    });
  }

  shell.playArea.querySelectorAll('[data-grav]').forEach((btn) => {
    btn.addEventListener('click', () => setGravity(btn.dataset.grav));
  });

  function onKeyDown(e) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      setGravity('up');
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      setGravity('down');
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      setGravity('right');
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      setGravity('left');
    }
  }
  window.addEventListener('keydown', onKeyDown);

  function circleIntersectsRect(cx, cy, cr, r) {
    const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
    const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  function step(now) {
    const dt = Math.min((now - lastTs) / 1000, 0.05);
    lastTs = now;

    if (!completed) {
      const accel = 520;
      if (gravity === 'down') {
        player.vy += accel * dt;
        player.vx *= 0.92;
      } else if (gravity === 'up') {
        player.vy -= accel * dt;
        player.vx *= 0.92;
      } else if (gravity === 'right') {
        player.vx += accel * dt;
        player.vy *= 0.92;
      } else if (gravity === 'left') {
        player.vx -= accel * dt;
        player.vy *= 0.92;
      }

      player.vx = Math.max(-280, Math.min(280, player.vx));
      player.vy = Math.max(-280, Math.min(280, player.vy));

      const nx = player.x + player.vx * dt;
      if (!walls.some((w) => circleIntersectsRect(nx, player.y, player.r, w))) {
        player.x = nx;
      } else {
        player.vx = 0;
      }

      const ny = player.y + player.vy * dt;
      if (!walls.some((w) => circleIntersectsRect(player.x, ny, player.r, w))) {
        player.y = ny;
      } else {
        player.vy = 0;
      }

      // Check spikes
      if (spikes.some((s) => circleIntersectsRect(player.x, player.y, player.r - 2, s))) {
        audio.playLaserZap();
        shell.recordAttempt();
        resetStage();
      }

      // Check exit portal
      if (Math.hypot(player.x - exitPortal.x, player.y - exitPortal.y) < exitPortal.r + player.r - 6) {
        completed = true;
        shell.complete();
      }

      if (shell.getHintLevel() >= 3) {
        updateHintHighlights();
      }
    }

    draw();
    if (!completed) {
      rafId = requestAnimationFrame(step);
    }
  }

  function draw() {
    ctx2d.clearRect(0, 0, 800, 420);

    // Cylindrical tunnel background
    const bg = ctx2d.createLinearGradient(0, 0, 0, 420);
    bg.addColorStop(0, '#082f49');
    bg.addColorStop(0.5, '#0f172a');
    bg.addColorStop(1, '#082f49');
    ctx2d.fillStyle = bg;
    ctx2d.fillRect(0, 0, 800, 420);

    // Wall signs
    wallSigns.forEach((s) => {
      ctx2d.fillStyle = 'rgba(14, 116, 144, 0.35)';
      ctx2d.fillRect(s.x - 28, s.y - 32, 56, 64);
      ctx2d.strokeStyle = '#22d3ee';
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(s.x - 28, s.y - 32, 56, 64);
      ctx2d.fillStyle = '#cffafe';
      ctx2d.font = 'bold 24px Vazirmatn, sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.fillText(s.arrow, s.x, s.y);
      ctx2d.font = 'bold 12px Vazirmatn, sans-serif';
      ctx2d.fillText(s.text, s.x, s.y + 22);
    });

    // Exit portal
    ctx2d.beginPath();
    ctx2d.arc(exitPortal.x, exitPortal.y, exitPortal.r, 0, Math.PI * 2);
    ctx2d.fillStyle = 'rgba(74, 222, 128, 0.32)';
    ctx2d.fill();
    ctx2d.strokeStyle = '#4ade80';
    ctx2d.lineWidth = 3.5;
    ctx2d.stroke();
    ctx2d.fillStyle = '#dcfce7';
    ctx2d.font = 'bold 13px Vazirmatn, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('خروج', exitPortal.x, exitPortal.y + 5);

    // Energy Spikes
    spikes.forEach((sp) => {
      ctx2d.fillStyle = '#ef4444';
      ctx2d.fillRect(sp.x, sp.y, sp.w, sp.h);
      ctx2d.strokeStyle = '#fecaca';
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(sp.x, sp.y, sp.w, sp.h);
    });

    // Walls
    walls.forEach((w) => {
      ctx2d.fillStyle = '#334155';
      ctx2d.fillRect(w.x, w.y, w.w, w.h);
      ctx2d.strokeStyle = '#38bdf8';
      ctx2d.lineWidth = 1.5;
      ctx2d.strokeRect(w.x, w.y, w.w, w.h);
    });

    // Player sphere with gravity orientation indicator
    ctx2d.beginPath();
    ctx2d.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx2d.fillStyle = '#38bdf8';
    ctx2d.fill();
    ctx2d.strokeStyle = '#f8fafc';
    ctx2d.lineWidth = 3;
    ctx2d.stroke();

    // Small directional dot inside player showing current gravity pull
    const off = { down: [0, 6], up: [0, -6], right: [6, 0], left: [-6, 0] }[gravity];
    ctx2d.beginPath();
    ctx2d.arc(player.x + off[0], player.y + off[1], 4, 0, Math.PI * 2);
    ctx2d.fillStyle = '#fde047';
    ctx2d.fill();
  }

  rafId = requestAnimationFrame(step);

  shell.registerCleanup(() => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
  });

  return shell;
}
