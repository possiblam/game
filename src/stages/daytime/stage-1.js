import { createStageShell } from '../stage-shell.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountDayStage1(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[900px] flex items-center justify-between text-xs sm:text-sm text-amber-200 px-1">
      <span>آراد را از میان لیزرهای زمان‌بندی‌شده به در خروجی برسانید</span>
      <span id="d1-checkpoint-label" class="font-bold text-emerald-300">نقطه امن: ورودی</span>
    </div>
    <div class="game-canvas-frame">
      <canvas id="d1-canvas" width="800" height="440" data-testid="daytime-1-canvas"></canvas>
    </div>
    <div class="touch-controls-bar" aria-label="کنترل حرکت">
      <button type="button" class="touch-btn" data-dir="right" aria-label="حرکت به راست">▶ راست</button>
      <button type="button" class="touch-btn" data-dir="up" aria-label="حرکت به بالا">▲ بالا</button>
      <button type="button" class="touch-btn" data-dir="down" aria-label="حرکت به پایین">▼ پایین</button>
      <button type="button" class="touch-btn" data-dir="left" aria-label="حرکت به چپ">◀ چپ</button>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#d1-canvas');
  const ctx2d = canvas.getContext('2d');
  const cpLabel = shell.playArea.querySelector('#d1-checkpoint-label');

  // Maze walls (x, y, w, h) in 800x440 space — generous corridors (>= 64px wide)
  const walls = [
    { x: 0, y: 0, w: 800, h: 18 },
    { x: 0, y: 422, w: 800, h: 18 },
    { x: 0, y: 0, w: 18, h: 440 },
    { x: 782, y: 0, w: 18, h: 440 },
    // Interior glass/steel security dividers
    { x: 165, y: 18, w: 22, h: 280 },
    { x: 330, y: 140, w: 22, h: 282 },
    { x: 495, y: 18, w: 22, h: 280 },
    { x: 640, y: 140, w: 22, h: 282 },
  ];

  // Safe checkpoints
  const checkpoints = [
    { x: 75, y: 75, r: 22, name: 'ورودی' },
    { x: 255, y: 365, r: 22, name: 'نقطه امن اول' },
    { x: 420, y: 75, r: 22, name: 'نقطه امن دوم' },
    { x: 580, y: 365, r: 22, name: 'نقطه امن سوم' },
  ];

  const exitZone = { x: 722, y: 75, r: 28 };

  // Timed laser beams (period & active window so there are clear safe crossing windows)
  const lasers = [
    { x1: 20, y1: 200, x2: 164, y2: 200, period: 2.8, activeStart: 0.0, activeEnd: 1.35 },
    { x1: 188, y1: 230, x2: 329, y2: 230, period: 3.0, activeStart: 1.2, activeEnd: 2.4 },
    { x1: 353, y1: 190, x2: 494, y2: 190, period: 2.6, activeStart: 0.2, activeEnd: 1.35 },
    { x1: 518, y1: 245, x2: 639, y2: 245, period: 3.1, activeStart: 1.4, activeEnd: 2.65 },
    { x1: 663, y1: 215, x2: 781, y2: 215, period: 2.5, activeStart: 0.1, activeEnd: 1.25 },
  ];

  let activeCheckpointIdx = 0;
  const player = { x: checkpoints[0].x, y: checkpoints[0].y, r: 15, speed: 215 };
  let hitFlash = 0;
  let simTime = 0;
  let completed = false;
  let rafId = null;
  let lastTs = performance.now();
  const held = new Set();

  function resetToStart() {
    activeCheckpointIdx = 0;
    player.x = checkpoints[0].x;
    player.y = checkpoints[0].y;
    hitFlash = 0;
    cpLabel.textContent = `نقطه امن: ${checkpoints[0].name}`;
  }

  shell.onRetry(resetToStart);

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

  shell.playArea.querySelectorAll('.touch-btn').forEach((btn) => {
    const dir = btn.dataset.dir;
    const press = (e) => {
      e.preventDefault();
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
    simTime += dt;
    if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt);

    if (!completed) {
      let vx = 0;
      let vy = 0;
      if (held.has('left')) vx -= 1;
      if (held.has('right')) vx += 1;
      if (held.has('up')) vy -= 1;
      if (held.has('down')) vy += 1;
      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }

      const nextX = player.x + vx * player.speed * dt;
      if (!walls.some((w) => circleIntersectsRect(nextX, player.y, player.r, w))) {
        player.x = nextX;
      }
      const nextY = player.y + vy * player.speed * dt;
      if (!walls.some((w) => circleIntersectsRect(player.x, nextY, player.r, w))) {
        player.y = nextY;
      }

      // Check checkpoints
      checkpoints.forEach((cp, idx) => {
        if (idx > activeCheckpointIdx) {
          const d = Math.hypot(player.x - cp.x, player.y - cp.y);
          if (d < cp.r + player.r - 4) {
            activeCheckpointIdx = idx;
            audio.playMechanism();
            cpLabel.textContent = `نقطه امن: ${cp.name}`;
          }
        }
      });

      // Check active lasers
      for (const l of lasers) {
        const phase = simTime % l.period;
        const isActive = phase >= l.activeStart && phase <= l.activeEnd;
        if (isActive) {
          const nearY = Math.abs(player.y - l.y1) < player.r + 4;
          const withinX = player.x > l.x1 - player.r && player.x < l.x2 + player.r;
          if (nearY && withinX && hitFlash === 0) {
            audio.playLaserZap();
            shell.recordAttempt();
            hitFlash = 0.55;
            player.x = checkpoints[activeCheckpointIdx].x;
            player.y = checkpoints[activeCheckpointIdx].y;
            break;
          }
        }
      }

      // Check exit goal
      if (Math.hypot(player.x - exitZone.x, player.y - exitZone.y) < exitZone.r + player.r - 6) {
        completed = true;
        shell.complete();
      }
    }

    draw();
    if (!completed) {
      rafId = requestAnimationFrame(step);
    }
  }

  function draw() {
    ctx2d.clearRect(0, 0, 800, 440);

    // Bright daytime laboratory floor
    const bgGrad = ctx2d.createLinearGradient(0, 0, 800, 440);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx2d.fillStyle = bgGrad;
    ctx2d.fillRect(0, 0, 800, 440);

    // Subtle floor grid
    ctx2d.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx2d.lineWidth = 1;
    for (let x = 40; x < 800; x += 40) {
      ctx2d.beginPath();
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, 440);
      ctx2d.stroke();
    }
    for (let y = 40; y < 440; y += 40) {
      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(800, y);
      ctx2d.stroke();
    }

    // Tier 3 Hint: Safe corridor guide
    if (shell.getHintLevel() >= 3) {
      ctx2d.save();
      ctx2d.setLineDash([8, 8]);
      ctx2d.strokeStyle = 'rgba(74, 222, 128, 0.55)';
      ctx2d.lineWidth = 4;
      ctx2d.beginPath();
      ctx2d.moveTo(75, 75);
      ctx2d.lineTo(75, 365);
      ctx2d.lineTo(255, 365);
      ctx2d.lineTo(255, 75);
      ctx2d.lineTo(420, 75);
      ctx2d.lineTo(420, 365);
      ctx2d.lineTo(580, 365);
      ctx2d.lineTo(580, 75);
      ctx2d.lineTo(722, 75);
      ctx2d.stroke();
      ctx2d.restore();
    }

    // Checkpoints
    checkpoints.forEach((cp, idx) => {
      const reached = idx <= activeCheckpointIdx;
      ctx2d.beginPath();
      ctx2d.arc(cp.x, cp.y, cp.r, 0, Math.PI * 2);
      ctx2d.fillStyle = reached ? 'rgba(34, 197, 94, 0.35)' : 'rgba(148, 163, 184, 0.2)';
      ctx2d.fill();
      ctx2d.lineWidth = 2.5;
      ctx2d.strokeStyle = reached ? '#4ade80' : '#94a3b8';
      ctx2d.stroke();
    });

    // Exit portal
    ctx2d.beginPath();
    ctx2d.arc(exitZone.x, exitZone.y, exitZone.r, 0, Math.PI * 2);
    ctx2d.fillStyle = 'rgba(251, 191, 36, 0.32)';
    ctx2d.fill();
    ctx2d.lineWidth = 3;
    ctx2d.strokeStyle = '#fbbf24';
    ctx2d.stroke();
    ctx2d.fillStyle = '#fef3c7';
    ctx2d.font = 'bold 13px Vazirmatn, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('خروج', exitZone.x, exitZone.y + 5);

    // Lasers
    lasers.forEach((l) => {
      const phase = simTime % l.period;
      const isActive = phase >= l.activeStart && phase <= l.activeEnd;
      const isWarning = !isActive && phase >= l.period - 0.45;

      // Emitters
      ctx2d.fillStyle = '#475569';
      ctx2d.fillRect(l.x1 - 4, l.y1 - 6, 10, 12);
      ctx2d.fillRect(l.x2 - 6, l.y2 - 6, 10, 12);

      if (isActive) {
        ctx2d.save();
        ctx2d.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx2d.lineWidth = 14;
        ctx2d.beginPath();
        ctx2d.moveTo(l.x1, l.y1);
        ctx2d.lineTo(l.x2, l.y2);
        ctx2d.stroke();

        ctx2d.strokeStyle = '#ef4444';
        ctx2d.lineWidth = 4;
        ctx2d.beginPath();
        ctx2d.moveTo(l.x1, l.y1);
        ctx2d.lineTo(l.x2, l.y2);
        ctx2d.stroke();
        ctx2d.restore();
      } else if (isWarning) {
        ctx2d.save();
        ctx2d.setLineDash([6, 6]);
        ctx2d.strokeStyle = 'rgba(251, 146, 60, 0.85)';
        ctx2d.lineWidth = 2.5;
        ctx2d.beginPath();
        ctx2d.moveTo(l.x1, l.y1);
        ctx2d.lineTo(l.x2, l.y2);
        ctx2d.stroke();
        ctx2d.restore();
      } else if (shell.getHintLevel() >= 3) {
        ctx2d.fillStyle = '#4ade80';
        ctx2d.font = 'bold 11px Vazirmatn, sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.fillText(`امن (${toPersianDigits((l.period - phase).toFixed(1))})`, (l.x1 + l.x2) / 2, l.y1 - 6);
      }
    });

    // Walls
    walls.forEach((w) => {
      ctx2d.fillStyle = '#475569';
      ctx2d.fillRect(w.x, w.y, w.w, w.h);
      ctx2d.strokeStyle = '#94a3b8';
      ctx2d.lineWidth = 1.5;
      ctx2d.strokeRect(w.x, w.y, w.w, w.h);
    });

    // Player (Arad)
    ctx2d.save();
    if (hitFlash > 0) {
      ctx2d.globalAlpha = 0.6;
    }
    ctx2d.beginPath();
    ctx2d.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx2d.fillStyle = hitFlash > 0 ? '#ef4444' : '#f97316';
    ctx2d.fill();
    ctx2d.lineWidth = 3;
    ctx2d.strokeStyle = '#fef3c7';
    ctx2d.stroke();
    // Goggles visor
    ctx2d.fillStyle = '#38bdf8';
    ctx2d.fillRect(player.x - 8, player.y - 6, 16, 5);
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
