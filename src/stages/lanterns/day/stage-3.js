import { createStageShell } from '../../stage-shell.js';
import { UI_TEXT, toPersianDigits } from '../../../data/translations.js';
import { renderKeyIconSvg } from '../../../components/progress-bar.js';
import { evaluateGearTrain } from '../lanterns-logic.js';

export function mountLanternsDayStage3(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { state, audio, onBackToMap } = ctx;
  const hasKey = Boolean(state.keys?.magnetic);

  const GEAR_OPTIONS = [
    { id: 'small', label: 'کوچک (۸ دندانه)', teeth: 8, radius: 22, color: '#f59e0b' },
    { id: 'large', label: 'بزرگ (۱۶ دندانه)', teeth: 16, radius: 36, color: '#ea580c' },
    { id: 'medium', label: 'متوسط (۱۲ دندانه)', teeth: 12, radius: 29, color: '#fbbf24' },
  ];

  const EXPECTED_SLOTS = ['small', 'large', 'medium'];
  const SLOT_LABELS = ['محور ۱ (کنار موتور)', 'محور ۲ (وسط)', 'محور ۳ (کنار پل)'];

  let keyInserted = false;
  let placed = [null, null, null];
  let selectedGearId = 'small';
  let motorRunning = false;
  let bridgeLowered = false;
  let crossed = false;
  let heroProgress = 0;
  let statusMsg = hasKey
    ? 'ابتدا کلید طلایی مغناطیسی را از کیف ابزار در قفل کنترل‌کننده بگذارید.'
    : 'این قفل فقط با کلید طلایی مرحله دوم (گلخانه هوشمند) باز می‌شود!';

  shell.onRetry(() => {
    placed = [null, null, null];
    selectedGearId = 'small';
    motorRunning = false;
    bridgeLowered = false;
    crossed = false;
    heroProgress = 0;
    statusMsg = keyInserted
      ? 'سه چرخ‌دنده را روی محورهای هم‌اندازه قرار دهید تا با هم درگیر شوند.'
      : 'ابتدا کلید طلایی مغناطیسی را در قفل قرار دهید.';
    render();
  });

  shell.onHint(() => render());

  function renderGearSvg(gearId, spinDir = 0) {
    const g = GEAR_OPTIONS.find((x) => x.id === gearId);
    if (!g) return '';
    const r = g.radius;
    const teethCount = g.teeth;
    const toothMarks = Array.from({ length: teethCount }, (_, i) => {
      const a = (i * 360) / teethCount;
      return `<rect x="${50 - 3}" y="${50 - r - 6}" width="6" height="8" rx="1.5" fill="${g.color}" transform="rotate(${a} 50 50)"/>`;
    }).join('');

    return `
      <svg viewBox="0 0 100 100" class="w-16 h-16 sm:w-20 sm:h-20 ${spinDir !== 0 ? 'animate-spin' : ''}" style="${spinDir < 0 ? 'animation-direction:reverse;' : ''} animation-duration:2.4s;" aria-hidden="true">
        ${toothMarks}
        <circle cx="50" cy="50" r="${r}" fill="#78350f" stroke="${g.color}" stroke-width="5"/>
        <circle cx="50" cy="50" r="${Math.max(8, r * 0.35)}" fill="#0f172a" stroke="#fde047" stroke-width="2.5"/>
      </svg>
    `;
  }

  function render() {
    const train = evaluateGearTrain(placed, EXPECTED_SLOTS);
    const showHint = shell.getHintLevel() >= 3 && keyInserted && !train.solved;

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[840px] rounded-2xl p-4 sm:p-6 bg-slate-900/95 border-2 ${
        crossed ? 'border-emerald-400' : 'border-amber-400/45'
      } shadow-2xl space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-bold text-amber-200">${statusMsg}</span>
          <span class="px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-xs font-bold text-orange-300 tabular-nums">
            چرخ‌دنده‌های درگیر: ${toPersianDigits(train.meshedCount)} از ${toPersianDigits(3)}
          </span>
        </div>

        <!-- Magnetic Key Lock Panel -->
        <div class="p-3.5 rounded-xl bg-slate-800/85 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center border-2 ${
              keyInserted ? 'bg-amber-500/30 border-amber-300' : 'bg-slate-900 border-slate-600'
            }">
              ${renderKeyIconSvg('magnetic', keyInserted || hasKey)}
            </div>
            <div>
              <div class="text-sm font-extrabold text-white">قفل نشان مغناطیسی کنترل‌کننده پل</div>
              <div class="text-xs text-slate-300">${
                keyInserted ? 'قفل باز شد! سیستم چرخ‌دنده‌ها آماده چیدمان است.' : hasKey ? 'کلید طلایی از گلخانه آماده استفاده است.' : UI_TEXT.lockedKeyHint
              }</div>
            </div>
          </div>

          ${
            !hasKey
              ? `<button type="button" id="ld3-back-map" class="px-4 py-2 rounded-xl btn-primary-gold text-xs sm:text-sm">بازگشت به نقشه برای یافتن کلید</button>`
              : !keyInserted
              ? `<button type="button" id="ld3-insert-key" data-testid="ld3-insert-key" class="px-5 py-2.5 rounded-xl btn-primary-gold text-xs sm:text-sm animate-pulse">🗝️ قرار دادن کلید طلایی در قفل</button>`
              : `<span class="px-3 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-400/60 text-emerald-200 text-xs font-bold">✓ کنترل‌کننده فعال شد</span>`
          }
        </div>

        <!-- Drawbridge Visual Scene -->
        <div class="relative rounded-2xl p-4 bg-gradient-to-b from-sky-950/80 to-slate-950 border border-amber-500/30 overflow-hidden">
          <div class="flex items-end justify-between gap-2 h-28 relative">
            <!-- Right Cliff (Start) -->
            <div class="w-24 sm:w-28 h-16 rounded-t-xl bg-gradient-to-b from-amber-800 to-stone-900 border-t-4 border-emerald-500 flex items-center justify-center text-xs font-bold text-amber-100 z-10">
              سکوی شروع
            </div>

            <!-- Moving Mechanical Bridge Deck -->
            <div class="flex-1 relative h-16 flex items-start">
              <div class="w-full h-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 border border-amber-200 origin-right transition-transform duration-700"
                   style="transform: rotate(${bridgeLowered ? '0deg' : '38deg'});">
              </div>
              <!-- Crossing Hero Token -->
              <div class="absolute -top-7 transition-all duration-700 w-9 h-9 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-sm shadow-lg"
                   style="right: ${heroProgress}%;">
                🧭
              </div>
            </div>

            <!-- Left Cliff (Far Side) -->
            <div class="w-24 sm:w-28 h-16 rounded-t-xl bg-gradient-to-b from-amber-800 to-stone-900 border-t-4 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-200 z-10">
              آن‌سوی دره
            </div>
          </div>
        </div>

        <!-- Gear Palette + 3 Bridge Axle Slots -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div class="md:col-span-4 p-3 rounded-2xl bg-slate-800/75 border border-slate-700 space-y-2">
            <div class="text-xs font-bold text-slate-300">۱. یک چرخ‌دنده انتخاب کنید:</div>
            <div class="flex flex-col gap-2">
              ${GEAR_OPTIONS.map((g) => {
                const usedCount = placed.filter((p) => p === g.id).length;
                const isSelected = selectedGearId === g.id;
                return `
                  <button type="button" data-select-gear="${g.id}"
                    class="px-3 py-2 rounded-xl border text-right text-xs font-bold flex items-center justify-between transition-all ${
                      !keyInserted || motorRunning
                        ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-700 text-slate-500'
                        : isSelected
                        ? 'bg-amber-400/20 border-amber-300 text-amber-200 ring-2 ring-amber-400'
                        : 'bg-slate-900 hover:bg-slate-700 border-slate-600 text-slate-200'
                    }"
                    ${!keyInserted || motorRunning ? 'disabled' : ''}>
                    <span>⚙️ ${g.label}</span>
                    <span class="text-[11px] text-slate-400">${usedCount ? 'قرار داده شد' : 'آماده'}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="md:col-span-8 p-3.5 rounded-2xl bg-slate-800/75 border border-slate-700">
            <div class="text-xs font-bold text-slate-300 mb-3">۲. روی هر محور بزنید تا چرخ‌دنده انتخاب‌شده نصب شود:</div>
            <div class="grid grid-cols-3 gap-2 sm:gap-3">
              ${[0, 1, 2]
                .map((slotIdx) => {
                  const gearId = placed[slotIdx];
                  const expectedLabel = GEAR_OPTIONS.find((x) => x.id === EXPECTED_SLOTS[slotIdx])?.label;
                  const spin = motorRunning ? train.spins[slotIdx] : 0;
                  return `
                    <button type="button" data-gear-slot="${slotIdx}" data-testid="ld3-slot-${slotIdx}"
                      class="p-2.5 rounded-2xl border-2 min-h-[128px] flex flex-col items-center justify-center gap-1.5 transition-all ${
                        !keyInserted || motorRunning
                          ? 'bg-slate-900/70 border-slate-700 opacity-60 cursor-not-allowed'
                          : gearId === EXPECTED_SLOTS[slotIdx]
                          ? 'bg-emerald-950/35 border-emerald-400/65'
                          : 'bg-slate-900 hover:bg-slate-800 border-amber-400/45'
                      }"
                      ${!keyInserted || motorRunning ? 'disabled' : ''}>
                      <span class="text-[11px] font-bold text-slate-300 text-center">${SLOT_LABELS[slotIdx]}</span>
                      ${
                        gearId
                          ? renderGearSvg(gearId, spin)
                          : `<div class="w-14 h-14 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-xs text-slate-400">خالی</div>`
                      }
                      ${
                        showHint
                          ? `<span class="text-[10px] font-bold text-emerald-300">${expectedLabel}</span>`
                          : ''
                      }
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>

        <!-- Motor & Cross Bridge Controls -->
        <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button type="button" id="ld3-run-motor" data-testid="ld3-run-motor"
            class="px-6 py-3 rounded-xl font-extrabold text-sm ${
              keyInserted && train.solved && !motorRunning
                ? 'btn-primary-gold animate-pulse'
                : 'btn-secondary-slate opacity-55 cursor-not-allowed'
            }"
            ${keyInserted && train.solved && !motorRunning ? '' : 'disabled'}>
            ⚡ راه‌اندازی موتور و پایین آوردن پل
          </button>

          <button type="button" id="ld3-cross-bridge" data-testid="ld3-cross-bridge"
            class="px-6 py-3 rounded-xl font-extrabold text-sm ${
              bridgeLowered && !crossed
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-4 ring-emerald-300/50 animate-pulse'
                : 'btn-secondary-slate opacity-55 cursor-not-allowed'
            }"
            ${bridgeLowered && !crossed ? '' : 'disabled'}>
            🚶 عبور از روی پل چرخ‌دنده‌ای
          </button>
        </div>
      </div>
    `;

    shell.playArea.querySelector('#ld3-back-map')?.addEventListener('click', () => {
      audio.playClick();
      onBackToMap();
    });

    shell.playArea.querySelector('#ld3-insert-key')?.addEventListener('click', () => {
      if (!hasKey || keyInserted) return;
      keyInserted = true;
      audio.playKeyPickup();
      statusMsg = 'کلید وارد شد! چرخ‌دنده‌های کوچک، بزرگ و متوسط را روی محورها بچینید.';
      render();
    });

    shell.playArea.querySelectorAll('[data-select-gear]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.playClick();
        selectedGearId = btn.dataset.selectGear;
        render();
      });
    });

    shell.playArea.querySelectorAll('[data-gear-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!keyInserted || motorRunning) return;
        const idx = Number(btn.dataset.gearSlot);
        // Remove selectedGearId from any previous slot so each gear stays unique
        placed = placed.map((g, i) => (i !== idx && g === selectedGearId ? null : g));
        placed[idx] = placed[idx] === selectedGearId ? null : selectedGearId;
        audio.playMechanism();
        const check = evaluateGearTrain(placed, EXPECTED_SLOTS);
        statusMsg = check.solved
          ? 'عالی! هر سه چرخ‌دنده درگیر شدند! حالا موتور را روشن کنید.'
          : 'چرخ‌دنده‌ها را طوری بچینید که هر سه محور درگیر شوند.';
        render();
      });
    });

    shell.playArea.querySelector('#ld3-run-motor')?.addEventListener('click', () => {
      if (!train.solved || motorRunning) return;
      motorRunning = true;
      audio.playGateOpen();
      statusMsg = 'چرخ‌دنده‌ها به حرکت درآمدند و پل در حال پایین آمدن است!';
      render();
      setTimeout(() => {
        bridgeLowered = true;
        statusMsg = 'پل پایین آمد! حالا دکمه «عبور از روی پل» را بزنید.';
        render();
      }, 650);
    });

    shell.playArea.querySelector('#ld3-cross-bridge')?.addEventListener('click', () => {
      if (!bridgeLowered || crossed) return;
      crossed = true;
      heroProgress = 90;
      audio.playJump();
      statusMsg = 'آفرین! از روی پل چرخ‌دنده‌ای عبور کردید!';
      render();
      setTimeout(() => shell.complete(), 650);
    });
  }

  render();
  return shell;
}
