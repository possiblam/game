import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';

export function mountChronosNightStage5(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  let progressPct = 5;
  let windState = 'calm'; // 'calm' | 'warning' | 'gust'
  let stateTimerMs = 2800;
  let moving = false;
  let gripping = false;
  let hintLevel = 0;
  let solved = false;
  let statusMsg = 'در آرامش روی پل جلو برو؛ با صدای زنگوله بادی فوراً طناب‌ها را بگیر!';
  let rafId = null;
  let lastTick = performance.now();

  shell.playArea.innerHTML = `
    <div class="w-full max-w-3xl flex flex-col gap-3">
      <div class="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-cyan-400/35 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs sm:text-sm font-bold">
          <span class="text-cyan-300 tabular-nums">🌉 پیشروی روی پل: <span id="n5-pct">۵٪</span></span>
          <span class="text-slate-600">|</span>
          <span id="n5-status" class="text-slate-100">${statusMsg}</span>
        </div>
        <span id="n5-wind-pill" class="px-3 py-1 rounded-full text-xs font-extrabold border bg-emerald-500/20 border-emerald-400 text-emerald-200">
          🍃 نسیم آرام
        </span>
      </div>

      <!-- Rope Bridge + Hanging Crystal Wind Chimes -->
      <div id="n5-arena" class="relative rounded-2xl overflow-hidden border-2 border-cyan-400/40 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 p-4 sm:p-6">
        <!-- Hanging Wind Chimes above/below bridge -->
        <div class="flex items-center justify-around mb-4" id="n5-chimes">
          ${[0, 1, 2, 3, 4]
            .map(
              (i) => `
            <div data-chime="${i}" class="flex flex-col items-center transition-transform duration-200">
              <div class="w-0.5 h-3 bg-slate-400"></div>
              <div class="w-3 h-9 sm:h-11 rounded-full bg-gradient-to-b from-cyan-300 to-violet-400 border border-white/70 shadow-md"></div>
            </div>
          `
            )
            .join('')}
        </div>

        <!-- Rope Bridge Track -->
        <div class="relative h-24 rounded-xl bg-slate-950/60 border border-slate-700/70 flex items-center px-4">
          <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 h-2 bg-amber-800 border-y border-amber-500/60 rounded-full"></div>
          <div class="absolute inset-x-4 top-5 h-0.5 bg-amber-300/40"></div>
          <div id="n5-player" class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-100 text-3xl" style="left: 5%;">
            🚶
          </div>
          <div class="ml-auto relative z-10 px-2 py-1 rounded-lg bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-extrabold">
            🏁 دروازه
          </div>
        </div>

        <!-- Hint 3 Wind Forecast Bar -->
        <div id="n5-forecast" class="hidden mt-3 text-center text-xs font-extrabold text-amber-300 tabular-nums"></div>
      </div>

      <!-- Controls -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="button" id="n5-walk-btn" data-testid="chronos-n5-walk-btn"
          class="py-4 px-5 rounded-2xl btn-primary-gold text-base font-extrabold select-none">
          ◀ حرکت روی پل (کلیک / نگه دار / ←)
        </button>
        <button type="button" id="n5-grip-btn" data-testid="chronos-n5-grip-btn"
          class="py-4 px-5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white border-2 border-cyan-300 text-base font-extrabold select-none">
          🪢 نشستن و گرفتن طناب (کلیک یا Space)
        </button>
      </div>
    </div>
  `;

  const pctEl = shell.playArea.querySelector('#n5-pct');
  const statusEl = shell.playArea.querySelector('#n5-status');
  const windPillEl = shell.playArea.querySelector('#n5-wind-pill');
  const playerEl = shell.playArea.querySelector('#n5-player');
  const chimes = [...shell.playArea.querySelectorAll('[data-chime]')];
  const forecastEl = shell.playArea.querySelector('#n5-forecast');
  const walkBtn = shell.playArea.querySelector('#n5-walk-btn');
  const gripBtn = shell.playArea.querySelector('#n5-grip-btn');

  function playWarningChime() {
    [1046, 1318, 1568].forEach((freq, idx) => {
      setTimeout(() => audio.playTone({ freq, duration: 0.22, type: 'sine', gain: 0.09 }), idx * 140);
    });
  }

  function renderUI() {
    pctEl.textContent = `${toPersianDigits(Math.round(progressPct))}٪`;
    statusEl.textContent = statusMsg;
    playerEl.style.left = `${progressPct}%`;
    playerEl.textContent = gripping ? '🧎' : '🚶';

    if (windState === 'calm') {
      windPillEl.textContent = '🍃 نسیم آرام (ایمن برای حرکت)';
      windPillEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold border bg-emerald-500/20 border-emerald-400 text-emerald-200';
      chimes.forEach((c) => (c.style.transform = 'rotate(0deg)'));
    } else if (windState === 'warning') {
      windPillEl.textContent = '🔔 زنگ هشدار! طناب‌ها را بگیر!';
      windPillEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold border bg-amber-500/30 border-amber-300 text-amber-100 animate-pulse';
      chimes.forEach((c, i) => (c.style.transform = `rotate(${i % 2 === 0 ? 16 : -16}deg)`));
    } else {
      windPillEl.textContent = '💨 تندباد شدید!';
      windPillEl.className = 'px-3 py-1 rounded-full text-xs font-extrabold border bg-rose-600/35 border-rose-400 text-rose-100';
      chimes.forEach((c) => (c.style.transform = 'rotate(-28deg)'));
    }

    gripBtn.classList.toggle('ring-4', gripping);
    gripBtn.classList.toggle('ring-emerald-300', gripping);
    gripBtn.textContent = gripping
      ? '🛡️ در حال گرفتن محکم طناب (رها کردن)'
      : '🪢 نشستن و گرفتن طناب (کلیک یا Space)';

    if (hintLevel >= 3) {
      forecastEl.classList.remove('hidden');
      forecastEl.textContent = `⏱ زمان وضعیت فعلی: ${toPersianDigits((stateTimerMs / 1000).toFixed(1))} ثانیه`;
    } else {
      forecastEl.classList.add('hidden');
    }
  }

  function advance(amount = 8) {
    if (solved || gripping) return;
    if (windState === 'gust') {
      audio.playError();
      shell.recordAttempt();
      progressPct = Math.max(5, progressPct - 18);
      statusMsg = 'باد شدید تو را عقب راند! در تندباد باید طناب را محکم بگیری!';
      renderUI();
      return;
    }
    progressPct = Math.min(96, progressPct + amount);
    audio.playClick();
    if (progressPct >= 94) {
      solved = true;
      audio.playGateOpen();
      statusMsg = 'آفرین! از روی پل طنابی زنگوله‌های بادی گذشتی!';
      renderUI();
      setTimeout(() => shell.complete(), 380);
    } else {
      renderUI();
    }
  }

  function tick(now) {
    const dt = Math.min(80, now - lastTick);
    lastTick = now;

    if (!solved) {
      if (moving && !gripping && windState !== 'gust') {
        progressPct = Math.min(96, progressPct + dt * 0.022);
        if (progressPct >= 94) {
          solved = true;
          audio.playGateOpen();
          statusMsg = 'آفرین! از روی پل طنابی زنگوله‌های بادی گذشتی!';
          renderUI();
          setTimeout(() => shell.complete(), 380);
        }
      }

      stateTimerMs -= dt;
      if (stateTimerMs <= 0) {
        if (windState === 'calm') {
          windState = 'warning';
          stateTimerMs = hintLevel >= 3 ? 2100 : 1550;
          playWarningChime();
          statusMsg = '🔔 صدای زنگوله‌ها بلند شد! فوراً طناب را بگیر!';
        } else if (windState === 'warning') {
          windState = 'gust';
          stateTimerMs = 2000;
          if (!gripping) {
            audio.playError();
            shell.recordAttempt();
            progressPct = Math.max(5, progressPct - 18);
            statusMsg = '💨 تندباد وزید و طناب را نگرفته بودی! به عقب پرت شدی!';
          } else {
            statusMsg = '🛡️ عالی! طناب‌ها را محکم گرفتی و از تندباد جان سالم به در بردی.';
          }
        } else {
          windState = 'calm';
          stateTimerMs = 2800;
          gripping = false;
          statusMsg = '🍃 تندباد آرام شد! رها کن و سریع به سمت جلو بدو!';
        }
      }
      renderUI();
    }

    rafId = requestAnimationFrame(tick);
  }

  walkBtn.addEventListener('pointerdown', () => {
    gripping = false;
    moving = true;
    advance(8);
  });
  walkBtn.addEventListener('pointerup', () => {
    moving = false;
  });
  walkBtn.addEventListener('pointerleave', () => {
    moving = false;
  });

  gripBtn.addEventListener('click', () => {
    if (solved) return;
    gripping = !gripping;
    moving = false;
    audio.playMechanism();
    renderUI();
  });

  const onKeyDown = (e) => {
    if (solved) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      gripping = false;
      moving = true;
      advance(6);
    } else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      gripping = true;
      moving = false;
      renderUI();
    }
  };
  const onKeyUp = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'a' || e.key === 'A') {
      moving = false;
    } else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      gripping = false;
      renderUI();
    }
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  shell.onHint((lvl) => {
    hintLevel = lvl;
    renderUI();
  });

  shell.onRetry(() => {
    progressPct = 5;
    windState = 'calm';
    stateTimerMs = 2800;
    moving = false;
    gripping = false;
    solved = false;
    statusMsg = 'در آرامش حرکت کن و با صدای زنگوله طناب را بگیر!';
    renderUI();
  });

  shell.registerCleanup(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  });

  renderUI();
  rafId = requestAnimationFrame(tick);
  return shell;
}
