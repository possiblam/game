import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';

// Cracked ice zones per lane (height % bands)
const CRACKED_ZONES = [
  { lane: 0, minPct: 22, maxPct: 36 },
  { lane: 1, minPct: 40, maxPct: 54 },
  { lane: 2, minPct: 62, maxPct: 76 },
  { lane: 0, minPct: 74, maxPct: 88 },
];

export function mountChronosNightStage4(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  let lane = 1; // 0, 1, 2
  let climbPct = 4; // 0..100
  let checkpointPct = 4;
  let crackHoldMs = 0;
  let icicles = []; // { lane, yPct, speed, warningMs }
  let spawnTimerMs = 900;
  let climbing = false;
  let hintLevel = 0;
  let solved = false;
  let statusMsg = 'از دیواره یخی بالا برو! قبل از شکستن یخ ترک‌خورده جابه‌جا شو و از قندیل‌ها جاخالی بده.';
  let rafId = null;
  let lastTick = performance.now();

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3 items-center">
      <div class="w-full p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-cyan-400/35 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs sm:text-sm font-bold">
          <span class="text-cyan-300 tabular-nums">🧗 ارتفاع صعود: <span id="n4-pct">۴٪</span></span>
          <span class="text-slate-600">|</span>
          <span id="n4-status" class="text-slate-100">${statusMsg}</span>
        </div>
      </div>

      <canvas id="n4-canvas" width="520" height="400"
        class="w-full max-w-[520px] rounded-2xl border-2 border-cyan-400/50 bg-slate-950 shadow-2xl touch-none"></canvas>

      <div class="w-full max-w-md grid grid-cols-3 gap-2.5 select-none">
        <button type="button" id="n4-right-btn" class="py-3 rounded-xl btn-secondary-slate text-sm sm:text-base font-extrabold">
          → ستون راست
        </button>
        <button type="button" id="n4-climb-btn" data-testid="chronos-n4-climb-btn"
          class="py-3 rounded-xl btn-primary-gold text-sm sm:text-base font-extrabold">
          ⛏️ صعود (نگه دار / بزن)
        </button>
        <button type="button" id="n4-left-btn" class="py-3 rounded-xl btn-secondary-slate text-sm sm:text-base font-extrabold">
          ستون چپ ←
        </button>
      </div>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#n4-canvas');
  const ctx2d = canvas.getContext('2d');
  const pctEl = shell.playArea.querySelector('#n4-pct');
  const statusEl = shell.playArea.querySelector('#n4-status');
  const leftBtn = shell.playArea.querySelector('#n4-left-btn');
  const rightBtn = shell.playArea.querySelector('#n4-right-btn');
  const climbBtn = shell.playArea.querySelector('#n4-climb-btn');

  function pctToCanvasY(pct) {
    return canvas.height - 28 - (pct / 100) * (canvas.height - 64);
  }

  function shiftLane(delta) {
    if (solved) return;
    const next = Math.max(0, Math.min(2, lane + delta));
    if (next !== lane) {
      lane = next;
      crackHoldMs = 0;
      audio.playClick();
    }
  }

  function stepClimb(amount = 6) {
    if (solved) return;
    climbPct = Math.min(100, climbPct + amount);
    if (climbPct >= 50 && checkpointPct < 50) {
      checkpointPct = 50;
      audio.playMechanism();
      statusMsg = '🚩 به سکوی استراحت میانی رسیدی! ادامه بده!';
    }
    if (climbPct >= 100) {
      solved = true;
      audio.playGateOpen();
      statusMsg = 'آفرین! به قله آبشار منجمد رسیدی!';
      pctEl.textContent = '۱۰۰٪';
      statusEl.textContent = statusMsg;
      setTimeout(() => shell.complete(), 380);
    }
  }

  function isOnCrackedIce(l, pct) {
    return CRACKED_ZONES.some((z) => z.lane === l && pct >= z.minPct && pct <= z.maxPct);
  }

  function resetToCheckpoint(reason) {
    audio.playError();
    shell.recordAttempt();
    climbPct = checkpointPct;
    crackHoldMs = 0;
    icicles = [];
    statusMsg = reason;
  }

  function tick(now) {
    const dt = Math.min(80, now - lastTick);
    lastTick = now;

    if (!solved) {
      if (climbing) {
        stepClimb(dt * 0.022);
      }

      // Cracked ice check
      if (isOnCrackedIce(lane, climbPct)) {
        crackHoldMs += dt;
        const limit = hintLevel >= 3 ? 2100 : 1500;
        if (crackHoldMs >= limit) {
          resetToCheckpoint('یخ ترک‌خورده زیر کلنگت شکست! سریع از ترک‌ها رد شو.');
        }
      } else {
        crackHoldMs = Math.max(0, crackHoldMs - dt * 1.5);
      }

      // Spawn telegraphed icicles
      spawnTimerMs -= dt;
      if (spawnTimerMs <= 0) {
        spawnTimerMs = 1350;
        const targetLane = Math.floor(Math.random() * 3);
        icicles.push({
          lane: targetLane,
          yPct: 105,
          warningMs: hintLevel >= 3 ? 1750 : 1300,
          speed: 0.036,
        });
      }

      // Update icicles
      for (let i = icicles.length - 1; i >= 0; i--) {
        const ic = icicles[i];
        if (ic.warningMs > 0) {
          ic.warningMs -= dt;
        } else {
          ic.yPct -= dt * ic.speed;
          if (ic.lane === lane && Math.abs(ic.yPct - climbPct) < 7.5) {
            resetToCheckpoint('قندیل یخی برخورد کرد! وقتی اخطار ستون چشمک می‌زند به ستون کناری برو.');
            break;
          }
          if (ic.yPct < -5) {
            icicles.splice(i, 1);
          }
        }
      }
    }

    // Draw ice wall
    const bgGrad = ctx2d.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#0c4a6e');
    bgGrad.addColorStop(0.55, '#1e3a8a');
    bgGrad.addColorStop(1, '#0f172a');
    ctx2d.fillStyle = bgGrad;
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);

    const laneW = canvas.width / 3;
    for (let l = 0; l < 3; l++) {
      ctx2d.strokeStyle = 'rgba(186, 230, 253, 0.2)';
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(l * laneW + 10, 12, laneW - 20, canvas.height - 24);
    }

    // Checkpoint line at 50%
    const cpY = pctToCanvasY(50);
    ctx2d.strokeStyle = checkpointPct >= 50 ? '#34d399' : 'rgba(250, 204, 21, 0.45)';
    ctx2d.lineWidth = 3;
    ctx2d.setLineDash([8, 6]);
    ctx2d.beginPath();
    ctx2d.moveTo(12, cpY);
    ctx2d.lineTo(canvas.width - 12, cpY);
    ctx2d.stroke();
    ctx2d.setLineDash([]);

    // Top goal ledge
    const topY = pctToCanvasY(100);
    ctx2d.fillStyle = '#34d399';
    ctx2d.fillRect(12, topY - 12, canvas.width - 24, 12);

    // Cracked ice zones
    CRACKED_ZONES.forEach((z) => {
      const yTop = pctToCanvasY(z.maxPct);
      const yBot = pctToCanvasY(z.minPct);
      const x = z.lane * laneW + 16;
      const w = laneW - 32;
      ctx2d.fillStyle = 'rgba(244, 63, 94, 0.25)';
      ctx2d.fillRect(x, yTop, w, yBot - yTop);
      ctx2d.strokeStyle = '#fb7185';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.moveTo(x + 8, yTop + 6);
      ctx2d.lineTo(x + w * 0.5, (yTop + yBot) / 2);
      ctx2d.lineTo(x + w - 8, yBot - 6);
      ctx2d.stroke();
    });

    // Icicle warnings & falling icicles
    icicles.forEach((ic) => {
      const cx = (ic.lane + 0.5) * laneW;
      if (ic.warningMs > 0) {
        ctx2d.save();
        ctx2d.strokeStyle = 'rgba(34, 211, 238, 0.65)';
        ctx2d.setLineDash([6, 6]);
        ctx2d.beginPath();
        ctx2d.moveTo(cx, 16);
        ctx2d.lineTo(cx, canvas.height - 20);
        ctx2d.stroke();
        ctx2d.fillStyle = '#fde047';
        ctx2d.font = 'bold 20px sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('⚠️', cx, 32);
        ctx2d.restore();
      } else {
        const iy = pctToCanvasY(ic.yPct);
        ctx2d.fillStyle = '#bae6fd';
        ctx2d.strokeStyle = '#ffffff';
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.moveTo(cx - 12, iy - 22);
        ctx2d.lineTo(cx + 12, iy - 22);
        ctx2d.lineTo(cx, iy + 12);
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.stroke();
      }
    });

    // Climber
    const px = (lane + 0.5) * laneW;
    const py = pctToCanvasY(climbPct);
    ctx2d.fillStyle = crackHoldMs > 0 ? '#fb7185' : '#38bdf8';
    ctx2d.beginPath();
    ctx2d.arc(px, py, 16, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.strokeStyle = '#ffffff';
    ctx2d.lineWidth = 3;
    ctx2d.stroke();
    ctx2d.font = '18px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('🧗', px, py + 1);

    pctEl.textContent = `${toPersianDigits(Math.round(climbPct))}٪`;
    statusEl.textContent = statusMsg;

    rafId = requestAnimationFrame(tick);
  }

  leftBtn.addEventListener('click', () => shiftLane(-1));
  rightBtn.addEventListener('click', () => shiftLane(1));
  climbBtn.addEventListener('pointerdown', () => {
    climbing = true;
    stepClimb(7);
  });
  climbBtn.addEventListener('pointerup', () => {
    climbing = false;
  });
  climbBtn.addEventListener('pointerleave', () => {
    climbing = false;
  });

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      shiftLane(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      shiftLane(1);
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
      e.preventDefault();
      climbing = true;
      stepClimb(5);
    }
  };
  const onKeyUp = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
      climbing = false;
    }
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  shell.onHint((lvl) => {
    hintLevel = lvl;
  });

  shell.onRetry(() => {
    lane = 1;
    climbPct = 4;
    checkpointPct = 4;
    crackHoldMs = 0;
    icicles = [];
    solved = false;
    statusMsg = 'از دیواره یخی بالا برو و از قندیل‌ها جاخالی بده!';
  });

  shell.registerCleanup(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  });

  rafId = requestAnimationFrame(tick);
  return shell;
}
