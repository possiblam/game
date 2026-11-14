import { createStageShell } from '../../stage-shell.js';
import { validateColorStoneStep } from '../chronos-logic.js';
import { toPersianDigits } from '../../../data/translations.js';

const COLOR_MAP = {
  cyan: { name: 'آبی', hex: '#22d3ee', bg: 'from-cyan-400 to-sky-600', symbol: '●' },
  magenta: { name: 'بنفش', hex: '#e879f9', bg: 'from-fuchsia-400 to-purple-700', symbol: '▲' },
  amber: { name: 'زرد', hex: '#fbbf24', bg: 'from-amber-300 to-orange-500', symbol: '★' },
  emerald: { name: 'سبز', hex: '#34d399', bg: 'from-emerald-400 to-teal-600', symbol: '■' },
};

const BRIDGES = [
  {
    seq: ['cyan', 'amber', 'magenta'],
    rows: [
      ['magenta', 'cyan', 'emerald'],
      ['amber', 'cyan', 'magenta'],
      ['emerald', 'amber', 'magenta'],
    ],
  },
  {
    seq: ['emerald', 'cyan', 'amber', 'magenta'],
    rows: [
      ['cyan', 'emerald', 'amber'],
      ['magenta', 'cyan', 'emerald'],
      ['amber', 'magenta', 'cyan'],
      ['emerald', 'amber', 'magenta'],
    ],
  },
  {
    seq: ['amber', 'magenta', 'emerald', 'cyan', 'amber'],
    rows: [
      ['cyan', 'amber', 'emerald'],
      ['magenta', 'cyan', 'amber'],
      ['amber', 'emerald', 'magenta'],
      ['cyan', 'magenta', 'emerald'],
      ['emerald', 'cyan', 'amber'],
    ],
  },
];

