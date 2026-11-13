import { createStageShell } from '../stage-shell.js';
import { UI_TEXT, toPersianDigits } from '../../data/translations.js';
import { renderKeyIconSvg } from '../../components/progress-bar.js';

export function mountDayStage3(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { state, audio, onBackToMap } = ctx;
  const hasMagneticKey = Boolean(state.keys?.magnetic);

  const SYMBOLS = [
    { id: 'triangle', name: 'مثلث', svg: '<polygon points="24,6 42,40 6,40" fill="currentColor"/>' },
    { id: 'star', name: 'ستاره', svg: '<polygon points="24,4 29.5,17 44,18.5 33,28 36,42 24,35 12,42 15,28 4,18.5 18.5,17" fill="currentColor"/>' },
    { id: 'circle', name: 'دایره', svg: '<circle cx="24" cy="24" r="16" fill="currentColor"/>' },
    { id: 'pentagon', name: 'پنج‌ضلعی', svg: '<polygon points="24,5 43,19 36,41 12,41 5,19" fill="currentColor"/>' },
    { id: 'diamond', name: 'لوزی', svg: '<polygon points="24,4 42,24 24,44 6,24" fill="currentColor"/>' },
  ];

  // Two hologram lock rounds matching the shapes on the map artwork
  const ROUNDS = [
    ['triangle', 'star', 'circle', 'pentagon'],
    ['triangle', 'star', 'circle', 'pentagon', 'star'],
  ];

  let keyInserted = false;
  let roundIdx = 0;
  let entered = [];
  let gateOpened = false;
  let statusMessage = hasMagneticKey
    ? 'ابتدا کلید مغناطیسی را در شکاف دروازه قرار دهید.'
    : 'این دروازه فقط با کلید مغناطیسی مرحله دوم باز می‌شود!';

  shell.onRetry(() => {
    entered = [];
    roundIdx = 0;
    statusMessage = keyInserted
      ? 'ترتیب نمادهای بالای دروازه را به ترتیب انتخاب کنید.'
      : 'ابتدا کلید مغناطیسی را در شکاف دروازه قرار دهید.';
    render();
  });

  shell.onHint(() => render());

  function render() {
    const targetSeq = ROUNDS[roundIdx];
    const nextRequiredId = targetSeq[entered.length];
    const showVisualHint = shell.getHintLevel() >= 3 && keyInserted && !gateOpened;

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[780px] rounded-2xl p-5 sm:p-6 bg-slate-900/95 border-2 ${
        gateOpened ? 'border-emerald-400' : 'border-blue-400/50'
      } shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span class="text-sm font-bold text-amber-200" id="d3-status">${statusMessage}</span>
          <span class="text-xs font-bold text-blue-300 tabular-nums">مرحله رمز: ${toPersianDigits(roundIdx + 1)} از ${toPersianDigits(ROUNDS.length)}</span>
        </div>

        <!-- Holographic Gate Display -->
        <div class="p-4 rounded-2xl bg-gradient-to-b from-blue-950/90 to-slate-950 border-2 border-cyan-400/50 text-center">
          <div class="text-xs text-cyan-200 mb-2 font-bold">الگوی هولوگرافیک دروازه:</div>
          <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3 min-h-[64px]">
            ${
              keyInserted
                ? targetSeq
                    .map((symId, idx) => {
                      const sym = SYMBOLS.find((s) => s.id === symId);
                      const isDone = idx < entered.length;
                      return `
                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center border-2 transition-all ${
                          isDone
                            ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 scale-105'
                            : 'bg-blue-900/60 border-cyan-300/60 text-cyan-200'
                        }">
                          <svg viewBox="0 0 48 48" class="w-8 h-8" aria-label="${sym.name}">${sym.svg}</svg>
                        </div>
                      `;
                    })
                    .join('')
                : '<div class="text-sm font-bold text-slate-400 py-3">🔒 صفحه هولوگرافیک تا قرار گرفتن کلید مغناطیسی خاموش است</div>'
            }
          </div>
        </div>

        <!-- Magnetic Key Slot -->
        <div class="mt-4 p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center border-2 ${
              keyInserted
                ? 'bg-amber-500/30 border-amber-300 text-amber-300'
                : 'bg-slate-900 border-slate-600 text-slate-400'
            }">
              ${renderKeyIconSvg('magnetic', keyInserted || hasMagneticKey)}
            </div>
            <div>
              <div class="text-sm font-bold text-slate-100">شکاف کلید مغناطیسی</div>
              <div class="text-xs text-slate-400">${
                keyInserted
                  ? 'کلید با موفقیت قفل را باز کرد!'
                  : hasMagneticKey
                  ? 'کلید مغناطیسی در کیف ابزار شما آماده است.'
                  : UI_TEXT.lockedKeyHint
              }</div>
            </div>
          </div>

          ${
            !hasMagneticKey
              ? `<button type="button" id="d3-go-map" class="px-4 py-2 rounded-xl btn-primary-gold text-xs sm:text-sm" data-testid="d3-missing-key-back">بازگشت به نقشه برای یافتن کلید</button>`
              : !keyInserted
              ? `<button type="button" id="d3-insert-key" class="px-5 py-2.5 rounded-xl btn-primary-gold text-xs sm:text-sm animate-pulse" data-testid="insert-magnetic-key">🗝️ قرار دادن کلید مغناطیسی در قفل</button>`
              : `<span class="px-3 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-400/60 text-emerald-200 text-xs font-bold">✓ قفل فعال شد</span>`
          }
        </div>

        <!-- Symbol Input Console -->
        <div class="mt-5">
          <div class="text-xs text-slate-300 mb-2 font-bold text-center">پنل انتخاب نمادها (از راست به چپ مطابق ردیف بالا):</div>
          <div class="flex flex-wrap items-center justify-center gap-3">
            ${SYMBOLS.map((sym) => {
              const isHinted = showVisualHint && sym.id === nextRequiredId;
              return `
                <button type="button" data-sym="${sym.id}" data-testid="holo-btn-${sym.id}"
                  class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                    !keyInserted || gateOpened
                      ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                      : isHinted
                      ? 'bg-amber-500/25 border-amber-300 text-amber-200 ring-4 ring-amber-400 animate-pulse'
                      : 'bg-slate-800 hover:bg-blue-900/60 border-cyan-400/60 text-cyan-200'
                  }"
                  ${!keyInserted || gateOpened ? 'disabled' : ''}>
                  <svg viewBox="0 0 48 48" class="w-8 h-8" aria-hidden="true">${sym.svg}</svg>
                  <span class="text-[11px] font-bold">${sym.name}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    shell.playArea.querySelector('#d3-go-map')?.addEventListener('click', () => {
      audio.playClick();
      onBackToMap();
    });

    shell.playArea.querySelector('#d3-insert-key')?.addEventListener('click', () => {
      if (!hasMagneticKey || keyInserted) return;
      keyInserted = true;
      audio.playKeyPickup();
      statusMessage = 'صفحه هولوگرافیک روشن شد! نمادهای ردیف بالا را به ترتیب انتخاب کنید.';
      render();
    });

    shell.playArea.querySelectorAll('[data-sym]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!keyInserted || gateOpened) return;
        const chosen = btn.dataset.sym;
        const expected = targetSeq[entered.length];
        if (chosen === expected) {
          audio.playClick();
          entered.push(chosen);
          if (entered.length === targetSeq.length) {
            if (roundIdx + 1 < ROUNDS.length) {
              audio.playMechanism();
              roundIdx += 1;
              entered = [];
              statusMessage = 'عالی! حالا الگوی دوم را هم باز کنید:';
            } else {
              gateOpened = true;
              audio.playGateOpen();
              statusMessage = 'دروازه هولوگرافیک با شکوه باز شد!';
              setTimeout(() => shell.complete(), 450);
            }
          }
        } else {
          audio.playError();
          shell.recordAttempt();
          entered = [];
          statusMessage = 'ترتیب اشتباه بود! دوباره از نماد اول این ردیف شروع کنید.';
        }
        render();
      });
    });
  }

  render();
  return shell;
}
