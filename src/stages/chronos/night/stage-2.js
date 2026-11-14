import { createStageShell } from '../../stage-shell.js';
import { stepSonarMazeMove } from '../chronos-logic.js';
import { toPersianDigits } from '../../../data/translations.js';

// S = Start, E = Exit, # = Cavern Wall, X = Crystal Spike Trap, . = Safe Floor
const MAZE_GRID = [
  '#########',
  '#S..#...#',
  '#.#.#X#.#',
  '#.#...#.#',
  '#.###.#X#',
  '#...#..E#',
  '#########',
];

const START_POS = { r: 1, c: 1 };
const EXIT_POS = { r: 5, c: 7 };
const MAX_PULSES = 8;

export function mountChronosNightStage2(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  let player = { ...START_POS };
  let pulsesLeft = MAX_PULSES;
  let sonarActiveMs = 0;
  let sonarMaxMs = 3600;
  let sonarOrigin = { ...START_POS };
  let sonarWaveRadius = 0;
  let hintLevel = 0;
  let solved = false;
  let statusMsg = 'موج پژواک صوتی بفرست تا دیوارها و کریستال‌های بنفش روشن شوند!';
  let rafId = null;
  let lastTick = performance.now();

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3 items-center">
      <div class="w-full p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-cyan-400/35 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs sm:text-sm font-bold">
          <span class="text-cyan-300 tabular-nums">📡 موج‌های باقی‌مانده: <span id="n2-pulses">${toPersianDigits(pulsesLeft)}</span></span>
          <span class="text-slate-600">|</span>
          <span id="n2-status" class="text-slate-100">${statusMsg}</span>
        </div>
        <button type="button" id="n2-sonar-btn" data-testid="chronos-n2-sonar-btn"
          class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/20">
          📡 ارسال موج پژواک (E / Space)
        </button>
      </div>

      <canvas id="n2-canvas" width="540" height="420"
        class="w-full max-w-[540px] rounded-2xl border-2 border-cyan-400/50 bg-slate-950 shadow-2xl touch-none"></canvas>

      <!-- Touch & Click D-Pad -->
      <div class="grid grid-cols-3 gap-2 w-48 select-none">
        <div></div>
        <button type="button" data-dir="up" class="h-11 rounded-xl btn-secondary-slate text-lg font-extrabold" aria-label="بالا">↑</button>
        <div></div>
        <button type="button" data-dir="right" class="h-11 rounded-xl btn-secondary-slate text-lg font-extrabold" aria-label="راست">→</button>
        <button type="button" data-dir="down" class="h-11 rounded-xl btn-secondary-slate text-lg font-extrabold" aria-label="پایین">↓</button>
        <button type="button" data-dir="left" class="h-11 rounded-xl btn-secondary-slate text-lg font-extrabold" aria-label="چپ">←</button>
      </div>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#n2-canvas');
  const ctx2d = canvas.getContext('2d');
  const pulsesEl = shell.playArea.querySelector('#n2-pulses');
  const statusEl = shell.playArea.querySelector('#n2-status');
  const sonarBtn = shell.playArea.querySelector('#n2-sonar-btn');

  function updateHud() {
    pulsesEl.textContent = toPersianDigits(pulsesLeft);
    statusEl.textContent = statusMsg;
    sonarBtn.disabled = solved || pulsesLeft <= 0;
  }

  function triggerSonar() {
    if (solved || pulsesLeft <= 0) return;
    pulsesLeft -= 1;
    sonarActiveMs = sonarMaxMs;
    sonarOrigin = { ...player };
    sonarWaveRadius = 8;
    audio.playTone({ freq: 580, duration: 0.16, type: 'sine', gain: 0.12 });
    audio.playTone({ freq: 880, duration: 0.25, type: 'triangle', gain: 0.08 });
    statusMsg = `پژواک ارسال شد! مسیر آبی ایمن را دنبال کن (${toPersianDigits(pulsesLeft)} موج باقی مانده).`;
    updateHud();
  }

  function movePlayer(dir) {
    if (solved) return;
    const res = stepSonarMazeMove(MAZE_GRID, player, dir);
    if (res.event === 'wall') {
      audio.playTone({ freq: 140, duration: 0.08, type: 'square', gain: 0.05 });
      statusMsg = 'به دیواره سنگی خوردی! یک موج پژواک بفرست یا مسیر دیگری برو.';
      updateHud();
      return;
    }
    if (res.event === 'spike') {
      audio.playError();
      shell.recordAttempt();
      player = { ...START_POS };
      statusMsg = 'اوه! با کریستال تیز بنفش برخورد کردی و به ورودی برگشتی!';
      updateHud();
      return;
    }

    player = res.pos;
    audio.playClick();

    if (res.event === 'exit') {
      solved = true;
      sonarActiveMs = sonarMaxMs;
      audio.playGateOpen();
      statusMsg = 'آفرین! از هزارتوی تاریک پژواک خارج شدی!';
      updateHud();
      setTimeout(() => shell.complete(), 420);
    } else {
      updateHud();
    }
  }

  function draw(dt) {
    if (sonarActiveMs > 0) {
      sonarActiveMs = Math.max(0, sonarActiveMs - dt);
      sonarWaveRadius += dt * 0.48;
    }

    const cols = MAZE_GRID[0].length;
    const rows = MAZE_GRID.length;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    // Pitch dark background
    ctx2d.fillStyle = '#020617';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);

    const revealAlpha = solved ? 1 : Math.min(1, sonarActiveMs / 1100);
    const localTorchRadius = hintLevel >= 3 ? cellW * 2.2 : cellW * 1.15;
    const pxCenter = (player.c + 0.5) * cellW;
    const pyCenter = (player.r + 0.5) * cellH;

    // Draw maze cells illuminated by either local aura or sonar pulse
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = MAZE_GRID[r][c];
        const x = c * cellW;
        const y = r * cellH;
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;
        const distToPlayer = Math.hypot(cx - pxCenter, cy - pyCenter);
        const torchAlpha = Math.max(0, 1 - distToPlayer / localTorchRadius) * 0.45;
        const distToSonar = Math.hypot(
          cx - (sonarOrigin.c + 0.5) * cellW,
          cy - (sonarOrigin.r + 0.5) * cellH
        );
        const reachedByWave = sonarActiveMs > 0 && distToSonar <= sonarWaveRadius;
        const cellAlpha = Math.max(torchAlpha, reachedByWave ? revealAlpha : 0);

        if (cellAlpha <= 0.02) continue;

        ctx2d.save();
        ctx2d.globalAlpha = cellAlpha;
        if (ch === '#') {
          ctx2d.fillStyle = '#0f172a';
          ctx2d.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
          ctx2d.strokeStyle = '#38bdf8';
          ctx2d.lineWidth = 2.5;
          ctx2d.strokeRect(x + 3, y + 3, cellW - 6, cellH - 6);
        } else if (ch === 'X') {
          // Sharp purple crystal hazard wireframe
          ctx2d.fillStyle = 'rgba(168, 85, 247, 0.25)';
          ctx2d.fillRect(x + 3, y + 3, cellW - 6, cellH - 6);
          ctx2d.strokeStyle = '#f43f5e';
          ctx2d.lineWidth = 2.5;
          ctx2d.beginPath();
          ctx2d.moveTo(cx, y + 10);
          ctx2d.lineTo(x + cellW - 10, y + cellH - 10);
          ctx2d.lineTo(x + 10, y + cellH - 10);
          ctx2d.closePath();
          ctx2d.stroke();
        } else if (ch === 'E') {
          ctx2d.fillStyle = 'rgba(16, 185, 129, 0.35)';
          ctx2d.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);
          ctx2d.strokeStyle = '#34d399';
          ctx2d.lineWidth = 3;
          ctx2d.strokeRect(x + 5, y + 5, cellW - 10, cellH - 10);
          ctx2d.fillStyle = '#fef08a';
          ctx2d.font = 'bold 22px sans-serif';
          ctx2d.textAlign = 'center';
          ctx2d.textBaseline = 'middle';
          ctx2d.fillText('🚪', cx, cy);
        } else {
          ctx2d.strokeStyle = 'rgba(56, 189, 248, 0.16)';
          ctx2d.lineWidth = 1;
          ctx2d.strokeRect(x + 4, y + 4, cellW - 8, cellH - 8);
        }
        ctx2d.restore();
      }
    }

    // Expanding sonar wave ring
    if (sonarActiveMs > 0 && sonarWaveRadius < 680) {
      ctx2d.save();
      ctx2d.strokeStyle = 'rgba(34, 211, 238, 0.75)';
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.arc(
        (sonarOrigin.c + 0.5) * cellW,
        (sonarOrigin.r + 0.5) * cellH,
        sonarWaveRadius,
        0,
        Math.PI * 2
      );
      ctx2d.stroke();
      ctx2d.restore();
    }

    // Hint 3 exit compass beacon
    if (hintLevel >= 3) {
      const ex = (EXIT_POS.c + 0.5) * cellW;
      const ey = (EXIT_POS.r + 0.5) * cellH;
      ctx2d.save();
      ctx2d.strokeStyle = '#34d399';
      ctx2d.lineWidth = 2;
      ctx2d.setLineDash([4, 4]);
      ctx2d.beginPath();
      ctx2d.arc(ex, ey, 22, 0, Math.PI * 2);
      ctx2d.stroke();
      ctx2d.restore();
    }

    // Explorer light orb
    const grad = ctx2d.createRadialGradient(pxCenter, pyCenter, 4, pxCenter, pyCenter, 36);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx2d.fillStyle = grad;
    ctx2d.beginPath();
    ctx2d.arc(pxCenter, pyCenter, 36, 0, Math.PI * 2);
    ctx2d.fill();

    ctx2d.fillStyle = '#fef08a';
    ctx2d.beginPath();
    ctx2d.arc(pxCenter, pyCenter, 12, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.font = '16px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('🧝', pxCenter, pyCenter + 1);
  }

  function tick(now) {
    const dt = Math.min(80, now - lastTick);
    lastTick = now;
    draw(dt);
    rafId = requestAnimationFrame(tick);
  }

  sonarBtn.addEventListener('click', triggerSonar);

  shell.playArea.querySelectorAll('[data-dir]').forEach((btn) => {
    btn.addEventListener('click', () => movePlayer(btn.dataset.dir));
  });

  const onKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      movePlayer('up');
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      movePlayer('down');
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      movePlayer('left');
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      movePlayer('right');
    } else if (e.key === ' ' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      triggerSonar();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  shell.onHint((lvl) => {
    hintLevel = lvl;
  });

  shell.onRetry(() => {
    player = { ...START_POS };
    pulsesLeft = MAX_PULSES;
    sonarActiveMs = 0;
    solved = false;
    statusMsg = 'موج پژواک صوتی بفرست تا مسیر تاریک روشن شود!';
    updateHud();
    triggerSonar();
  });

  shell.registerCleanup(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
  });

  updateHud();
  // Start with 1 automatic initial ping (without consuming player's 8 manual pulses)
  sonarActiveMs = 2600;
  sonarOrigin = { ...START_POS };
  sonarWaveRadius = 10;
  rafId = requestAnimationFrame(tick);
  return shell;
}
