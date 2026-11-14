import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';
import { traceSunBeam } from '../lanterns-logic.js';

export function mountLanternsDayStage1(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  // Emitter shoots right-downward toward mirror 1
  const emitter = { x: 75, y: 115, angleDeg: 0 };
  const sensor = { x: 715, y: 92, r: 26 };
  const blockers = [
    { x: 255, y: 20, w: 32, h: 195 },
    { x: 485, y: 220, w: 32, h: 200 },
  ];

  // 4 mirrors arranged so a neat bounce path (1 -> 2 -> 3 -> 4 -> sensor) is solvable cleanly
  // Target angles (with snap 15° steps):
  // Mirror 1 at (185, 115) -> deflects beam DOWN (90°): mirror angle 45° or 135° (45° reflects 0° -> 90°)
  // Mirror 2 at (185, 345) -> deflects beam RIGHT (0°): mirror angle 45° reflects 90° -> 0°
  // Mirror 3 at (405, 345) -> deflects beam UP-RIGHT (-45° / 315°): mirror angle 67.5°? Better keep exact 15° steps!
  // Let's use clean 15° / 45° angles:
  // Emitter (75, 115) angle 0° -> Mirror 1 (175, 115): angle 45° -> reflects straight DOWN (90°)
  // -> Mirror 2 (175, 345): angle 45° -> reflects straight RIGHT (0°)
  // -> Mirror 3 (395, 345): angle 135° -> reflects straight UP (270°)
  // -> Mirror 4 (395, 92): angle 135° -> reflects straight RIGHT (0°) -> hits Sensor (715, 92)!
  // Let's verify reflection math:
  // Horizontal beam (1, 0) hitting mirror at 45°: tangent (cos45, sin45), normal (-sin45, cos45).
  // d - 2(d·n)n => (1, 0) - 2(-sin45)(-sin45, cos45) = (1 - 2*0.5, 2*0.5) = (0, 1) -> straight DOWN!
  // Vertical DOWN beam (0, 1) hitting mirror at 45°: d·n = cos45 -> (0, 1) - 2*cos45*(-sin45, cos45) = (1, 0) -> straight RIGHT!
  // Horizontal RIGHT beam (1, 0) hitting mirror at 135°: tangent (-c, c), normal (-c, -c)
  // d·n = -c -> (1, 0) - 2(-c)(-c, -c) = (0, -1) -> straight UP!
  // Vertical UP beam (0, -1) hitting mirror at 135°: d·n = c -> (0, -1) - 2(c)(-c, -c) = (1, 0) -> straight RIGHT!
  // All 4 angles are clean multiples of 15° (45° and 135°)!

  const INITIAL_MIRRORS = [
    { id: 1, name: 'آینه ۱', x: 175, y: 115, length: 72, angleDeg: 15, targetDeg: 45 },
    { id: 2, name: 'آینه ۲', x: 175, y: 345, length: 72, angleDeg: 90, targetDeg: 45 },
    { id: 3, name: 'آینه ۳', x: 395, y: 345, length: 72, angleDeg: 90, targetDeg: 135 },
    { id: 4, name: 'آینه ۴', x: 395, y: 92, length: 72, angleDeg: 165, targetDeg: 135 },
  ];

  let mirrors = INITIAL_MIRRORS.map((m) => ({ ...m }));
  let selectedId = 1;
  let solved = false;
  let pulsePhase = 0;
  let rafId = null;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-amber-200 px-1">
      <span>آینه‌ها را بچرخانید تا پرتو خورشید به حسگر بالای برج ساعت برسد</span>
      <span id="ld1-status" class="font-bold text-orange-300">حسگر ساعت خاموش است</span>
    </div>

    <div class="game-canvas-frame">
      <canvas id="ld1-canvas" width="800" height="440" data-testid="lanterns-day-1-canvas"></canvas>
    </div>

    <div class="w-full max-w-[900px] flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-amber-400/30">
      <div class="flex flex-wrap items-center justify-center gap-2" id="ld1-mirror-tabs">
        ${mirrors
          .map(
            (m) => `
          <button type="button" data-mirror-id="${m.id}" class="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all min-h-[42px]">
            ${m.name} (<span data-mirror-deg="${m.id}" class="tabular-nums">${toPersianDigits(m.angleDeg)}°</span>)
          </button>`
          )
          .join('')}
      </div>
      <div class="flex items-center gap-2">
        <button type="button" id="ld1-rot-left" data-testid="ld1-rot-left" class="touch-btn px-4 py-2 text-xs sm:text-sm">↺ چرخش ۱۵° چپ</button>
        <button type="button" id="ld1-rot-right" data-testid="ld1-rot-right" class="touch-btn px-4 py-2 text-xs sm:text-sm">↻ چرخش ۱۵° راست</button>
      </div>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#ld1-canvas');
  const ctx2d = canvas.getContext('2d');
  const statusEl = shell.playArea.querySelector('#ld1-status');

  function updateControlsUi() {
    shell.playArea.querySelectorAll('[data-mirror-id]').forEach((btn) => {
      const id = Number(btn.dataset.mirrorId);
      const m = mirrors.find((x) => x.id === id);
      const active = id === selectedId;
      btn.className = `px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all min-h-[42px] ${
        active
          ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-md shadow-amber-500/20'
          : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
      }`;
      const degSpan = btn.querySelector(`[data-mirror-deg="${id}"]`);
      if (degSpan && m) degSpan.textContent = `${toPersianDigits(m.angleDeg)}°`;
    });
  }

  function rotateSelected(deltaDeg) {
    if (solved) return;
    const m = mirrors.find((x) => x.id === selectedId);
    if (!m) return;
    m.angleDeg = ((m.angleDeg + deltaDeg) % 180 + 180) % 180;
    audio.playMechanism();
    updateControlsUi();
    evaluate();
  }

  function evaluate() {
    const trace = traceSunBeam({ emitter, mirrors, blockers, sensor });
    if (trace.hitSensor && !solved) {
      solved = true;
      statusEl.textContent = 'برج ساعت سایه‌ها روشن شد و دروازه جنگل باز شد!';
      statusEl.className = 'font-extrabold text-emerald-300';
      audio.playGateOpen();
      setTimeout(() => shell.complete(), 650);
    } else if (!solved) {
      statusEl.textContent = `برخورد با ${toPersianDigits(trace.hitMirrorIds.length)} از ${toPersianDigits(4)} آینه`;
    }
    return trace;
  }

  shell.onRetry(() => {
    mirrors = INITIAL_MIRRORS.map((m) => ({ ...m }));
    selectedId = 1;
    solved = false;
    statusEl.textContent = 'حسگر ساعت خاموش است';
    statusEl.className = 'font-bold text-orange-300';
    updateControlsUi();
  });

  shell.onHint(() => updateControlsUi());

  shell.playArea.querySelectorAll('[data-mirror-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.playClick();
      selectedId = Number(btn.dataset.mirrorId);
      updateControlsUi();
    });
  });

  shell.playArea.querySelector('#ld1-rot-left').addEventListener('click', () => rotateSelected(-15));
  shell.playArea.querySelector('#ld1-rot-right').addEventListener('click', () => rotateSelected(15));

  // Allow clicking mirrors directly on canvas
  canvas.addEventListener('pointerdown', (e) => {
    if (solved) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 440;
    let best = null;
    let bestDist = 48;
    for (const m of mirrors) {
      const d = Math.hypot(x - m.x, y - m.y);
      if (d < bestDist) {
        bestDist = d;
        best = m;
      }
    }
    if (best) {
      selectedId = best.id;
      rotateSelected(15);
    }
  });

  const onKeyDown = (e) => {
    if (document.querySelector('[role="dialog"]')) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      rotateSelected(-15);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      rotateSelected(15);
    } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
      selectedId = Number(e.code.replace('Digit', ''));
      updateControlsUi();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  function draw() {
    pulsePhase += 0.04;
    const trace = traceSunBeam({ emitter, mirrors, blockers, sensor });

    ctx2d.clearRect(0, 0, 800, 440);
    const bg = ctx2d.createLinearGradient(0, 0, 800, 440);
    bg.addColorStop(0, '#451a03');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#0f172a');
    ctx2d.fillStyle = bg;
    ctx2d.fillRect(0, 0, 800, 440);

    // Subtle sundial arcs in background
    ctx2d.strokeStyle = 'rgba(251, 191, 36, 0.1)';
    ctx2d.lineWidth = 2;
    for (let r = 90; r <= 270; r += 60) {
      ctx2d.beginPath();
      ctx2d.arc(715, 92, r, 0, Math.PI * 2);
      ctx2d.stroke();
    }

    // Tier 3 Pico Hint: dashed ideal guide path
    if (shell.getHintLevel() >= 3 && !solved) {
      ctx2d.save();
      ctx2d.setLineDash([7, 7]);
      ctx2d.strokeStyle = 'rgba(74, 222, 128, 0.5)';
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.moveTo(emitter.x, emitter.y);
      ctx2d.lineTo(175, 115);
      ctx2d.lineTo(175, 345);
      ctx2d.lineTo(395, 345);
      ctx2d.lineTo(395, 92);
      ctx2d.lineTo(sensor.x, sensor.y);
      ctx2d.stroke();
      ctx2d.restore();
    }

    // Stone blockers
    blockers.forEach((b) => {
      ctx2d.fillStyle = '#475569';
      ctx2d.fillRect(b.x, b.y, b.w, b.h);
      ctx2d.strokeStyle = '#94a3b8';
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(b.x, b.y, b.w, b.h);
    });

    // Sun Emitter
    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.arc(emitter.x, emitter.y, 24, 0, Math.PI * 2);
    ctx2d.fillStyle = '#f59e0b';
    ctx2d.fill();
    ctx2d.lineWidth = 3;
    ctx2d.strokeStyle = '#fef08a';
    ctx2d.stroke();
    ctx2d.fillStyle = '#0f172a';
    ctx2d.font = 'bold 12px Vazirmatn, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('خورشید', emitter.x, emitter.y + 4);
    ctx2d.restore();

    // Clocktower Sensor
    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.arc(sensor.x, sensor.y, sensor.r + (solved ? 6 + Math.sin(pulsePhase) * 3 : 0), 0, Math.PI * 2);
    ctx2d.fillStyle = solved ? 'rgba(34, 197, 94, 0.35)' : 'rgba(251, 191, 36, 0.2)';
    ctx2d.fill();
    ctx2d.lineWidth = 3;
    ctx2d.strokeStyle = solved ? '#4ade80' : '#fbbf24';
    ctx2d.stroke();
    ctx2d.fillStyle = '#fef3c7';
    ctx2d.font = 'bold 12px Vazirmatn, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('ساعت', sensor.x, sensor.y + 4);
    ctx2d.restore();

    // Reflected Sunbeam
    trace.segments.forEach((seg) => {
      ctx2d.save();
      ctx2d.strokeStyle = 'rgba(253, 224, 71, 0.32)';
      ctx2d.lineWidth = 12;
      ctx2d.lineCap = 'round';
      ctx2d.beginPath();
      ctx2d.moveTo(seg.x1, seg.y1);
      ctx2d.lineTo(seg.x2, seg.y2);
      ctx2d.stroke();

      ctx2d.strokeStyle = solved ? '#4ade80' : '#fde047';
      ctx2d.lineWidth = 4;
      ctx2d.beginPath();
      ctx2d.moveTo(seg.x1, seg.y1);
      ctx2d.lineTo(seg.x2, seg.y2);
      ctx2d.stroke();
      ctx2d.restore();
    });

    // Rotatable Mirrors
    mirrors.forEach((m) => {
      const isSelected = m.id === selectedId;
      const isLit = trace.hitMirrorIds.includes(m.id);
      const rad = (m.angleDeg * Math.PI) / 180;
      const half = m.length / 2;

      ctx2d.save();
      // Target angle ghost when Tier 3 hint is active
      if (shell.getHintLevel() >= 3 && m.angleDeg !== m.targetDeg) {
        const tRad = (m.targetDeg * Math.PI) / 180;
        ctx2d.setLineDash([4, 4]);
        ctx2d.strokeStyle = 'rgba(74, 222, 128, 0.65)';
        ctx2d.lineWidth = 3;
        ctx2d.beginPath();
        ctx2d.moveTo(m.x - Math.cos(tRad) * half, m.y - Math.sin(tRad) * half);
        ctx2d.lineTo(m.x + Math.cos(tRad) * half, m.y + Math.sin(tRad) * half);
        ctx2d.stroke();
        ctx2d.setLineDash([]);
      }

      // Pedestal ring
      ctx2d.beginPath();
      ctx2d.arc(m.x, m.y, 24, 0, Math.PI * 2);
      ctx2d.fillStyle = isSelected ? 'rgba(251, 191, 36, 0.22)' : 'rgba(15, 23, 42, 0.6)';
      ctx2d.fill();
      if (isSelected) {
        ctx2d.strokeStyle = '#fbbf24';
        ctx2d.lineWidth = 2;
        ctx2d.stroke();
      }

      // Mirror glass bar
      ctx2d.strokeStyle = isLit ? '#38bdf8' : '#cbd5e1';
      ctx2d.lineWidth = 8;
      ctx2d.lineCap = 'round';
      ctx2d.beginPath();
      ctx2d.moveTo(m.x - Math.cos(rad) * half, m.y - Math.sin(rad) * half);
      ctx2d.lineTo(m.x + Math.cos(rad) * half, m.y + Math.sin(rad) * half);
      ctx2d.stroke();

      ctx2d.fillStyle = '#fef3c7';
      ctx2d.font = 'bold 12px Vazirmatn, sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.fillText(toPersianDigits(m.id), m.x, m.y + 36);
      ctx2d.restore();
    });

    rafId = requestAnimationFrame(draw);
  }

  updateControlsUi();
  evaluate();
  rafId = requestAnimationFrame(draw);

  shell.registerCleanup(() => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
  });

  return shell;
}
