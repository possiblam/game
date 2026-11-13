import { createStageShell } from '../stage-shell.js';
import { areRingsAligned } from '../puzzle-logic.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountNightStage2(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  // 3 concentric rings rotated in 45-degree increments; 0 is straight up (aligned with top beam)
  const INITIAL_ANGLES = [90, 225, 135];
  let angles = [...INITIAL_ANGLES];
  let vaultOpened = false;
  let keyCollected = false;

  const RING_LABELS = ['حلقه بیرونی', 'حلقه میانی', 'حلقه درونی'];

  shell.onRetry(() => {
    angles = [...INITIAL_ANGLES];
    vaultOpened = false;
    render();
  });

  shell.onHint(() => render());

  function rotateRing(idx, deltaDeg) {
    if (vaultOpened) return;
    audio.playMechanism();
    angles[idx] = ((angles[idx] + deltaDeg) % 360 + 360) % 360;
    if (areRingsAligned(angles, 0)) {
      vaultOpened = true;
      audio.playGateOpen();
    }
    render();
  }

  function render() {
    const showHint = shell.getHintLevel() >= 3 && !vaultOpened;

    const ringRadii = [122, 90, 58];
    const ringColors = ['#06b6d4', '#3b82f6', '#a78bfa'];

    const ringsSvg = angles
      .map((deg, idx) => {
        const r = ringRadii[idx];
        const aligned = deg === 0;
        const color = aligned ? '#4ade80' : ringColors[idx];
        return `
          <g transform="rotate(${deg} 160 160)" style="transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);">
            <circle cx="160" cy="160" r="${r}" fill="none" stroke="${color}" stroke-width="18" stroke-opacity="0.35"/>
            <circle cx="160" cy="160" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="14 8"/>
            <!-- Alignment Notch Marker at 12 o'clock (top) relative to ring -->
            <circle cx="160" cy="${160 - r}" r="10" fill="${aligned ? '#4ade80' : '#fde047'}" stroke="#0f172a" stroke-width="2.5"/>
          </g>
        `;
      })
      .join('');

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[820px] rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-sky-950/95 to-slate-950/95 border-2 border-cyan-400/50 shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span class="text-xs sm:text-sm font-bold text-cyan-200">
            هر سه حلقه زیرآبی را بچرخانید تا نشانه‌های زرد دقیقاً زیر پرتو سفید بالا تراز شوند
          </span>
          <span class="text-xs font-bold text-emerald-300 tabular-nums">
            حلقه‌های تراز: ${toPersianDigits(angles.filter((a) => a === 0).length)} از ${toPersianDigits(3)}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          <!-- Underwater Vault SVG -->
          <div class="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/30 relative overflow-hidden">
            <svg viewBox="0 0 320 320" class="w-64 h-64 sm:w-72 sm:h-72" aria-label="خزانه زیرآبی کلید نقره‌ای">
              <!-- Underwater glow -->
              <circle cx="160" cy="160" r="145" fill="#082f49" stroke="#0e7490" stroke-width="3"/>
              <!-- Top Alignment Target Beam -->
              <line x1="160" y1="6" x2="160" y2="128" stroke="#ffffff" stroke-width="3" stroke-dasharray="6 4" opacity="0.75"/>
              <polygon points="160,24 152,10 168,10" fill="#fde047"/>
              ${ringsSvg}
              <!-- Center Vault Chamber -->
              <circle cx="160" cy="160" r="32" fill="${vaultOpened ? '#064e3b' : '#1e293b'}" stroke="${vaultOpened ? '#4ade80' : '#64748b'}" stroke-width="3"/>
              ${
                vaultOpened
                  ? `<text x="160" y="166" text-anchor="middle" font-size="24">🗝️</text>`
                  : `<text x="160" y="166" text-anchor="middle" font-size="20">🔒</text>`
              }
            </svg>

            <button type="button" id="n2-pickup-key" data-testid="pickup-silver-key"
              class="mt-3 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
                vaultOpened && !keyCollected
                  ? 'btn-primary-gold ring-4 ring-cyan-300/60'
                  : keyCollected
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }"
              ${!vaultOpened || keyCollected ? 'disabled' : ''}>
              ${
                keyCollected
                  ? '✓ کلید نقره‌ای برداشته شد!'
                  : vaultOpened
                  ? '🗝️ برداشتن کلید نقره‌ای'
                  : 'قفل خزانه هنوز بسته است'
              }
            </button>
          </div>

          <!-- Ring Controls -->
          <div class="space-y-3">
            ${RING_LABELS.map((label, idx) => {
              const aligned = angles[idx] === 0;
              const diffSteps = ((360 - angles[idx]) % 360) / 45;
              const hintDirText =
                showHint && !aligned
                  ? diffSteps <= 4
                    ? `(${toPersianDigits(diffSteps)} بار راستگرد)`
                    : `(${toPersianDigits(8 - diffSteps)} بار چپ‌گرد)`
                  : '';
              return `
                <div class="p-3.5 rounded-xl border ${
                  aligned ? 'bg-emerald-950/50 border-emerald-400/70' : 'bg-slate-900/90 border-cyan-500/35'
                }">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-sm text-slate-100">${label} ${hintDirText}</span>
                    <span class="text-xs font-bold ${aligned ? 'text-emerald-300' : 'text-amber-300'}">
                      ${aligned ? '✓ تراز شد' : 'نیاز به تنظیم'}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button type="button" data-ring="${idx}" data-dir="-45" data-testid="ring-${idx}-ccw"
                      class="flex-1 py-2 rounded-lg btn-night-accent text-xs sm:text-sm" ${vaultOpened ? 'disabled' : ''}>
                      ↺ چرخش چپ
                    </button>
                    <button type="button" data-ring="${idx}" data-dir="45" data-testid="ring-${idx}-cw"
                      class="flex-1 py-2 rounded-lg btn-night-accent text-xs sm:text-sm" ${vaultOpened ? 'disabled' : ''}>
                      ↻ چرخش راست
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    shell.playArea.querySelectorAll('[data-ring]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.ring);
        const dir = Number(btn.dataset.dir);
        rotateRing(idx, dir);
      });
    });

    shell.playArea.querySelector('#n2-pickup-key')?.addEventListener('click', () => {
      if (!vaultOpened || keyCollected) return;
      keyCollected = true;
      audio.playKeyPickup();
      shell.refreshToolkitKey('silver');
      render();
      setTimeout(() => {
        shell.complete({ grantedKey: 'silver' });
      }, 350);
    });
  }

  render();
  return shell;
}
