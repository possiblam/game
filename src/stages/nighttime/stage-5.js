import { createStageShell } from '../stage-shell.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountNightStage5(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-cyan-200 px-1">
      <span>پهپاد را به ترتیب از میان حلقه‌های ۱ تا ۶ عبور دهید و روی سکوی فرود بنشینید</span>
      <span id="n5-ring-label" class="font-bold text-amber-300 tabular-nums">حلقه بعدی: ۱ از ۶</span>
    </div>
    <div class="game-canvas-frame">
      <canvas id="n5-canvas" width="800" height="420" data-testid="nighttime-5-canvas"></canvas>
    </div>
    <div class="touch-controls-bar" aria-label="هدایت پهپاد">
      <button type="button" class="touch-btn" data-dir="right" aria-label="حرکت به راست">▶ راست</button>
      <button type="button" class="touch-btn" data-dir="up" aria-label="حرکت به بالا">▲ بالا</button>
      <button type="button" class="touch-btn" data-dir="down" aria-label="حرکت به پایین">▼ پایین</button>
      <button type="button" class="touch-btn" data-dir="left" aria-label="حرکت به چپ">◀ چپ</button>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#n5-canvas');
  const ctx2d = canvas.getContext('2d');
  const ringLabel = shell.playArea.querySelector('#n5-ring-label');

  const rings = [
    { num: 1, x: 155, y: 120, r: 26 },
    { num: 2, x: 280, y: 295, r: 26 },
    { num: 3, x: 405, y: 115, r: 26 },
    { num: 4, x: 525, y: 290, r: 26 },
    { num: 5, x: 645, y: 125, r: 26 },
    { num: 6, x: 715, y: 255, r: 26 },
  ];

  const landingPad = { x: 715, y: 365, w: 68, h: 18 };

  const barriers = [
    { x: 220, baseY: 205, amp: 85, speed: 1.8, r: 16, y: 205 },
    { x: 465, baseY: 205, amp: 95, speed: 2.1, r: 16, y: 205 },
    { x: 585, baseY: 205, amp: 85, speed: 1.9, r: 16, y: 205 },
  ];

  const drone = { x: 65, y: 210, vx: 0, vy: 0, r: 14 };
  let nextRingIdx = 0;
  let invuln = 0;
  let simTime = 0;
  let completed = false;
  let pointerTarget = null;
  let rafId = null;
  let lastTs = performance.now();
  const held = new Set();

  function resetStage() {
    drone.x = 65;
    drone.y = 210;
    drone.vx = 0;
    drone.vy = 0;
    nextRingIdx = 0;
    invuln = 0;
    pointerTarget = null;
    ringLabel.textContent = 'حلقه بعدی: ۱ از ۶';
  }
  shell.onRetry(resetStage);

  const keyMap = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
  };

  function onKeyDown(e) {
    const dir = keyMap[e.code];
    if (dir) {
      e.preventDefault();
      pointerTarget = null;
      held.add(dir);
    }
  }
  function onKeyUp(e) {
    const dir = keyMap[e.code];
    if (dir) held.delete(dir);
  }
  function clearHeld() {
    held.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearHeld);

  // Pointer/mouse steering on canvas
  function updatePointer(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * 800;
    const sy = ((e.clientY - rect.top) / rect.height) * 420;
    pointerTarget = { x: sx, y: sy };
  }
  let pointerActive = false;
  canvas.addEventListener('pointerdown', (e) => {
    pointerActive = true;
    updatePointer(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointerActive) updatePointer(e);
  });
  window.addEventListener('pointerup', () => {
    pointerActive = false;
    pointerTarget = null;
  });

  shell.playArea.querySelectorAll('.touch-btn').forEach((btn) => {
    const dir = btn.dataset.dir;
    const press = (e) => {
      e.preventDefault();
      pointerTarget = null;
      held.add(dir);
      btn.classList.add('is-pressed');
    };
    const release = () => {
      held.delete(dir);
      btn.classList.remove('is-pressed');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
  });

  function step(now) {
    const dt = Math.min((now - lastTs) / 1000, 0.05);
    lastTs = now;
    simTime += dt;
    if (invuln > 0) invuln = Math.max(0, invuln - dt);

    barriers.forEach((b, i) => {
      b.y = b.baseY + Math.sin(simTime * b.speed + i * 1.4) * b.amp;
    });

    if (!completed) {
      let ax = 0;
      let ay = 0;
      if (held.has('left')) ax -= 1;
      if (held.has('right')) ax += 1;
      if (held.has('up')) ay -= 1;
      if (held.has('down')) ay += 1;

      if (ax !== 0 || ay !== 0) {
        const len = Math.hypot(ax, ay);
        drone.vx = (ax / len) * 235;
        drone.vy = (ay / len) * 235;
      } else if (pointerTarget) {
        const dx = pointerTarget.x - drone.x;
        const dy = pointerTarget.y - drone.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          drone.vx = (dx / dist) * 235;
          drone.vy = (dy / dist) * 235;
        } else {
          drone.vx = 0;
          drone.vy = 0;
        }
      } else {
        drone.vx *= 0.85;
        drone.vy *= 0.85;
      }

      drone.x = Math.max(20, Math.min(780, drone.x + drone.vx * dt));
      drone.y = Math.max(20, Math.min(400, drone.y + drone.vy * dt));

      // Check rings in sequential order
      if (nextRingIdx < rings.length) {
        const targetRing = rings[nextRingIdx];
        if (Math.hypot(drone.x - targetRing.x, drone.y - targetRing.y) < targetRing.r + drone.r - 4) {
          audio.playKeyPickup();
          nextRingIdx += 1;
          ringLabel.textContent =
            nextRingIdx < rings.length
              ? `حلقه بعدی: ${toPersianDigits(nextRingIdx + 1)} از ${toPersianDigits(rings.length)}`
              : 'همه حلقه‌ها رد شدند! حالا روی سکوی فرود بنشینید';
        }
      } else {
        // Check landing pad
        if (
          drone.x > landingPad.x - 10 &&
          drone.x < landingPad.x + landingPad.w + 10 &&
          Math.abs(drone.y + drone.r - landingPad.y) < 18
        ) {
          completed = true;
          shell.complete();
        }
      }

      // Check barriers
      if (invuln <= 0) {
        for (const b of barriers) {
          if (Math.hypot(drone.x - b.x, drone.y - b.y) < b.r + drone.r) {
            audio.playLaserZap();
            shell.recordAttempt();
            invuln = 1.0;
            // Bounce back toward last cleared checkpoint
            if (nextRingIdx > 0) {
              drone.x = rings[nextRingIdx - 1].x;
              drone.y = rings[nextRingIdx - 1].y;
            } else {
              drone.x = 65;
              drone.y = 210;
            }
            break;
          }
        }
      }
    }

    draw();
    if (!completed) {
      rafId = requestAnimationFrame(step);
    }
  }

  function draw() {
    ctx2d.clearRect(0, 0, 800, 420);

    // Night skyline sky
    const sky = ctx2d.createLinearGradient(0, 0, 0, 420);
    sky.addColorStop(0, '#020617');
    sky.addColorStop(1, '#1e1b4b');
    ctx2d.fillStyle = sky;
    ctx2d.fillRect(0, 0, 800, 420);

    // Background towers
    ctx2d.fillStyle = 'rgba(15, 23, 42, 0.85)';
    [80, 210, 360, 520, 680].forEach((tx, idx) => {
      const h = 110 + (idx % 3) * 45;
      ctx2d.fillRect(tx, 420 - h, 55, h);
    });

    // Tier 3 Hint: guide beam to next target
    if (shell.getHintLevel() >= 3) {
      const target = nextRingIdx < rings.length ? rings[nextRingIdx] : { x: landingPad.x + landingPad.w / 2, y: landingPad.y - 10 };
      ctx2d.save();
      ctx2d.setLineDash([6, 6]);
      ctx2d.strokeStyle = '#fde047';
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.moveTo(drone.x, drone.y);
      ctx2d.lineTo(target.x, target.y);
      ctx2d.stroke();
      ctx2d.restore();
    }

    // Rings
    rings.forEach((r, idx) => {
      const passed = idx < nextRingIdx;
      const isCurrent = idx === nextRingIdx;
      ctx2d.beginPath();
      ctx2d.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx2d.strokeStyle = passed ? '#4ade80' : isCurrent ? '#fbbf24' : '#38bdf8';
      ctx2d.lineWidth = isCurrent ? 5 : 3;
      ctx2d.stroke();

      ctx2d.fillStyle = passed ? '#4ade80' : isCurrent ? '#fef08a' : '#bae6fd';
      ctx2d.font = 'bold 14px Vazirmatn, sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.fillText(passed ? '✓' : toPersianDigits(r.num), r.x, r.y + 5);
    });

    // Landing pad
    const padActive = nextRingIdx >= rings.length;
    ctx2d.fillStyle = padActive ? '#4ade80' : '#475569';
    ctx2d.fillRect(landingPad.x, landingPad.y, landingPad.w, landingPad.h);
    ctx2d.fillStyle = '#0f172a';
    ctx2d.font = 'bold 11px Vazirmatn, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('فرود', landingPad.x + landingPad.w / 2, landingPad.y + 13);

    // Moving security drone orbs
    barriers.forEach((b) => {
      ctx2d.beginPath();
      ctx2d.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx2d.fillStyle = '#ef4444';
      ctx2d.fill();
      ctx2d.strokeStyle = '#fecaca';
      ctx2d.lineWidth = 2.5;
      ctx2d.stroke();
    });

    // Player Drone
    ctx2d.save();
    if (invuln > 0 && Math.floor(simTime * 12) % 2 === 0) {
      ctx2d.globalAlpha = 0.4;
    }
    ctx2d.translate(drone.x, drone.y);
    // Propellers
    ctx2d.strokeStyle = '#38bdf8';
    ctx2d.lineWidth = 3;
    ctx2d.beginPath();
    ctx2d.moveTo(-20, -6);
    ctx2d.lineTo(-6, -6);
    ctx2d.moveTo(6, -6);
    ctx2d.lineTo(20, -6);
    ctx2d.stroke();
    // Body
    ctx2d.fillStyle = '#f8fafc';
    ctx2d.beginPath();
    ctx2d.ellipse(0, 2, 14, 8, 0, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = '#0284c7';
    ctx2d.beginPath();
    ctx2d.arc(0, 2, 5, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
  }

  rafId = requestAnimationFrame(step);

  shell.registerCleanup(() => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', clearHeld);
  });

  return shell;
}
