import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';

export function mountChronosDayStage5(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const W = 780;
  const H = 390;

  // 4 hanging pendulum ropes/vines across the high chasm + 3 repelling magnetic boulders
  const ropes = [
    { id: 0, ax: 120, ay: 32, len: 148, amp: 0.72, speed: 2.35 },
    { id: 1, ax: 300, ay: 28, len: 146, amp: 0.74, speed: 2.45 },
    { id: 2, ax: 485, ay: 26, len: 148, amp: 0.72, speed: 2.55 },
    { id: 3, ax: 645, ay: 30, len: 138, amp: 0.68, speed: 2.45 },
  ];

  const magnets = [
    { x: 215, y: 235, r: 28, fieldR: 62 },
    { x: 395, y: 228, r: 28, fieldR: 64 },
    { x: 565, y: 222, r: 28, fieldR: 62 },
  ];

  const goalCliff = { x: 705, y: 205, w: 75, h: 185 };

  let mode = 'swing'; // 'swing' | 'fly' | 'done'
  let currentRopeIdx = 0;
  let lastSafeRopeIdx = 0;
  let swingT = 0;
  let px = 120;
  let py = 175;
  let vx = 0;
  let vy = 0;
  let magnetCooldown = 0;
  let hintLevel = 0;
  let statusText = 'در اوج حرکت به راست، طناب را رها کن تا با کمک دافعه مغناطیسی بپری!';

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3">
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-amber-400/35 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold">
        <span id="d5-status" class="text-amber-200">${statusText}</span>
        <span class="text-cyan-300 tabular-nums">طناب فعلی: <strong id="d5-rope">۱ از ۴</strong></span>
      </div>

      <div class="relative rounded-2xl overflow-hidden border-2 border-amber-400/40 bg-slate-950">
        <canvas id="d5-canvas" width="${W}" height="${H}" class="w-full h-auto block"></canvas>
      </div>

      <div class="flex justify-center">
        <button type="button" id="d5-release-btn" data-testid="chronos-d5-release"
          class="w-full sm:w-auto px-8 py-3.5 rounded-2xl btn-primary-gold text-base sm:text-lg font-extrabold">
          🪝 رها کردن و پرش! (Space)
        </button>
      </div>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#d5-canvas');
  const ctx2d = canvas.getContext('2d');
  const statusEl = shell.playArea.querySelector('#d5-status');
  const ropeEl = shell.playArea.querySelector('#d5-rope');
  const releaseBtn = shell.playArea.querySelector('#d5-release-btn');

  let rafId = null;
  let lastNow = performance.now();

  function getRopeTip(r, t) {
    const theta = Math.sin(t * r.speed) * r.amp;
    return {
      theta,
      omega: Math.cos(t * r.speed) * r.amp * r.speed,
      x: r.ax + Math.sin(theta) * r.len,
      y: r.ay + Math.cos(theta) * r.len,
    };
  }

  function releaseRope() {
    if (mode !== 'swing') return;
    const r = ropes[currentRopeIdx];
    const tip = getRopeTip(r, swingT);
    const tangentVx = Math.cos(tip.theta) * tip.omega * r.len;
    const tangentVy = -Math.sin(tip.theta) * tip.omega * r.len;

    mode = 'fly';
    px = tip.x;
    py = tip.y;
    // Ensure lively forward launch feel even if player taps slightly early/late
    vx = Math.max(155, tangentVx * 0.95 + 85);
    vy = Math.min(-150, tangentVy - 165);
    audio.playJump();
    statusText = 'در حال پرواز! از سنگ مغناطیسی شتاب بگیر...';
    statusEl.textContent = statusText;
  }

  function respawnOnLastRope() {
    audio.playError();
    shell.recordAttempt();
    mode = 'swing';
    currentRopeIdx = lastSafeRopeIdx;
    swingT = 0;
    statusText = 'به دره افتادی! دوباره در اوج تاب به راست رها کن.';
    statusEl.textContent = statusText;
  }

  function step(dt) {
    swingT += dt;
    if (magnetCooldown > 0) magnetCooldown = Math.max(0, magnetCooldown - dt);

    if (mode === 'swing') {
      const r = ropes[currentRopeIdx];
      const tip = getRopeTip(r, swingT);
      px = tip.x;
      py = tip.y;
      ropeEl.textContent = `${toPersianDigits(currentRopeIdx + 1)} از ${toPersianDigits(4)}`;
    } else if (mode === 'fly') {
      vy += 430 * dt; // gravity
      px += vx * dt;
      py += vy * dt;

      // Repelling magnetic boulders accelerate forward & upward!
      if (magnetCooldown <= 0) {
        for (const m of magnets) {
          const dist = Math.hypot(px - m.x, py - m.y);
          if (dist <= m.fieldR) {
            magnetCooldown = 0.45;
            vx = Math.max(vx + 70, 215);
            vy = Math.min(vy, -195);
            audio.playMechanism();
            statusText = '⚡ شتاب‌دهی مغناطیسی! آماده گرفتن طناب بعدی باش!';
            statusEl.textContent = statusText;
            break;
          }
        }
      }

      // Check catching next rope
      for (let i = currentRopeIdx + 1; i < ropes.length; i++) {
        const r = ropes[i];
        const tip = getRopeTip(r, swingT);
        // Check distance to rope segment/tip
        if (Math.hypot(px - tip.x, py - tip.y) <= 44 || (Math.abs(px - r.ax) < 28 && py >= r.ay + 40 && py <= r.ay + r.len + 26)) {
          mode = 'swing';
          currentRopeIdx = i;
          lastSafeRopeIdx = i;
          audio.playClick();
          statusText = i === 3 ? 'آخرین طناب! به سمت سکوی گنج بپر!' : 'گرفتی! آماده پرش بعدی شو!';
          statusEl.textContent = statusText;
          return;
        }
      }

      // Check goal platform
      if (px >= goalCliff.x - 10 && py <= goalCliff.y + 34 && py >= goalCliff.y - 80) {
        mode = 'done';
        audio.playGateOpen();
        statusText = 'آفرین! با تاب‌بازی مغناطیسی به سکوی پایان رسیدی!';
        statusEl.textContent = statusText;
        setTimeout(() => shell.complete(), 420);
        return;
      }

      if (py > H + 20 || px > W + 30) {
        respawnOnLastRope();
      }
    }
  }

  function renderFrame(now) {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    if (mode !== 'done') step(dt);

    const sky = ctx2d.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1e293b');
    sky.addColorStop(0.6, '#7c2d12');
    sky.addColorStop(1, '#451a03');
    ctx2d.fillStyle = sky;
    ctx2d.fillRect(0, 0, W, H);

    // Repelling Magnetic Boulders
    for (const m of magnets) {
      ctx2d.beginPath();
      ctx2d.arc(m.x, m.y, m.fieldR, 0, Math.PI * 2);
      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx2d.fill();
      ctx2d.strokeStyle = 'rgba(248, 113, 113, 0.65)';
      ctx2d.setLineDash([5, 5]);
      ctx2d.lineWidth = 2;
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      ctx2d.beginPath();
      ctx2d.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx2d.fillStyle = '#334155';
      ctx2d.fill();
      ctx2d.lineWidth = 3;
      ctx2d.strokeStyle = '#38bdf8';
      ctx2d.stroke();
      ctx2d.font = 'bold 16px sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      ctx2d.fillText('🧲', m.x, m.y + 1);
    }

    // Goal Cliff
    ctx2d.fillStyle = '#065f46';
    ctx2d.fillRect(goalCliff.x, goalCliff.y, goalCliff.w, goalCliff.h);
    ctx2d.fillStyle = '#fde047';
    ctx2d.fillRect(goalCliff.x, goalCliff.y, goalCliff.w, 8);
    ctx2d.font = '24px sans-serif';
    ctx2d.fillText('🏁', goalCliff.x + 36, goalCliff.y - 18);

    // Draw Ropes
    ropes.forEach((r, idx) => {
      const tip = getRopeTip(r, swingT);
      ctx2d.strokeStyle = idx === currentRopeIdx && mode === 'swing' ? '#fde047' : '#84cc16';
      ctx2d.lineWidth = 5;
      ctx2d.beginPath();
      ctx2d.moveTo(r.ax, r.ay);
      ctx2d.lineTo(tip.x, tip.y);
      ctx2d.stroke();

      ctx2d.beginPath();
      ctx2d.arc(r.ax, r.ay, 7, 0, Math.PI * 2);
      ctx2d.fillStyle = '#f59e0b';
      ctx2d.fill();

      ctx2d.beginPath();
      ctx2d.arc(tip.x, tip.y, 7, 0, Math.PI * 2);
      ctx2d.fillStyle = '#fef08a';
      ctx2d.fill();
    });

    // Golden timing hint on swing peak right
    if (mode === 'swing') {
      const r = ropes[currentRopeIdx];
      const tip = getRopeTip(r, swingT);
      const isGoldenMoment = tip.theta > 0.25 && tip.omega > 0;
      if (hintLevel >= 3 && isGoldenMoment) {
        ctx2d.fillStyle = '#4ade80';
        ctx2d.font = 'bold 16px Vazirmatn, sans-serif';
        ctx2d.fillText('✨ الان رها کن!', px, py - 28);
      }
    }

    // Explorer
    ctx2d.beginPath();
    ctx2d.arc(px, py, 13, 0, Math.PI * 2);
    ctx2d.fillStyle = '#fb923c';
    ctx2d.fill();
    ctx2d.lineWidth = 3;
    ctx2d.strokeStyle = '#fef3c7';
    ctx2d.stroke();

    rafId = requestAnimationFrame(renderFrame);
  }

  releaseBtn.addEventListener('click', releaseRope);
  const onKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      releaseRope();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  shell.onHint((lvl) => { hintLevel = lvl; });
  shell.onRetry(() => {
    mode = 'swing';
    currentRopeIdx = 0;
    lastSafeRopeIdx = 0;
    swingT = 0;
  });

  shell.registerCleanup(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
  });

  rafId = requestAnimationFrame(renderFrame);
  return shell;
}
