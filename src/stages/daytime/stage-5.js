import { createStageShell } from '../stage-shell.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountDayStage5(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-amber-200 px-1">
      <span>با کایت بادی از روی رودخانه خروشان بگذرید و حلقه‌های سبز باد را بگیرید</span>
      <div class="flex items-center gap-3 tabular-nums font-bold">
        <span id="d5-wind-label" class="text-sky-300">باد: ملایم رو به بالا</span>
        <span id="d5-dist-label" class="text-emerald-300">مسافت: ۰٪</span>
      </div>
    </div>
    <div class="game-canvas-frame">
      <canvas id="d5-canvas" width="800" height="420" data-testid="daytime-5-canvas"></canvas>
    </div>
    <div class="touch-controls-bar" aria-label="کنترل کایت بادی">
      <button type="button" class="touch-btn bg-sky-700/80 border-sky-300" data-ctrl="up" aria-label="اوج گرفتن">▲ اوج گرفتن</button>
      <button type="button" class="touch-btn" data-ctrl="boost" aria-label="سرعت به جلو">▶ سرعت باد</button>
      <button type="button" class="touch-btn" data-ctrl="down" aria-label="فرود ملایم">▼ فرود ملایم</button>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#d5-canvas');
  const ctx2d = canvas.getContext('2d');
  const windLabel = shell.playArea.querySelector('#d5-wind-label');
  const distLabel = shell.playArea.querySelector('#d5-dist-label');

  const kite = { x: 70, y: 175, vy: 0, energy: 100 };
  let checkpointX = 70;
  let simTime = 0;
  let completed = false;
  let rafId = null;
  let lastTs = performance.now();
  const held = new Set();

  const windRings = [
    { x: 205, y: 155, r: 24, collected: false },
    { x: 350, y: 210, r: 24, collected: false },
    { x: 495, y: 145, r: 24, collected: false },
    { x: 635, y: 195, r: 24, collected: false },
  ];

  const rocks = [
    { x: 270, y: 280, w: 38, h: 90 },
    { x: 430, y: 70, w: 34, h: 75 },
    { x: 565, y: 270, w: 38, h: 100 },
  ];

  function resetStage() {
    kite.x = 70;
    kite.y = 175;
    kite.vy = 0;
    kite.energy = 100;
    checkpointX = 70;
    windRings.forEach((r) => (r.collected = false));
  }
  shell.onRetry(resetStage);

  function onKeyDown(e) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      held.add('up');
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      held.add('down');
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Space') {
      e.preventDefault();
      held.add('boost');
    }
  }
  function onKeyUp(e) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') held.delete('up');
    if (e.code === 'ArrowDown' || e.code === 'KeyS') held.delete('down');
    if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Space') held.delete('boost');
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

    if (!completed) {
      // Dynamic wind wave
      const windLift = Math.sin(simTime * 1.4) * 38;
      windLabel.textContent = windLift > 8 ? 'باد: بالابرنده ↗' : windLift < -8 ? 'باد: رو به پایین ↘' : 'باد: آرام ➝';

      const forwardSpeed = held.has('boost') ? 132 : 84;
      kite.x += forwardSpeed * dt;

      if (held.has('up') && kite.energy > 0) {
        kite.vy -= 260 * dt;
        kite.energy = Math.max(0, kite.energy - 16 * dt);
      } else if (held.has('down')) {
        kite.vy += 220 * dt;
        kite.energy = Math.min(100, kite.energy + 12 * dt);
      } else {
        // Gentle glide sink + wind effect
        kite.vy += (28 - windLift * 0.55) * dt;
        kite.energy = Math.min(100, kite.energy + 8 * dt);
      }

      kite.vy = Math.max(-165, Math.min(165, kite.vy));
      kite.y += kite.vy * dt;
      if (kite.y < 35) {
        kite.y = 35;
        kite.vy = 0;
      }

      // Check wind rings
      windRings.forEach((ring) => {
        if (!ring.collected && Math.hypot(kite.x - ring.x, kite.y - ring.y) < ring.r + 18) {
          ring.collected = true;
          kite.energy = 100;
          kite.vy = -60;
          checkpointX = Math.max(checkpointX, ring.x - 20);
          audio.playKeyPickup();
        }
      });

      // Check rock or water collision
      const hitWater = kite.y > 335;
      const hitRock = rocks.some(
        (r) => kite.x + 16 > r.x && kite.x - 16 < r.x + r.w && kite.y + 14 > r.y && kite.y - 14 < r.y + r.h
      );

      if (hitWater || hitRock) {
        audio.playError();
        shell.recordAttempt();
        kite.x = checkpointX;
        kite.y = 165;
        kite.vy = 0;
        kite.energy = 100;
      }

      const pct = Math.min(100, Math.max(0, Math.round(((kite.x - 70) / (720 - 70)) * 100)));
      distLabel.textContent = `مسافت: ${toPersianDigits(pct)}٪`;

      if (kite.x >= 720) {
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

    // Bright daytime sky
    const sky = ctx2d.createLinearGradient(0, 0, 0, 355);
    sky.addColorStop(0, '#0284c7');
    sky.addColorStop(1, '#bae6fd');
    ctx2d.fillStyle = sky;
    ctx2d.fillRect(0, 0, 800, 355);

    // Flowing river
    ctx2d.fillStyle = '#0369a1';
    ctx2d.fillRect(0, 345, 800, 75);
    ctx2d.strokeStyle = '#7dd3fc';
    ctx2d.lineWidth = 3;
    for (let x = -40; x < 840; x += 70) {
      const offset = (simTime * 55) % 70;
      ctx2d.beginPath();
      ctx2d.moveTo(x - offset, 368);
      ctx2d.quadraticCurveTo(x + 20 - offset, 358, x + 42 - offset, 368);
      ctx2d.stroke();
    }

    // Wind streaks
    ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx2d.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const wx = ((800 - ((simTime * 110 + i * 140) % 860)) + 860) % 860 - 30;
      const wy = 65 + i * 45;
      ctx2d.beginPath();
      ctx2d.moveTo(wx, wy);
      ctx2d.lineTo(wx + 48, wy);
      ctx2d.stroke();
    }

    // Destination dock
    ctx2d.fillStyle = '#65a30d';
    ctx2d.fillRect(710, 290, 90, 65);
    ctx2d.fillStyle = '#fef08a';
    ctx2d.fillRect(720, 240, 6, 50);
    ctx2d.fillStyle = '#ef4444';
    ctx2d.fillRect(726, 240, 28, 16);

    // Tier 3 Hint: safe flight path
    if (shell.getHintLevel() >= 3) {
      ctx2d.save();
      ctx2d.setLineDash([7, 7]);
      ctx2d.strokeStyle = '#4ade80';
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.moveTo(70, 175);
      windRings.forEach((r) => ctx2d.lineTo(r.x, r.y));
      ctx2d.lineTo(735, 260);
      ctx2d.stroke();
      ctx2d.restore();
    }

    // Rocks
    rocks.forEach((r) => {
      ctx2d.fillStyle = '#57534e';
      ctx2d.fillRect(r.x, r.y, r.w, r.h);
      ctx2d.strokeStyle = '#a8a29e';
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(r.x, r.y, r.w, r.h);
    });

    // Wind rings
    windRings.forEach((ring) => {
      if (ring.collected) return;
      ctx2d.beginPath();
      ctx2d.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx2d.strokeStyle = '#4ade80';
      ctx2d.lineWidth = 4;
      ctx2d.stroke();
      ctx2d.fillStyle = 'rgba(74, 222, 128, 0.2)';
      ctx2d.fill();
    });

    // Energy meter top-left
    ctx2d.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx2d.fillRect(14, 14, 148, 24);
    ctx2d.fillStyle = kite.energy > 30 ? '#4ade80' : '#f97316';
    ctx2d.fillRect(18, 18, 1.4 * kite.energy, 16);
    ctx2d.fillStyle = '#f8fafc';
    ctx2d.font = 'bold 11px Vazirmatn, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('انرژی باد', 88, 30);

    // Kite & Rider
    ctx2d.save();
    ctx2d.translate(kite.x, kite.y);
    ctx2d.rotate(kite.vy * 0.0022);
    // Kite wing
    ctx2d.fillStyle = '#fb923c';
    ctx2d.beginPath();
    ctx2d.moveTo(-22, -16);
    ctx2d.lineTo(24, -6);
    ctx2d.lineTo(-14, 2);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.strokeStyle = '#fef08a';
    ctx2d.lineWidth = 2;
    ctx2d.stroke();
    // Rider
    ctx2d.fillStyle = '#1e293b';
    ctx2d.beginPath();
    ctx2d.arc(0, 14, 8, 0, Math.PI * 2);
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
