import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';
import { isConstellationAligned, normalizeDeg } from '../lanterns-logic.js';

export function mountLanternsNightStage2(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  // Target Telescope angle = 0° (vertical top constellation beam), 3 star rings also target 0°
  const TARGET_TELESCOPE = 0;
  const TARGET_RING = 0;

  let telescopeDeg = 300;
  let ringAngles = [90, 210, 150];
  let keyCollected = false;

  shell.onRetry(() => {
    telescopeDeg = 300;
    ringAngles = [90, 210, 150];
    keyCollected = false;
    render();
  });

  shell.onHint(() => render());

  function rotateTelescope(delta) {
    if (keyCollected) return;
    telescopeDeg = normalizeDeg(telescopeDeg + delta);
    audio.playMechanism();
    render();
  }

  function rotateRing(idx, delta) {
    if (keyCollected) return;
    ringAngles[idx] = normalizeDeg(ringAngles[idx] + delta);
    audio.playMechanism();
    render();
  }

  function render() {
    const align = isConstellationAligned({
      telescopeDeg,
      ringAngles,
      targetTelescopeDeg: TARGET_TELESCOPE,
      targetRingDeg: TARGET_RING,
    });
    const showHint = shell.getHintLevel() >= 3 && !align.solved;

    const ringRadii = [108, 78, 48];
    const ringColors = ['#38bdf8', '#a78bfa', '#e2e8f0'];
    const ringNames = ['حلقه بیرونی', 'حلقه میانی', 'حلقه درونی'];

    const starCoords = ringAngles.map((deg, idx) => {
      const r = ringRadii[idx];
      const rad = ((deg - 90) * Math.PI) / 180;
      return {
        x: 130 + Math.cos(rad) * r,
        y: 130 + Math.sin(rad) * r,
        aligned: normalizeDeg(deg) === TARGET_RING,
      };
    });

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[840px] rounded-2xl p-4 sm:p-6 bg-slate-950/95 border-2 ${
        align.solved ? 'border-cyan-300 shadow-[0_0_40px_rgba(34,211,238,0.3)]' : 'border-sky-500/40'
      } shadow-2xl space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-bold text-cyan-200">
            ${
              align.solved
                ? 'پرتو ستارگان روی دیوار متمرکز شد! محفظه کلید نقره‌ای باز است.'
                : 'تلسکوپ و هر سه حلقه نجومی را در امتداد خط طلایی بالایی (۰°) هم‌راستا کنید'
            }
          </span>
          <span class="px-3 py-1 rounded-full bg-slate-900 border border-sky-400/40 text-xs font-extrabold text-sky-300 tabular-nums">
            ستاره‌های هم‌راستا: ${toPersianDigits(align.alignedCount)} از ${toPersianDigits(3)}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <!-- Telescope Sky Dome SVG -->
          <div class="md:col-span-6 flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-indigo-950 to-slate-950 border border-cyan-400/35">
            <svg viewBox="0 0 260 260" class="w-56 h-56 sm:w-64 sm:h-64" aria-label="گنبد رصدخانه ماه">
              <!-- Target Alignment Line -->
              <line x1="130" y1="8" x2="130" y2="130" stroke="${align.solved ? '#fde047' : '#fbbf24'}" stroke-width="${align.solved ? '4' : '2'}" stroke-dasharray="${align.solved ? 'none' : '5 4'}"/>
              <polygon points="130,4 124,14 136,14" fill="#fde047"/>

              <!-- Telescope Aim Beam -->
              <g transform="rotate(${telescopeDeg} 130 130)">
                <line x1="130" y1="130" x2="130" y2="14" stroke="${align.teleAligned ? '#34d399' : '#38bdf8'}" stroke-width="5" stroke-opacity="0.35"/>
                <rect x="125" y="102" width="10" height="32" rx="3" fill="#e2e8f0" stroke="#0284c7" stroke-width="2"/>
              </g>

              <!-- 3 Concentric Rings & Glowing Stars -->
              ${ringRadii
                .map(
                  (r, i) => `
                  <circle cx="130" cy="130" r="${r}" fill="none" stroke="${starCoords[i].aligned ? '#fde047' : ringColors[i]}" stroke-width="3" stroke-dasharray="10 6"/>
                  <circle cx="${starCoords[i].x}" cy="${starCoords[i].y}" r="9" fill="${starCoords[i].aligned ? '#fde047' : ringColors[i]}" stroke="#0f172a" stroke-width="2"/>
                  <text x="${starCoords[i].x}" y="${starCoords[i].y + 3.5}" text-anchor="middle" fill="#0f172a" font-size="10" font-weight="bold">★</text>
                `
                )
                .join('')}

              <circle cx="130" cy="130" r="14" fill="#0f172a" stroke="#e2e8f0" stroke-width="2.5"/>
            </svg>
          </div>

          <!-- Controls Panel -->
          <div class="md:col-span-6 space-y-2.5">
            <!-- Telescope Rotation -->
            <div class="p-3 rounded-xl border ${align.teleAligned ? 'bg-emerald-950/40 border-emerald-400/60' : 'bg-slate-900 border-slate-700'} flex items-center justify-between gap-2">
              <div>
                <div class="text-xs sm:text-sm font-extrabold text-amber-200">🔭 جهت تلسکوپ</div>
                <div class="text-xs text-slate-400 tabular-nums">زاویه فعلی: ${toPersianDigits(telescopeDeg)}° ${showHint && !align.teleAligned ? '(هدف: ۰°)' : ''}</div>
              </div>
              <div class="flex items-center gap-1.5">
                <button type="button" id="ln2-tele-l" data-testid="ln2-tele-l" class="w-10 h-10 rounded-lg btn-secondary-slate font-extrabold" ${keyCollected ? 'disabled' : ''}>↺</button>
                <button type="button" id="ln2-tele-r" data-testid="ln2-tele-r" class="w-10 h-10 rounded-lg btn-secondary-slate font-extrabold" ${keyCollected ? 'disabled' : ''}>↻</button>
              </div>
            </div>

            <!-- 3 Ring Controls -->
            ${[0, 1, 2]
              .map((i) => {
                const ok = normalizeDeg(ringAngles[i]) === TARGET_RING;
                return `
                  <div class="p-3 rounded-xl border ${ok ? 'bg-emerald-950/40 border-emerald-400/60' : 'bg-slate-900 border-slate-700'} flex items-center justify-between gap-2">
                    <div>
                      <div class="text-xs sm:text-sm font-extrabold text-cyan-200">${ringNames[i]}</div>
                      <div class="text-xs text-slate-400 tabular-nums">زاویه: ${toPersianDigits(ringAngles[i])}° ${showHint && !ok ? '(هدف: ۰°)' : ''}</div>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button type="button" data-ring-l="${i}" data-testid="ln2-ring-l-${i}" class="w-10 h-10 rounded-lg btn-secondary-slate font-extrabold" ${keyCollected ? 'disabled' : ''}>↺</button>
                      <button type="button" data-ring-r="${i}" data-testid="ln2-ring-r-${i}" class="w-10 h-10 rounded-lg btn-secondary-slate font-extrabold" ${keyCollected ? 'disabled' : ''}>↻</button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Silver Moon Key Vault -->
        <div class="p-3.5 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-3 ${
          align.solved
            ? 'bg-gradient-to-l from-cyan-950/80 to-indigo-950/70 border-cyan-300 shadow-lg shadow-cyan-500/20'
            : 'bg-slate-900/80 border-slate-700'
        }">
          <div class="text-center sm:text-right">
            <div class="font-extrabold text-sm text-cyan-200">
              ${align.solved ? '🌙 نور ستارگان محفظه کلید نقره‌ای را گشود!' : '🔒 محفظه پنهان در دیوار رصدخانه'}
            </div>
            <div class="text-xs text-slate-300 mt-0.5">
              ${
                align.solved
                  ? 'پیکو: «این کلید برای دروازه‌ای ساخته شده که در زیر کوه قرار دارد. باید مراقبش باشیم!»'
                  : 'با هم‌راستا شدن تلسکوپ و هر سه حلقه، محفظه باز می‌شود.'
              }
            </div>
          </div>

          <button type="button" id="ln2-collect-key" data-testid="collect-lanterns-silver-key"
            class="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm ${
              align.solved && !keyCollected
                ? 'btn-primary-gold animate-pulse'
                : 'btn-secondary-slate opacity-55 cursor-not-allowed'
            }"
            ${align.solved && !keyCollected ? '' : 'disabled'}>
            ${keyCollected ? '✓ کلید نقره‌ای برداشته شد!' : '🗝️ برداشتن کلید نقره‌ای ماه'}
          </button>
        </div>
      </div>
    `;

    shell.playArea.querySelector('#ln2-tele-l')?.addEventListener('click', () => rotateTelescope(-30));
    shell.playArea.querySelector('#ln2-tele-r')?.addEventListener('click', () => rotateTelescope(30));

    shell.playArea.querySelectorAll('[data-ring-l]').forEach((btn) => {
      btn.addEventListener('click', () => rotateRing(Number(btn.dataset.ringL), -30));
    });
    shell.playArea.querySelectorAll('[data-ring-r]').forEach((btn) => {
      btn.addEventListener('click', () => rotateRing(Number(btn.dataset.ringR), 30));
    });

    shell.playArea.querySelector('#ln2-collect-key')?.addEventListener('click', () => {
      if (!align.solved || keyCollected) return;
      keyCollected = true;
      audio.playKeyPickup();
      shell.refreshToolkitKey('silver');
      render();
      setTimeout(() => shell.complete({ grantedKey: 'silver' }), 420);
    });
  }

  render();
  return shell;
}
