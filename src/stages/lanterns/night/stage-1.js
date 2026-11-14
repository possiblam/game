import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';

export function mountLanternsNightStage1(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const CRYSTALS = [
    { id: 'cyan', name: 'کریستال فیروزه‌ای', freq: 392.0, color: '#22d3ee', bg: 'bg-cyan-500/25', border: 'border-cyan-300', glyph: '◆' },
    { id: 'violet', name: 'کریستال بنفش', freq: 493.88, color: '#a78bfa', bg: 'bg-violet-500/25', border: 'border-violet-300', glyph: '★' },
    { id: 'emerald', name: 'کریستال زمردی', freq: 587.33, color: '#34d399', bg: 'bg-emerald-500/25', border: 'border-emerald-300', glyph: '▲' },
    { id: 'amber', name: 'کریستال طلایی', freq: 659.25, color: '#fbbf24', bg: 'bg-amber-500/25', border: 'border-amber-300', glyph: '●' },
    { id: 'silver', name: 'کریستال نقره‌ای', freq: 783.99, color: '#e2e8f0', bg: 'bg-slate-400/25', border: 'border-slate-200', glyph: '✦' },
  ];

  const ROUNDS = [
    ['cyan', 'violet', 'emerald'],
    ['violet', 'amber', 'cyan', 'silver'],
    ['emerald', 'cyan', 'silver', 'amber', 'violet'],
  ];

  let roundIdx = 0;
  let playingPattern = false;
  let activeGlowId = null;
  let userInput = [];
  let completed = false;
  let timers = [];
  let statusText = 'به الگوی نور و صدای کریستال‌های غار پژواک دقت کنید...';

  function clearTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }

  function chimeCrystal(id) {
    const c = CRYSTALS.find((x) => x.id === id);
    if (!c) return;
    audio.playTone({ freq: c.freq, duration: 0.34, type: 'sine', gain: 0.13 });
    audio.playTone({ freq: c.freq * 1.5, duration: 0.25, type: 'triangle', gain: 0.04, delay: 0.08 });
  }

  function playRoundPattern() {
    clearTimers();
    playingPattern = true;
    userInput = [];
    activeGlowId = null;
    statusText = `در حال پخش پژواک دور ${toPersianDigits(roundIdx + 1)}... (نوری و صوتی)`;
    render();

    const seq = ROUNDS[roundIdx];
    seq.forEach((id, idx) => {
      const tOn = setTimeout(() => {
        activeGlowId = id;
        chimeCrystal(id);
        render();
      }, 450 + idx * 650);
      const tOff = setTimeout(() => {
        activeGlowId = null;
        render();
      }, 450 + idx * 650 + 420);
      timers.push(tOn, tOff);
    });

    const tDone = setTimeout(() => {
      playingPattern = false;
      activeGlowId = null;
      statusText = 'حالا همان ترتیب را روی کریستال‌ها تکرار کنید!';
      render();
    }, 450 + seq.length * 650 + 180);
    timers.push(tDone);
  }

  shell.onRetry(() => {
    roundIdx = 0;
    completed = false;
    playRoundPattern();
  });

  shell.onHint(() => render());

  function render() {
    const seq = ROUNDS[roundIdx];
    const showVisualGuide = shell.getHintLevel() >= 3 && !playingPattern && !completed;
    const nextExpectedId = seq[userInput.length];

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[780px] rounded-2xl p-4 sm:p-6 bg-slate-950/95 border-2 ${
        completed ? 'border-emerald-400' : 'border-cyan-400/45'
      } shadow-2xl space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-bold text-cyan-200">${statusText}</span>
          <span class="px-3 py-1 rounded-full bg-slate-900 border border-cyan-400/40 text-xs font-extrabold text-cyan-300 tabular-nums">
            دور ${toPersianDigits(roundIdx + 1)} از ${toPersianDigits(ROUNDS.length)}
          </span>
        </div>

        <!-- Echo Progress Dots -->
        <div class="flex items-center justify-center gap-2">
          ${seq
            .map(
              (_, i) =>
                `<span class="w-4 h-4 rounded-full border transition-all ${
                  i < userInput.length
                    ? 'bg-emerald-400 border-emerald-200 scale-110'
                    : 'bg-slate-800 border-slate-600'
                }"></span>`
            )
            .join('')}
        </div>

        <!-- 5 Interactive Cave Echo Crystals -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          ${CRYSTALS.map((c) => {
            const isGlowing = activeGlowId === c.id;
            const isHinted = showVisualGuide && c.id === nextExpectedId;
            return `
              <button type="button" data-crystal="${c.id}" data-testid="ln1-crystal-${c.id}"
                class="min-h-[112px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                  isGlowing
                    ? `${c.bg} ${c.border} scale-105 shadow-[0_0_28px_rgba(34,211,238,0.55)] ring-4 ring-white/50`
                    : isHinted
                    ? `${c.bg} border-amber-300 ring-4 ring-amber-400 animate-pulse`
                    : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-100'
                }"
                ${playingPattern || completed ? 'disabled' : ''}>
                <span class="text-3xl font-extrabold" style="color:${c.color};">${c.glyph}</span>
                <span class="text-xs font-bold text-slate-200">${c.name}</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="flex items-center justify-center pt-1">
          <button type="button" id="ln1-replay" data-testid="ln1-replay"
            class="px-5 py-2.5 rounded-xl btn-secondary-slate text-xs sm:text-sm font-bold"
            ${playingPattern || completed ? 'disabled' : ''}>
            🔁 پخش دوباره الگوی غار
          </button>
        </div>
      </div>
    `;

    shell.playArea.querySelector('#ln1-replay')?.addEventListener('click', () => {
      if (playingPattern || completed) return;
      playRoundPattern();
    });

    shell.playArea.querySelectorAll('[data-crystal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (playingPattern || completed) return;
        const id = btn.dataset.crystal;
        activeGlowId = id;
        chimeCrystal(id);
        setTimeout(() => {
          if (activeGlowId === id) {
            activeGlowId = null;
            render();
          }
        }, 220);

        const expected = seq[userInput.length];
        if (id === expected) {
          userInput.push(id);
          if (userInput.length === seq.length) {
            if (roundIdx + 1 < ROUNDS.length) {
              audio.playMechanism();
              roundIdx += 1;
              statusText = 'آفرین! آماده الگوی بعدی غار باشید...';
              render();
              const tNext = setTimeout(() => playRoundPattern(), 750);
              timers.push(tNext);
            } else {
              completed = true;
              audio.playGateOpen();
              statusText = 'دروازه سنگی غار پژواک باز شد!';
              render();
              setTimeout(() => shell.complete(), 500);
            }
          } else {
            render();
          }
        } else {
          audio.playError();
          shell.recordAttempt();
          userInput = [];
          statusText = 'پژواک نادرست بود! دوباره الگو را ببینید و تکرار کنید.';
          render();
          const tErr = setTimeout(() => playRoundPattern(), 700);
          timers.push(tErr);
        }
      });
    });
  }

  playRoundPattern();
  shell.registerCleanup(clearTimers);
  return shell;
}
