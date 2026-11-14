import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';
import { evaluateCableCarSystem } from '../lanterns-logic.js';

export function mountLanternsNightStage5(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const WEIGHT_CHOICES = [
    { id: 'w5', kg: 5 },
    { id: 'w10', kg: 10 },
    { id: 'w15', kg: 15 },
    { id: 'w20', kg: 20 },
  ];
  const TARGET_WEIGHT = 30;

  let cableConnected = false;
  let leftPulleyDir = 'reverse';  // needs 'forward'
  let rightPulleyDir = 'reverse'; // needs 'forward'
  let activeWeightIds = ['w5'];   // starts unbalanced at 5kg
  let cabinPos = 50;              // starts stuck mid-gorge (50%), moves to station (10%), then crosses to (88%)
  let phase = 'repair';           // 'repair' | 'boarding' | 'crossing' | 'done'

  shell.onRetry(() => {
    cableConnected = false;
    leftPulleyDir = 'reverse';
    rightPulleyDir = 'reverse';
    activeWeightIds = ['w5'];
    cabinPos = 50;
    phase = 'repair';
    render();
  });

  shell.onHint(() => render());

  function render() {
    const selectedWeights = activeWeightIds.map(
      (id) => WEIGHT_CHOICES.find((w) => w.id === id)?.kg || 0
    );
    const sys = evaluateCableCarSystem({
      cableConnected,
      leftPulleyDir,
      rightPulleyDir,
      selectedWeights,
      targetWeight: TARGET_WEIGHT,
    });
    const showHint = shell.getHintLevel() >= 3 && phase === 'repair';

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[860px] rounded-2xl p-4 sm:p-6 bg-slate-950/95 border-2 ${
        phase === 'done' ? 'border-emerald-400' : 'border-sky-500/45'
      } shadow-2xl space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-bold text-cyan-200">
            ${
              phase === 'done'
                ? 'کابین تله‌کابین نجات با ایمنی به ایستگاه مقابل رسید!'
                : phase === 'boarding'
                ? 'کابین به سکوی ایستگاه رسید! دکمه سوار شدن و عبور را بزنید.'
                : 'کابل، جهت قرقره‌ها و وزنه‌های تعادل (مجموع دقیق ۳۰ کیلوگرم) را تنظیم کنید'
            }
          </span>
          <span class="px-3 py-1 rounded-full border text-xs font-extrabold tabular-nums ${
            sys.weightBalanced
              ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300'
              : 'bg-slate-900 border-amber-400/50 text-amber-300'
          }">
            تعادل وزنه: ${toPersianDigits(sys.totalWeight)} / ${toPersianDigits(TARGET_WEIGHT)} کیلوگرم
          </span>
        </div>

        <!-- Gorge & Cable Car Visual -->
        <div class="relative rounded-2xl p-4 bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border border-cyan-400/35 h-44 overflow-hidden">
          <!-- Main Cable Line -->
          <div class="absolute left-8 right-8 top-12 h-1.5 rounded-full transition-colors ${
            cableConnected ? 'bg-cyan-300 shadow-[0_0_10px_#67e8f9]' : 'border-b-2 border-dashed border-rose-400/70'
          }"></div>

          <!-- Two Towers -->
          <div class="absolute right-6 top-8 w-8 h-28 rounded-t-lg bg-slate-700 border border-cyan-300/60 flex items-end justify-center pb-1 text-[10px] font-bold text-cyan-200">شروع</div>
          <div class="absolute left-6 top-8 w-8 h-28 rounded-t-lg bg-slate-700 border border-emerald-300/60 flex items-end justify-center pb-1 text-[10px] font-bold text-emerald-200">مقصد</div>

          <!-- Hanging Cable Car Cabin -->
          <div class="absolute top-12 transition-all duration-700 -translate-x-1/2" style="right: ${cabinPos}%;">
            <div class="w-1 h-5 bg-slate-300 mx-auto"></div>
            <div class="w-16 h-12 rounded-xl bg-gradient-to-b from-rose-500 to-red-700 border-2 border-amber-200 flex flex-col items-center justify-center shadow-xl">
              <span class="text-base">${phase === 'boarding' || phase === 'crossing' || phase === 'done' ? '🧑‍🚀' : '🚡'}</span>
            </div>
          </div>

          <div class="absolute bottom-2 inset-x-4 text-center text-[11px] text-slate-400">
            ${cableConnected ? '✓ کابل اصلی متصل است' : '⚠ کابل اصلی قطع است — ابتدا آن را متصل کنید'}
          </div>
        </div>

        <!-- Repair Controls -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Cable & Pulleys -->
          <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 space-y-2.5">
            <div class="text-xs font-extrabold text-amber-300">۱. کابل و قرقره‌ها</div>
            <button type="button" id="ln5-cable-btn" data-testid="ln5-cable-btn"
              class="w-full py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all ${
                cableConnected
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-rose-950/50 hover:bg-rose-900/60 border-rose-400 text-rose-200'
              }"
              ${phase !== 'repair' ? 'disabled' : ''}>
              ${cableConnected ? '✓ کابل اصلی متصل شد' : '🔌 اتصال کابل اصلی تله‌کابین'}
            </button>

            <div class="grid grid-cols-2 gap-2">
              <button type="button" id="ln5-pulley-l" data-testid="ln5-pulley-l"
                class="p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  leftPulleyDir === 'forward'
                    ? 'bg-cyan-500/20 border-cyan-300 text-cyan-200'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }"
                ${phase !== 'repair' ? 'disabled' : ''}>
                قرقره چپ: ${leftPulleyDir === 'forward' ? '◀ جلو (درست)' : '▶ معکوس'}
              </button>
              <button type="button" id="ln5-pulley-r" data-testid="ln5-pulley-r"
                class="p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  rightPulleyDir === 'forward'
                    ? 'bg-cyan-500/20 border-cyan-300 text-cyan-200'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }"
                ${phase !== 'repair' ? 'disabled' : ''}>
                قرقره راست: ${rightPulleyDir === 'forward' ? '◀ جلو (درست)' : '▶ معکوس'}
              </button>
            </div>
          </div>

          <!-- Counterweights Selector -->
          <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 space-y-2.5">
            <div class="text-xs font-extrabold text-amber-300">۲. انتخاب وزنه‌های تعادل (هدف: ۳۰ کیلوگرم)</div>
            <div class="grid grid-cols-2 gap-2">
              ${WEIGHT_CHOICES.map((w) => {
                const active = activeWeightIds.includes(w.id);
                const hintMark = showHint && (w.kg === 10 || w.kg === 20);
                return `
                  <button type="button" data-weight-id="${w.id}" data-testid="ln5-w-${w.kg}"
                    class="py-2.5 px-3 rounded-xl border font-extrabold text-xs sm:text-sm transition-all tabular-nums ${
                      active
                        ? 'bg-amber-400/25 border-amber-300 text-amber-200 ring-2 ring-amber-400/60'
                        : hintMark
                        ? 'bg-slate-800 border-emerald-400 text-emerald-200 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                    }"
                    ${phase !== 'repair' ? 'disabled' : ''}>
                    ${active ? '✓ ' : ''}⚖️ ${toPersianDigits(w.kg)} کیلوگرم
                  </button>
                `;
              }).join('')}
            </div>
            ${
              showHint
                ? `<div class="text-[11px] text-emerald-300 font-bold">پیکو: «وزنه ۱۰ و ۲۰ کیلوگرمی با هم دقیقاً ۳۰ کیلوگرم می‌سازند!»</div>`
                : ''
            }
          </div>
        </div>

        <!-- Action Button -->
        <div class="flex justify-center pt-1">
          ${
            phase === 'repair'
              ? `<button type="button" id="ln5-run-motor" data-testid="ln5-run-motor"
                  class="px-6 py-3 rounded-xl font-extrabold text-sm ${
                    sys.readyToRun ? 'btn-primary-gold animate-pulse' : 'btn-secondary-slate opacity-55 cursor-not-allowed'
                  }"
                  ${sys.readyToRun ? '' : 'disabled'}>
                  ⚡ روشن کردن موتور و فراخوانی کابین به سکو
                </button>`
              : phase === 'boarding'
              ? `<button type="button" id="ln5-ride-btn" data-testid="ln5-ride-btn"
                  class="px-7 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm ring-4 ring-emerald-300/60 animate-pulse">
                  🚡 سوار شدن و عبور از دره!
                </button>`
              : `<span class="px-5 py-2.5 rounded-xl bg-emerald-950/70 border border-emerald-400 text-emerald-200 font-extrabold text-sm">
                  ✓ تله‌کابین به ایستگاه مقصد رسید!
                </span>`
          }
        </div>
      </div>
    `;

    shell.playArea.querySelector('#ln5-cable-btn')?.addEventListener('click', () => {
      cableConnected = !cableConnected;
      audio.playMechanism();
      render();
    });

    shell.playArea.querySelector('#ln5-pulley-l')?.addEventListener('click', () => {
      leftPulleyDir = leftPulleyDir === 'forward' ? 'reverse' : 'forward';
      audio.playClick();
      render();
    });

    shell.playArea.querySelector('#ln5-pulley-r')?.addEventListener('click', () => {
      rightPulleyDir = rightPulleyDir === 'forward' ? 'reverse' : 'forward';
      audio.playClick();
      render();
    });

    shell.playArea.querySelectorAll('[data-weight-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.weightId;
        if (activeWeightIds.includes(id)) {
          activeWeightIds = activeWeightIds.filter((x) => x !== id);
        } else {
          activeWeightIds = [...activeWeightIds, id];
        }
        audio.playClick();
        render();
      });
    });

    shell.playArea.querySelector('#ln5-run-motor')?.addEventListener('click', () => {
      if (!sys.readyToRun || phase !== 'repair') return;
      audio.playGateOpen();
      cabinPos = 10;
      phase = 'boarding';
      render();
    });

    shell.playArea.querySelector('#ln5-ride-btn')?.addEventListener('click', () => {
      if (phase !== 'boarding') return;
      phase = 'crossing';
      audio.playMechanism();
      cabinPos = 88;
      render();
      setTimeout(() => {
        phase = 'done';
        audio.playGateOpen();
        render();
        setTimeout(() => shell.complete(), 500);
      }, 750);
    });
  }

  render();
  return shell;
}
