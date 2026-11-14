import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';
import { evaluateWaterFlow, getPipePorts } from '../lanterns-logic.js';

export function mountLanternsDayStage2(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  // 5x5 Greenhouse Irrigation Grid (RTL-friendly logical col 0..4 left-to-right on screen via dir="ltr" grid container)
  // Tank at (0, 0), Plants at (0, 4), (4, 0), (4, 4).
  // Solution rotations:
  // (0,0) tank [1,2] -> (0,1) straight [1,3] rot 0 -> (0,2) tee rot 0 [1,2,3] -> (0,3) straight rot 0 -> (0,4) plant!
  // From (0,2) bottom -> (1,2) valve [0,2] rot 1 open -> (2,2) cross [0,1,2,3] ->
  //   Left: (2,1) straight rot 0 -> (2,0) corner [1,2] rot 0 -> (3,0) valve rot 1 open -> (4,0) plant!
  //   Right: (2,3) straight rot 0 -> (2,4) corner [2,3] rot 1 -> (3,4) straight rot 1 -> (4,4) plant!
  const INITIAL_GRID = [
    [
      { type: 'tank', ports: [1, 2], label: 'مخزن آب' },
      { type: 'straight', rotation: 1, targetRot: 0 },
      { type: 'tee', rotation: 2, targetRot: 0 },
      { type: 'straight', rotation: 1, targetRot: 0 },
      { type: 'plant', ports: [0, 1, 2, 3], name: 'آفتاب‌گردان' },
    ],
    [
      { type: 'empty' },
      { type: 'empty' },
      { type: 'valve', rotation: 1, open: false, targetRot: 1, targetOpen: true },
      { type: 'empty' },
      { type: 'empty' },
    ],
    [
      { type: 'corner', rotation: 2, targetRot: 0 },
      { type: 'straight', rotation: 1, targetRot: 0 },
      { type: 'cross', rotation: 0, targetRot: 0 },
      { type: 'straight', rotation: 1, targetRot: 0 },
      { type: 'corner', rotation: 3, targetRot: 1 },
    ],
    [
      { type: 'valve', rotation: 1, open: false, targetRot: 1, targetOpen: true },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'straight', rotation: 0, targetRot: 1 },
    ],
    [
      { type: 'plant', ports: [0, 1, 2, 3], name: 'ارکیده طلایی' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'plant', ports: [0, 1, 2, 3], name: 'سرخس کمیاب' },
    ],
  ];

  const TANK_POS = { r: 0, c: 0 };
  const PLANTS = [
    { r: 0, c: 4 },
    { r: 4, c: 0 },
    { r: 4, c: 4 },
  ];

  let grid = INITIAL_GRID.map((row) => row.map((c) => ({ ...c })));
  let keyCollected = false;

  shell.onRetry(() => {
    grid = INITIAL_GRID.map((row) => row.map((c) => ({ ...c })));
    keyCollected = false;
    render();
  });

  shell.onHint(() => render());

  function renderPipeSvg(cell, isWet) {
    if (cell.type === 'tank') {
      return `
        <svg viewBox="0 0 60 60" class="w-11 h-11 sm:w-13 sm:h-13" aria-hidden="true">
          <rect x="8" y="8" width="44" height="44" rx="10" fill="#0284c7" stroke="#bae6fd" stroke-width="3"/>
          <path d="M16 32 Q24 26 30 32 T44 32" fill="none" stroke="#e0f2fe" stroke-width="3"/>
          <text x="30" y="24" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold">مخزن</text>
        </svg>
      `;
    }
    if (cell.type === 'plant') {
      return `
        <svg viewBox="0 0 60 60" class="w-11 h-11 sm:w-13 sm:h-13" aria-hidden="true">
          <circle cx="30" cy="30" r="22" fill="${isWet ? '#065f46' : '#3f2e1d'}" stroke="${isWet ? '#34d399' : '#d97706'}" stroke-width="3"/>
          <path d="M30 44 V26 M30 34 C20 32 18 22 28 24 M30 30 C40 28 42 18 32 20" stroke="${isWet ? '#4ade80' : '#fbbf24'}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
          <circle cx="30" cy="18" r="5" fill="${isWet ? '#fde047' : '#94a3b8'}"/>
        </svg>
      `;
    }
    if (cell.type === 'empty') {
      return `<div class="w-3 h-3 rounded-full bg-slate-700/50"></div>`;
    }

    const ports = cell.type === 'valve'
      ? [(1 + cell.rotation) % 4, (3 + cell.rotation) % 4]
      : getPipePorts(cell);
    const stroke = cell.type === 'valve' && !cell.open
      ? '#ef4444'
      : isWet
      ? '#38bdf8'
      : '#94a3b8';

    const lines = ports
      .map((dir) => {
        if (dir === 0) return '<line x1="30" y1="30" x2="30" y2="2"/>';
        if (dir === 1) return '<line x1="30" y1="30" x2="58" y2="30"/>';
        if (dir === 2) return '<line x1="30" y1="30" x2="30" y2="58"/>';
        return '<line x1="30" y1="30" x2="2" y2="30"/>';
      })
      .join('');

    const valveWheel =
      cell.type === 'valve'
        ? `<circle cx="30" cy="30" r="11" fill="${cell.open ? '#10b981' : '#991b1b'}" stroke="#f8fafc" stroke-width="2.5"/>
           <text x="30" y="34" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold">${cell.open ? 'باز' : 'بسته'}</text>`
        : `<circle cx="30" cy="30" r="6" fill="${stroke}"/>`;

    return `
      <svg viewBox="0 0 60 60" class="w-12 h-12 sm:w-14 sm:h-14" aria-hidden="true">
        <g stroke="${stroke}" stroke-width="11" stroke-linecap="round">${lines}</g>
        ${valveWheel}
      </svg>
    `;
  }

  function render() {
    const flow = evaluateWaterFlow(grid, TANK_POS, PLANTS);
    const showHint = shell.getHintLevel() >= 3 && !flow.allWatered;

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[820px] rounded-2xl p-4 sm:p-6 bg-slate-900/95 border-2 ${
        flow.allWatered ? 'border-emerald-400' : 'border-emerald-500/40'
      } shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span class="text-xs sm:text-sm font-bold text-amber-200">
            ${
              flow.allWatered
                ? 'همه گیاهان گلخانه سیراب شدند! محفظه کلید طلایی باز شد.'
                : 'روی لوله‌ها بزنید تا بچرخند و شیرهای قرمز آب را باز کنید'
            }
          </span>
          <span class="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/50 text-emerald-200 text-xs font-extrabold tabular-nums">
            گیاهان آبیاری‌شده: ${toPersianDigits(flow.wateredCount)} از ${toPersianDigits(3)}
          </span>
        </div>

        <!-- Greenhouse Irrigation Grid -->
        <div class="mx-auto w-full max-w-[360px] sm:max-w-[400px] grid grid-cols-5 gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-2xl bg-slate-950/90 border border-emerald-500/35" dir="ltr" data-testid="ld2-grid">
          ${grid
            .map((row, r) =>
              row
                .map((cell, c) => {
                  const isWet = flow.wetKeys.has(`${r},${c}`);
                  const interactive = ['straight', 'corner', 'tee', 'valve'].includes(cell.type);
                  const needsHint =
                    showHint &&
                    ((cell.type === 'valve' && !cell.open) ||
                      (cell.type !== 'valve' && cell.targetRot !== undefined && cell.rotation !== cell.targetRot && !(cell.type === 'straight' && cell.rotation % 2 === cell.targetRot % 2)));

                  if (!interactive) {
                    return `
                      <div class="aspect-square rounded-xl flex items-center justify-center border ${
                        isWet ? 'bg-sky-950/55 border-cyan-400/70' : 'bg-slate-900/70 border-slate-800'
                      }" title="${cell.name || cell.label || ''}">
                        ${renderPipeSvg(cell, isWet)}
                      </div>
                    `;
                  }

                  return `
                    <button type="button" data-r="${r}" data-c="${c}" data-testid="ld2-cell-${r}-${c}"
                      aria-label="${cell.type === 'valve' ? 'تغییر وضعیت شیر آب' : 'چرخش لوله'}"
                      class="aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${
                        needsHint
                          ? 'bg-amber-500/20 border-amber-300 ring-2 ring-amber-400 animate-pulse'
                          : isWet
                          ? 'bg-sky-900/45 border-cyan-400 shadow-md shadow-cyan-500/15'
                          : 'bg-slate-800/90 hover:bg-slate-700 border-slate-600'
                      }">
                      ${renderPipeSvg(cell, isWet)}
                    </button>
                  `;
                })
                .join('')
            )
            .join('')}
        </div>

        <!-- Hidden Magnetic Key Vault -->
        <div class="mt-4 p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-3 transition-all ${
          flow.allWatered
            ? 'bg-gradient-to-l from-amber-950/80 to-emerald-950/60 border-amber-300 shadow-lg shadow-amber-500/15'
            : 'bg-slate-800/75 border-slate-700'
        }">
          <div class="text-center sm:text-right">
            <div class="font-extrabold text-sm text-amber-200">
              ${flow.allWatered ? '🌺 گیاه بزرگ شکوفا شد و محفظه مخفی باز است!' : '🔒 محفظه فلزی زیر گل طلایی'}
            </div>
            <div class="text-xs text-slate-300 mt-0.5">
              ${
                flow.allWatered
                  ? 'پیکو: «این کلید معمولی نیست! به نظر می‌رسد برای یک دستگاه مکانیکی بزرگ ساخته شده باشد.»'
                  : 'وقتی هر ۳ گیاه آب بگیرند، محفظه کلید طلایی باز می‌شود.'
              }
            </div>
          </div>

          <button type="button" id="ld2-collect-key" data-testid="collect-lanterns-magnetic-key"
            class="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm ${
              flow.allWatered && !keyCollected
                ? 'btn-primary-gold animate-pulse'
                : 'btn-secondary-slate opacity-55 cursor-not-allowed'
            }"
            ${flow.allWatered && !keyCollected ? '' : 'disabled'}>
            ${keyCollected ? '✓ کلید طلایی برداشته شد!' : '🗝️ برداشتن کلید طلایی مغناطیسی'}
          </button>
        </div>
      </div>
    `;

    shell.playArea.querySelectorAll('[data-r][data-c]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (keyCollected) return;
        const r = Number(btn.dataset.r);
        const c = Number(btn.dataset.c);
        const cell = grid[r][c];
        if (cell.type === 'valve') {
          cell.open = !cell.open;
        } else {
          cell.rotation = (cell.rotation + 1) % 4;
        }
        audio.playMechanism();
        render();
      });
    });

    shell.playArea.querySelector('#ld2-collect-key')?.addEventListener('click', () => {
      if (!flow.allWatered || keyCollected) return;
      keyCollected = true;
      audio.playKeyPickup();
      shell.refreshToolkitKey('magnetic');
      render();
      setTimeout(() => shell.complete({ grantedKey: 'magnetic' }), 420);
    });
  }

  render();
  return shell;
}
