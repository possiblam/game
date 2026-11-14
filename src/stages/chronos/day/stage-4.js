import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';

export function mountChronosDayStage4(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const W = 760;
  const H = 390;
  const TOTAL_DIST = 2600;
  const CHECKPOINT_DIST = 1280;

  // Periodic steam geysers along canyon floor
  const geysers = [
    { worldX: 380, width: 76, phase: 0, period: 3.6, activeDur: 2.2 },
    { worldX: 760, width: 80, phase: 1.0, period: 3.6, activeDur: 2.3 },
    { worldX: 1140, width: 78, phase: 0.4, period: 3.4, activeDur: 2.2 },
    { worldX: 1520, width: 82, phase: 1.5, period: 3.8, activeDur: 2.3 },
    { worldX: 1920, width: 84, phase: 0.2, period: 3.5, activeDur: 2.3 },
    { worldX: 2290, width: 84, phase: 1.1, period: 3.6, activeDur: 2.4 },
  ];

  // Sharp canyon rocks (top stalactites & mid/bottom spires)
  const rocks = [
    { worldX: 550, y: 0, w: 46, h: 120 },
    { worldX: 950, y: 250, w: 48, h: 140 },
    { worldX: 1350, y: 0, w: 50, h: 135 },
    { worldX: 1730, y: 240, w: 52, h: 150 },
    { worldX: 2110, y: 0, w: 50, h: 130 },
  ];

  let glider = { worldX: 80, y: 150, vy: 0 };
  let checkpointReached = false;
  let pitchInput = 0; // -1 up, +1 down
  let boostInput = 0; // +1 forward
  let elapsed = 0;
  let hintLevel = 0;
  let done = false;
  let respawnFlash = 0;
  let statusText = 'روی ستون‌های سفید بخار عبور کن تا اوج بگیری و از صخره‌ها جاخالی بده!';

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3">
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-amber-400/35 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold">
        <span id="d4-status" class="text-amber-200">${statusText}</span>
        <div class="flex items-center gap-3 tabular-nums">
          <span class="text-cyan-300">مسافت: <strong id="d4-dist">۰٪</strong></span>
          <span id="d4-cp" class="text-slate-400 text-xs">نقطه امن: ابتدای دره</span>
        </div>
      </div>

      <div class="relative rounded-2xl overflow-hidden border-2 border-amber-400/40 bg-slate-950">
        <canvas id="d4-canvas" width="${W}" height="${H}" class="w-full h-auto block"></canvas>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <button type="button" id="d4-up-btn" data-testid="chronos-d4-up"
          class="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl btn-day-accent text-sm sm:text-base font-extrabold select-none">
          ⬆ اوج گرفتن (W / ↑)
        </button>
        <button type="button" id="d4-down-btn" data-testid="chronos-d4-down"
          class="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl btn-secondary-slate text-sm sm:text-base font-extrabold select-none">
          ⬇ شیرجه و سرعت (S / ↓)
        </button>
      </div>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#d4-canvas');
  const ctx2d = canvas.getContext('2d');
  const statusEl = shell.playArea.querySelector('#d4-status');
  const distEl = shell.playArea.querySelector('#d4-dist');
  const cpEl = shell.playArea.querySelector('#d4-cp');
  const upBtn = shell.playArea.querySelector('#d4-up-btn');
  const downBtn = shell.playArea.querySelector('#d4-down-btn');

  const keys = new Set();
  let holdUp = false;
  let holdDown = false;
  let rafId = null;
  let lastNow = performance.now();

  function getGeyserState(g, t) {
    const cycle = (t + g.phase) % g.period;
    if (cycle < g.activeDur) return 'active';
    if (cycle > g.period - 0.85) return 'warning';
    return 'idle';
  }

  function resetToCheckpoint(reason) {
    audio.playError();
    shell.recordAttempt();
    respawnFlash = 0.6;
    glider.worldX = checkpointReached ? CHECKPOINT_DIST : 80;
    glider.y = 145;
    glider.vy = 0;
    statusText = reason;
    statusEl.textContent = statusText;
  }

  function stepPhysics(dt) {
    elapsed += dt;
    if (respawnFlash > 0) respawnFlash = Math.max(0, respawnFlash - dt);

    const isUp = holdUp || keys.has('ArrowUp') || keys.has('KeyW');
    const isDown = holdDown || keys.has('ArrowDown') || keys.has('KeyS');
    pitchInput = (isDown ? 1 : 0) - (isUp ? 1 : 0);
    boostInput = isDown ? 45 : 0;

    // Gentle forward glide speed + descent gravity
    const forwardSpeed = 138 + boostInput;
    glider.worldX += forwardSpeed * dt;
    glider.vy += (58 + pitchInput * 130) * dt;

    // Check steam geyser updrafts
    let inUpdraft = false;
    for (const g of geysers) {
      if (Math.abs(glider.worldX - g.worldX) <= g.width * 0.62) {
        const st = getGeyserState(g, elapsed);
        if (st === 'active') {
          glider.vy -= 275 * dt;
          inUpdraft = true;
        }
      }
    }
    if (inUpdraft && Math.random() < 0.08) {
      audio.playTone({ freq: 520, slideTo: 690, duration: 0.09, type: 'sine', gain: 0.04 });
    }

    glider.vy = Math.max(-175, Math.min(185, glider.vy));
    glider.y += glider.vy * dt;

    if (!checkpointReached && glider.worldX >= CHECKPOINT_DIST) {
      checkpointReached = true;
      audio.playMechanism();
      cpEl.textContent = 'نقطه امن: میانه دره ✓';
      cpEl.className = 'text-emerald-300 text-xs font-extrabold';
    }

    // Check bounds (sky cap & canyon floor crash)
    if (glider.y < 22) {
      glider.y = 22;
      glider.vy = Math.max(0, glider.vy);
    }
    if (glider.y > H - 28) {
      resetToCheckpoint('به کف دره افتادی! از بخار داغ برای بالا رفتن استفاده کن.');
      return;
    }

    // Check sharp rocks collision
    for (const r of rocks) {
      if (
        glider.worldX + 18 > r.worldX &&
        glider.worldX - 18 < r.worldX + r.w &&
        glider.y + 14 > r.y &&
        glider.y - 14 < r.y + r.h
      ) {
        resetToCheckpoint('با صخره تیز برخورد کردی! بازگشت به نقطه امن.');
        return;
      }
    }

    // Goal landing cliff
    if (glider.worldX >= TOTAL_DIST - 90) {
      done = true;
      audio.playGateOpen();
      statusText = 'فرود عالی روی سکوی آن‌سوی دره!';
      statusEl.textContent = statusText;
      setTimeout(() => shell.complete(), 420);
    }
  }

  function renderFrame(now) {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    if (!done) stepPhysics(dt);

    const camX = Math.max(0, Math.min(TOTAL_DIST - W, glider.worldX - 180));
    const pct = Math.min(100, Math.round((glider.worldX / (TOTAL_DIST - 90)) * 100));
    distEl.textContent = `${toPersianDigits(pct)}٪`;

    // Sky & canyon gradient
    const sky = ctx2d.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0284c7');
    sky.addColorStop(0.55, '#fb923c');
    sky.addColorStop(1, '#451a03');
    ctx2d.fillStyle = sky;
    ctx2d.fillRect(0, 0, W, H);

    // Distant canyon silhouettes
    ctx2d.fillStyle = 'rgba(67, 20, 7, 0.45)';
    for (let i = 0; i < 6; i++) {
      const mx = ((i * 220 - camX * 0.25) % (W + 220)) - 110;
      ctx2d.beginPath();
      ctx2d.moveTo(mx, H);
      ctx2d.lineTo(mx + 110, 140 + (i % 2) * 45);
      ctx2d.lineTo(mx + 220, H);
      ctx2d.fill();
    }

    // Canyon bottom lava/steam floor
    ctx2d.fillStyle = '#7c2d12';
    ctx2d.fillRect(0, H - 22, W, 22);

    // Steam Geysers
    for (const g of geysers) {
      const sx = g.worldX - camX;
      if (sx < -120 || sx > W + 120) continue;
      const st = getGeyserState(g, elapsed);

      // Vent mound
      ctx2d.fillStyle = '#431407';
      ctx2d.fillRect(sx - g.width / 2, H - 30, g.width, 12);

      if (st === 'warning') {
        ctx2d.fillStyle = 'rgba(251, 146, 60, 0.65)';
        ctx2d.beginPath();
        ctx2d.arc(sx, H - 34, 16 + Math.sin(elapsed * 20) * 4, 0, Math.PI * 2);
        ctx2d.fill();
      } else if (st === 'active') {
        const colGrad = ctx2d.createLinearGradient(sx, H - 24, sx, 40);
        colGrad.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
        colGrad.addColorStop(0.6, 'rgba(186, 230, 253, 0.45)');
        colGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        ctx2d.fillStyle = colGrad;
        ctx2d.fillRect(sx - g.width * 0.42, 35, g.width * 0.84, H - 59);

        // Rising steam bubbles
        ctx2d.fillStyle = 'rgba(255, 255, 255, 0.65)';
        for (let b = 0; b < 5; b++) {
          const by = H - 30 - ((elapsed * 240 + b * 65) % (H - 80));
          const bx = sx + Math.sin(elapsed * 8 + b) * 14;
          ctx2d.beginPath();
          ctx2d.arc(bx, by, 6 + (b % 3) * 3, 0, Math.PI * 2);
          ctx2d.fill();
        }
      }
    }

    // Sharp Rocks
    for (const r of rocks) {
      const rx = r.worldX - camX;
      if (rx < -80 || rx > W + 80) continue;
      ctx2d.fillStyle = '#292524';
      ctx2d.strokeStyle = hintLevel >= 3 ? '#f87171' : '#78350f';
      ctx2d.lineWidth = hintLevel >= 3 ? 3 : 2;
      ctx2d.beginPath();
      if (r.y === 0) {
        ctx2d.moveTo(rx, 0);
        ctx2d.lineTo(rx + r.w / 2, r.h);
        ctx2d.lineTo(rx + r.w, 0);
      } else {
        ctx2d.moveTo(rx, H);
        ctx2d.lineTo(rx + r.w / 2, r.y);
        ctx2d.lineTo(rx + r.w, H);
      }
      ctx2d.closePath();
      ctx2d.fill();
      ctx2d.stroke();
    }

    // Mid checkpoint banner
    const cpScreenX = CHECKPOINT_DIST - camX;
    if (cpScreenX > -40 && cpScreenX < W + 40) {
      ctx2d.strokeStyle = '#34d399';
      ctx2d.setLineDash([6, 6]);
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.moveTo(cpScreenX, 0);
      ctx2d.lineTo(cpScreenX, H);
      ctx2d.stroke();
      ctx2d.setLineDash([]);
    }

    // Landing goal cliff
    const goalX = TOTAL_DIST - 120 - camX;
    if (goalX < W + 100) {
      ctx2d.fillStyle = '#15803d';
      ctx2d.fillRect(goalX, 180, 180, H - 180);
      ctx2d.fillStyle = '#fde047';
      ctx2d.fillRect(goalX, 180, 180, 8);
      ctx2d.font = 'bold 26px sans-serif';
      ctx2d.fillText('🏁', goalX + 45, 165);
    }

    // Glider & Explorer
    const gx = glider.worldX - camX;
    const gy = glider.y;
    ctx2d.save();
    ctx2d.translate(gx, gy);
    ctx2d.rotate(glider.vy * 0.0022);
    if (respawnFlash > 0 && Math.floor(respawnFlash * 20) % 2 === 0) {
      ctx2d.globalAlpha = 0.45;
    }
    // Paraglider wing canopy
    ctx2d.fillStyle = '#f97316';
    ctx2d.strokeStyle = '#fef3c7';
    ctx2d.lineWidth = 2.5;
    ctx2d.beginPath();
    ctx2d.arc(0, -14, 24, Math.PI, 0);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();
    // Suspension cords
    ctx2d.strokeStyle = '#e2e8f0';
    ctx2d.lineWidth = 1.5;
    ctx2d.beginPath();
    ctx2d.moveTo(-18, -14);
    ctx2d.lineTo(0, 6);
    ctx2d.moveTo(18, -14);
    ctx2d.lineTo(0, 6);
    ctx2d.stroke();
    // Explorer
    ctx2d.beginPath();
    ctx2d.arc(0, 10, 9, 0, Math.PI * 2);
    ctx2d.fillStyle = '#38bdf8';
    ctx2d.fill();
    ctx2d.stroke();
    ctx2d.restore();

    rafId = requestAnimationFrame(renderFrame);
  }

  const onKeyDown = (e) => {
    if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
      e.preventDefault();
      keys.add(e.code);
    }
  };
  const onKeyUp = (e) => keys.delete(e.code);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  upBtn.addEventListener('pointerdown', () => { holdUp = true; });
  upBtn.addEventListener('pointerup', () => { holdUp = false; });
  upBtn.addEventListener('pointerleave', () => { holdUp = false; });
  downBtn.addEventListener('pointerdown', () => { holdDown = true; });
  downBtn.addEventListener('pointerup', () => { holdDown = false; });
  downBtn.addEventListener('pointerleave', () => { holdDown = false; });

  shell.onHint((lvl) => { hintLevel = lvl; });
  shell.onRetry(() => {
    checkpointReached = false;
    glider = { worldX: 80, y: 150, vy: 0 };
    cpEl.textContent = 'نقطه امن: ابتدای دره';
    cpEl.className = 'text-slate-400 text-xs';
    done = false;
  });

  shell.registerCleanup(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  });

  rafId = requestAnimationFrame(renderFrame);
  return shell;
}
