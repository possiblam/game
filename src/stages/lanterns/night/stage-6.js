import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';

export function mountLanternsNightStage6(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  // 5x5 Luminous Memory Stone Hall (bottom row 4 -> top row 0)
  // Two escalating waves; Wave 2 includes decoy red flashes to test concentration!
  const WAVES = [
    {
      path: [
        { r: 4, c: 2 },
        { r: 3, c: 2 },
        { r: 3, c: 1 },
        { r: 2, c: 1 },
        { r: 1, c: 1 },
        { r: 0, c: 1 },
      ],
      decoys: [],
    },
    {
      path: [
        { r: 4, c: 1 },
        { r: 3, c: 1 },
        { r: 3, c: 2 },
        { r: 3, c: 3 },
        { r: 2, c: 3 },
        { r: 1, c: 3 },
        { r: 1, c: 2 },
        { r: 0, c: 2 },
      ],
      decoys: [
        { r: 4, c: 3 },
        { r: 2, c: 1 },
      ],
    },
  ];

  let waveIdx = 0;
  let phase = 'memorize'; // 'memorize' | 'walk' | 'lantern'
  let stepIdx = 0;
  let wrongKey = null;
  let memTimer = null;

  function startMemorize() {
    clearTimeout(memTimer);
    phase = 'memorize';
    stepIdx = 0;
    wrongKey = null;
    render();
    memTimer = setTimeout(() => {
      phase = 'walk';
      render();
    }, waveIdx === 0 ? 2800 : 3400);
  }

  shell.onRetry(() => {
    waveIdx = 0;
    startMemorize();
  });

  shell.onHint(() => render());

  function render() {
    const wave = WAVES[waveIdx];
    const safeKeys = new Set(wave.path.map((p) => `${p.r},${p.c}`));
    const decoyKeys = new Set(wave.decoys.map((p) => `${p.r},${p.c}`));
    const nextExpected = wave.path[stepIdx];
    const showHint = shell.getHintLevel() >= 3 && phase === 'walk' && nextExpected;

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[780px] rounded-2xl p-4 sm:p-6 bg-slate-950/95 border-2 ${
        phase === 'lantern' ? 'border-cyan-300 shadow-[0_0_50px_rgba(34,211,238,0.45)]' : 'border-cyan-500/45'
      } shadow-2xl space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-bold text-cyan-200">
            ${
              phase === 'lantern'
                ? '🌙🏮 فانوس ماه روشن شد و نشان نقره‌ای ماه درخشید!'
                : phase === 'memorize'
                ? 'مسیر نورانی آبی را به خاطر بسپارید! (مواظب سنگ‌های فریبنده قرمز باشید)'
                : `حالا از روی سنگ‌های امن مسیر عبور کنید (${toPersianDigits(stepIdx)} از ${toPersianDigits(wave.path.length)})`
            }
          </span>
          <span class="px-3 py-1 rounded-full bg-slate-900 border border-cyan-400/40 text-xs font-extrabold text-cyan-300 tabular-nums">
            تالار ${toPersianDigits(waveIdx + 1)} از ${toPersianDigits(WAVES.length)}
          </span>
        </div>

        ${
          phase === 'lantern'
            ? `
            <div class="p-6 rounded-2xl bg-gradient-to-b from-cyan-500/20 to-indigo-950/75 border-2 border-cyan-300 text-center animate-treasure-pop">
              <div class="text-4xl mb-2">🌙🏮✨</div>
              <div class="text-lg font-extrabold text-cyan-200">نشان نقره‌ای ماه ساخته شد و فانوس ماه روشن گشت!</div>
              <p class="text-xs sm:text-sm text-sky-100/90 mt-1 m-0">هر دو قلمرو خورشید و ماه برای باز شدن معبد مرکزی آماده هستند!</p>
            </div>
          `
            : `
            <div class="mx-auto w-full max-w-[330px] sm:max-w-[370px] grid grid-cols-5 gap-2 p-3 rounded-2xl bg-slate-900 border border-cyan-400/35" dir="ltr" data-testid="ln6-grid">
              ${Array.from({ length: 5 }, (_, r) =>
                Array.from({ length: 5 }, (_, c) => {
                  const key = `${r},${c}`;
                  const isSafe = safeKeys.has(key);
                  const isDecoy = decoyKeys.has(key);
                  const pathIdx = wave.path.findIndex((p) => p.r === r && p.c === c);
                  const walked = pathIdx !== -1 && pathIdx < stepIdx;
                  const isNextHint = showHint && nextExpected.r === r && nextExpected.c === c;
                  const isWrong = wrongKey === key;

                  let tileCls = 'bg-slate-800/80 border-slate-700 text-slate-500';
                  let tileText = '';

                  if (phase === 'memorize') {
                    if (isSafe) {
                      tileCls = 'bg-cyan-500/35 border-cyan-300 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.45)]';
                      tileText = toPersianDigits(pathIdx + 1);
                    } else if (isDecoy) {
                      tileCls = 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse';
                      tileText = '✕';
                    }
                  } else {
                    if (walked) {
                      tileCls = 'bg-emerald-500/35 border-emerald-300 text-emerald-100';
                      tileText = '✓';
                    } else if (isWrong) {
                      tileCls = 'bg-rose-600/40 border-rose-400 text-rose-100';
                      tileText = '!';
                    } else if (isNextHint) {
                      tileCls = 'bg-amber-400/25 border-amber-300 text-amber-200 ring-2 ring-amber-400 animate-pulse';
                      tileText = '★';
                    } else {
                      tileCls = 'bg-slate-800/90 hover:bg-slate-700 border-slate-600 text-slate-300';
                      if (r === wave.path[0].r && c === wave.path[0].c && stepIdx === 0) {
                        tileText = 'شروع';
                        tileCls = 'bg-cyan-900/60 border-cyan-400 text-cyan-100';
                      } else if (r === wave.path[wave.path.length - 1].r && c === wave.path[wave.path.length - 1].c) {
                        tileText = 'خروج';
                      }
                    }
                  }

                  return `
                    <button type="button" data-tile="${r}-${c}" data-testid="ln6-tile-${r}-${c}"
                      class="aspect-square rounded-xl border-2 flex items-center justify-center font-extrabold text-xs sm:text-sm transition-all ${tileCls}"
                      ${phase !== 'walk' ? 'disabled' : ''}>
                      ${tileText}
                    </button>
                  `;
                }).join('')
              ).join('')}
            </div>

            <div class="flex items-center justify-center">
              <button type="button" id="ln6-peek" data-testid="ln6-peek"
                class="px-4 py-2 rounded-xl btn-secondary-slate text-xs font-bold"
                ${phase !== 'walk' ? 'disabled' : ''}>
                👁️ نمایش دوباره مسیر نورانی
              </button>
            </div>
          `
        }
      </div>
    `;

    shell.playArea.querySelector('#ln6-peek')?.addEventListener('click', () => {
      if (phase !== 'walk') return;
      shell.recordAttempt();
      audio.playClick();
      startMemorize();
    });

    shell.playArea.querySelectorAll('[data-tile]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (phase !== 'walk') return;
        const [r, c] = btn.dataset.tile.split('-').map(Number);
        const expected = wave.path[stepIdx];
        if (expected && r === expected.r && c === expected.c) {
          audio.playClick();
          wrongKey = null;
          stepIdx += 1;
          if (stepIdx >= wave.path.length) {
            if (waveIdx + 1 < WAVES.length) {
              audio.playMechanism();
              waveIdx += 1;
              startMemorize();
            } else {
              phase = 'lantern';
              audio.playCrestActivate?.('moon');
              audio.playGrandTreasureFanfare?.();
              render();
              setTimeout(() => shell.complete(), 1400);
            }
          } else {
            render();
          }
        } else {
          audio.playError();
          shell.recordAttempt();
          wrongKey = `${r},${c}`;
          stepIdx = 0;
          render();
          setTimeout(() => startMemorize(), 750);
        }
      });
    });
  }

  startMemorize();
  shell.registerCleanup(() => clearTimeout(memTimer));
  return shell;
}
