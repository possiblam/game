import { createStageShell } from '../../stage-shell.js';
import { isChronosConstellationSolved, normalizeDeg } from '../chronos-logic.js';
import { toPersianDigits } from '../../../data/translations.js';

const TARGET_RINGS = [90, 225, 315]; // Outer, Middle, Inner
const TARGET_STAR_SLOT = 5; // 0..7 outer star positions

export function mountChronosNightStage6(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  let rings = [0, 90, 180];
  let starSlot = 1;
  let hintLevel = 0;
  let solved = false;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-4xl flex flex-col gap-3">
      <div class="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-cyan-400/35 flex flex-wrap items-center justify-between gap-2">
        <div class="text-xs sm:text-sm font-bold text-cyan-200" id="n6-status">
          ✨ حلقه‌های سنگی دروازه و ستاره راهنما را دقیقاً مطابق صورت فلکی آسمان شب بچرخان!
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <!-- Night Sky Constellation Reference Dome -->
        <div class="rounded-2xl p-4 bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-900 border-2 border-cyan-400/40 flex flex-col items-center justify-between">
          <div class="text-xs sm:text-sm font-extrabold text-cyan-200 mb-2">🌌 نقشه صورت فلکی در آسمان شب</div>
          <svg id="n6-sky-svg" viewBox="0 0 240 240" class="w-52 h-52 sm:w-60 sm:h-60"></svg>
          <p class="m-0 mt-2 text-[11px] sm:text-xs text-slate-300 text-center">
            مکان سه نشانگر خطی روی حلقه‌ها و ستاره طلایی بیرونی را به خاطر بسپار.
          </p>
        </div>

        <!-- Interactive Stone Gate Rings -->
        <div class="rounded-2xl p-4 bg-slate-900/90 border-2 border-amber-400/45 flex flex-col items-center justify-between">
          <div class="text-xs sm:text-sm font-extrabold text-amber-200 mb-2">🏛️ حلقه‌های حکاکی‌شده دروازه</div>
          <svg id="n6-gate-svg" viewBox="0 0 240 240" class="w-52 h-52 sm:w-60 sm:h-60"></svg>
          <p class="m-0 mt-2 text-[11px] text-slate-300 text-center">
            روی یکی از ۸ جایگاه بیرونی ستاره درخشان کلیک کن یا از دکمه‌های چرخش زیر استفاده کن.
          </p>
        </div>
      </div>

      <!-- Ring & Star Controls -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5" id="n6-controls"></div>
    </div>
  `;

  const statusEl = shell.playArea.querySelector('#n6-status');
  const skySvg = shell.playArea.querySelector('#n6-sky-svg');
  const gateSvg = shell.playArea.querySelector('#n6-gate-svg');
  const controlsEl = shell.playArea.querySelector('#n6-controls');

  function polarPoint(cx, cy, r, deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  }

  function buildConstellationSvg(svgEl, ringAngles, activeStarSlot, isReference) {
    const radii = [86, 62, 38];
    const colors = ['#38bdf8', '#a78bfa', '#fbbf24'];

    const starPos = polarPoint(120, 120, 104, activeStarSlot * 45);
    const points = radii.map((r, i) => polarPoint(120, 120, r, ringAngles[i]));

    let slotsHtml = '';
    for (let s = 0; s < 8; s++) {
      const p = polarPoint(120, 120, 104, s * 45);
      const isStar = s === activeStarSlot;
      if (isReference && !isStar) continue;
      slotsHtml += `
        <g ${!isReference ? `data-star-slot="${s}" style="cursor:pointer"` : ''}>
          <circle cx="${p.x}" cy="${p.y}" r="${isStar ? 10 : 7}"
            fill="${isStar ? '#fde047' : 'rgba(51,65,85,0.8)'}"
            stroke="${isStar ? '#ffffff' : '#64748b'}" stroke-width="2"/>
          ${isStar ? `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-size="11" fill="#0f172a">★</text>` : ''}
        </g>
      `;
    }

    svgEl.innerHTML = `
      <circle cx="120" cy="120" r="112" fill="${isReference ? '#020617' : '#0f172a'}" stroke="rgba(148,163,184,0.3)" stroke-width="1.5"/>
      <!-- Constellation connecting lines -->
      <polyline points="${starPos.x},${starPos.y} ${points[0].x},${points[0].y} ${points[1].x},${points[1].y} ${points[2].x},${points[2].y} 120,120"
        fill="none" stroke="${solved && !isReference ? '#34d399' : '#7dd3fc'}" stroke-width="2.5" stroke-dasharray="${isReference ? '4 3' : 'none'}" opacity="0.85"/>
      ${radii
        .map((r, i) => {
          const pt = points[i];
          const aligned = !isReference && normalizeDeg(ringAngles[i]) === normalizeDeg(TARGET_RINGS[i]);
          const stroke = hintLevel >= 3 && aligned ? '#34d399' : colors[i];
          return `
            <circle cx="120" cy="120" r="${r}" fill="none" stroke="${stroke}" stroke-width="4" stroke-dasharray="10 6" opacity="0.7"/>
            <line x1="120" y1="120" x2="${pt.x}" y2="${pt.y}" stroke="${stroke}" stroke-width="1.5" opacity="0.35"/>
            <circle cx="${pt.x}" cy="${pt.y}" r="7" fill="${stroke}" stroke="#ffffff" stroke-width="2"/>
          `;
        })
        .join('')}
      <circle cx="120" cy="120" r="11" fill="${solved ? '#34d399' : '#1e293b'}" stroke="#e2e8f0" stroke-width="2"/>
      ${slotsHtml}
    `;

    if (!isReference) {
      svgEl.querySelectorAll('[data-star-slot]').forEach((el) => {
        el.addEventListener('click', () => {
          if (solved) return;
          starSlot = Number(el.dataset.starSlot);
          audio.playClick();
          checkWin();
        });
      });
    }
  }

  function render() {
    buildConstellationSvg(skySvg, TARGET_RINGS, TARGET_STAR_SLOT, true);
    buildConstellationSvg(gateSvg, rings, starSlot, false);

    const ringNames = ['حلقه بیرونی (آبی)', 'حلقه میانی (بنفش)', 'حلقه درونی (طلایی)'];
    const ringControls = [0, 1, 2]
      .map((idx) => {
        const aligned = normalizeDeg(rings[idx]) === normalizeDeg(TARGET_RINGS[idx]);
        const hintTarget =
          hintLevel >= 3
            ? `<span class="text-[11px] font-bold ${aligned ? 'text-emerald-300' : 'text-amber-300'}">${
                aligned ? '✓ هم‌تراز' : `هدف: ${toPersianDigits(TARGET_RINGS[idx])}°`
              }</span>`
            : '';
        return `
          <div class="p-2.5 rounded-xl bg-slate-900/90 border ${
            hintLevel >= 3 && aligned ? 'border-emerald-400' : 'border-slate-700'
          } flex flex-col items-center gap-2">
            <div class="text-xs font-extrabold text-slate-200">${ringNames[idx]}</div>
            <div class="text-[11px] text-slate-400 tabular-nums">زاویه: ${toPersianDigits(normalizeDeg(rings[idx]))}°</div>
            ${hintTarget}
            <div class="flex gap-1.5 w-full">
              <button type="button" data-rot="${idx}" data-dir="-45" class="flex-1 py-2 rounded-lg btn-secondary-slate text-xs font-extrabold">⟲ ۴۵°</button>
              <button type="button" data-rot="${idx}" data-dir="45" class="flex-1 py-2 rounded-lg btn-secondary-slate text-xs font-extrabold">⟳ ۴۵°</button>
            </div>
          </div>
        `;
      })
      .join('');

    const starAligned = starSlot === TARGET_STAR_SLOT;
    const starControl = `
      <div class="p-2.5 rounded-xl bg-slate-900/90 border ${
        hintLevel >= 3 && starAligned ? 'border-emerald-400' : 'border-amber-400/50'
      } flex flex-col items-center justify-between gap-2">
        <div class="text-xs font-extrabold text-amber-200">★ ستاره راهنما</div>
        <div class="text-[11px] text-slate-300 tabular-nums">جایگاه: ${toPersianDigits(starSlot + 1)} از ۸</div>
        ${
          hintLevel >= 3
            ? `<span class="text-[11px] font-bold ${starAligned ? 'text-emerald-300' : 'text-amber-300'}">${
                starAligned ? '✓ درست' : `هدف: جایگاه ${toPersianDigits(TARGET_STAR_SLOT + 1)}`
              }</span>`
            : ''
        }
        <button type="button" id="n6-star-next" data-testid="chronos-n6-star-btn" class="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400 text-amber-200 text-xs font-extrabold">
          ★ جابه‌جایی ستاره
        </button>
      </div>
    `;

    controlsEl.innerHTML = ringControls + starControl;

    controlsEl.querySelectorAll('[data-rot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (solved) return;
        const idx = Number(btn.dataset.rot);
        const delta = Number(btn.dataset.dir);
        rings[idx] = normalizeDeg(rings[idx] + delta);
        audio.playMechanism();
        checkWin();
      });
    });

    controlsEl.querySelector('#n6-star-next')?.addEventListener('click', () => {
      if (solved) return;
      starSlot = (starSlot + 1) % 8;
      audio.playClick();
      checkWin();
    });
  }

  function checkWin() {
    if (isChronosConstellationSolved(rings, TARGET_RINGS, starSlot, TARGET_STAR_SLOT)) {
      solved = true;
      audio.playGateOpen();
      statusEl.textContent = '✨ صورت فلکی با دروازه باستانی هم‌تراز شد! راه قله گشوده است!';
      statusEl.className = 'text-xs sm:text-sm font-extrabold text-emerald-300';
      render();
      setTimeout(() => shell.complete(), 480);
    } else {
      render();
    }
  }

  shell.onHint((lvl) => {
    hintLevel = lvl;
    render();
  });

  shell.onRetry(() => {
    rings = [0, 90, 180];
    starSlot = 1;
    solved = false;
    statusEl.textContent = '✨ حلقه‌های سنگی دروازه و ستاره راهنما را دقیقاً مطابق صورت فلکی آسمان شب بچرخان!';
    statusEl.className = 'text-xs sm:text-sm font-bold text-cyan-200';
    render();
  });

  render();
  return shell;
}
