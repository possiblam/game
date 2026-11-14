import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';
import { routeMineOre } from '../lanterns-logic.js';

export function mountLanternsDayStage4(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const TARGET_COUNT = 9;
  const ORE_TYPES = [
    { color: 'blue', shape: 'circle', label: 'دایره آبی', fill: '#38bdf8', stroke: '#bae6fd' },
    { color: 'red', shape: 'triangle', label: 'مثلث قرمز', fill: '#f43f5e', stroke: '#ffe4e6' },
    { color: 'gold', shape: 'hex', label: 'شش‌ضلعی طلایی', fill: '#fbbf24', stroke: '#fef08a' },
  ];

  // State
  let div1 = 'blue'; // 'blue' -> top chute (Bin Blue) | 'pass' -> continues toward div2
  let div2 = 'red';  // 'red' -> mid chute (Bin Red) | 'gold' -> bottom chute (Bin Gold)
  let sortedCount = 0;
  let mistakes = 0;
  let completed = false;
  let ores = [];
  let spawnTimer = 0.6;
  let beltOffset = 0;
  let feedbackText = 'انحراف‌دهنده‌ها را تنظیم کنید تا سنگ‌ها وارد مخزن هم‌شکل شوند';
  let feedbackKind = 'info';
  let rafId = null;
  let lastTs = performance.now();
  let oreSeq = 0;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm px-1">
      <span id="ld4-feedback" class="font-bold text-amber-200">${feedbackText}</span>
      <span id="ld4-score" class="px-3 py-1 rounded-full bg-slate-800 border border-amber-400/50 text-amber-300 font-extrabold tabular-nums">
        دسته‌بندی‌شده: ${toPersianDigits(0)} از ${toPersianDigits(TARGET_COUNT)}
      </span>
    </div>

    <div class="game-canvas-frame">
      <canvas id="ld4-canvas" width="800" height="400" data-testid="lanterns-day-4-canvas"></canvas>
    </div>

    <div class="w-full max-w-[900px] grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button type="button" id="ld4-div1" data-testid="ld4-div1"
        class="p-3.5 rounded-2xl border-2 bg-slate-900 hover:bg-slate-800 border-cyan-400/70 text-right flex items-center justify-between gap-2 transition-all min-h-[58px]">
        <div>
          <div class="text-xs text-slate-400 font-bold">انحراف‌دهنده ۱ (کلید ۱)</div>
          <div id="ld4-div1-label" class="text-sm sm:text-base font-extrabold text-cyan-300">مسیر دایره آبی باز است</div>
        </div>
        <span class="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 text-xs font-extrabold">تغییر مسیر ⇅</span>
      </button>

      <button type="button" id="ld4-div2" data-testid="ld4-div2"
        class="p-3.5 rounded-2xl border-2 bg-slate-900 hover:bg-slate-800 border-amber-400/70 text-right flex items-center justify-between gap-2 transition-all min-h-[58px]">
        <div>
          <div class="text-xs text-slate-400 font-bold">انحراف‌دهنده ۲ (کلید ۲)</div>
          <div id="ld4-div2-label" class="text-sm sm:text-base font-extrabold text-rose-300">مسیر مثلث قرمز باز است</div>
        </div>
        <span class="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-200 text-xs font-extrabold">تغییر مسیر ⇅</span>
      </button>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#ld4-canvas');
  const ctx2d = canvas.getContext('2d');
  const feedbackEl = shell.playArea.querySelector('#ld4-feedback');
  const scoreEl = shell.playArea.querySelector('#ld4-score');
  const div1LabelEl = shell.playArea.querySelector('#ld4-div1-label');
  const div2LabelEl = shell.playArea.querySelector('#ld4-div2-label');

  function updateDiverterLabels() {
    div1LabelEl.textContent = div1 === 'blue' ? 'مسیر دایره آبی (مخزن بالایی)' : 'عبور مستقیم به انحراف‌دهنده ۲';
    div1LabelEl.className = `text-sm sm:text-base font-extrabold ${div1 === 'blue' ? 'text-cyan-300' : 'text-slate-200'}`;

    div2LabelEl.textContent = div2 === 'red' ? 'مسیر مثلث قرمز (مخزن میانی)' : 'مسیر شش‌ضلعی طلایی (مخزن پایینی)';
    div2LabelEl.className = `text-sm sm:text-base font-extrabold ${div2 === 'red' ? 'text-rose-300' : 'text-amber-300'}`;
  }

  function toggleDiv1() {
    if (completed) return;
    div1 = div1 === 'blue' ? 'pass' : 'blue';
    audio.playMechanism();
    updateDiverterLabels();
  }

  function toggleDiv2() {
    if (completed) return;
    div2 = div2 === 'red' ? 'gold' : 'red';
    audio.playMechanism();
    updateDiverterLabels();
  }

  shell.playArea.querySelector('#ld4-div1').addEventListener('click', toggleDiv1);
  shell.playArea.querySelector('#ld4-div2').addEventListener('click', toggleDiv2);

  // Also allow clicking directly on diverters on canvas
  canvas.addEventListener('pointerdown', (e) => {
    if (completed) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    if (x < 410) toggleDiv1();
    else toggleDiv2();
  });

  const onKeyDown = (e) => {
    if (document.querySelector('[role="dialog"]')) return;
    if (e.code === 'Digit1' || e.code === 'ArrowUp') {
      e.preventDefault();
      toggleDiv1();
    } else if (e.code === 'Digit2' || e.code === 'ArrowDown') {
      e.preventDefault();
      toggleDiv2();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  function spawnOre() {
    const spec = ORE_TYPES[oreSeq % ORE_TYPES.length];
    oreSeq += 1;
    ores.push({
      ...spec,
      x: 40,
      y: 200,
      targetY: 200,
      routedBin: null,
      decided1: false,
      decided2: false,
    });
  }

  function resetStage() {
    sortedCount = 0;
    mistakes = 0;
    completed = false;
    ores = [];
    spawnTimer = 0.4;
    div1 = 'blue';
    div2 = 'red';
    feedbackText = 'انحراف‌دهنده‌ها را تنظیم کنید تا سنگ‌ها وارد مخزن هم‌شکل شوند';
    feedbackEl.textContent = feedbackText;
    feedbackEl.className = 'font-bold text-amber-200';
    scoreEl.textContent = `دسته‌بندی‌شده: ${toPersianDigits(0)} از ${toPersianDigits(TARGET_COUNT)}`;
    updateDiverterLabels();
  }

  shell.onRetry(resetStage);

  function drawShape(ctx, shape, x, y, r, fill, stroke) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else if (shape === 'triangle') {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.95, y + r * 0.8);
      ctx.lineTo(x - r * 0.95, y + r * 0.8);
      ctx.closePath();
    } else {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function step(now) {
    const dt = Math.min((now - lastTs) / 1000, 0.05);
    lastTs = now;

    // Gentle speed ramp as player sorts more ores
    const beltSpeed = 108 + sortedCount * 9;
    beltOffset = (beltOffset + beltSpeed * dt) % 28;

    if (!completed) {
      spawnTimer -= dt;
      if (spawnTimer <= 0 && ores.length < 3) {
        spawnOre();
        spawnTimer = Math.max(1.95, 2.75 - sortedCount * 0.07);
      }

      for (let i = ores.length - 1; i >= 0; i--) {
        const ore = ores[i];
        ore.x += beltSpeed * dt;

        // Diverter 1 at x = 285
        if (!ore.decided1 && ore.x >= 285) {
          ore.decided1 = true;
          if (div1 === 'blue') {
            ore.routedBin = 'blue';
            ore.targetY = 88;
          }
        }
        // Diverter 2 at x = 515 (if not already diverted at 1)
        if (!ore.routedBin && !ore.decided2 && ore.x >= 515) {
          ore.decided2 = true;
          ore.routedBin = div2 === 'red' ? 'red' : 'gold';
          ore.targetY = div2 === 'red' ? 200 : 312;
        }

        // Smoothly glide Y to target chute
        ore.y += (ore.targetY - ore.y) * Math.min(1, dt * 8);

        // Reached collection bin at x = 675
        if (ore.x >= 675) {
          const check = routeMineOre({
            shape: ore.shape,
            color: ore.color,
            div1: ore.routedBin === 'blue' ? 'blue' : 'pass',
            div2: ore.routedBin === 'red' ? 'red' : 'gold',
          });
          ores.splice(i, 1);

          if (check.isCorrect) {
            sortedCount += 1;
            audio.playClick();
            feedbackEl.textContent = `آفرین! ${ore.label} به مخزن درست رسید.`;
            feedbackEl.className = 'font-bold text-emerald-300';
            scoreEl.textContent = `دسته‌بندی‌شده: ${toPersianDigits(sortedCount)} از ${toPersianDigits(TARGET_COUNT)}`;
            if (sortedCount >= TARGET_COUNT) {
              completed = true;
              audio.playGateOpen();
              feedbackEl.textContent = 'سیستم دسته‌بندی معدن با موفقیت اصلاح شد!';
              setTimeout(() => shell.complete(), 500);
            }
          } else {
            mistakes += 1;
            audio.playError();
            if (mistakes % 2 === 0) shell.recordAttempt();
            feedbackEl.textContent = `${ore.label} به مخزن اشتباه رفت! به رنگ و شکل دقت کنید.`;
            feedbackEl.className = 'font-bold text-rose-300';
          }
        }
      }
    }

    draw();
    if (!completed) {
      rafId = requestAnimationFrame(step);
    }
  }

  function draw() {
    ctx2d.clearRect(0, 0, 800, 400);
    const bg = ctx2d.createLinearGradient(0, 0, 800, 400);
    bg.addColorStop(0, '#292524');
    bg.addColorStop(1, '#0f172a');
    ctx2d.fillStyle = bg;
    ctx2d.fillRect(0, 0, 800, 400);

    // Conveyor tracks
    const drawBelt = (x1, y1, x2, y2) => {
      ctx2d.save();
      ctx2d.strokeStyle = '#334155';
      ctx2d.lineWidth = 34;
      ctx2d.lineCap = 'round';
      ctx2d.beginPath();
      ctx2d.moveTo(x1, y1);
      ctx2d.lineTo(x2, y2);
      ctx2d.stroke();

      ctx2d.strokeStyle = '#64748b';
      ctx2d.lineWidth = 4;
      ctx2d.setLineDash([12, 16]);
      ctx2d.lineDashOffset = -beltOffset;
      ctx2d.beginPath();
      ctx2d.moveTo(x1, y1);
      ctx2d.lineTo(x2, y2);
      ctx2d.stroke();
      ctx2d.restore();
    };

    // Main belt + 3 chute belts
    drawBelt(25, 200, 520, 200);
    drawBelt(285, 200, 675, 88);
    drawBelt(515, 200, 675, 200);
    drawBelt(515, 200, 675, 312);

    // Diverter Gates
    const drawGate = (gx, gy, activeTop, label, sub) => {
      ctx2d.save();
      ctx2d.fillStyle = '#0f172a';
      ctx2d.strokeStyle = '#fbbf24';
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.arc(gx, gy, 24, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.stroke();

      // Switch arrow
      ctx2d.strokeStyle = activeTop ? '#38bdf8' : '#fb923c';
      ctx2d.lineWidth = 5;
      ctx2d.beginPath();
      ctx2d.moveTo(gx - 8, gy);
      ctx2d.lineTo(gx + 10, activeTop ? gy - 11 : gy + 10);
      ctx2d.stroke();

      ctx2d.fillStyle = '#fef3c7';
      ctx2d.font = 'bold 12px Vazirmatn, sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.fillText(label, gx, gy + 42);
      ctx2d.fillStyle = '#94a3b8';
      ctx2d.font = 'bold 11px Vazirmatn, sans-serif';
      ctx2d.fillText(sub, gx, gy + 57);
      ctx2d.restore();
    };

    drawGate(285, 200, div1 === 'blue', 'انحراف‌دهنده ۱', div1 === 'blue' ? 'به آبی ↗' : 'ادامه مسیر ➡');
    drawGate(515, 200, div2 === 'red', 'انحراف‌دهنده ۲', div2 === 'red' ? 'به قرمز ➡' : 'به طلایی ↘');

    // Collection Bins on Right
    const bins = [
      { y: 88, label: 'دایره آبی', shape: 'circle', fill: '#0c4a6e', stroke: '#38bdf8' },
      { y: 200, label: 'مثلث قرمز', shape: 'triangle', fill: '#4c0519', stroke: '#fb7185' },
      { y: 312, label: 'شش‌ضلعی طلایی', shape: 'hex', fill: '#451a03', stroke: '#fbbf24' },
    ];
    bins.forEach((b) => {
      ctx2d.fillStyle = b.fill;
      ctx2d.strokeStyle = b.stroke;
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.roundRect(670, b.y - 36, 118, 72, 12);
      ctx2d.fill();
      ctx2d.stroke();
      drawShape(ctx2d, b.shape, 700, b.y, 13, b.stroke, '#ffffff');
      ctx2d.fillStyle = '#f8fafc';
      ctx2d.font = 'bold 12px Vazirmatn, sans-serif';
      ctx2d.textAlign = 'right';
      ctx2d.fillText(b.label, 778, b.y + 4);
    });

    // Moving Ores
    ores.forEach((ore) => {
      drawShape(ctx2d, ore.shape, ore.x, ore.y, 17, ore.fill, ore.stroke);
      if (shell.getHintLevel() >= 3) {
        const targetText = ore.color === 'blue' ? '۱:آبی' : ore.color === 'red' ? '۱:ادامه / ۲:قرمز' : '۱:ادامه / ۲:طلایی';
        ctx2d.fillStyle = '#fde047';
        ctx2d.font = 'bold 11px Vazirmatn, sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.fillText(targetText, ore.x, ore.y - 24);
      }
    });
  }

  updateDiverterLabels();
  rafId = requestAnimationFrame(step);

  shell.registerCleanup(() => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
  });

  return shell;
}
