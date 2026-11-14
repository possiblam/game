import { createStageShell } from '../../stage-shell.js';
import { isGearToothSolid, normalizeDeg } from '../chronos-logic.js';
import { toPersianDigits } from '../../../data/translations.js';

export function mountChronosDayStage2(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  // 4 vertical giant gears on cliffside (bottom -> top)
  const gears = [
    { id: 0, x: 240, y: 318, r: 58, speed: 58, angle: 0, dir: 1, teeth: 10, broken: [{ startDeg: 65, endDeg: 130 }, { startDeg: 245, endDeg: 300 }] },
    { id: 1, x: 425, y: 242, r: 54, speed: -70, angle: 40, dir: -1, teeth: 10, broken: [{ startDeg: 15, endDeg: 85 }, { startDeg: 195, endDeg: 265 }] },
    { id: 2, x: 255, y: 162, r: 52, speed: 120, angle: 120, dir: 1, teeth: 10, lockedFast: true, broken: [{ startDeg: 0, endDeg: 140 }, { startDeg: 180, endDeg: 320 }] },
    { id: 3, x: 445, y: 92, r: 46, speed: -115, angle: 10, dir: -1, teeth: 9, lockedFast: true, broken: [{ startDeg: 20, endDeg: 160 }, { startDeg: 200, endDeg: 320 }] },
  ];

  // Player progression: 0 = bottom cliff, 1 = Gear 0, 2 = Gear 1 (lever ledge), 3 = Gear 2, 4 = Gear 3, 5 = Summit Goal
  let stepIndex = 0;
  let leverPulled = false;
  let hintLevel = 0;
  let jumpAnim = 0;
  let slipTimer = 0;
  let done = false;
  let statusText = 'روی دندانه سالم چرخ‌دنده اول بپر!';

  const W = 720;
  const H = 400;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3">
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-amber-400/35 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold">
        <span id="d2-status" class="text-amber-200">${statusText}</span>
        <div class="flex items-center gap-3 tabular-nums">
          <span class="text-slate-300">ارتفاع: <strong id="d2-step" class="text-emerald-300">۰ از ۵</strong></span>
          <span id="d2-lever-badge" class="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-xs">
            ⚙ اهرم تغییر جهت: قفل
          </span>
        </div>
      </div>

      <div class="relative rounded-2xl overflow-hidden border-2 border-amber-400/40 bg-slate-950">
        <canvas id="d2-canvas" width="${W}" height="${H}" class="w-full h-auto block"></canvas>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <button type="button" id="d2-jump-btn" data-testid="chronos-d2-jump-btn"
          class="flex-1 sm:flex-none px-7 py-3.5 rounded-2xl btn-primary-gold text-base sm:text-lg font-extrabold">
          ⬆ پرش روی چرخ‌دنده بعدی
        </button>
        <button type="button" id="d2-lever-btn" data-testid="chronos-d2-lever-btn"
          class="px-5 py-3.5 rounded-2xl btn-secondary-slate text-sm sm:text-base font-extrabold border-amber-400/60 text-amber-200">
          ⚙ کشیدن اهرم تغییر جهت
        </button>
      </div>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#d2-canvas');
  const ctx2d = canvas.getContext('2d');
  const statusEl = shell.playArea.querySelector('#d2-status');
  const stepEl = shell.playArea.querySelector('#d2-step');
  const leverBadgeEl = shell.playArea.querySelector('#d2-lever-badge');
  const jumpBtn = shell.playArea.querySelector('#d2-jump-btn');
  const leverBtn = shell.playArea.querySelector('#d2-lever-btn');

  let rafId = null;
  let lastNow = performance.now();

  function updateHud() {
    statusEl.textContent = statusText;
    stepEl.textContent = `${toPersianDigits(stepIndex)} از ${toPersianDigits(5)}`;
    leverBadgeEl.textContent = leverPulled ? '⚙ اهرم تغییر جهت: آزاد ✓' : '⚙ اهرم تغییر جهت: قفل';
    leverBadgeEl.className = leverPulled
      ? 'px-2.5 py-0.5 rounded-full bg-emerald-900/70 border border-emerald-400 text-emerald-200 text-xs font-extrabold'
      : 'px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-xs';
    leverBtn.disabled = leverPulled || stepIndex < 2;
    leverBtn.classList.toggle('opacity-50', leverBtn.disabled);
    leverBtn.classList.toggle('animate-pulse', !leverPulled && stepIndex >= 2);
  }

  function getTargetTopAngle() {
    return 270; // Top crest of each gear wheel (12 o'clock)
  }

  function pullLever() {
    if (leverPulled || stepIndex < 2) {
      audio.playError();
      statusText = stepIndex < 2 ? 'ابتدا به چرخ‌دنده دوم برس تا دستت به اهرم برسد!' : 'اهرم قبلاً کشیده شده است!';
      updateHud();
      return;
    }
    leverPulled = true;
    audio.playGateOpen();
    // Unlock & stabilize upper gears 2 & 3
    gears[2].speed = -52;
    gears[2].broken = [{ startDeg: 85, endDeg: 145 }];
    gears[3].speed = 55;
    gears[3].broken = [{ startDeg: 180, endDeg: 240 }];
    statusText = 'عالی! چرخ‌دنده‌های بالایی باز شدند. به سمت قله بپر!';
    updateHud();
  }

  function attemptJump() {
    if (done || slipTimer > 0) return;
    if (stepIndex === 4) {
      // Final leap to summit platform
      stepIndex = 5;
      done = true;
      jumpAnim = 1;
      audio.playJump();
      statusText = 'آفرین! از تمام چرخ‌دنده‌های غول‌پیکر بالا رفتی!';
      updateHud();
      setTimeout(() => shell.complete(), 450);
      return;
    }

    if (stepIndex === 2 && !leverPulled) {
      audio.playError();
      statusText = 'چرخ‌دنده سوم قفل و پرسرعت است! اول اهرم تغییر جهت را بکش!';
      updateHud();
      return;
    }

    const nextGear = gears[stepIndex];
    const solid = isGearToothSolid(nextGear.angle, getTargetTopAngle(), nextGear.broken);
    audio.playJump();
    jumpAnim = 1;

    if (!solid) {
      audio.playError();
      shell.recordAttempt();
      slipTimer = 0.7;
      stepIndex = stepIndex >= 2 ? 2 : 0;
      statusText = 'ای وای! روی دندانه شکسته پریدی! لحظه‌ای صبر کن تا دندانه برنجی برسد.';
      updateHud();
      return;
    }

    stepIndex += 1;
    audio.playMechanism();
    if (stepIndex === 2 && !leverPulled) {
      statusText = 'روی سکوی اهرم هستی! حالا دکمه «کشیدن اهرم تغییر جهت» را بزن.';
    } else if (stepIndex === 4) {
      statusText = 'یک پرش دیگر تا دروازه بالای صخره!';
    } else {
      statusText = 'پرش دقیق! ادامه بده!';
    }
    updateHud();
  }

  function drawGear(g, isNextTarget) {
    ctx2d.save();
    ctx2d.translate(g.x, g.y);

    // Draw safe indicator arc at top crest when hint >= 3 or target
    if (isNextTarget) {
      const solid = isGearToothSolid(g.angle, 270, g.broken);
      ctx2d.beginPath();
      ctx2d.arc(0, -g.r - 10, 8, 0, Math.PI * 2);
      ctx2d.fillStyle = solid ? '#4ade80' : '#f87171';
      ctx2d.fill();
      if (hintLevel >= 3 && solid) {
        ctx2d.strokeStyle = '#fef08a';
        ctx2d.lineWidth = 3;
        ctx2d.stroke();
      }
    }

    ctx2d.rotate((g.angle * Math.PI) / 180);

    // Teeth
    const stepDeg = 360 / g.teeth;
    for (let i = 0; i < g.teeth; i++) {
      const toothDeg = i * stepDeg;
      const solid = isGearToothSolid(0, toothDeg, g.broken);
      const rad = (toothDeg * Math.PI) / 180;
      ctx2d.save();
      ctx2d.rotate(rad);
      if (solid) {
        ctx2d.fillStyle = '#f59e0b';
        ctx2d.strokeStyle = '#78350f';
        ctx2d.lineWidth = 2;
        ctx2d.fillRect(g.r - 4, -8, 14, 16);
        ctx2d.strokeRect(g.r - 4, -8, 14, 16);
      } else {
        ctx2d.strokeStyle = 'rgba(248,113,113,0.75)';
        ctx2d.setLineDash([3, 3]);
        ctx2d.lineWidth = 2;
        ctx2d.strokeRect(g.r - 2, -6, 10, 12);
        ctx2d.setLineDash([]);
      }
      ctx2d.restore();
    }

    // Main rim
    ctx2d.beginPath();
    ctx2d.arc(0, 0, g.r, 0, Math.PI * 2);
    ctx2d.fillStyle = '#78350f';
    ctx2d.fill();
    ctx2d.lineWidth = 6;
    ctx2d.strokeStyle = '#d97706';
    ctx2d.stroke();

    // Spokes
    ctx2d.strokeStyle = '#b45309';
    ctx2d.lineWidth = 6;
    for (let s = 0; s < 4; s++) {
      const a = (s * Math.PI) / 2;
      ctx2d.beginPath();
      ctx2d.moveTo(Math.cos(a) * (g.r - 6), Math.sin(a) * (g.r - 6));
      ctx2d.lineTo(-Math.cos(a) * (g.r - 6), -Math.sin(a) * (g.r - 6));
      ctx2d.stroke();
    }

    // Axle
    ctx2d.beginPath();
    ctx2d.arc(0, 0, 12, 0, Math.PI * 2);
    ctx2d.fillStyle = '#fde047';
    ctx2d.fill();
    ctx2d.restore();
  }

  function getExplorerPos() {
    if (stepIndex === 0) return { x: 110, y: 344 };
    if (stepIndex >= 1 && stepIndex <= 4) {
      const g = gears[stepIndex - 1];
      return { x: g.x, y: g.y - g.r - 18 };
    }
    return { x: 615, y: 64 };
  }

  function renderFrame(now) {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    if (jumpAnim > 0) jumpAnim = Math.max(0, jumpAnim - dt * 3.5);
    if (slipTimer > 0) slipTimer = Math.max(0, slipTimer - dt);

    for (const g of gears) {
      g.angle = normalizeDeg(g.angle + g.speed * dt);
    }

    // Background cliff & waterfall
    const bgGrad = ctx2d.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#451a03');
    ctx2d.fillStyle = bgGrad;
    ctx2d.fillRect(0, 0, W, H);

    // Waterfall stream powering gears
    ctx2d.fillStyle = 'rgba(56, 189, 248, 0.24)';
    ctx2d.fillRect(510, 0, 56, H);
    ctx2d.fillStyle = 'rgba(186, 230, 253, 0.4)';
    for (let w = 0; w < 6; w++) {
      const wy = ((now * 0.14 + w * 70) % H);
      ctx2d.fillRect(520 + (w % 2) * 20, wy, 10, 28);
    }

    // Start cliff platform
    ctx2d.fillStyle = '#92400e';
    ctx2d.fillRect(40, 358, 130, 42);
    ctx2d.fillStyle = '#fbbf24';
    ctx2d.fillRect(40, 358, 130, 6);

    // Mid lever ledge
    ctx2d.fillStyle = '#78350f';
    ctx2d.fillRect(495, 224, 95, 16);
    // Lever visual
    ctx2d.strokeStyle = leverPulled ? '#4ade80' : '#fde047';
    ctx2d.lineWidth = 4;
    ctx2d.beginPath();
    ctx2d.moveTo(540, 224);
    ctx2d.lineTo(leverPulled ? 565 : 515, 195);
    ctx2d.stroke();
    ctx2d.beginPath();
    ctx2d.arc(leverPulled ? 565 : 515, 195, 6, 0, Math.PI * 2);
    ctx2d.fillStyle = leverPulled ? '#22c55e' : '#ef4444';
    ctx2d.fill();

    // Summit platform & Goal Gate
    ctx2d.fillStyle = '#065f46';
    ctx2d.fillRect(560, 78, 135, 22);
    ctx2d.fillStyle = '#fde047';
    ctx2d.fillRect(625, 32, 38, 46);
    ctx2d.fillStyle = '#0f172a';
    ctx2d.fillRect(632, 40, 24, 38);

    // Draw all 4 gears
    gears.forEach((g, idx) => drawGear(g, idx === stepIndex && !done));

    // Explorer sprite
    const pos = getExplorerPos();
    const bob = Math.sin(jumpAnim * Math.PI) * 18;
    const shake = slipTimer > 0 ? Math.sin(now * 0.05) * 6 : 0;
    ctx2d.save();
    ctx2d.translate(pos.x + shake, pos.y - bob);
    ctx2d.beginPath();
    ctx2d.arc(0, 0, 14, 0, Math.PI * 2);
    ctx2d.fillStyle = '#fb923c';
    ctx2d.fill();
    ctx2d.lineWidth = 3;
    ctx2d.strokeStyle = '#fef3c7';
    ctx2d.stroke();
    ctx2d.fillStyle = '#fff';
    ctx2d.font = 'bold 14px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('🧭', 0, 1);
    ctx2d.restore();

    rafId = requestAnimationFrame(renderFrame);
  }

  jumpBtn.addEventListener('click', attemptJump);
  leverBtn.addEventListener('click', pullLever);

  const onKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      attemptJump();
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      pullLever();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  shell.onHint((lvl) => {
    hintLevel = lvl;
  });

  shell.onRetry(() => {
    stepIndex = 0;
    leverPulled = false;
    done = false;
    gears[2].speed = 120;
    gears[2].broken = [{ startDeg: 0, endDeg: 140 }, { startDeg: 180, endDeg: 320 }];
    gears[3].speed = -115;
    gears[3].broken = [{ startDeg: 20, endDeg: 160 }, { startDeg: 200, endDeg: 320 }];
    statusText = 'روی دندانه سالم چرخ‌دنده اول بپر!';
    updateHud();
  });

  shell.registerCleanup(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
  });

  updateHud();
  rafId = requestAnimationFrame(renderFrame);
  return shell;
}
