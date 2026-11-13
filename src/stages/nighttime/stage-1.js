import { createStageShell } from '../stage-shell.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountNightStage1(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const RUNES = [
    { id: 'moon', name: 'ماه', color: '#38bdf8', freq: 392, svg: '<path d="M29 10 A14 14 0 1 0 38 31 A11 11 0 1 1 29 10 Z" fill="currentColor"/>' },
    { id: 'star', name: 'ستاره', color: '#fde047', freq: 440, svg: '<polygon points="24,6 29,18 42,19 32,28 35,41 24,34 13,41 16,28 6,19 19,18" fill="currentColor"/>' },
    { id: 'wave', name: 'موج', color: '#22d3ee', freq: 493.88, svg: '<path d="M6 26 Q15 14 24 26 T42 26" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>' },
    { id: 'crystal', name: 'بلور', color: '#a78bfa', freq: 523.25, svg: '<polygon points="24,5 38,24 24,43 10,24" fill="currentColor"/>' },
    { id: 'spiral', name: 'چرخه', color: '#34d399', freq: 587.33, svg: '<circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="22 8"/><circle cx="24" cy="24" r="5" fill="currentColor"/>' },
    { id: 'eye', name: 'فانوس', color: '#f472b6', freq: 659.25, svg: '<polygon points="24,8 40,38 8,38" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="28" r="5" fill="currentColor"/>' },
  ];

  const SEQUENCES = [
    ['moon', 'star', 'crystal'],
    ['wave', 'moon', 'eye', 'star'],
    ['crystal', 'spiral', 'wave', 'moon', 'eye'],
  ];

  let roundIdx = 0;
  let userStep = 0;
  let isShowing = false;
  let activeRuneId = null;
  let completed = false;
  let statusText = 'در حال نمایش الگوی نورانی... دقت کنید!';
  const timers = [];

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
  }

  shell.registerCleanup(clearTimers);

  shell.onRetry(() => {
    clearTimers();
    roundIdx = 0;
    userStep = 0;
    playSequence();
  });

  shell.onHint((lvl) => {
    if (lvl >= 3 && !isShowing && !completed) {
      playSequence(700);
    } else {
      render();
    }
  });

  function playSequence(customStepMs = null) {
    clearTimers();
    isShowing = true;
    userStep = 0;
    activeRuneId = null;
    statusText = 'تماشا کنید... نورها به ترتیب روشن می‌شوند';
    render();

    const seq = SEQUENCES[roundIdx];
    const stepMs = customStepMs || (roundIdx === 0 ? 680 : roundIdx === 1 ? 540 : 440);

    seq.forEach((runeId, idx) => {
      const t1 = setTimeout(() => {
        activeRuneId = runeId;
        const rune = RUNES.find((r) => r.id === runeId);
        audio.playTone({ freq: rune.freq, duration: 0.28, type: 'sine', gain: 0.12 });
        render();
      }, idx * stepMs + 280);
      timers.push(t1);

      const t2 = setTimeout(() => {
        activeRuneId = null;
        render();
      }, idx * stepMs + stepMs * 0.72 + 280);
      timers.push(t2);
    });

    const endT = setTimeout(() => {
      isShowing = false;
      activeRuneId = null;
      statusText = 'حالا شما دقیقاً به همان ترتیب نمادها را لمس کنید!';
      render();
    }, seq.length * stepMs + 360);
    timers.push(endT);
  }

  function render() {
    const seq = SEQUENCES[roundIdx];
    const hintTargetId = shell.getHintLevel() >= 3 && !isShowing ? seq[userStep] : null;

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[780px] rounded-2xl p-5 sm:p-6 bg-slate-900/95 border-2 border-cyan-400/50 shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span class="text-sm font-bold text-cyan-200" id="n1-status">${statusText}</span>
          <span class="text-xs sm:text-sm font-bold text-amber-300 tabular-nums">مرحله حافظه: ${toPersianDigits(roundIdx + 1)} از ${toPersianDigits(SEQUENCES.length)}</span>
        </div>

        <!-- Sequence Progress Dots -->
        <div class="flex items-center justify-center gap-2 mb-5">
          ${seq
            .map((_, idx) => {
              const done = idx < userStep;
              return `<span class="w-4 h-4 rounded-full border-2 transition-all ${
                done ? 'bg-emerald-400 border-emerald-200 scale-110' : 'bg-slate-800 border-cyan-500/50'
              }"></span>`;
            })
            .join('')}
        </div>

        <!-- 6 Glowing Runes Grid -->
        <div class="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
          ${RUNES.map((rune) => {
            const lit = activeRuneId === rune.id;
            const isHint = hintTargetId === rune.id;
            return `
              <button type="button" data-rune="${rune.id}" data-testid="memory-rune-${rune.id}"
                class="h-24 sm:h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
                  lit
                    ? 'scale-105 bg-cyan-500/35 border-white shadow-[0_0_28px_rgba(34,211,238,0.9)]'
                    : isHint
                    ? 'bg-amber-500/20 border-amber-300 ring-4 ring-amber-400 animate-pulse'
                    : 'bg-slate-800/90 hover:bg-slate-700 border-cyan-500/40'
                }"
                style="color:${rune.color}"
                ${isShowing || completed ? 'disabled' : ''}>
                <svg viewBox="0 0 48 48" class="w-10 h-10 sm:w-12 sm:h-12" aria-hidden="true">${rune.svg}</svg>
                <span class="text-xs font-bold text-slate-200">${rune.name}</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="mt-5 text-center">
          <button type="button" id="n1-replay-seq" class="px-4 py-2 rounded-xl btn-secondary-slate text-xs sm:text-sm" ${isShowing || completed ? 'disabled' : ''}>
            👁 نمایش دوباره الگو
          </button>
        </div>
      </div>
    `;

    shell.playArea.querySelector('#n1-replay-seq')?.addEventListener('click', () => {
      if (!isShowing && !completed) {
        audio.playClick();
        playSequence();
      }
    });

    shell.playArea.querySelectorAll('[data-rune]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isShowing || completed) return;
        const chosen = btn.dataset.rune;
        const rune = RUNES.find((r) => r.id === chosen);
        const expected = seq[userStep];

        if (chosen === expected) {
          audio.playTone({ freq: rune.freq, duration: 0.22, type: 'sine', gain: 0.12 });
          activeRuneId = chosen;
          userStep += 1;
          render();
          setTimeout(() => {
            if (activeRuneId === chosen) {
              activeRuneId = null;
              render();
            }
          }, 180);

          if (userStep === seq.length) {
            if (roundIdx + 1 < SEQUENCES.length) {
              isShowing = true;
              statusText = 'آفرین! آماده الگوی بعدی باشید...';
              render();
              const nextT = setTimeout(() => {
                roundIdx += 1;
                playSequence();
              }, 750);
              timers.push(nextT);
            } else {
              completed = true;
              statusText = 'هورا! دیوار حافظه هولوگرافیک روشن شد!';
              render();
              setTimeout(() => shell.complete(), 400);
            }
          }
        } else {
          audio.playError();
          shell.recordAttempt();
          statusText = 'اشتباه بود! الگو دوباره پخش می‌شود...';
          isShowing = true;
          render();
          const retryT = setTimeout(() => playSequence(), 800);
          timers.push(retryT);
        }
      });
    });
  }

  playSequence();
  return shell;
}
