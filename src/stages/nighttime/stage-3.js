import { createStageShell } from '../stage-shell.js';
import { UI_TEXT, toPersianDigits } from '../../data/translations.js';
import { renderKeyIconSvg } from '../../components/progress-bar.js';

export function mountNightStage3(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { state, audio, onBackToMap } = ctx;
  const hasSilverKey = Boolean(state.keys?.silver);

  // Two 3x3 optical biometric patterns to reconstruct
  const TARGET_PATTERNS = [
    [1, 0, 1, 0, 1, 0, 1, 0, 1], // X-shaped optical biometric code
    [0, 1, 0, 1, 1, 1, 0, 1, 0], // Plus-shaped optical core
  ];

  let keyInserted = false;
  let roundIdx = 0;
  let gridState = Array(9).fill(0);
  let doorOpened = false;
  let statusText = hasSilverKey
    ? 'ابتدا کلید نقره‌ای را در قفل مکانیکی دروازه قرار دهید.'
    : 'برای باز کردن این دروازه به کلید نقره‌ای مرحله دوم نیاز دارید!';

  shell.onRetry(() => {
    roundIdx = 0;
    gridState = Array(9).fill(0);
    statusText = keyInserted
      ? 'الگوی مدار نوری را دقیقاً مانند صفحه اسکنر کنار بچینید.'
      : 'ابتدا کلید نقره‌ای را در قفل مکانیکی قرار دهید.';
    render();
  });

  shell.onHint(() => render());

  function render() {
    const target = TARGET_PATTERNS[roundIdx];
    const showHint = shell.getHintLevel() >= 3 && keyInserted && !doorOpened;

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[820px] rounded-2xl p-5 sm:p-6 bg-slate-900/95 border-2 ${
        doorOpened ? 'border-emerald-400' : 'border-cyan-400/50'
      } shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span class="text-sm font-bold text-cyan-200">${statusText}</span>
          <span class="text-xs font-bold text-amber-300 tabular-nums">الگوی نوری: ${toPersianDigits(roundIdx + 1)} از ${toPersianDigits(TARGET_PATTERNS.length)}</span>
        </div>

        <!-- Silver Key Mechanical Lock Bar -->
        <div class="p-4 rounded-xl bg-slate-800/85 border border-cyan-500/35 flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center border-2 ${
              keyInserted ? 'bg-cyan-500/25 border-cyan-300' : 'bg-slate-900 border-slate-600'
            }">
              ${renderKeyIconSvg('silver', keyInserted || hasSilverKey)}
            </div>
            <div>
              <div class="text-sm font-bold text-slate-100">قفل مکانیکی کلید نقره‌ای</div>
              <div class="text-xs text-slate-400">${
                keyInserted
                  ? 'سامانه رمزگذاری نوری فعال شد!'
                  : hasSilverKey
                  ? 'کلید نقره‌ای آماده است.'
                  : UI_TEXT.lockedKeyHint
              }</div>
            </div>
          </div>

          ${
            !hasSilverKey
              ? `<button type="button" id="n3-go-map" class="px-4 py-2 rounded-xl btn-primary-gold text-xs sm:text-sm" data-testid="n3-missing-key-back">بازگشت به نقشه برای یافتن کلید</button>`
              : !keyInserted
              ? `<button type="button" id="n3-insert-key" class="px-5 py-2.5 rounded-xl btn-night-accent text-xs sm:text-sm animate-pulse" data-testid="insert-silver-key">🗝️ قرار دادن کلید نقره‌ای در قفل</button>`
              : `<span class="px-3 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-400/60 text-emerald-200 text-xs font-bold">✓ دروازه متصل شد</span>`
          }
        </div>

        <!-- Optical Scanner Reference + Interactive Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div class="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/35 text-center">
            <div class="text-xs font-bold text-cyan-300 mb-3">الگوی اسکنر زیست‌سنجی (هدف)</div>
            <div class="grid grid-cols-3 gap-2 max-w-[168px] mx-auto" style="direction:ltr">
              ${target
                .map(
                  (v) => `
                  <div class="w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                    v ? 'bg-cyan-400/35 border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]' : 'bg-slate-900 border-slate-700'
                  }">
                    <span class="w-4 h-4 rounded-full ${v ? 'bg-cyan-300' : 'bg-slate-700'}"></span>
                  </div>
                `
                )
                .join('')}
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/35 text-center">
            <div class="text-xs font-bold text-amber-200 mb-3">صفحه کنترل مدار نوری (گره‌ها را لمس کنید)</div>
            <div class="grid grid-cols-3 gap-2.5 max-w-[216px] mx-auto" style="direction:ltr">
              ${gridState
                .map((v, idx) => {
                  const needsChange = showHint && v !== target[idx];
                  return `
                    <button type="button" data-node="${idx}" data-testid="bio-node-${idx}"
                      class="w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all ${
                        !keyInserted || doorOpened
                          ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                          : v
                          ? 'bg-cyan-500/40 border-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.8)]'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-600'
                      } ${needsChange ? 'ring-4 ring-amber-400 animate-pulse' : ''}"
                      aria-label="گره نوری ${toPersianDigits(idx + 1)}"
                      ${!keyInserted || doorOpened ? 'disabled' : ''}>
                      <span class="w-6 h-6 rounded-full ${v ? 'bg-cyan-200' : 'bg-slate-600'}"></span>
                    </button>
                  `;
                })
                .join('')}
            </div>

            <button type="button" id="n3-verify-btn" data-testid="verify-biometric-btn"
              class="mt-4 px-5 py-2.5 rounded-xl text-sm font-extrabold ${
                keyInserted && !doorOpened ? 'btn-primary-gold' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }"
              ${!keyInserted || doorOpened ? 'disabled' : ''}>
              بررسی و باز کردن دروازه
            </button>
          </div>
        </div>
      </div>
    `;

    shell.playArea.querySelector('#n3-go-map')?.addEventListener('click', () => {
      audio.playClick();
      onBackToMap();
    });

    shell.playArea.querySelector('#n3-insert-key')?.addEventListener('click', () => {
      if (!hasSilverKey || keyInserted) return;
      keyInserted = true;
      audio.playKeyPickup();
      statusText = 'قفل باز شد! حالا مدار نوری سمت چپ را مثل الگوی اسکنر روشن کنید.';
      render();
    });

    shell.playArea.querySelectorAll('[data-node]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!keyInserted || doorOpened) return;
        const idx = Number(btn.dataset.node);
        audio.playClick();
        gridState[idx] = gridState[idx] ? 0 : 1;
        render();
      });
    });

    shell.playArea.querySelector('#n3-verify-btn')?.addEventListener('click', () => {
      if (!keyInserted || doorOpened) return;
      const matches = target.every((v, i) => v === gridState[i]);
      if (matches) {
        if (roundIdx + 1 < TARGET_PATTERNS.length) {
          audio.playMechanism();
          roundIdx += 1;
          gridState = Array(9).fill(0);
          statusText = 'درست بود! حالا الگوی دوم زیست‌سنجی را هم تنظیم کنید.';
          render();
        } else {
          doorOpened = true;
          audio.playGateOpen();
          statusText = 'دروازه معمای زیست‌سنجی باز شد!';
          render();
          setTimeout(() => shell.complete(), 400);
        }
      } else {
        audio.playError();
        shell.recordAttempt();
        statusText = 'الگو هنوز با اسکنر یکی نیست! به خانه‌های روشن در الگو دقت کنید.';
        render();
      }
    });
  }

  render();
  return shell;
}
