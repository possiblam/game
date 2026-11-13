import { createStageShell } from '../stage-shell.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountDayStage4(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-amber-200 px-1">
      <span>سرعت زیپلاین را تنظیم کنید و هنگام فوران گدازه پاها را جمع کنید تا به سکوی سمت راست برسید</span>
      <span id="d4-progress-label" class="font-bold text-orange-300 tabular-nums">مسافت: ۰٪</span>
    </div>
    <div class="game-canvas-frame">
      <canvas id="d4-canvas" width="800" height="420" data-testid="daytime-4-canvas"></canvas>
    </div>
    <div class="touch-controls-bar" aria-label="کنترل زیپلاین">
      <button type="button" class="touch-btn" data-ctrl="faster" aria-label="افزایش سرعت">▶▶ تندتر</button>
      <button type="button" class="touch-btn bg-amber-600/80 border-amber-300" data-ctrl="tuck" aria-label="جمع کردن پاها">▲ جمع کردن پاها (فاصله)</button>
      <button type="button" class="touch-btn" data-ctrl="slower" aria-label="کاهش سرعت">◀ آرام‌تر</button>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#d4-canvas');
  const ctx2d = canvas.getContext('2d');
  const progressLabel = shell.playArea.querySelector('#d4-progress-label');

  const startPt = { x: 55, y: 110 };
  const endPt = { x: 745, y: 190 };

  const geysers = [
    { x: 230, period: 3.1, eruptStart: 1.5, eruptEnd: 2.35, maxH: 155 },
    { x: 385, period: 2.8, eruptStart: 1.2, eruptEnd: 2.05, maxH: 150 },
    { x: 530, period: 3.3, eruptStart: 1.7, eruptEnd: 2.55, maxH: 145 },
    { x: 660, period: 2.7, eruptStart: 1.3, eruptEnd: 2.1, maxH: 140 },
  ];

  let progress = 0;
  let speed = 0.095; // progress per second
  let tucking = false;
  let invuln = 0;
  let simTime = 0;
  let completed = false;
  let rafId = null;
  let lastTs = performance.now();
  const held = new Set();

  function resetStage() {
    progress = 0;
    speed = 0.095;
    tucking = false;
    invuln = 0;
    progressLabel.textContent = 'مسافت: ۰٪';
  }
  shell.onRetry(resetStage);

  function onKeyDown(e) {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      held.add('faster');
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      held.add('slower');
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      held.add('tuck');
    }
  }
  function onKeyUp(e) {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') held.delete('faster');
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') held.delete('slower');
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') held.delete('tuck');
  }
  function clearHeld() {
    held.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearHeld);

  shell.playArea.querySelectorAll('[data-ctrl]').forEach((btn) => {
    const ctrl = btn.dataset.ctrl;
    const press = (e) => {
      e.preventDefault();
      held.add(ctrl);
      btn.classList.add('is-pressed');
    };
    const release = () => {
      held.delete(ctrl);
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

    if (!completed) {
      if (held.has('faster')) {
        speed = Math.min(0.24, speed + 0.18 * dt);
      } else if (held.has('slower')) {
        speed = Math.max(0.02, speed - 0.22 * dt);
      } else {
        // Gentle cruise drift
        speed += (0.095 - speed) * 1.8 * dt;
      }

      tucking = held.has('tuck');
      progress = Math.min(1, progress + speed * dt);

      const playerX = startPt.x + (endPt.x - startPt.x) * progress;
      const cableY = startPt.y + (endPt.y - startPt.y) * progress;
      const feetY = cableY + (tucking ? 26 : 62);

      // Check geyser collisions
      if (invuln <= 0) {
        for (const g of geysers) {
          const phase = simTime % g.period;
          const isErupting = phase >= g.eruptStart && phase <= g.eruptEnd;
          if (isErupting && Math.abs(playerX - g.x) < 22) {
            const flameTopY = 365 - g.maxH;
            if (feetY > flameTopY) {
              audio.playError();
              shell.recordAttempt();
              invuln = 1.0;
              // Step back slightly to safe distance before geyser
              progress = Math.max(0, progress - 0.14);
              break;
            }
          }
        }
      }

      progressLabel.textContent = `مسافت: ${toPersianDigits(Math.round(progress * 100))}٪`;

      if (progress >= 1) {
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
    ctx2d.clearRect(0, 0, 800, 420);

    // Canyon sunset sky
    const sky = ctx2d.createLinearGradient(0, 0, 0, 420);
    sky.addColorStop(0, '#451a03');
    sky.addColorStop(0.65, '#7c2d12');
    sky.addColorStop(1, '#dc2626');
    ctx2d.fillStyle = sky;
    ctx2d.fillRect(0, 0, 800, 420);

    // Lava river at bottom
    ctx2d.fillStyle = '#ea580c';
    ctx2d.fillRect(0, 355, 800, 65);
    ctx2d.fillStyle = '#fde047';
    for (let x = 30; x < 800; x += 95) {
      ctx2d.beginPath();
      ctx2d.ellipse(x + Math.sin(simTime * 2 + x) * 10, 385, 24, 6, 0, 0, Math.PI * 2);
      ctx2d.fill();
    }

    // Left & right cliffs
    ctx2d.fillStyle = '#292524';
    ctx2d.fillRect(0, 125, 95, 295);
    ctx2d.fillRect(705, 205, 95, 215);

    // Landing pad flag
    ctx2d.fillStyle = '#4ade80';
    ctx2d.fillRect(720, 198, 60, 8);

    // Zipline cable & towers
    ctx2d.fillStyle = '#78716c';
    ctx2d.fillRect(46, 95, 16, 35);
    ctx2d.fillRect(738, 175, 16, 35);
    ctx2d.strokeStyle = '#e2e8f0';
    ctx2d.lineWidth = 4;
    ctx2d.beginPath();
    ctx2d.moveTo(startPt.x, startPt.y);
    ctx2d.lineTo(endPt.x, endPt.y);
    ctx2d.stroke();

    // Lava geysers
    geysers.forEach((g) => {
      const phase = simTime % g.period;
      const isWarning = phase >= g.eruptStart - 0.65 && phase < g.eruptStart;
      const isErupting = phase >= g.eruptStart && phase <= g.eruptEnd;

      // Tier 3 Hint: danger zone dashed guide
      if (shell.getHintLevel() >= 3) {
        ctx2d.save();
        ctx2d.setLineDash([5, 5]);
        ctx2d.strokeStyle = isErupting ? '#ef4444' : isWarning ? '#fde047' : '#4ade80';
        ctx2d.lineWidth = 2;
        ctx2d.strokeRect(g.x - 22, 365 - g.maxH, 44, g.maxH);
        ctx2d.restore();
      }

      if (isWarning) {
        ctx2d.fillStyle = 'rgba(251, 191, 36, 0.7)';
        ctx2d.beginPath();
        ctx2d.arc(g.x, 352, 14 + Math.sin(simTime * 18) * 4, 0, Math.PI * 2);
        ctx2d.fill();
      }

      if (isErupting) {
        const grad = ctx2d.createLinearGradient(g.x, 365, g.x, 365 - g.maxH);
        grad.addColorStop(0, '#ef4444');
        grad.addColorStop(0.6, '#fb923c');
        grad.addColorStop(1, '#fef08a');
        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.moveTo(g.x - 20, 365);
        ctx2d.quadraticCurveTo(g.x - 10, 365 - g.maxH, g.x, 365 - g.maxH);
        ctx2d.quadraticCurveTo(g.x + 10, 365 - g.maxH, g.x + 20, 365);
        ctx2d.fill();
      }
    });

    // Player on Zipline
    const px = startPt.x + (endPt.x - startPt.x) * progress;
    const py = startPt.y + (endPt.y - startPt.y) * progress;

    ctx2d.save();
    if (invuln > 0 && Math.floor(simTime * 12) % 2 === 0) {
      ctx2d.globalAlpha = 0.45;
    }
    // Pulley wheel
    ctx2d.fillStyle = '#fbbf24';
    ctx2d.beginPath();
    ctx2d.arc(px, py, 7, 0, Math.PI * 2);
    ctx2d.fill();

    // Arms holding pulley
    ctx2d.strokeStyle = '#fde68a';
    ctx2d.lineWidth = 3;
    ctx2d.beginPath();
    ctx2d.moveTo(px, py + 5);
    ctx2d.lineTo(px, py + 18);
    ctx2d.stroke();

    // Character head & body
    ctx2d.fillStyle = '#ea580c';
    ctx2d.fillRect(px - 9, py + 18, 18, tucking ? 12 : 24);
    ctx2d.fillStyle = '#fed7aa';
    ctx2d.beginPath();
    ctx2d.arc(px, py + 15, 9, 0, Math.PI * 2);
    ctx2d.fill();

    // Legs (tucked vs hanging)
    ctx2d.strokeStyle = '#1e3a8a';
    ctx2d.lineWidth = 5;
    ctx2d.beginPath();
    if (tucking) {
      ctx2d.moveTo(px - 5, py + 28);
      ctx2d.lineTo(px + 9, py + 25);
    } else {
      ctx2d.moveTo(px - 4, py + 42);
      ctx2d.lineTo(px - 6, py + 60);
      ctx2d.moveTo(px + 4, py + 42);
      ctx2d.lineTo(px + 6, py + 60);
    }
    ctx2d.stroke();
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
