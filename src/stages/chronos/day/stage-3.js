import { createStageShell } from '../../stage-shell.js';
import { traceChronosSolarPrism, normalizeDeg } from '../chronos-logic.js';
import { toPersianDigits } from '../../../data/translations.js';

export function mountChronosDayStage3(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  const emitter = { x: 64, y: 110, angleDeg: 0 };
  const prism = { x: 375, y: 220, r: 26, redAngleDeg: -90, yellowAngleDeg: 90, blueAngleDeg: 22 };
  const sensors = [
    { id: 'red-gate', x: 695, y: 86, r: 24, color: 'red', label: 'حسگر قرمز' },
    { id: 'yellow-gate', x: 695, y: 344, r: 24, color: 'yellow', label: 'حسگر زرد' },
  ];
  const blockers = [
    { x: 270, y: 20, w: 26, h: 145 },
    { x: 515, y: 165, w: 26, h: 95 },
  ];

  // Solution targets: M1=45, M2=45, M3=135, M4=45
  const initialMirrors = [
    { id: 1, name: 'آینه اول', x: 195, y: 110, length: 74, angleDeg: 0, targetDeg: 45 },
    { id: 2, name: 'آینه دوم', x: 195, y: 220, length: 74, angleDeg: 90, targetDeg: 45 },
    { id: 3, name: 'آینه قرمز', x: 375, y: 86, length: 74, angleDeg: 45, targetDeg: 135 },
    { id: 4, name: 'آینه زرد', x: 375, y: 344, length: 74, angleDeg: 135, targetDeg: 45 },
  ];

  let mirrors = initialMirrors.map((m) => ({ ...m }));
  let hintLevel = 0;
  let solvedDone = false;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3">
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-amber-400/35 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold">
        <span id="d3-status" class="text-amber-200">پرتو خورشید را به منشور وسط برسان تا رنگ‌های قرمز و زرد به دو حسگر دروازه بتابند!</span>
        <div class="flex items-center gap-2">
          <span id="d3-prism-badge" class="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-xs">منشور: خاموش</span>
          <span id="d3-red-badge" class="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-xs">🔴 قرمز</span>
          <span id="d3-yellow-badge" class="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-xs">🟡 زرد</span>
        </div>
      </div>

      <div class="rounded-2xl overflow-hidden border-2 border-amber-400/40 bg-slate-950">
        <svg id="d3-svg" viewBox="0 0 780 420" class="w-full h-auto block select-none"></svg>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="d3-controls"></div>
    </div>
  `;

  const svg = shell.playArea.querySelector('#d3-svg');
  const controlsEl = shell.playArea.querySelector('#d3-controls');
  const statusEl = shell.playArea.querySelector('#d3-status');
  const prismBadge = shell.playArea.querySelector('#d3-prism-badge');
  const redBadge = shell.playArea.querySelector('#d3-red-badge');
  const yellowBadge = shell.playArea.querySelector('#d3-yellow-badge');

  function rotateMirror(mirrorId) {
    if (solvedDone) return;
    const m = mirrors.find((x) => x.id === mirrorId);
    if (!m) return;
    m.angleDeg = normalizeDeg(m.angleDeg + 45) % 180;
    audio.playMechanism();
    render();
  }

  function render() {
    const trace = traceChronosSolarPrism({ emitter, mirrors, prism, sensors, blockers, bounds: { w: 780, h: 420 } });
    const redLit = trace.litSensorIds.includes('red-gate');
    const yellowLit = trace.litSensorIds.includes('yellow-gate');

    prismBadge.textContent = trace.prismLit ? 'منشور: روشن ✦' : 'منشور: خاموش';
    prismBadge.className = trace.prismLit
      ? 'px-2.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-300 text-amber-200 text-xs font-extrabold'
      : 'px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-xs';

    redBadge.className = redLit
      ? 'px-2.5 py-0.5 rounded-full bg-red-500/30 border border-red-400 text-red-200 text-xs font-extrabold'
      : 'px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-xs';

    yellowBadge.className = yellowLit
      ? 'px-2.5 py-0.5 rounded-full bg-amber-400/30 border border-amber-300 text-amber-200 text-xs font-extrabold'
      : 'px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-xs';

    const rayStroke = {
      white: '#fef9c3',
      red: '#f87171',
      yellow: '#facc15',
      blue: '#38bdf8',
    };

    const nextHintMirror = hintLevel >= 3 ? mirrors.find((m) => normalizeDeg(m.angleDeg) % 180 !== m.targetDeg) : null;

    svg.innerHTML = `
      <defs>
        <radialGradient id="sunTempleBg" cx="15%" cy="20%" r="85%">
          <stop offset="0%" stop-color="#451a03"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </radialGradient>
      </defs>
      <rect width="780" height="420" fill="url(#sunTempleBg)"/>

      <!-- Temple Pillars / Blockers -->
      ${blockers
        .map(
          (b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="#475569" stroke="#94a3b8" stroke-width="2"/>`
        )
        .join('')}

      <!-- Ray Paths -->
      ${trace.segments
        .map(
          (seg) => `
          <line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}"
            stroke="${rayStroke[seg.color] || '#fef9c3'}" stroke-width="6" stroke-opacity="0.28" stroke-linecap="round"/>
          <line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}"
            stroke="${rayStroke[seg.color] || '#fef9c3'}" stroke-width="2.8" stroke-linecap="round"/>
        `
        )
        .join('')}

      <!-- Sun Window Emitter -->
      <circle cx="${emitter.x}" cy="${emitter.y}" r="24" fill="#f59e0b" stroke="#fef3c7" stroke-width="3"/>
      <text x="${emitter.x}" y="${emitter.y + 5}" text-anchor="middle" font-size="18">☀️</text>

      <!-- Central Glass Prism -->
      <polygon points="${prism.x},${prism.y - 28} ${prism.x - 26},${prism.y + 22} ${prism.x + 26},${prism.y + 22}"
        fill="${trace.prismLit ? 'rgba(224,242,254,0.85)' : 'rgba(148,163,184,0.35)'}"
        stroke="${trace.prismLit ? '#fde047' : '#cbd5e1'}" stroke-width="3"/>
      <text x="${prism.x}" y="${prism.y + 42}" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="bold">منشور</text>

      <!-- Sensors on Stone Gate -->
      ${sensors
        .map((s) => {
          const lit = trace.litSensorIds.includes(s.id);
          const col = s.color === 'red' ? '#ef4444' : '#facc15';
          return `
            <circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${lit ? col : '#1e293b'}" stroke="${col}" stroke-width="3.5"/>
            <text x="${s.x}" y="${s.y + 5}" text-anchor="middle" fill="${lit ? '#0f172a' : '#e2e8f0'}" font-size="13" font-weight="bold">${lit ? '✓' : '◎'}</text>
            <text x="${s.x}" y="${s.y + 40}" text-anchor="middle" fill="#cbd5e1" font-size="12" font-weight="bold">${s.label}</text>
          `;
        })
        .join('')}

      <!-- Rotatable Mirrors -->
      ${mirrors
        .map((m) => {
          const rad = (m.angleDeg * Math.PI) / 180;
          const half = m.length / 2;
          const x1 = m.x - Math.cos(rad) * half;
          const y1 = m.y - Math.sin(rad) * half;
          const x2 = m.x + Math.cos(rad) * half;
          const y2 = m.y + Math.sin(rad) * half;
          const isHint = nextHintMirror && nextHintMirror.id === m.id;
          return `
            <g class="cursor-pointer" data-svg-mirror="${m.id}">
              <circle cx="${m.x}" cy="${m.y}" r="28" fill="transparent"/>
              ${isHint ? `<circle cx="${m.x}" cy="${m.y}" r="26" fill="none" stroke="#4ade80" stroke-width="3" stroke-dasharray="5 3"/>` : ''}
              <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
              <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
              <circle cx="${m.x}" cy="${m.y}" r="6" fill="#fbbf24"/>
              <text x="${m.x}" y="${m.y - 26}" text-anchor="middle" fill="#fef08a" font-size="11" font-weight="bold">${m.name}</text>
            </g>
          `;
        })
        .join('')}
    `;

    svg.querySelectorAll('[data-svg-mirror]').forEach((el) => {
      el.addEventListener('click', () => rotateMirror(Number(el.dataset.svgMirror)));
    });

    controlsEl.innerHTML = mirrors
      .map(
        (m) => `
        <button type="button" data-btn-mirror="${m.id}"
          class="p-2.5 rounded-xl btn-secondary-slate text-xs font-bold flex items-center justify-between gap-2 ${
            nextHintMirror && nextHintMirror.id === m.id ? 'border-emerald-400 ring-2 ring-emerald-400/60' : ''
          }">
          <span>${m.name}</span>
          <span class="text-amber-300 tabular-nums">${toPersianDigits(m.angleDeg)}° ↻</span>
        </button>
      `
      )
      .join('');

    controlsEl.querySelectorAll('[data-btn-mirror]').forEach((btn) => {
      btn.addEventListener('click', () => rotateMirror(Number(btn.dataset.btnMirror)));
    });

    if (trace.solved && !solvedDone) {
      solvedDone = true;
      audio.playGateOpen();
      statusEl.textContent = 'درخشش رنگ‌های منشور هر دو حسگر را روشن کرد! دروازه باز شد!';
      setTimeout(() => shell.complete(), 520);
    }
  }

  shell.onHint((lvl) => {
    hintLevel = lvl;
    render();
  });

  shell.onRetry(() => {
    solvedDone = false;
    mirrors = initialMirrors.map((m) => ({ ...m }));
    render();
  });

  render();
  return shell;
}