export function mountChronosNightStage3(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  let bridgeIdx = 0;
  let stepIdx = 0;
  let hintLevel = 0;
  let solved = false;
  let statusMsg = 'توالی کریستال‌های سقف را ببین و در هر ردیف روی سنگ هم‌رنگ قدم بگذار!';

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3">
      <div class="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-cyan-400/35 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs sm:text-sm font-bold">
          <span class="text-cyan-300 tabular-nums">💎 پل: <span id="n3-bridge">۱ از ۳</span></span>
          <span class="text-slate-600">|</span>
          <span id="n3-status" class="text-slate-100">${statusMsg}</span>
        </div>
      </div>

      <!-- Overhead Hanging Sequence Crystals -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-950 to-slate-900 border-2 border-purple-400/40 text-center">
        <div class="text-xs font-extrabold text-purple-200 mb-2.5">✨ الگوی کریستال‌های منشور سقف (از راست به چپ دنبال کن):</div>
        <div id="n3-crystals" class="flex flex-wrap items-center justify-center gap-2 sm:gap-3"></div>
      </div>

      <!-- Stepping Stone Rows -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border-2 border-cyan-400/35 space-y-2.5">
        <div class="flex items-center justify-between text-[11px] font-bold text-slate-400">
          <span>ردیف پیش رو را با کلیک یا کلیدهای ۱، ۲، ۳ انتخاب کن</span>
          <span id="n3-hint-color" class="hidden text-emerald-300"></span>
        </div>
        <div id="n3-rows" class="flex flex-col gap-2"></div>
      </div>
    </div>
  `;

  const bridgeEl = shell.playArea.querySelector('#n3-bridge');
  const statusEl = shell.playArea.querySelector('#n3-status');
  const crystalsEl = shell.playArea.querySelector('#n3-crystals');
  const rowsEl = shell.playArea.querySelector('#n3-rows');
  const hintColorEl = shell.playArea.querySelector('#n3-hint-color');

  function render() {
    const bridge = BRIDGES[bridgeIdx];
    bridgeEl.textContent = `${toPersianDigits(bridgeIdx + 1)} از ${toPersianDigits(BRIDGES.length)}`;
    statusEl.textContent = statusMsg;

    crystalsEl.innerHTML = bridge.seq
      .map((colorKey, i) => {
        const c = COLOR_MAP[colorKey];
        const done = i < stepIdx || solved;
        const active = !solved && i === stepIdx;
        return `
          <div class="px-3 py-2 rounded-xl border-2 flex items-center gap-1.5 transition-all ${
            active
              ? 'scale-110 border-white bg-slate-800 shadow-[0_0_16px_rgba(255,255,255,0.45)]'
              : done
              ? 'border-emerald-400/60 bg-emerald-950/40 opacity-70'
              : 'border-slate-700 bg-slate-900/80 opacity-85'
          }">
            <span class="w-5 h-5 rounded-full bg-gradient-to-b ${c.bg} flex items-center justify-center text-[10px] text-slate-950 font-black">${c.symbol}</span>
            <span class="text-xs font-extrabold text-white">${c.name}</span>
            ${done ? '<span class="text-emerald-300 text-xs">✓</span>' : ''}
          </div>
        `;
      })
      .join('');

    const targetColor = bridge.seq[stepIdx];
    if (hintLevel >= 3 && !solved && targetColor) {
      hintColorEl.classList.remove('hidden');
      hintColorEl.textContent = `💡 سنگ درست این ردیف: ${COLOR_MAP[targetColor].name} (${COLOR_MAP[targetColor].symbol})`;
    } else {
      hintColorEl.classList.add('hidden');
    }

    rowsEl.innerHTML = bridge.rows
      .map((options, rIdx) => {
        const isCurrent = !solved && rIdx === stepIdx;
        const isCleared = solved || rIdx < stepIdx;
        return `
          <div class="grid grid-cols-12 items-center gap-2 p-2 rounded-xl border ${
            isCurrent
              ? 'bg-cyan-950/35 border-cyan-400/70'
              : isCleared
              ? 'bg-emerald-950/20 border-emerald-500/30 opacity-75'
              : 'bg-slate-900/50 border-slate-800 opacity-55'
          }">
            <div class="col-span-3 sm:col-span-2 text-xs font-extrabold text-slate-300 text-center tabular-nums">
              ${isCleared ? '✓ ایمن' : isCurrent ? `◀ گام ${toPersianDigits(rIdx + 1)}` : `گام ${toPersianDigits(rIdx + 1)}`}
            </div>
            <div class="col-span-9 sm:col-span-10 grid grid-cols-3 gap-2">
              ${options
                .map((cKey, colIdx) => {
                  const c = COLOR_MAP[cKey];
                  const isHintMatch = hintLevel >= 3 && isCurrent && cKey === targetColor;
                  return `
                    <button type="button" data-row="${rIdx}" data-color="${cKey}"
                      class="h-11 sm:h-12 rounded-xl border-2 bg-gradient-to-b ${c.bg} text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                        isCurrent ? 'hover:scale-105 cursor-pointer border-white/80 shadow-md' : 'cursor-default border-slate-900/40'
                      } ${isHintMatch ? 'ring-4 ring-white animate-pulse' : ''}"
                      ${isCurrent ? '' : 'disabled'}>
                      <span>${c.symbol}</span>
                      <span>${c.name}</span>
                      ${isCurrent ? `<span class="hidden sm:inline text-[10px] opacity-75">(${toPersianDigits(colIdx + 1)})</span>` : ''}
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      })
      .join('');

    rowsEl.querySelectorAll('button[data-color]').forEach((btn) => {
      btn.addEventListener('click', () => handlePick(btn.dataset.color));
    });
  }

  function handlePick(chosenColor) {
    if (solved) return;
    const bridge = BRIDGES[bridgeIdx];
    const res = validateColorStoneStep(bridge.seq, stepIdx, chosenColor);
    if (!res.ok) {
      audio.playError();
      shell.recordAttempt();
      stepIdx = 0;
      statusMsg = 'وای! سنگ اشتباه ناپدید شد — از اول همین پل دوباره قدم بردار!';
      render();
      return;
    }

    audio.playTone({ freq: 440 + stepIdx * 75, duration: 0.2, type: 'triangle', gain: 0.11 });
    stepIdx += 1;

    if (res.complete) {
      if (bridgeIdx + 1 < BRIDGES.length) {
        bridgeIdx += 1;
        stepIdx = 0;
        audio.playMechanism();
        statusMsg = `عالی! پل ${toPersianDigits(bridgeIdx)} تمام شد؛ آماده پل بعدی!`;
      } else {
        solved = true;
        audio.playGateOpen();
        statusMsg = 'فوق‌العاده! تمام سنگ‌های منشور رنگی را با موفقیت پشت سر گذاشتی!';
        render();
        setTimeout(() => shell.complete(), 420);
        return;
      }
    } else {
      statusMsg = `آفرین! سنگ ${COLOR_MAP[chosenColor].name} ثابت ماند.`;
    }
    render();
  }

  const onKeyDown = (e) => {
    if (solved) return;
    const num = Number(e.key);
    if (num >= 1 && num <= 3) {
      e.preventDefault();
      const row = BRIDGES[bridgeIdx].rows[stepIdx];
      if (row && row[num - 1]) handlePick(row[num - 1]);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  shell.onHint((lvl) => {
    hintLevel = lvl;
    render();
  });

  shell.onRetry(() => {
    bridgeIdx = 0;
    stepIdx = 0;
    solved = false;
    statusMsg = 'توالی کریستال‌های سقف را دنبال کن!';
    render();
  });

  shell.registerCleanup(() => {
    window.removeEventListener('keydown', onKeyDown);
  });

  render();
  return shell;
}
