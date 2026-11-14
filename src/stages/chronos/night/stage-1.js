import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';

const LILYPADS = [
  { id: 1, periodMs: 2600, litRatio: 0.58, phaseMs: 0, label: 'نیلوفر ۱' },
  { id: 2, periodMs: 2400, litRatio: 0.54, phaseMs: 550, label: 'نیلوفر ۲' },
  { id: 3, periodMs: 2200, litRatio: 0.5, phaseMs: 900, label: 'نیلوفر ۳' },
  { id: 4, periodMs: 2050, litRatio: 0.48, phaseMs: 300, label: 'نیلوفر ۴' },
  { id: 5, periodMs: 1950, litRatio: 0.46, phaseMs: 1100, label: 'نیلوفر ۵' },
];

export function mountChronosNightStage1(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  let currentStep = 0; // 0 = start bank, 1..5 = lilypad, 6 = exit shore
  let decoyTriggered = false;
  let splashMsg = 'فقط وقتی نیلوفر بعدی روشن و آبی است بپر! مراقب گنج فریبنده سمت راست هم باش.';
  let splashKind = 'info'; // 'info' | 'good' | 'warn'
  let hintLevel = 0;
  let animLocked = false;
  let rafId = null;
  const startTime = performance.now();

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3">
      <div class="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-cyan-400/35 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs sm:text-sm font-bold">
          <span class="text-cyan-300 tabular-nums">🪷 موقعیت: <span id="n1-pos">ساحل شروع</span></span>
          <span class="text-slate-600">|</span>
          <span id="n1-status" class="text-slate-100">${splashMsg}</span>
        </div>
      </div>

      <!-- Dark Glowing Lilypad Lagoon -->
      <div class="relative rounded-2xl overflow-hidden border-2 border-cyan-400/40 bg-gradient-to-b from-slate-950 via-indigo-950/90 to-cyan-950/80 p-4 sm:p-5">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          <!-- Main Pond Track (8 cols) -->
          <div class="md:col-span-9 rounded-2xl bg-slate-950/75 border border-cyan-400/25 p-3 sm:p-4 flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between text-[11px] sm:text-xs font-bold text-cyan-200/80">
              <span>🏁 سکوی شروع</span>
              <span id="n1-countdown" class="hidden text-emerald-300 tabular-nums"></span>
              <span>🚪 دروازه مرداب شب</span>
            </div>

            <div class="flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto py-2" id="n1-track">
              <!-- Populated dynamically -->
            </div>
          </div>

          <!-- Tempting Decoy Treasure Branch on Right (4 cols) -->
          <div class="md:col-span-3 rounded-2xl bg-amber-950/35 border-2 border-dashed border-amber-400/60 p-3 flex flex-col items-center justify-between text-center gap-2">
            <div class="text-xs font-extrabold text-amber-300">✨ گنج کناری؟!</div>
            <div class="text-3xl animate-float" aria-hidden="true">${decoyTriggered ? '💥' : '🧰'}</div>
            <p class="m-0 text-[11px] text-amber-100/90 leading-relaxed">
              در گوشه راست درخشش طلایی عجیبی دیده می‌شود!
            </p>
            <button type="button" id="n1-decoy-btn" data-testid="chronos-n1-decoy-btn"
              class="w-full px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/70 text-amber-200 text-[11px] font-extrabold">
              🪙 بررسی صندوق راست
            </button>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex flex-wrap items-center justify-center gap-3">
        <button type="button" id="n1-hop-btn" data-testid="chronos-n1-hop-btn"
          class="w-full sm:w-auto px-8 py-3.5 rounded-2xl btn-primary-gold text-base sm:text-lg font-extrabold">
          🐸 پرش روی نیلوفر بعدی (Space / ↑)
        </button>
      </div>
    </div>
  `;

  const posEl = shell.playArea.querySelector('#n1-pos');
  const statusEl = shell.playArea.querySelector('#n1-status');
  const trackEl = shell.playArea.querySelector('#n1-track');
  const countdownEl = shell.playArea.querySelector('#n1-countdown');
  const hopBtn = shell.playArea.querySelector('#n1-hop-btn');
  const decoyBtn = shell.playArea.querySelector('#n1-decoy-btn');

  function getLilypadState(pad, nowMs) {
    const elapsed = (nowMs - startTime + pad.phaseMs) % pad.periodMs;
    const progress = elapsed / pad.periodMs;
    const lit = progress < pad.litRatio;
    const remainingLitMs = lit ? Math.max(0, pad.litRatio * pad.periodMs - elapsed) : 0;
    return { lit, remainingLitMs };
  }

  function buildTrackDom() {
    const items = [];
    items.push(`
      <div data-node="0" class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 flex flex-col items-center justify-center shrink-0 text-xs font-extrabold bg-slate-800 border-slate-500 text-slate-200">
        <span data-avatar="0"></span>
        <span class="text-[10px]">شروع</span>
      </div>
    `);
    LILYPADS.forEach((pad, idx) => {
      items.push(`
        <button type="button" data-pad-btn="${idx + 1}"
          class="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center shrink-0 transition-all duration-150">
          <span data-avatar="${idx + 1}" class="text-lg"></span>
          <span class="text-[10px] font-extrabold tabular-nums">${toPersianDigits(idx + 1)}</span>
        </button>
      `);
    });
    items.push(`
      <div data-node="6" class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 flex flex-col items-center justify-center shrink-0 text-xs font-extrabold bg-emerald-950/70 border-emerald-400 text-emerald-200">
        <span data-avatar="6">🚪</span>
        <span class="text-[10px]">پایان</span>
      </div>
    `);
    trackEl.innerHTML = items.join('');

    trackEl.querySelectorAll('[data-pad-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetStep = Number(btn.dataset.padBtn);
        if (targetStep === currentStep + 1) {
          attemptHop();
        }
      });
    });
  }

  function updateVisuals(nowMs) {
    posEl.textContent =
      currentStep === 0
        ? 'ساحل شروع'
        : currentStep === 6
        ? 'دروازه پایان!'
        : `نیلوفر ${toPersianDigits(currentStep)} از ${toPersianDigits(LILYPADS.length)}`;

    statusEl.textContent = splashMsg;
    statusEl.className =
      splashKind === 'warn'
        ? 'text-rose-300'
        : splashKind === 'good'
        ? 'text-emerald-300'
        : 'text-slate-100';

    for (let s = 0; s <= 6; s++) {
      const av = trackEl.querySelector(`[data-avatar="${s}"]`);
      if (av) {
        av.textContent = currentStep === s ? '🧝' : s === 6 ? '🚪' : s === 0 ? '⛰' : '🪷';
      }
    }

    LILYPADS.forEach((pad, idx) => {
      const stepNum = idx + 1;
      const btn = trackEl.querySelector(`[data-pad-btn="${stepNum}"]`);
      if (!btn) return;
      const { lit, remainingLitMs } = getLilypadState(pad, nowMs);
      const isNext = stepNum === currentStep + 1;
      const passed = stepNum <= currentStep;

      if (passed) {
        btn.className =
          'relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center shrink-0 transition-all bg-emerald-500/30 border-emerald-300 text-white shadow-md';
      } else if (lit) {
        btn.className = `relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center shrink-0 transition-all bg-cyan-500/45 border-cyan-200 text-white shadow-[0_0_18px_rgba(34,211,238,0.75)] ${
          isNext ? 'scale-110 ring-4 ring-cyan-300/60' : ''
        }`;
      } else {
        btn.className = `relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center shrink-0 transition-all bg-slate-900/80 border-slate-700 text-slate-500 opacity-65 ${
          isNext ? 'ring-2 ring-rose-500/40' : ''
        }`;
      }

      if (isNext && hintLevel >= 3) {
        countdownEl.classList.remove('hidden');
        countdownEl.textContent = lit
          ? `✅ نیلوفر ${toPersianDigits(stepNum)} روشن است (${toPersianDigits((remainingLitMs / 1000).toFixed(1))} ثانیه)`
          : `⏳ صبر کن تا نیلوفر ${toPersianDigits(stepNum)} روشن شود...`;
      } else if (hintLevel < 3) {
        countdownEl.classList.add('hidden');
      }
    });
  }

  function attemptHop() {
    if (animLocked || currentStep >= 6) return;
    const nextStep = currentStep + 1;
    if (nextStep === 6) {
      // Hop onto exit shore!
      currentStep = 6;
      audio.playGateOpen();
      splashMsg = 'آفرین! از روی تمام نیلوفرهای درخشان به ساحل امن رسیدی!';
      splashKind = 'good';
      animLocked = true;
      updateVisuals(performance.now());
      setTimeout(() => shell.complete(), 420);
      return;
    }

    const pad = LILYPADS[nextStep - 1];
    const { lit } = getLilypadState(pad, performance.now());
    if (lit) {
      currentStep = nextStep;
      audio.playJump();
      splashMsg =
        currentStep === 5
          ? 'فقط یک پرش دیگر تا دروازه مرداب باقی مانده!'
          : `عالی! روی نیلوفر ${toPersianDigits(currentStep)} فرود آمدی.`;
      splashKind = 'good';
    } else {
      audio.playError();
      shell.recordAttempt();
      currentStep = 0;
      splashMsg = 'شلپ! نیلوفر خاموش بود و داخل آب افتادی؛ دوباره از ساحل بپر!';
      splashKind = 'warn';
    }
    updateVisuals(performance.now());
  }

  decoyBtn.addEventListener('click', () => {
    if (animLocked) return;
    decoyTriggered = true;
    audio.playError();
    shell.recordAttempt();
    currentStep = 0;
    splashMsg = 'اوه! گنج سمت راست فقط یک صندوق تله فریبنده بود! برگردیم سر مسیر نیلوفرها.';
    splashKind = 'warn';
    decoyBtn.textContent = '⚠ تله لو رفت!';
    updateVisuals(performance.now());
  });

  hopBtn.addEventListener('click', attemptHop);

  const onKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      attemptHop();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  function loop(now) {
    updateVisuals(now);
    rafId = requestAnimationFrame(loop);
  }

  shell.onHint((lvl) => {
    hintLevel = lvl;
    updateVisuals(performance.now());
  });

  shell.onRetry(() => {
    currentStep = 0;
    animLocked = false;
    splashMsg = 'فقط وقتی نیلوفر بعدی روشن و آبی است بپر!';
    splashKind = 'info';
    updateVisuals(performance.now());
  });

  shell.registerCleanup(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
  });

  buildTrackDom();
  updateVisuals(performance.now());
  rafId = requestAnimationFrame(loop);
  return shell;
}
