import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';
import { traceGridOpticalMaze } from '../lanterns-logic.js';

export function mountLanternsNightStage4(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const ROWS = 5;
  const COLS = 6;

  // Rail-mounted movable mirrors + fixed rotatable mirror
  let m1 = { id: 'm1', label: 'آینه ریلی ۱ (ردیف بالا)', r: 1, c: 3, minC: 3, maxC: 5, mirrorType: 'slash', targetR: 1, targetC: 4, targetType: 'backslash' };
  let m2 = { id: 'm2', label: 'آینه ریلی ۲ (ستون وسط)', r: 2, c: 2, minR: 2, maxR: 4, mirrorType: 'backslash', targetR: 3, targetC: 2, targetType: 'slash' };
  let m3 = { id: 'm3', label: 'آینه چرخان ۳', r: 3, c: 1, mirrorType: 'backslash', targetType: 'slash' };
  let selectedId = 'm1';
  let solved = false;

  const emitters = [{ r: 1, c: 0, dir: 1, color: 'white' }];

  function buildGrid() {
    const cells = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ kind: 'empty' }))
    );

    // Maze crystal walls
    cells[0][3] = { kind: 'wall' };
    cells[0][4] = { kind: 'wall' };
    cells[2][0] = { kind: 'wall' };
    cells[2][4] = { kind: 'empty' };
    cells[4][3] = { kind: 'wall' };
    cells[4][5] = { kind: 'wall' };

    // Emitter marker, central prism, receivers
    cells[1][0] = { kind: 'emitter', color: 'white' };
    cells[1][2] = { kind: 'prism' };
    cells[4][4] = { kind: 'receiver', id: 'rx-cyan', color: 'cyan', label: 'فیروزه‌ای' };
    cells[4][1] = { kind: 'receiver', id: 'rx-magenta', color: 'magenta', label: 'بنفش' };

    // Place mirrors
    cells[m1.r][m1.c] = { kind: 'mirror', mirrorType: m1.mirrorType, id: 'm1' };
    cells[m2.r][m2.c] = { kind: 'mirror', mirrorType: m2.mirrorType, id: 'm2' };
    cells[m3.r][m3.c] = { kind: 'mirror', mirrorType: m3.mirrorType, id: 'm3' };

    return cells;
  }

  shell.onRetry(() => {
    m1.c = 3;
    m1.mirrorType = 'slash';
    m2.r = 2;
    m2.mirrorType = 'backslash';
    m3.mirrorType = 'backslash';
    selectedId = 'm1';
    solved = false;
    render();
  });

  shell.onHint(() => render());

  function flipMirror(id) {
    if (solved) return;
    const m = id === 'm1' ? m1 : id === 'm2' ? m2 : m3;
    m.mirrorType = m.mirrorType === 'slash' ? 'backslash' : 'slash';
    audio.playMechanism();
    render();
  }

  function slideMirror(id, delta) {
    if (solved) return;
    if (id === 'm1') {
      m1.c = Math.max(m1.minC, Math.min(m1.maxC, m1.c + delta));
      audio.playClick();
    } else if (id === 'm2') {
      m2.r = Math.max(m2.minR, Math.min(m2.maxR, m2.r + delta));
      audio.playClick();
    }
    render();
  }

  function render() {
    const cells = buildGrid();
    const trace = traceGridOpticalMaze({ cols: COLS, rows: ROWS, emitters, cells });
    const cyanLit = trace.activeReceivers.includes('rx-cyan');
    const magentaLit = trace.activeReceivers.includes('rx-magenta');
    const allLit = cyanLit && magentaLit;
    const showHint = shell.getHintLevel() >= 3 && !allLit;

    if (allLit && !solved) {
      solved = true;
      audio.playGateOpen();
      setTimeout(() => shell.complete(), 550);
    }

    // Build SVG beams overlay (cell centers in 600 x 500 coordinate space, each cell = 100x100)
    const beamLinesSvg = trace.beams
      .map((ray) => {
        if (ray.path.length < 2) return '';
        const pts = ray.path.map((p) => `${p.c * 100 + 50},${p.r * 100 + 50}`).join(' ');
        const stroke =
          ray.color === 'cyan' ? '#22d3ee' : ray.color === 'magenta' ? '#e879f9' : '#f8fafc';
        return `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.88"/>`;
      })
      .join('');

    const activeMirror = selectedId === 'm1' ? m1 : selectedId === 'm2' ? m2 : m3;

    shell.playArea.innerHTML = `
      <div class="w-full max-w-[840px] rounded-2xl p-4 sm:p-6 bg-slate-950/95 border-2 ${
        allLit ? 'border-emerald-400' : 'border-fuchsia-500/45'
      } shadow-2xl space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-bold text-cyan-200">
            ${
              allLit
                ? 'هر دو گیرنده رنگی فعال شدند و دروازه آزمایشگاه باز شد!'
                : 'آینه‌های ریلی را جابه‌جا کنید و زاویه آن‌ها را بچرخانید تا هر دو پرتو به گیرنده هم‌رنگ برسند'
            }
          </span>
          <div class="flex items-center gap-2 text-xs font-extrabold">
            <span class="px-2.5 py-1 rounded-full border ${cyanLit ? 'bg-cyan-500/25 border-cyan-300 text-cyan-200' : 'bg-slate-900 border-slate-700 text-slate-400'}">
              فیروزه‌ای ${cyanLit ? '✓' : '○'}
            </span>
            <span class="px-2.5 py-1 rounded-full border ${magentaLit ? 'bg-fuchsia-500/25 border-fuchsia-300 text-fuchsia-200' : 'bg-slate-900 border-slate-700 text-slate-400'}">
              بنفش ${magentaLit ? '✓' : '○'}
            </span>
          </div>
        </div>

        <!-- 6x5 Optical Maze Grid + SVG Light Overlay -->
        <div class="relative mx-auto w-full max-w-[440px] aspect-[6/5] rounded-2xl bg-slate-900 border-2 border-cyan-400/35 overflow-hidden" dir="ltr">
          <svg viewBox="0 0 600 500" class="absolute inset-0 w-full h-full pointer-events-none z-10" aria-hidden="true">
            ${beamLinesSvg}
          </svg>

          <div class="relative z-20 grid grid-cols-6 grid-rows-5 w-full h-full">
            ${cells
              .map((row, r) =>
                row
                  .map((cell, c) => {
                    const isM1Rail = r === 1 && c >= m1.minC && c <= m1.maxC;
                    const isM2Rail = c === 2 && r >= m2.minR && r <= m2.maxR;
                    const isHintTarget =
                      showHint && ((r === m1.targetR && c === m1.targetC) || (r === m2.targetR && c === m2.targetC));

                    let content = '';
                    if (cell.kind === 'wall') {
                      content = `<div class="w-4/5 h-4/5 rounded-lg bg-slate-700 border border-slate-500"></div>`;
                    } else if (cell.kind === 'emitter') {
                      content = `<div class="w-9 h-9 rounded-full bg-white text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-[0_0_16px_#ffffff]">نور</div>`;
                    } else if (cell.kind === 'prism') {
                      content = `<div class="w-10 h-10 flex items-center justify-center" title="منشور تقسیم‌کننده نور">
                        <svg viewBox="0 0 40 40" class="w-9 h-9"><polygon points="20,4 36,34 4,34" fill="#38bdf8" fill-opacity="0.45" stroke="#e0f2fe" stroke-width="2.5"/></svg>
                      </div>`;
                    } else if (cell.kind === 'receiver') {
                      const lit = trace.activeReceivers.includes(cell.id);
                      const isCyan = cell.color === 'cyan';
                      content = `<div class="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center text-[10px] font-extrabold ${
                        lit
                          ? isCyan
                            ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_18px_#22d3ee]'
                            : 'bg-fuchsia-400 text-slate-950 border-white shadow-[0_0_18px_#e879f9]'
                          : isCyan
                          ? 'bg-cyan-950/70 text-cyan-200 border-cyan-400'
                          : 'bg-fuchsia-950/70 text-fuchsia-200 border-fuchsia-400'
                      }">${cell.label}</div>`;
                    } else if (cell.kind === 'mirror') {
                      const isSel = selectedId === cell.id;
                      const slashLine =
                        cell.mirrorType === 'slash'
                          ? '<line x1="10" y1="38" x2="38" y2="10" stroke="#fde047" stroke-width="5" stroke-linecap="round"/>'
                          : '<line x1="10" y1="10" x2="38" y2="38" stroke="#fde047" stroke-width="5" stroke-linecap="round"/>';
                      content = `
                        <button type="button" data-pick-mirror="${cell.id}" data-testid="ln4-pick-${cell.id}"
                          aria-label="انتخاب آینه"
                          class="w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all ${
                            isSel ? 'bg-amber-400/25 border-amber-300 ring-2 ring-amber-300' : 'bg-slate-800/85 border-slate-500 hover:border-amber-300'
                          }">
                          <svg viewBox="0 0 48 48" class="w-9 h-9">${slashLine}</svg>
                        </button>
                      `;
                    }

                    return `
                      <div class="border border-slate-800/70 flex items-center justify-center relative ${
                        isHintTarget ? 'ring-2 ring-inset ring-emerald-400 bg-emerald-500/15' : ''
                      } ${isM1Rail ? 'bg-cyan-950/20' : isM2Rail ? 'bg-fuchsia-950/20' : ''}">
                        ${content}
                      </div>
                    `;
                  })
                  .join('')
              )
              .join('')}
          </div>
        </div>

        <!-- Mirror Controls Console -->
        <div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-center gap-2">
            ${[m1, m2, m3]
              .map(
                (m) => `
                <button type="button" data-select-m="${m.id}" data-testid="ln4-tab-${m.id}"
                  class="px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                    selectedId === m.id
                      ? 'bg-amber-400 text-slate-950 border-amber-200'
                      : 'bg-slate-800 text-slate-200 border-slate-600'
                  }">
                  ${m.label}
                </button>
              `
              )
              .join('')}
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2">
            ${
              activeMirror.id === 'm1'
                ? `
                <button type="button" id="ln4-slide-prev" data-testid="ln4-slide-prev" class="touch-btn px-4 py-2 text-xs sm:text-sm">◀ حرکت روی ریل به چپ</button>
                <button type="button" id="ln4-slide-next" data-testid="ln4-slide-next" class="touch-btn px-4 py-2 text-xs sm:text-sm">▶ حرکت روی ریل به راست</button>
              `
                : activeMirror.id === 'm2'
                ? `
                <button type="button" id="ln4-slide-prev" data-testid="ln4-slide-prev" class="touch-btn px-4 py-2 text-xs sm:text-sm">▲ حرکت روی ریل به بالا</button>
                <button type="button" id="ln4-slide-next" data-testid="ln4-slide-next" class="touch-btn px-4 py-2 text-xs sm:text-sm">▼ حرکت روی ریل به پایین</button>
              `
                : ''
            }
            <button type="button" id="ln4-flip" data-testid="ln4-flip" class="px-5 py-2.5 rounded-xl btn-primary-gold text-xs sm:text-sm">
              ↻ چرخش زاویه آینه (${activeMirror.mirrorType === 'slash' ? '╱' : '╲'})
            </button>
          </div>
          ${
            showHint
              ? `<div class="text-xs text-emerald-300 text-center font-bold">
                  راهنمای پیکو: آینه ۱ در خانه (ردیف ۲، ستون ۵) با ╲ | آینه ۲ در خانه (ردیف ۴، ستون ۳) با ╱ | آینه ۳ با ╱
                </div>`
              : ''
          }
        </div>
      </div>
    `;

    shell.playArea.querySelectorAll('[data-pick-mirror], [data-select-m]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.playClick();
        selectedId = btn.dataset.pickMirror || btn.dataset.selectM;
        render();
      });
    });

    shell.playArea.querySelector('#ln4-slide-prev')?.addEventListener('click', () => slideMirror(selectedId, -1));
    shell.playArea.querySelector('#ln4-slide-next')?.addEventListener('click', () => slideMirror(selectedId, 1));
    shell.playArea.querySelector('#ln4-flip')?.addEventListener('click', () => flipMirror(selectedId));
  }

  render();
  return shell;
}
