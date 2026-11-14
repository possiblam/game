import { createStageShell } from '../../stage-shell.js';
import { UI_TEXT, toPersianDigits } from '../../../data/translations.js';
import { renderKeyIconSvg } from '../../../components/progress-bar.js';
import { validateCryoActivationStep } from '../lanterns-logic.js';

export function mountLanternsNightStage3(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { state, audio, onBackToMap } = ctx;
  const hasKey = Boolean(state.keys?.silver);

  const TARGET_TEMPS = [4, 8, 12];
  const EXPECTED_ORDER = [0, 1, 2]; // First chamber 1 (4°), then 2 (8°), then 3 (12°)
  const CHAMBER_NAMES = ['محفظه اول (بلور یخ)', 'محفظه دوم (دانه‌های نایاب)', 'محفظه سوم (لوله‌های انرژی)'];

  let keyInserted = false;
  let temps = [0, 10, 6];
  let activatedOrder = [];
  let gateOpened = false;
  let statusText = hasKey
    ? 'ابتدا کلید نقره‌ای رصدخانه را در قفل دروازه سردخانه قرار دهید.'
    : 'این دروازه عظیم فقط با کلید نقره‌ای مرحله هشتم باز می‌شود!';

  shell.onRetry(() => {
    temps = [0, 10, 6];
    activatedOrder = [];
    gateOpened = false;
    statusText = keyInserted
      ? 'دماها را طبق دستورالعمل تنظیم کنید و به ترتیب از گام ۱ تا ۳ فعال نمایید.'
      : 'ابتدا کلید نقره‌ای را در قفل دروازه قرار دهید.';
    render();
  });

  shell.onHint(() => render());

  function adjustTemp(idx, delta) {
    if (!keyInserted || activatedOrder.includes(idx) || gateOpened) return;
    temps[idx] = Math.max(-4, Math.min(20, temps[idx] + delta));
    audio.playClick();
    render();
  }

  function activateChamber(idx) {
    if (!keyInserted || gateOpened || activatedOrder.includes(idx)) return;
    const res = validateCryoActivationStep({
      chamberIndex: idx,
      temps,
      targetTemps: TARGET_TEMPS,
      activatedOrder,
      expectedOrder: EXPECTED_ORDER,
    });

    if (res.ok) {
      activatedOrder = res.nextOrder;
      audio.playMechanism();
      if (res.solved) {
        gateOpened = true;
        audio.playGateOpen();
        statusText = 'هر سه محفظه با ترتیب دقیق فعال شدند و دروازه سردخانه باز شد!';
        render();
        setTimeout(() => shell.complete(), 550);
      } else {
        statusText = `محفظه ${toPersianDigits(idx + 1)} با دمای ${toPersianDigits(temps[idx])}° فعال شد! نوبت گام بعدی است.`;
        render();
      }
    } else {
      audio.playError();
      shell.recordAttempt();
      if (res.reason === 'order') {
        activatedOrder = [];
        statusText = 'ترتیب فعال‌سازی اشتباه بود! باید به ترتیب از محفظه اول تا سوم فعال کنید.';
      } else {
        statusText = `دمای این محفظه هنوز به ${toPersianDigits(TARGET_TEMPS[idx])} درجه نرسیده است!`;
      }
      render();
    }
  }

  function render() {
    const nextExpectedIdx = EXPECTED_ORDER[activatedOrder.length];
    const showHint = shell.getHintLevel() >= 3 && keyInserted && !gateOpened;

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[820px] rounded-2xl p-4 sm:p-6 bg-slate-950/95 border-2 ${
        gateOpened ? 'border-emerald-400' : 'border-cyan-400/50'
      } shadow-2xl space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-bold text-cyan-200">${statusText}</span>
          <span class="px-3 py-1 rounded-full bg-slate-900 border border-cyan-400/40 text-xs font-extrabold text-cyan-300 tabular-nums">
            محفظه‌های فعال‌شده: ${toPersianDigits(activatedOrder.length)} از ${toPersianDigits(3)}
          </span>
        </div>

        <!-- Wall Blueprint Instruction -->
        <div class="p-3.5 rounded-2xl bg-sky-950/60 border border-cyan-400/45 text-center">
          <div class="text-xs font-extrabold text-amber-300 mb-1.5">📜 دستورالعمل دیواری سردخانه (ترتیب فعال‌سازی مهم است!):</div>
          <div class="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-bold text-cyan-100 tabular-nums">
            <span class="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-400/40">۱) محفظه اول: ۴°</span>
            <span class="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-400/40">۲) محفظه دوم: ۸°</span>
            <span class="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-400/40">۳) محفظه سوم: ۱۲°</span>
          </div>
        </div>

        <!-- Silver Key Slot -->
        <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center border-2 ${
              keyInserted ? 'bg-cyan-500/25 border-cyan-300' : 'bg-slate-950 border-slate-600'
            }">
              ${renderKeyIconSvg('silver', keyInserted || hasKey)}
            </div>
            <div>
              <div class="text-sm font-extrabold text-white">قفل مکانیکی دروازه سردخانه</div>
              <div class="text-xs text-slate-400">${
                keyInserted ? 'قفل باز شد و پنل کنترل دما فعال است.' : hasKey ? 'کلید نقره‌ای در کیف ابزار آماده است.' : UI_TEXT.lockedKeyHint
              }</div>
            </div>
          </div>

          ${
            !hasKey
              ? `<button type="button" id="ln3-back-map" class="px-4 py-2 rounded-xl btn-primary-gold text-xs sm:text-sm">بازگشت به نقشه برای یافتن کلید</button>`
              : !keyInserted
              ? `<button type="button" id="ln3-insert-key" data-testid="ln3-insert-key" class="px-5 py-2.5 rounded-xl btn-primary-gold text-xs sm:text-sm animate-pulse">🗝️ قرار دادن کلید نقره‌ای در قفل</button>`
              : `<span class="px-3 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-400/60 text-emerald-200 text-xs font-bold">✓ دروازه آماده تنظیم دما</span>`
          }
        </div>

        <!-- 3 Cryo Chamber Dials -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          ${[0, 1, 2]
            .map((idx) => {
              const isDone = activatedOrder.includes(idx);
              const isHinted = showHint && idx === nextExpectedIdx;
              const matchesTemp = temps[idx] === TARGET_TEMPS[idx];
              return `
                <div class="p-3.5 rounded-2xl border-2 flex flex-col justify-between gap-3 transition-all ${
                  !keyInserted
                    ? 'bg-slate-900/60 border-slate-800 opacity-55'
                    : isDone
                    ? 'bg-emerald-950/45 border-emerald-400'
                    : isHinted
                    ? 'bg-slate-900 border-amber-300 ring-2 ring-amber-400'
                    : 'bg-slate-900 border-cyan-500/40'
                }">
                  <div class="text-center">
                    <div class="text-xs font-extrabold text-cyan-200">${CHAMBER_NAMES[idx]}</div>
                    <div class="text-3xl font-extrabold mt-2 tabular-nums ${matchesTemp ? 'text-emerald-300' : 'text-white'}">
                      ${toPersianDigits(temps[idx])}°
                    </div>
                    <div class="text-[11px] text-slate-400">هدف: ${toPersianDigits(TARGET_TEMPS[idx])}°</div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <button type="button" data-temp-dec="${idx}" data-testid="ln3-dec-${idx}"
                      class="py-2 rounded-xl btn-secondary-slate font-extrabold text-base"
                      ${!keyInserted || isDone || gateOpened ? 'disabled' : ''}>−۲°</button>
                    <button type="button" data-temp-inc="${idx}" data-testid="ln3-inc-${idx}"
                      class="py-2 rounded-xl btn-secondary-slate font-extrabold text-base"
                      ${!keyInserted || isDone || gateOpened ? 'disabled' : ''}>+۲°</button>
                  </div>

                  <button type="button" data-activate="${idx}" data-testid="ln3-act-${idx}"
                    class="w-full py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all ${
                      isDone
                        ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200'
                        : keyInserted
                        ? 'btn-primary-gold'
                        : 'btn-secondary-slate opacity-50 cursor-not-allowed'
                    }"
                    ${!keyInserted || isDone || gateOpened ? 'disabled' : ''}>
                    ${isDone ? '✓ فعال شد' : `فعال‌سازی (${toPersianDigits(idx + 1)})`}
                  </button>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    shell.playArea.querySelector('#ln3-back-map')?.addEventListener('click', () => {
      audio.playClick();
      onBackToMap();
    });

    shell.playArea.querySelector('#ln3-insert-key')?.addEventListener('click', () => {
      if (!hasKey || keyInserted) return;
      keyInserted = true;
      audio.playKeyPickup();
      statusText = 'قفل باز شد! دماها را تنظیم و از محفظه اول تا سوم فعال کنید.';
      render();
    });

    shell.playArea.querySelectorAll('[data-temp-dec]').forEach((btn) => {
      btn.addEventListener('click', () => adjustTemp(Number(btn.dataset.tempDec), -2));
    });
    shell.playArea.querySelectorAll('[data-temp-inc]').forEach((btn) => {
      btn.addEventListener('click', () => adjustTemp(Number(btn.dataset.tempInc), 2));
    });
    shell.playArea.querySelectorAll('[data-activate]').forEach((btn) => {
      btn.addEventListener('click', () => activateChamber(Number(btn.dataset.activate)));
    });
  }

  render();
  return shell;
}
