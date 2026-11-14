import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';
import { evaluateFloatingBridge } from '../lanterns-logic.js';

export function mountLanternsDayStage6(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  // 3 Floating platforms across the Sun Temple river:
  // Platform 1 (سکوی سبک): needs 20kg counterweight to resist strong current (starts at 0kg)
  // Platform 2 (سکوی متوسط): needs 10kg counterweight (starts at 0kg)
  // Platform 3 (سکوی سنگین): ideal at 10kg counterweight (already sturdy, needs rope + lock)
  // Player can move stones (10kg each, 4 available weights) onto platforms, tie ropes, and engage mechanical locks!
  const INITIAL_PLATFORMS = [
    { id: 1, name: 'سکوی سبک اول', kind: 'سبک (جریان تند)', currentLoad: 0, idealLoad: 20, ropeConnected: false, locked: false },
    { id: 2, name: 'سکوی میانی دوم', kind: 'متوسط', currentLoad: 0, idealLoad: 10, ropeConnected: false, locked: false },
    { id: 3, name: 'سکوی سنگی سوم', kind: 'سنگین', currentLoad: 20, idealLoad: 10, ropeConnected: false, locked: false },
  ];

  let platforms = INITIAL_PLATFORMS.map((p) => ({ ...p }));
  let bankWeights = 10; // Total system weights = 40kg (20+10+10 needed on bridge + 0..10 spare)
  let crossed = false;
  let lanternLit = false;

  shell.onRetry(() => {
    platforms = INITIAL_PLATFORMS.map((p) => ({ ...p }));
    bankWeights = 10;
    crossed = false;
    lanternLit = false;
    render();
  });

  shell.onHint(() => render());

  function render() {
    const evalRes = evaluateFloatingBridge(platforms);
    const showHint = shell.getHintLevel() >= 3 && !evalRes.solved;

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[880px] rounded-2xl p-4 sm:p-6 bg-slate-900/95 border-2 ${
        lanternLit ? 'border-amber-300 shadow-[0_0_50px_rgba(251,191,36,0.45)]' : 'border-sky-400/45'
      } shadow-2xl space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-bold text-amber-200">
            ${
              lanternLit
                ? '☀️ فانوس خورشید روشن شد و نشان طلایی خورشید ساخته شد!'
                : evalRes.solved
                ? 'پل شناور کامل و ایمن است! از روی سکوها عبور کنید.'
                : 'وزنه‌ها را متعادل کنید، طناب‌ها را ببندید و قفل مکانیکی هر سکو را فعال کنید'
            }
          </span>
          <span class="px-3 py-1 rounded-full bg-sky-950/80 border border-sky-400/50 text-sky-200 text-xs font-extrabold tabular-nums">
            وزنه آزاد ساحل: ${toPersianDigits(bankWeights)} کیلوگرم
          </span>
        </div>

        <!-- River & 3 Floating Platforms Visual -->
        <div class="relative rounded-2xl p-3 sm:p-5 bg-gradient-to-b from-sky-900/80 via-cyan-950/85 to-slate-950 border border-cyan-400/40 overflow-hidden">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
            ${platforms
              .map((p, idx) => {
                const st = evalRes.platforms[idx];
                const driftLabel =
                  st.diff < 0
                    ? `کم‌وزن (${toPersianDigits(Math.abs(st.diff))} کیلوگرم کم دارد)`
                    : st.diff > 0
                    ? `سنگین‌تر از حد (${toPersianDigits(st.diff)} کیلوگرم اضافه)`
                    : '✓ وزن کاملاً متعادل!';
                return `
                  <div class="p-3.5 rounded-2xl border-2 flex flex-col justify-between gap-2.5 transition-all ${
                    st.ready
                      ? 'bg-emerald-950/60 border-emerald-400 shadow-lg shadow-emerald-500/15'
                      : st.balanced
                      ? 'bg-sky-950/75 border-cyan-300'
                      : 'bg-slate-900/85 border-amber-400/45'
                  }">
                    <div>
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-extrabold text-sm text-white">${p.name}</span>
                        <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">${p.kind}</span>
                      </div>
                      <div class="text-xs font-bold mt-1 ${st.balanced ? 'text-emerald-300' : 'text-amber-300'}">${driftLabel}</div>
                      ${
                        showHint
                          ? `<div class="text-[11px] text-emerald-300 mt-0.5">وزن هدف: ${toPersianDigits(p.idealLoad)} کیلوگرم</div>`
                          : ''
                      }
                    </div>

                    <!-- Weight Controls -->
                    <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/75 border border-slate-700">
                      <button type="button" data-sub-w="${p.id}" data-testid="ld6-sub-${p.id}"
                        class="w-9 h-9 rounded-lg btn-secondary-slate font-extrabold text-base flex items-center justify-center"
                        ${p.currentLoad < 10 || p.locked ? 'disabled' : ''}>−</button>
                      <span class="text-xs sm:text-sm font-extrabold text-amber-200 tabular-nums">
                        ⚖️ ${toPersianDigits(p.currentLoad)} کیلوگرم
                      </span>
                      <button type="button" data-add-w="${p.id}" data-testid="ld6-add-${p.id}"
                        class="w-9 h-9 rounded-lg btn-secondary-slate font-extrabold text-base flex items-center justify-center"
                        ${bankWeights < 10 || p.locked ? 'disabled' : ''}>+</button>
                    </div>

                    <!-- Rope & Lock Buttons -->
                    <div class="grid grid-cols-2 gap-2">
                      <button type="button" data-rope="${p.id}" data-testid="ld6-rope-${p.id}"
                        class="px-2 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          p.ropeConnected
                            ? 'bg-amber-500/25 border-amber-300 text-amber-200'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                        }"
                        ${crossed ? 'disabled' : ''}>
                        ${p.ropeConnected ? '🪢 طناب وصل شد' : '🪢 بستن طناب'}
                      </button>

                      <button type="button" data-lock="${p.id}" data-testid="ld6-lock-${p.id}"
                        class="px-2 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          p.locked
                            ? 'bg-emerald-500/25 border-emerald-300 text-emerald-200'
                            : st.balanced && p.ropeConnected
                            ? 'bg-cyan-500/25 border-cyan-300 text-cyan-100 animate-pulse'
                            : 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                        }"
                        ${!st.balanced || !p.ropeConnected || crossed ? 'disabled' : ''}>
                        ${p.locked ? '🔒 قفل ثابت شد' : '🔓 قفل موقعیت'}
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Crossing & Sun Lantern Ceremony -->
        ${
          lanternLit
            ? `
            <div class="p-4 rounded-2xl bg-gradient-to-b from-amber-500/25 to-orange-950/60 border-2 border-amber-300 text-center animate-treasure-pop">
              <div class="text-4xl mb-2">☀️🏮✨</div>
              <div class="text-lg font-extrabold text-amber-200">نشان طلایی خورشید ساخته شد و فانوس خورشید روشن گشت!</div>
              <p class="text-xs sm:text-sm text-amber-100/90 mt-1 m-0">تمام قلمرو روز با نور طلایی روشن شد و راه به سوی معبد مرکزی باز است.</p>
            </div>
          `
            : `
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div class="text-xs text-slate-300">
                برای هر سکو: ۱) وزن را متعادل کنید · ۲) طناب اتصال را ببندید · ۳) قفل مکانیکی را بزنید.
              </div>
              <button type="button" id="ld6-cross-btn" data-testid="ld6-cross-btn"
                class="w-full sm:w-auto px-6 py-3 rounded-xl font-extrabold text-sm ${
                  evalRes.solved && !crossed
                    ? 'btn-primary-gold ring-4 ring-amber-300/50 animate-pulse'
                    : 'btn-secondary-slate opacity-55 cursor-not-allowed'
                }"
                ${evalRes.solved && !crossed ? '' : 'disabled'}>
                🚶 عبور از پل شناور و روشن کردن فانوس خورشید
              </button>
            </div>
          `
        }
      </div>
    `;

    shell.playArea.querySelectorAll('[data-add-w]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (bankWeights < 10) return;
        const id = Number(btn.dataset.addW);
        const p = platforms.find((x) => x.id === id);
        if (!p || p.locked) return;
        p.currentLoad += 10;
        bankWeights -= 10;
        audio.playMechanism();
        render();
      });
    });

    shell.playArea.querySelectorAll('[data-sub-w]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.subW);
        const p = platforms.find((x) => x.id === id);
        if (!p || p.locked || p.currentLoad < 10) return;
        p.currentLoad -= 10;
        bankWeights += 10;
        audio.playMechanism();
        render();
      });
    });

    shell.playArea.querySelectorAll('[data-rope]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.rope);
        const p = platforms.find((x) => x.id === id);
        if (!p) return;
        p.ropeConnected = !p.ropeConnected;
        if (!p.ropeConnected) p.locked = false;
        audio.playClick();
        render();
      });
    });

    shell.playArea.querySelectorAll('[data-lock]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.lock);
        const p = platforms.find((x) => x.id === id);
        if (!p || !p.ropeConnected || p.currentLoad !== p.idealLoad) return;
        p.locked = !p.locked;
        audio.playGateOpen();
        render();
      });
    });

    shell.playArea.querySelector('#ld6-cross-btn')?.addEventListener('click', () => {
      if (!evalRes.solved || crossed) return;
      crossed = true;
      lanternLit = true;
      audio.playCrestActivate?.('sun');
      audio.playGrandTreasureFanfare?.();
      render();
      setTimeout(() => shell.complete(), 1400);
    });
  }

  render();
  return shell;
}
