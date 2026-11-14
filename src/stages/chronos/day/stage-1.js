import { createStageShell } from '../../stage-shell.js';
import { evaluateAcousticSequence } from '../chronos-logic.js';
import { toPersianDigits } from '../../../data/translations.js';

const CRYSTALS = [
  { id: 'c1', label: 'دو', freq: 261.63, color: '#38bdf8', bg: 'from-sky-500/30 to-blue-900/60', border: 'border-sky-400' },
  { id: 'c2', label: 'ر', freq: 293.66, color: '#fbbf24', bg: 'from-amber-400/30 to-amber-900/60', border: 'border-amber-300' },
  { id: 'c3', label: 'می', freq: 329.63, color: '#fb923c', bg: 'from-orange-500/30 to-red-900/60', border: 'border-orange-400' },
  { id: 'c4', label: 'سل', freq: 392.0, color: '#34d399', bg: 'from-emerald-400/30 to-teal-900/60', border: 'border-emerald-400' },
];

const ROUNDS = [
  ['c1', 'c3', 'c2'],
  ['c2', 'c4', 'c1', 'c3'],
];

export function mountChronosDayStage1(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  let phase = 'listen'; // 'listen' | 'input' | 'run' | 'done'
  let roundIdx = 0;
  let inputSeq = [];
  let activeCrystalId = null;
  let isPlayingPattern = false;
  let bridgeAlignedCount = 0;
  let runnerPct = 6;
  let vibrationLeftMs = 0;
  const MAX_VIBRATION_MS = 7000;
  let statusMsg = 'به صدای کریستال‌های دیاپازونی گوش بده...';
  let hintLevel = 0;
  let rafId = null;
  let lastTick = performance.now();
  const timers = [];

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3">
      <div class="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-amber-400/35 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-200">
          <span>🎵 نوبت: <span id="d1-round" class="tabular-nums">۱ از ۲</span></span>
          <span class="text-slate-600">|</span>
          <span id="d1-status" class="text-slate-100">${statusMsg}</span>
        </div>
        <button type="button" id="d1-replay-btn" class="px-3.5 py-1.5 rounded-xl btn-secondary-slate text-xs sm:text-sm font-bold">
          🔊 پخش دوباره الگو
        </button>
      </div>

      <!-- Acoustic Bridge Visual Arena -->
      <div class="relative rounded-2xl overflow-hidden border-2 border-amber-400/40 bg-gradient-to-b from-sky-950 via-slate-900 to-orange-950/60 p-4 sm:p-5">
        <div class="flex items-center justify-between text-[11px] sm:text-xs font-bold text-amber-200/90 mb-2">
          <span>⛰ سکوی شروع</span>
          <span id="d1-vib-label" class="hidden text-emerald-300 tabular-nums">⚡ زمان ارتعاش پل: ۷ ثانیه</span>
          <span>🏁 آن‌سوی دره</span>
        </div>

        <!-- Resonance Timer Bar -->
        <div id="d1-vib-wrap" class="hidden w-full h-2.5 rounded-full bg-slate-800 border border-slate-700 overflow-hidden mb-3">
          <div id="d1-vib-bar" class="h-full rounded-full bg-gradient-to-l from-emerald-400 to-cyan-400 transition-[width] duration-75" style="width:100%"></div>
        </div>

        <!-- Canyon & Floating Stone Slabs -->
        <div class="relative h-32 sm:h-36 rounded-xl bg-slate-950/65 border border-slate-700/70 overflow-hidden flex items-center px-3">
          <div class="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-orange-950/80 to-transparent pointer-events-none"></div>
          <!-- Left & Right Cliffs -->
          <div class="w-14 sm:w-20 h-16 self-end rounded-tr-xl bg-amber-900/90 border-t-4 border-amber-400 shrink-0"></div>
          <!-- 4 Floating Bridge Stones -->
          <div id="d1-slabs" class="flex-1 grid grid-cols-4 gap-2 px-2 h-full items-center"></div>
          <div class="w-14 sm:w-20 h-16 self-end rounded-tl-xl bg-emerald-900/90 border-t-4 border-emerald-400 shrink-0 flex items-center justify-center text-lg">🚪</div>

          <!-- Explorer Runner -->
          <div id="d1-runner" class="absolute bottom-14 -translate-x-1/2 transition-[left] duration-100 text-2xl sm:text-3xl drop-shadow-lg" style="left: 6%;">
            🏃
          </div>
        </div>
      </div>

      <!-- 4 Giant Tuning-Fork Crystals -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5" id="d1-crystals"></div>

      <!-- Bridge Run Control (shown when bridge locks) -->
      <div id="d1-run-controls" class="hidden flex-col items-center gap-2 p-3 rounded-2xl bg-emerald-950/50 border-2 border-emerald-400/70">
        <div class="text-xs sm:text-sm font-extrabold text-emerald-200">
          پل با ارتعاش صوتی هم‌تراز شد! سریع دکمه زیر را پشت‌سرهم بزن یا نگه دار تا قبل از قطع ارتعاش عبور کنی!
        </div>
        <button type="button" id="d1-dash-btn" data-testid="chronos-d1-dash-btn"
          class="w-full sm:w-auto px-8 py-3.5 rounded-2xl btn-primary-gold text-base sm:text-lg font-extrabold">
          ⚡ دویدن روی پل کریستالی!
        </button>
      </div>
    </div>
  `;

  const roundEl = shell.playArea.querySelector('#d1-round');
  const statusEl = shell.playArea.querySelector('#d1-status');
  const replayBtn = shell.playArea.querySelector('#d1-replay-btn');
  const slabsEl = shell.playArea.querySelector('#d1-slabs');
  const crystalsEl = shell.playArea.querySelector('#d1-crystals');
  const runnerEl = shell.playArea.querySelector('#d1-runner');
  const vibWrapEl = shell.playArea.querySelector('#d1-vib-wrap');
  const vibBarEl = shell.playArea.querySelector('#d1-vib-bar');
  const vibLabelEl = shell.playArea.querySelector('#d1-vib-label');
  const runControlsEl = shell.playArea.querySelector('#d1-run-controls');
  const dashBtn = shell.playArea.querySelector('#d1-dash-btn');

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
  }

  function playCrystalTone(crystal) {
    audio.playTone({ freq: crystal.freq, duration: 0.34, type: 'sine', gain: 0.14 });
    audio.playTone({ freq: crystal.freq * 2, duration: 0.22, type: 'triangle', gain: 0.05 });
  }

  function renderUI() {
    const targetSeq = ROUNDS[roundIdx];
    roundEl.textContent = `${toPersianDigits(roundIdx + 1)} از ${toPersianDigits(ROUNDS.length)}`;
    statusEl.textContent = statusMsg;

    // Render 4 slabs (offset vertically unless aligned)
    const offsets = ['-translate-y-7 rotate-6', 'translate-y-6 -rotate-6', '-translate-y-5 -rotate-3', 'translate-y-7 rotate-6'];
    slabsEl.innerHTML = [0, 1, 2, 3]
      .map((i) => {
        const aligned = phase === 'run' || phase === 'done' || i < bridgeAlignedCount;
        return `
          <div class="h-5 sm:h-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center text-[10px] font-extrabold ${
            aligned
              ? 'translate-y-4 rotate-0 bg-gradient-to-r from-cyan-400/80 to-emerald-400/80 border-white text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.7)]'
              : `${offsets[i]} bg-slate-700/90 border-slate-500 text-slate-300`
          }">
            ${aligned ? '〰️' : '◇'}
          </div>
        `;
      })
      .join('');

    runnerEl.style.left = `${runnerPct}%`;

    const nextExpectedId = hintLevel >= 3 && phase === 'input' ? targetSeq[inputSeq.length] : null;
    crystalsEl.innerHTML = CRYSTALS.map((c) => {
      const isLit = activeCrystalId === c.id;
      const isHint = nextExpectedId === c.id;
      return `
        <button type="button" data-crystal="${c.id}"
          class="p-3 sm:p-4 rounded-2xl border-2 bg-gradient-to-b ${c.bg} ${c.border} flex flex-col items-center gap-1.5 transition-all ${
            isLit ? 'scale-105 ring-4 ring-white shadow-xl brightness-125' : 'hover:scale-[1.03]'
          } ${isHint ? 'ring-4 ring-amber-300 animate-pulse' : ''}"
          ${phase === 'run' || phase === 'done' || isPlayingPattern ? 'disabled' : ''}>
          <svg viewBox="0 0 48 56" class="w-10 h-12" aria-hidden="true">
            <path d="M16 6 V24 A8 8 0 0 0 32 24 V6" fill="none" stroke="${c.color}" stroke-width="5" stroke-linecap="round"/>
            <line x1="24" y1="32" x2="24" y2="50" stroke="${c.color}" stroke-width="5" stroke-linecap="round"/>
            <circle cx="16" cy="8" r="2.5" fill="#fff"/>
            <circle cx="32" cy="8" r="2.5" fill="#fff"/>
          </svg>
          <span class="font-extrabold text-sm sm:text-base text-white">کریستال «${c.label}»</span>
          <span class="text-[11px] text-slate-200/80 tabular-nums">${toPersianDigits(Math.round(c.freq))} هرتز</span>
        </button>
      `;
    }).join('');

    crystalsEl.querySelectorAll('[data-crystal]').forEach((btn) => {
      btn.addEventListener('click', () => handleCrystalTap(btn.dataset.crystal));
    });

    const isRun = phase === 'run';
    vibWrapEl.classList.toggle('hidden', !isRun);
    vibLabelEl.classList.toggle('hidden', !isRun);
    runControlsEl.classList.toggle('hidden', !isRun);
    runControlsEl.classList.toggle('flex', isRun);
    replayBtn.disabled = isRun || phase === 'done';
  }

  function playCurrentPattern() {
    if (isPlayingPattern || phase === 'run' || phase === 'done') return;
    clearTimers();
    isPlayingPattern = true;
    phase = 'listen';
    inputSeq = [];
    bridgeAlignedCount = roundIdx === 0 ? 0 : 2;
    statusMsg = 'به توالی نت‌های کریستال گوش کن...';
    renderUI();

    const seq = ROUNDS[roundIdx];
    seq.forEach((cid, idx) => {
      const t1 = setTimeout(() => {
        activeCrystalId = cid;
        const c = CRYSTALS.find((x) => x.id === cid);
        if (c) playCrystalTone(c);
        renderUI();
      }, 420 + idx * 650);
      timers.push(t1);

      const t2 = setTimeout(() => {
        activeCrystalId = null;
        renderUI();
      }, 420 + idx * 650 + 380);
      timers.push(t2);
    });

    const tEnd = setTimeout(() => {
      isPlayingPattern = false;
      phase = 'input';
      statusMsg = `نوبت توست! ${toPersianDigits(seq.length)} کریستال را به ترتیب بنواز.`;
      renderUI();
    }, 420 + seq.length * 650 + 180);
    timers.push(tEnd);
  }

  function handleCrystalTap(cid) {
    if (phase !== 'input' || isPlayingPattern) return;
    const c = CRYSTALS.find((x) => x.id === cid);
    if (!c) return;

    activeCrystalId = cid;
    playCrystalTone(c);
    setTimeout(() => {
      if (activeCrystalId === cid) {
        activeCrystalId = null;
        renderUI();
      }
    }, 220);

    const nextInput = [...inputSeq, cid];
    const target = ROUNDS[roundIdx];
    const res = evaluateAcousticSequence(nextInput, target);

    if (!res.ok) {
      audio.playError();
      shell.recordAttempt();
      inputSeq = [];
      statusMsg = 'فرکانس ناهماهنگ بود! دوباره به الگو گوش کن...';
      renderUI();
      const t = setTimeout(playCurrentPattern, 700);
      timers.push(t);
      return;
    }

    inputSeq = nextInput;
    bridgeAlignedCount = Math.min(4, (roundIdx === 0 ? 0 : 2) + inputSeq.length);

    if (res.complete) {
      if (roundIdx + 1 < ROUNDS.length) {
        roundIdx += 1;
        audio.playMechanism();
        statusMsg = 'عالی! بخش اول پل تراز شد؛ آماده الگوی دوم!';
        renderUI();
        const t = setTimeout(playCurrentPattern, 850);
        timers.push(t);
      } else {
        // Both rounds complete -> Unlock bridge run!
        phase = 'run';
        bridgeAlignedCount = 4;
        runnerPct = 8;
        vibrationLeftMs = MAX_VIBRATION_MS;
        audio.playGateOpen();
        statusMsg = 'همه قطعات پل در یک راستا قرار گرفتند! بدو!';
        renderUI();
      }
    } else {
      statusMsg = `درست بود! (${toPersianDigits(inputSeq.length)} از ${toPersianDigits(target.length)})`;
      renderUI();
    }
  }

  function advanceRunner(stepPct = 10) {
    if (phase !== 'run') return;
    runnerPct = Math.min(94, runnerPct + stepPct);
    audio.playJump();
    runnerEl.style.left = `${runnerPct}%`;
    if (runnerPct >= 90) {
      phase = 'done';
      statusMsg = 'عالی! به سلامت از پل کریستالی صوتی عبور کردی!';
      renderUI();
      setTimeout(() => shell.complete(), 380);
    }
  }

  function tick(now) {
    const dt = Math.min(80, now - lastTick);
    lastTick = now;
    if (phase === 'run') {
      vibrationLeftMs = Math.max(0, vibrationLeftMs - dt);
      const pct = Math.max(0, (vibrationLeftMs / MAX_VIBRATION_MS) * 100);
      if (vibBarEl) vibBarEl.style.width = `${pct}%`;
      if (vibLabelEl) {
        vibLabelEl.textContent = `⚡ زمان ارتعاش پل: ${toPersianDigits(Math.ceil(vibrationLeftMs / 1000))} ثانیه`;
      }
      if (vibrationLeftMs <= 0) {
        audio.playError();
        shell.recordAttempt();
        phase = 'input';
        roundIdx = 1;
        runnerPct = 6;
        statusMsg = 'ارتعاش پل قطع شد! الگوی دوم را دوباره بنواز تا پل هم‌تراز شود.';
        playCurrentPattern();
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  replayBtn.addEventListener('click', () => {
    audio.playClick();
    playCurrentPattern();
  });

  dashBtn.addEventListener('click', () => advanceRunner(12));

  const onKeyDown = (e) => {
    if (phase === 'run' && (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      advanceRunner(11);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  shell.onHint((lvl) => {
    hintLevel = lvl;
    renderUI();
  });

  shell.onRetry(() => {
    clearTimers();
    roundIdx = 0;
    phase = 'listen';
    inputSeq = [];
    bridgeAlignedCount = 0;
    runnerPct = 6;
    playCurrentPattern();
  });

  shell.registerCleanup(() => {
    clearTimers();
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
  });

  renderUI();
  playCurrentPattern();
  rafId = requestAnimationFrame(tick);
  return shell;
}
