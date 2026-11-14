import { toPersianDigits } from '../data/translations.js';
import { WORLDS, getWorldConfig } from '../data/worlds.js';

export const SPLASH_ARTWORK_URL = '/assets/aistudio/Quest_Beyond_the_Three_Realms_ffb24094.png';

const MIN_SPLASH_DURATION_MS = 2300;
const FADE_OUT_MS = 380;

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src || typeof Image === 'undefined') {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
    if (img.complete) {
      resolve();
    }
  });
}

export function renderSplashScreen(mountEl, { state, onFinish }) {
  const activeWorld = getWorldConfig(state?.activeWorldId);
  const screen = document.createElement('div');
  screen.dataset.testid = 'splash-screen';
  screen.className =
    'fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#070d1d] text-slate-100 select-none transition-opacity duration-400';
  screen.style.opacity = '1';

  screen.innerHTML = `
    <!-- Ambient blurred backdrop so portrait mobile & wide screens blend seamlessly -->
    <img
      src="${SPLASH_ARTWORK_URL}"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 w-full h-full object-cover object-center opacity-50 md:opacity-30 blur-2xl scale-110 pointer-events-none"
    />
    <div class="absolute inset-0 bg-gradient-to-b from-[#070d1d]/80 via-[#070d1d]/30 to-[#060b18]/92 pointer-events-none"></div>

    <!-- Desktop full-bleed identity artwork -->
    <div class="hidden md:block absolute inset-0 pointer-events-none">
      <img
        src="${SPLASH_ARTWORK_URL}"
        alt="تصویر معرفی بازی راز گنج دو جهان"
        data-testid="splash-artwork-desktop"
        class="w-full h-full object-cover object-center animate-splash-kenburns"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-transparent to-slate-950/88"></div>
    </div>

    <!-- Desktop top crest (keeps central floating island & spirits unobstructed) -->
    <header class="hidden md:flex relative z-10 w-full flex-col items-center pt-7 px-4 text-center">
      <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-950/75 backdrop-blur-md border border-amber-400/45 shadow-lg">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]"></span>
        <span class="text-sm font-extrabold text-amber-200 tracking-wide">
          دنیای ماجراجویی و معماهای جادویی
        </span>
        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></span>
      </div>
      <h1 class="mt-2.5 text-4xl font-extrabold text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
        راز گنج دو جهان
      </h1>
      <p class="mt-1 text-sm font-semibold text-amber-100/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
        از آتشفشان خورشید تا قله بلورین ماه
      </p>
    </header>

    <!-- Mobile cohesive centerpiece (title crest + full-scene framed artwork grouped cleanly) -->
    <main class="md:hidden relative z-10 flex-1 flex flex-col items-center justify-center gap-5 px-3.5 py-4 text-center">
      <div class="flex flex-col items-center">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/45 shadow-lg">
          <span class="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></span>
          <span class="text-xs font-extrabold text-amber-200">
            دنیای ماجراجویی و معماهای جادویی
          </span>
          <span class="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
        </div>
        <h1 class="mt-3 text-3xl font-extrabold text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          راز گنج دو جهان
        </h1>
        <p class="mt-1 text-xs font-semibold text-amber-100/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          از آتشفشان خورشید تا قله بلورین ماه
        </p>
      </div>

      <div class="relative w-full max-w-md">
        <div class="absolute -inset-2 rounded-[28px] bg-gradient-to-r from-amber-500/25 via-cyan-400/20 to-violet-500/25 blur-xl pointer-events-none"></div>
        <div class="relative w-full rounded-3xl overflow-hidden border-2 border-amber-400/55 shadow-[0_22px_55px_rgba(0,0,0,0.8)] bg-slate-950">
          <img
            src="${SPLASH_ARTWORK_URL}"
            alt="تصویر معرفی بازی راز گنج دو جهان"
            data-testid="splash-artwork-mobile"
            class="w-full aspect-video object-cover object-center block"
          />
          <div class="absolute inset-0 ring-1 ring-inset ring-white/15 rounded-3xl pointer-events-none"></div>
        </div>
      </div>

      <p class="text-xs font-medium text-slate-200/90 max-w-xs leading-relaxed">
        دو مسیر اسرارآمیز، دوازده ماجرا و رازهای نهفته در انتظار کشف تو هستند
      </p>
    </main>

    <!-- Bottom loading HUD & quick enter action -->
    <footer class="relative z-10 w-full flex flex-col items-center pb-6 sm:pb-8 px-4">
      <div class="w-full max-w-md rounded-2xl bg-slate-950/84 backdrop-blur-md border border-amber-400/45 p-4 sm:p-5 shadow-[0_18px_45px_rgba(0,0,0,0.75)]">
        <div class="flex items-center justify-between gap-3 mb-2.5">
          <span id="splash-status-text" class="text-xs sm:text-sm font-bold text-amber-100">
            در حال آماده‌سازی نقشه و سرزمین‌ها...
          </span>
          <span id="splash-percent-text" class="text-xs sm:text-sm font-extrabold text-amber-300 tabular-nums">
            ${toPersianDigits(0)}٪
          </span>
        </div>

        <div
          class="w-full h-3 rounded-full bg-slate-800/95 border border-slate-700/80 overflow-hidden p-0.5"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="0"
          id="splash-progress-bar-wrap"
        >
          <div
            id="splash-progress-fill"
            class="h-full rounded-full bg-gradient-to-l from-cyan-400 via-amber-400 to-orange-500 transition-[width] duration-75 ease-out shadow-[0_0_12px_rgba(251,191,36,0.7)]"
            style="width: 0%"
          ></div>
        </div>

        <div class="mt-3 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-300">
          <span class="truncate">بارگذاری: ${activeWorld.title}</span>
          <button
            type="button"
            id="splash-enter-btn"
            data-testid="splash-skip-btn"
            class="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 font-bold transition-colors shrink-0"
          >
            ورود به بازی ◀
          </button>
        </div>
      </div>
    </footer>
  `;

  mountEl.appendChild(screen);

  const fillEl = screen.querySelector('#splash-progress-fill');
  const wrapEl = screen.querySelector('#splash-progress-bar-wrap');
  const percentEl = screen.querySelector('#splash-percent-text');
  const statusEl = screen.querySelector('#splash-status-text');
  const enterBtn = screen.querySelector('#splash-enter-btn');

  let destroyed = false;
  let finished = false;
  let rafId = null;
  let fadeTimer = null;
  let assetsReady = false;

  const startTime = performance.now();

  const assetsToPreload = [
    SPLASH_ARTWORK_URL,
    activeWorld.mapImage,
    ...WORLDS.map((w) => w.mapImage),
  ];

  Promise.all([...new Set(assetsToPreload)].map(preloadImage)).then(() => {
    assetsReady = true;
  });

  function updateProgress(pct) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (fillEl) fillEl.style.width = `${clamped}%`;
    if (wrapEl) wrapEl.setAttribute('aria-valuenow', String(clamped));
    if (percentEl) percentEl.textContent = `${toPersianDigits(clamped)}٪`;
    if (statusEl) {
      if (clamped >= 98) {
        statusEl.textContent = 'دنیای ماجراجویی آماده است!';
      } else if (clamped >= 55) {
        statusEl.textContent = 'در حال بیدار کردن فانوس‌ها و معماها...';
      } else {
        statusEl.textContent = 'در حال آماده‌سازی نقشه و سرزمین‌ها...';
      }
    }
  }

  function completeSplash() {
    if (destroyed || finished) return;
    finished = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    updateProgress(100);
    screen.style.opacity = '0';
    fadeTimer = window.setTimeout(() => {
      if (!destroyed && typeof onFinish === 'function') {
        onFinish();
      }
    }, FADE_OUT_MS);
  }

  function tick(now) {
    if (destroyed || finished) return;
    const elapsed = now - startTime;
    const rawRatio = Math.min(1, elapsed / MIN_SPLASH_DURATION_MS);
    const eased = 1 - Math.pow(1 - rawRatio, 2.2);
    const maxAllowed = assetsReady ? 100 : 92;
    const displayPct = Math.min(maxAllowed, eased * 100);
    updateProgress(displayPct);

    if (rawRatio >= 1 && assetsReady) {
      completeSplash();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  const onEnterClick = () => {
    completeSplash();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      completeSplash();
    }
  };

  enterBtn?.addEventListener('click', onEnterClick);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    destroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (fadeTimer !== null) clearTimeout(fadeTimer);
    enterBtn?.removeEventListener('click', onEnterClick);
    window.removeEventListener('keydown', onKeyDown);
  };
}
