import { createStageShell } from '../../stage-shell.js';
import { evaluateWaterScale } from '../chronos-logic.js';
import { toPersianDigits } from '../../../data/translations.js';

export function mountChronosDayStage6(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const MAX_WATER = 10;
  const TARGET_MIN = 10;
  const INITIAL_WEIGHTS = [
    { id: 'w1', kg: 2, side: 'left' },
    { id: 'w2', kg: 5, side: 'left' },
    { id: 'w3', kg: 3, side: 'rack' },
    { id: 'w4', kg: 4, side: 'rack' },
    { id: 'w5', kg: 2, side: 'rack' },
  ];

  let leftWater = 3; // Starts at 3 + (2+5) = 10
  let rightWater = 2; // Starts at 2 + 0 = 2
  let leftValveOpen = false;
  let rightValveOpen = false;
  let weights = INITIAL_WEIGHTS.map((w) => ({ ...w }));
  let selectedWeightId = null;
  let balancedHoldMs = 0;
  let hintLevel = 0;
  let done = false;
  let statusMsg = 'دو کفه ترازوی آبی را روی ۱۰ واحد یا بیشتر برابر کن (بدون سرریز شدن از ۱۰ واحد آب)!';

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3">
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-amber-400/35 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold">
        <span id="d6-status" class="text-amber-200">${statusMsg}</span>
        <span id="d6-hold" class="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs tabular-nums">
          تعادل: ۰٪
        </span>
      </div>

      <!-- Visual Scale Arena (dir="ltr" keeps physical left/right matching tilt rotation) -->
      <div dir="ltr" class="rounded-2xl bg-gradient-to-b from-sky-950/80 via-slate-900 to-slate-950 border-2 border-amber-400/40 p-4 sm:p-5">
        <div class="grid grid-cols-2 gap-4 items-end mb-10">
          <!-- Left Waterfall Valve -->
          <div dir="rtl" class="flex flex-col items-center gap-1.5">
            <button type="button" id="d6-valve-left" data-testid="chronos-d6-valve-left"
              class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all">
              💧 شیر آب چپ
            </button>
            <div class="text-[11px] text-cyan-200 tabular-nums" id="d6-water-left-lbl">آب: ۳ از ۱۰</div>
          </div>

          <!-- Right Waterfall Valve -->
          <div dir="rtl" class="flex flex-col items-center gap-1.5">
            <button type="button" id="d6-valve-right" data-testid="chronos-d6-valve-right"
              class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all">
              💧 شیر آب راست
            </button>
            <div class="text-[11px] text-cyan-200 tabular-nums" id="d6-water-right-lbl">آب: ۲ از ۱۰</div>
          </div>
        </div>

        <!-- Tilting Balance Beam & Dual Basins -->
        <div class="relative pt-8 pb-8 flex flex-col items-center">
          <div id="d6-beam" class="w-full max-w-xl transition-transform duration-300 origin-top">
            <div class="h-3 rounded-full bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600 border border-amber-100 shadow-lg"></div>
            <div class="grid grid-cols-2 gap-5 sm:gap-10 mt-3">
              <!-- Left Basin -->
              <div dir="rtl" id="d6-basin-left" data-testid="chronos-d6-basin-left"
                class="cursor-pointer rounded-b-3xl rounded-t-lg border-2 border-cyan-300/60 bg-slate-900/90 p-3 min-h-[120px] flex flex-col justify-between relative overflow-hidden">
                <div id="d6-fill-left" class="absolute inset-x-0 bottom-0 bg-cyan-500/35 transition-all duration-150 pointer-events-none" style="height:30%"></div>
                <div class="relative z-10 flex items-center justify-between text-xs font-extrabold">
                  <span class="text-amber-200">کفه چپ</span>
                  <span id="d6-total-left" class="text-white tabular-nums">۱۰ کیلو</span>
                </div>
                <div id="d6-weights-left" class="relative z-10 flex flex-wrap gap-1.5 my-2"></div>
                <div class="relative z-10 text-[10px] text-cyan-200/80 text-center">کلیک برای گذاشتن وزنه</div>
              </div>

              <!-- Right Basin -->
              <div dir="rtl" id="d6-basin-right" data-testid="chronos-d6-basin-right"
                class="cursor-pointer rounded-b-3xl rounded-t-lg border-2 border-cyan-300/60 bg-slate-900/90 p-3 min-h-[120px] flex flex-col justify-between relative overflow-hidden">
                <div id="d6-fill-right" class="absolute inset-x-0 bottom-0 bg-cyan-500/35 transition-all duration-150 pointer-events-none" style="height:20%"></div>
                <div class="relative z-10 flex items-center justify-between text-xs font-extrabold">
                  <span class="text-amber-200">کفه راست</span>
                  <span id="d6-total-right" class="text-white tabular-nums">۲ کیلو</span>
                </div>
                <div id="d6-weights-right" class="relative z-10 flex flex-wrap gap-1.5 my-2"></div>
                <div class="relative z-10 text-[10px] text-cyan-200/80 text-center">کلیک برای گذاشتن وزنه</div>
              </div>
            </div>
          </div>
          <!-- Center Fulcrum Pillar -->
          <div class="w-8 h-8 mt-1 rotate-45 bg-amber-500 border-2 border-amber-100 rounded-sm shadow-md"></div>
        </div>
      </div>

      <!-- Weight Rack -->
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-700 flex flex-col gap-2">
        <div class="flex items-center justify-between text-xs font-bold text-slate-300">
          <span>سنگ‌های وزنه (ابتدا سنگ را انتخاب کن، بعد روی حوضچه چپ یا راست بزن):</span>
          <span id="d6-hint-box" class="hidden text-emerald-300">پیشنهاد: ۳ + ۴ کیلو را در راست بگذار + ۳ واحد آب!</span>
        </div>
        <div id="d6-rack" class="flex flex-wrap gap-2"></div>
      </div>
    </div>
  `;

  const statusEl = shell.playArea.querySelector('#d6-status');
  const holdEl = shell.playArea.querySelector('#d6-hold');
  const beamEl = shell.playArea.querySelector('#d6-beam');
  const valveLeftBtn = shell.playArea.querySelector('#d6-valve-left');
  const valveRightBtn = shell.playArea.querySelector('#d6-valve-right');
  const waterLeftLbl = shell.playArea.querySelector('#d6-water-left-lbl');
  const waterRightLbl = shell.playArea.querySelector('#d6-water-right-lbl');
  const fillLeft = shell.playArea.querySelector('#d6-fill-left');
  const fillRight = shell.playArea.querySelector('#d6-fill-right');
  const totalLeftEl = shell.playArea.querySelector('#d6-total-left');
  const totalRightEl = shell.playArea.querySelector('#d6-total-right');
  const weightsLeftEl = shell.playArea.querySelector('#d6-weights-left');
  const weightsRightEl = shell.playArea.querySelector('#d6-weights-right');
  const basinLeft = shell.playArea.querySelector('#d6-basin-left');
  const basinRight = shell.playArea.querySelector('#d6-basin-right');
  const rackEl = shell.playArea.querySelector('#d6-rack');
  const hintBox = shell.playArea.querySelector('#d6-hint-box');

  function getScaleResult() {
    return evaluateWaterScale({
      leftWater,
      rightWater,
      leftWeights: weights.filter((w) => w.side === 'left').map((w) => w.kg),
      rightWeights: weights.filter((w) => w.side === 'right').map((w) => w.kg),
      maxWater: MAX_WATER,
      minBalancedTotal: TARGET_MIN,
    });
  }

  function renderWeightChip(w) {
    const selected = selectedWeightId === w.id;
    return `
      <button type="button" data-weight-id="${w.id}"
        class="px-2.5 py-1.5 rounded-xl border text-xs font-extrabold tabular-nums transition-all ${
          selected
            ? 'bg-amber-400 text-slate-950 border-white ring-2 ring-amber-200 scale-105'
            : 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-amber-400/50'
        }">
        🪨 ${toPersianDigits(w.kg)} کیلو
      </button>
    `;
  }

  function render() {
    const res = getScaleResult();
    statusEl.textContent = statusMsg;
    const visualTilt = Math.max(-9, Math.min(9, res.tiltDeg * 0.5));
    beamEl.style.transform = `rotate(${visualTilt.toFixed(1)}deg)`;

    waterLeftLbl.textContent = `آب: ${toPersianDigits(leftWater.toFixed(1).replace(/\.0$/, ''))} از ${toPersianDigits(MAX_WATER)}`;
    waterRightLbl.textContent = `آب: ${toPersianDigits(rightWater.toFixed(1).replace(/\.0$/, ''))} از ${toPersianDigits(MAX_WATER)}`;
    fillLeft.style.height = `${Math.min(100, (leftWater / MAX_WATER) * 100)}%`;
    fillRight.style.height = `${Math.min(100, (rightWater / MAX_WATER) * 100)}%`;

    totalLeftEl.textContent = `${toPersianDigits(res.leftTotal)} کیلو`;
    totalRightEl.textContent = `${toPersianDigits(res.rightTotal)} کیلو`;

    valveLeftBtn.className = leftValveOpen
      ? 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold border bg-cyan-500 text-slate-950 border-white animate-pulse'
      : 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold border btn-secondary-slate';
    valveLeftBtn.textContent = leftValveOpen ? '🌊 شیر چپ باز است (ببند)' : '💧 شیر آب چپ (بسته)';

    valveRightBtn.className = rightValveOpen
      ? 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold border bg-cyan-500 text-slate-950 border-white animate-pulse'
      : 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold border btn-secondary-slate';
    valveRightBtn.textContent = rightValveOpen ? '🌊 شیر راست باز است (ببند)' : '💧 شیر آب راست (بسته)';

    weightsLeftEl.innerHTML = weights.filter((w) => w.side === 'left').map(renderWeightChip).join('');
    weightsRightEl.innerHTML = weights.filter((w) => w.side === 'right').map(renderWeightChip).join('');
    rackEl.innerHTML = weights.filter((w) => w.side === 'rack').map(renderWeightChip).join('') || '<span class="text-xs text-slate-400">همه وزنه‌ها روی ترازو هستند! روی هر وزنه بزن تا برداشته شود.</span>';

    shell.playArea.querySelectorAll('[data-weight-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wid = btn.dataset.weightId;
        const w = weights.find((x) => x.id === wid);
        if (!w || done) return;
        audio.playClick();
        if (selectedWeightId === wid) {
          w.side = 'rack';
          selectedWeightId = null;
        } else {
          selectedWeightId = wid;
        }
        render();
      });
    });

    const holdPct = Math.min(100, Math.round((balancedHoldMs / 1000) * 100));
    holdEl.textContent = res.balanced ? `تعادل برقرار! ${toPersianDigits(holdPct)}٪` : 'تعادل: نامتوازن';
    holdEl.className = res.balanced
      ? 'px-2.5 py-0.5 rounded-full bg-emerald-900/75 border border-emerald-400 text-emerald-200 text-xs font-extrabold tabular-nums'
      : 'px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs tabular-nums';

    hintBox.classList.toggle('hidden', hintLevel < 3);
  }

  function moveSelectedTo(side) {
    if (!selectedWeightId || done) return;
    const w = weights.find((x) => x.id === selectedWeightId);
    if (!w) return;
    w.side = side;
    selectedWeightId = null;
    audio.playMechanism();
    render();
  }

  basinLeft.addEventListener('click', () => moveSelectedTo('left'));
  basinRight.addEventListener('click', () => moveSelectedTo('right'));

  valveLeftBtn.addEventListener('click', () => {
    if (done) return;
    leftValveOpen = !leftValveOpen;
    audio.playClick();
    render();
  });

  valveRightBtn.addEventListener('click', () => {
    if (done) return;
    rightValveOpen = !rightValveOpen;
    audio.playClick();
    render();
  });

  const waterTimer = setInterval(() => {
    if (done) return;
    let changed = false;
    if (leftValveOpen) {
      leftWater = Math.round((leftWater + 0.5) * 10) / 10;
      changed = true;
    }
    if (rightValveOpen) {
      rightWater = Math.round((rightWater + 0.5) * 10) / 10;
      changed = true;
    }

    const res = getScaleResult();
    if (res.overflow) {
      audio.playError();
      shell.recordAttempt();
      leftValveOpen = false;
      rightValveOpen = false;
      leftWater = 3;
      rightWater = 2;
      balancedHoldMs = 0;
      statusMsg = 'آب حوضچه سرریز شد و ترازو ریست گردید! زودتر شیر را ببند.';
      render();
      return;
    }

    if (res.balanced) {
      balancedHoldMs += 250;
      if (balancedHoldMs >= 1000) {
        done = true;
        leftValveOpen = false;
        rightValveOpen = false;
        audio.playGateOpen();
        statusMsg = 'ترازوی آبی کاملاً متعادل شد! دروازه قله باز گردید!';
        render();
        setTimeout(() => shell.complete(), 450);
        return;
      }
      changed = true;
    } else if (balancedHoldMs > 0) {
      balancedHoldMs = 0;
      changed = true;
    }

    if (changed) render();
  }, 250);

  shell.onHint((lvl) => {
    hintLevel = lvl;
    render();
  });

  shell.onRetry(() => {
    done = false;
    leftValveOpen = false;
    rightValveOpen = false;
    leftWater = 3;
    rightWater = 2;
    balancedHoldMs = 0;
    selectedWeightId = null;
    weights = INITIAL_WEIGHTS.map((w) => ({ ...w }));
    statusMsg = 'دو کفه ترازوی آبی را روی ۱۰ واحد یا بیشتر برابر کن!';
    render();
  });

  shell.registerCleanup(() => clearInterval(waterTimer));

  render();
  return shell;
}
