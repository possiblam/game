import { UI_TEXT, toPersianDigits, formatTimePersian } from '../data/translations.js';
import { FINAL_VICTORY_STORY, renderCharacterAvatarSvg } from '../data/story.js';
import { getTotalCompletedStages, getTotalStars } from '../core/game-state.js';
import { showModal } from './modal.js';

export function renderStarsRow(earnedCount, maxCount = 3) {
  let html = '<div class="flex items-center justify-center gap-2 my-3" aria-label="ستاره‌های کسب‌شده">';
  for (let i = 1; i <= maxCount; i++) {
    const filled = i <= earnedCount;
    html += `
      <svg viewBox="0 0 36 36" class="w-10 h-10 ${filled ? 'text-amber-400 drop-shadow' : 'text-slate-600'}" aria-hidden="true">
        <polygon points="18,3 22.8,12.8 33.6,14.4 25.8,22 27.6,32.7 18,27.6 8.4,32.7 10.2,22 2.4,14.4 13.2,12.8"
          fill="${filled ? '#fbbf24' : '#334155'}" stroke="${filled ? '#fef08a' : '#475569'}" stroke-width="2"/>
      </svg>
    `;
  }
  html += '</div>';
  return html;
}

export function showStageResultModal({
  stage,
  stars,
  attempts,
  hintsUsed,
  elapsedSeconds,
  keyGranted,
  hasNextStage,
  onReplay,
  onNextStage,
  onBackToMap,
}) {
  const keyBanner = keyGranted
    ? `
      <div class="mt-3 p-3 rounded-xl bg-amber-900/50 border border-amber-400 text-amber-200 font-bold text-sm flex items-center gap-2">
        <span aria-hidden="true">🗝️</span>
        <span>${keyGranted === 'magnetic' ? UI_TEXT.magneticKey : UI_TEXT.silverKey} به کیف ابزار شما اضافه شد!</span>
      </div>
    `
    : '';

  const actions = [
    {
      label: UI_TEXT.replayStage,
      variant: 'secondary',
      onClick: () => onReplay?.(),
    },
    {
      label: UI_TEXT.backToMap,
      variant: hasNextStage ? 'secondary' : 'primary',
      onClick: () => onBackToMap?.(),
    },
  ];

  if (hasNextStage) {
    actions.push({
      label: UI_TEXT.nextStage,
      variant: 'primary',
      testId: 'next-stage-btn',
      onClick: () => onNextStage?.(),
    });
  }

  showModal({
    title: `آفرین! ${stage.title} کامل شد`,
    closeOnBackdrop: false,
    bodyHtml: `
      <div class="text-center">
        ${renderStarsRow(stars, 3)}
        <p class="text-amber-300 font-extrabold text-lg m-0">${toPersianDigits(stars)} ستاره از ۳ ستاره گرفتید!</p>
      </div>
      ${keyBanner}
      <div class="grid grid-cols-3 gap-2.5 mt-4 text-center tabular-nums">
        <div class="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
          <div class="text-xs text-slate-400">${UI_TEXT.timeLabel}</div>
          <div class="font-bold text-slate-100 mt-1">${formatTimePersian(elapsedSeconds)}</div>
        </div>
        <div class="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
          <div class="text-xs text-slate-400">${UI_TEXT.attemptsLabel}</div>
          <div class="font-bold text-slate-100 mt-1">${toPersianDigits(attempts)}</div>
        </div>
        <div class="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
          <div class="text-xs text-slate-400">${UI_TEXT.hintsUsedLabel}</div>
          <div class="font-bold text-slate-100 mt-1">${toPersianDigits(hintsUsed)}</div>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-3 text-xs sm:text-sm text-slate-200">
        <div class="w-10 h-10 shrink-0">${renderCharacterAvatarSvg('nika', 'excited')}</div>
        <span>نیکا: «فوق‌العاده بود! با هم هیچ معمایی سد راهمان نمی‌شود.»</span>
      </div>
    `,
    actions,
  });
}

export function renderFinalTempleScene(container, { state, audio, onCompleteCeremony, onBackToMap, onResetAdventure }) {
  let sunPlaced = false;
  let moonPlaced = false;
  let isOpening = false;
  let justBurst = false;
  let chestOpened = Boolean(state.finalCompleted);

  const totalStars = getTotalStars(state);
  const totalCompleted = getTotalCompletedStages(state);
  const decoyCount =
    (state.decoyDiscovered?.daytime ? 1 : 0) + (state.decoyDiscovered?.nighttime ? 1 : 0);

  const rankTitle =
    totalStars >= 32
      ? 'اسطوره طلایی دو جهان'
      : totalStars >= 24
      ? 'نگهبان بزرگ خورشید و ماه'
      : 'ماجراجوی شجاع گنج';

  if (chestOpened) {
    sunPlaced = true;
    moonPlaced = true;
  }

  const wrapper = document.createElement('div');
  wrapper.className =
    'min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 bg-gradient-to-b from-indigo-950 via-slate-900 to-amber-950 text-slate-100 relative overflow-hidden';

  // Full-screen 60fps Fireworks + Coins Canvas overlay
  const fwCanvas = document.createElement('canvas');
  fwCanvas.id = 'victory-fireworks-canvas';
  fwCanvas.className = 'fixed inset-0 w-full h-full pointer-events-none z-20';
  fwCanvas.setAttribute('aria-hidden', 'true');

  const contentHost = document.createElement('div');
  contentHost.className = 'relative z-10 w-full flex flex-col items-center';

  wrapper.appendChild(contentHost);
  wrapper.appendChild(fwCanvas);

  let rafId = null;
  let burstTimer = null;
  let autoVolleyTimer = null;
  const particles = [];
  const rockets = [];
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    fwCanvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    fwCanvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    const ctx2d = fwCanvas.getContext('2d');
    if (ctx2d) ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function launchFireworkBurst(cx, cy, count = 48) {
    if (reducedMotion) return;
    const palette = ['#fde047', '#fbbf24', '#fb923c', '#38bdf8', '#f472b6', '#34d399', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
      const speed = 2.2 + Math.random() * 5.6;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        size: 2.2 + Math.random() * 3.4,
        color: palette[i % palette.length],
        alpha: 1,
        decay: 0.011 + Math.random() * 0.01,
        gravity: 0.085,
        kind: i % 5 === 0 ? 'star' : 'spark',
      });
    }
  }

  function launchTreasureFountain() {
    if (reducedMotion) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const originX = w * 0.5;
    const originY = h * 0.44;
    const coinColors = ['#fde047', '#fbbf24', '#f59e0b', '#38bdf8', '#f43f5e', '#34d399'];
    for (let i = 0; i < 65; i++) {
      const spread = (Math.random() - 0.5) * 9.5;
      particles.push({
        x: originX + (Math.random() - 0.5) * 36,
        y: originY,
        vx: spread,
        vy: -(4.5 + Math.random() * 6.5),
        size: 4 + Math.random() * 4.5,
        color: coinColors[i % coinColors.length],
        alpha: 1,
        decay: 0.0065 + Math.random() * 0.005,
        gravity: 0.16,
        kind: i % 3 === 0 ? 'gem' : 'coin',
      });
    }
  }

  function triggerGrandCelebrationVolley() {
    if (reducedMotion) return;
    resizeCanvas();
    const w = window.innerWidth;
    const h = window.innerHeight;
    launchTreasureFountain();
    launchFireworkBurst(w * 0.5, h * 0.34, 60);
    setTimeout(() => launchFireworkBurst(w * 0.25, h * 0.25, 44), 220);
    setTimeout(() => launchFireworkBurst(w * 0.75, h * 0.25, 44), 420);
    setTimeout(() => launchFireworkBurst(w * 0.5, h * 0.2, 52), 700);
    startFireworksLoop();
  }

  function startFireworksLoop() {
    if (rafId || reducedMotion) return;
    const ctx2d = fwCanvas.getContext('2d');
    if (!ctx2d) return;

    function tick() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx2d.clearRect(0, 0, w, h);

      // Process rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.06;
        ctx2d.beginPath();
        ctx2d.arc(r.x, r.y, 3, 0, Math.PI * 2);
        ctx2d.fillStyle = '#fef08a';
        ctx2d.fill();
        if (r.vy >= -0.5 || r.y <= r.targetY) {
          launchFireworkBurst(r.x, r.y, 40);
          rockets.splice(i, 1);
        }
      }

      // Process particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.alpha -= p.decay;

        if (p.alpha <= 0.02 || p.y > h + 30) {
          particles.splice(i, 1);
          continue;
        }

        ctx2d.save();
        ctx2d.globalAlpha = Math.max(0, p.alpha);
        ctx2d.fillStyle = p.color;
        if (p.kind === 'coin') {
          ctx2d.beginPath();
          ctx2d.ellipse(p.x, p.y, p.size, p.size * 0.72, p.x * 0.03, 0, Math.PI * 2);
          ctx2d.fill();
        } else if (p.kind === 'gem') {
          ctx2d.translate(p.x, p.y);
          ctx2d.rotate(p.x * 0.04);
          ctx2d.fillRect(-p.size * 0.7, -p.size * 0.7, p.size * 1.4, p.size * 1.4);
        } else {
          ctx2d.beginPath();
          ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx2d.fill();
        }
        ctx2d.restore();
      }

      if (particles.length > 0 || rockets.length > 0 || chestOpened) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function render() {
    const bothPlaced = sunPlaced && moonPlaced;

    contentHost.innerHTML = `
      <div class="storybook-panel relative z-10 w-full max-w-3xl rounded-3xl p-4 sm:p-8 text-center">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/45 text-amber-200 text-xs sm:text-sm font-extrabold mb-2">
          <span>${chestOpened ? '👑 فتح قله افسانه‌ای' : bothPlaced ? '✨ دروازه باستانی گشوده شد' : '🏛️ آخرین آزمون دو جهان'}</span>
        </div>

        <h1 class="text-2xl sm:text-4xl font-extrabold text-amber-300 mb-2">${FINAL_VICTORY_STORY.title}</h1>
        <p class="text-xs sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed">
          ${
            chestOpened
              ? FINAL_VICTORY_STORY.congratulationsText
              : isOpening
              ? 'قفل‌های باستانی در حال باز شدن هستند... آماده انفجار نور و گنج باشید!'
              : bothPlaced
              ? FINAL_VICTORY_STORY.emblemText
              : FINAL_VICTORY_STORY.openingText
          }
        </p>

        <!-- Grand Temple Altar -->
        <div class="mt-4 sm:mt-6 relative mx-auto max-w-xl rounded-2xl p-4 sm:p-6 bg-slate-950/90 border-2 overflow-hidden transition-all duration-500 ${
          chestOpened
            ? 'border-amber-300 shadow-[0_0_65px_rgba(251,191,36,0.55)]'
            : bothPlaced
            ? 'border-amber-400/80 shadow-[0_0_36px_rgba(251,191,36,0.3)]'
            : 'border-amber-500/40'
        }">
          ${
            chestOpened
              ? `<div class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] opacity-30 animate-sun-rays"
                   style="background: repeating-conic-gradient(from 0deg, rgba(251,191,36,0.45) 0deg 12deg, transparent 12deg 28deg); border-radius: 9999px;"></div>`
              : ''
          }
          ${
            justBurst
              ? `<div class="pointer-events-none absolute left-1/2 top-1/2 w-36 h-36 rounded-full border-4 border-amber-200 animate-shockwave"></div>`
              : ''
          }

          <!-- Dual Sun & Moon Crest Pedestals + Energy Conduits -->
          <div class="relative z-10 flex items-center justify-center gap-2.5 sm:gap-6 mb-4 sm:mb-5">
            <button type="button" id="place-sun-crest"
              class="flex-1 max-w-[210px] px-2.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 min-h-[76px] ${
                sunPlaced
                  ? 'bg-gradient-to-b from-orange-500/35 to-amber-900/40 border-amber-300 text-amber-100 shadow-lg shadow-orange-500/25'
                  : 'bg-slate-800/90 hover:bg-orange-950/60 border-orange-400/75 text-orange-200 animate-pulse'
              }"
              ${sunPlaced || isOpening ? 'disabled' : ''}>
              <span class="text-2xl sm:text-3xl" aria-hidden="true">☀️</span>
              <span class="text-xs sm:text-sm font-extrabold leading-tight sm:whitespace-nowrap">${sunPlaced ? 'نشان خورشید روشن ✓' : 'قرار دادن نشان خورشید'}</span>
            </button>

            <div class="hidden sm:flex items-center gap-1 text-amber-300/80 text-lg font-extrabold" aria-hidden="true">
              <span class="${sunPlaced ? 'text-amber-300' : 'text-slate-600'}">━</span>
              <span class="text-xl">${bothPlaced ? '⚡' : '🔒'}</span>
              <span class="${moonPlaced ? 'text-cyan-300' : 'text-slate-600'}">━</span>
            </div>

            <button type="button" id="place-moon-crest"
              class="flex-1 max-w-[210px] px-2.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 min-h-[76px] ${
                moonPlaced
                  ? 'bg-gradient-to-b from-cyan-500/35 to-sky-900/40 border-cyan-300 text-cyan-100 shadow-lg shadow-cyan-500/25'
                  : 'bg-slate-800/90 hover:bg-cyan-950/60 border-cyan-400/75 text-cyan-200 animate-pulse'
              }"
              ${moonPlaced || isOpening ? 'disabled' : ''}>
              <span class="text-2xl sm:text-3xl" aria-hidden="true">🌙</span>
              <span class="text-xs sm:text-sm font-extrabold leading-tight sm:whitespace-nowrap">${moonPlaced ? 'نشان ماه روشن ✓' : 'قرار دادن نشان ماه'}</span>
            </button>
          </div>

          <!-- Temple Gate & Legendary Golden Chest -->
          <div class="relative z-10 flex flex-col items-center">
            <div class="relative w-64 sm:w-72 h-44 flex items-center justify-center overflow-hidden rounded-2xl bg-slate-900/75 border border-amber-400/25">
              <!-- Parting Stone & Gold Temple Doors (slide open when both crests are placed) -->
              <div class="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-slate-800 via-slate-900 to-amber-950/90 border-l-2 border-amber-400/50 z-20 transition-transform duration-700 ease-in-out flex items-center justify-start pl-2 ${
                bothPlaced ? 'translate-x-full' : 'translate-x-0'
              }">
                <span class="text-amber-400/70 text-xl">☀</span>
              </div>
              <div class="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-slate-800 via-slate-900 to-sky-950/90 border-r-2 border-cyan-400/50 z-20 transition-transform duration-700 ease-in-out flex items-center justify-end pr-2 ${
                bothPlaced ? '-translate-x-full' : 'translate-x-0'
              }">
                <span class="text-cyan-300/70 text-xl">🌙</span>
              </div>

              <!-- Royal Treasure Chest SVG -->
              <svg viewBox="0 0 240 165" class="w-60 h-40 relative z-10 ${
                isOpening ? 'animate-chest-suspense' : chestOpened ? 'animate-treasure-pop' : ''
              }" aria-label="صندوق گنج طلایی">
                <defs>
                  <radialGradient id="goldGlow" cx="50%" cy="42%" r="58%">
                    <stop offset="0%" stop-color="#fef08a" stop-opacity="${chestOpened ? '1' : isOpening ? '0.85' : '0.2'}"/>
                    <stop offset="55%" stop-color="#f59e0b" stop-opacity="${chestOpened ? '0.55' : '0.1'}"/>
                    <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
                  </radialGradient>
                </defs>
                <circle cx="120" cy="76" r="80" fill="url(#goldGlow)"/>

                ${
                  chestOpened
                    ? `
                    <!-- Open Ornate Lid -->
                    <path d="M44 70 C44 20 196 20 196 70 Z" fill="#b45309" stroke="#fde047" stroke-width="4.5"/>
                    <path d="M54 66 C58 32 182 32 186 66 Z" fill="#78350f"/>
                    <!-- Royal Crown & Bursting Treasure Pile -->
                    <polygon points="100,48 106,30 115,41 120,25 125,41 134,30 140,48" fill="#fde047" stroke="#92400e" stroke-width="2"/>
                    <circle cx="120" cy="40" r="3" fill="#f43f5e"/>
                    <circle cx="80" cy="74" r="10" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>
                    <circle cx="99" cy="66" r="11" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
                    <circle cx="120" cy="68" r="12" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>
                    <circle cx="141" cy="65" r="11" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
                    <circle cx="160" cy="74" r="9.5" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>
                    <polygon points="103,50 112,60 103,70 94,60" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.8"/>
                    <polygon points="138,50 146,60 138,70 130,60" fill="#f43f5e" stroke="#ffe4e6" stroke-width="1.8"/>
                    <polygon points="84,54 91,63 84,72 77,63" fill="#34d399" stroke="#d1fae5" stroke-width="1.8"/>
                    <polygon points="156,56 162,64 156,72 150,64" fill="#a78bfa" stroke="#ede9fe" stroke-width="1.8"/>
                  `
                    : `
                    <!-- Closed Ornate Lid -->
                    <path d="M44 82 C44 40 196 40 196 82 Z" fill="#92400e" stroke="#fbbf24" stroke-width="4.5"/>
                    <path d="M72 48 L72 82 M168 48 L168 82" stroke="#fbbf24" stroke-width="9"/>
                  `
                }

                <!-- Chest Base -->
                <rect x="44" y="80" width="152" height="62" rx="10" fill="#78350f" stroke="#fbbf24" stroke-width="4.5"/>
                <rect x="68" y="80" width="14" height="62" fill="#f59e0b"/>
                <rect x="158" y="80" width="14" height="62" fill="#f59e0b"/>
                <rect x="106" y="86" width="28" height="24" rx="5" fill="${isOpening ? '#fef08a' : '#fde047'}" stroke="#92400e" stroke-width="2.5"/>
                <circle cx="120" cy="98" r="4.5" fill="${chestOpened ? '#10b981' : '#451a03'}"/>
              </svg>
            </div>

            ${
              !chestOpened
                ? `
                <button type="button" id="open-final-chest-btn" data-testid="open-final-chest-btn"
                  class="mt-4 w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-2xl text-sm sm:text-base font-extrabold transition-all ${
                    isOpening
                      ? 'btn-primary-gold scale-105 opacity-90 cursor-wait'
                      : bothPlaced
                      ? 'btn-primary-gold ring-4 ring-amber-300/60'
                      : 'btn-secondary-slate opacity-65 cursor-not-allowed'
                  }"
                  ${bothPlaced && !isOpening ? '' : 'disabled'}>
                  ${
                    isOpening
                      ? '✨ در حال گشودن قفل افسانه‌ای...'
                      : bothPlaced
                      ? '🗝️ باز کردن گنج افسانه‌ای!'
                      : 'ابتدا هر دو نشان خورشید و ماه را قرار دهید'
                  }
                </button>
              `
                : `
                <div class="mt-4 w-full animate-treasure-pop">
                  <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-l from-amber-400/25 to-emerald-400/25 border border-amber-300/70 text-amber-200 font-extrabold text-xs sm:text-sm mb-3">
                    <span>🏆 نشان افتخار:</span>
                    <span class="text-white">${rankTitle}</span>
                  </div>

                  <div class="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-lg mx-auto tabular-nums">
                    <div class="p-2.5 sm:p-3 rounded-xl bg-slate-800/90 border border-emerald-400/40">
                      <div class="text-[11px] sm:text-xs text-slate-400">مراحل</div>
                      <div class="text-lg sm:text-2xl font-extrabold text-emerald-300 mt-0.5">${toPersianDigits(totalCompleted)} ${UI_TEXT.ofTwelve}</div>
                    </div>
                    <div class="p-2.5 sm:p-3 rounded-xl bg-slate-800/90 border border-amber-400/40">
                      <div class="text-[11px] sm:text-xs text-slate-400">ستاره‌ها</div>
                      <div class="text-lg sm:text-2xl font-extrabold text-amber-300 mt-0.5">${toPersianDigits(totalStars)}/${toPersianDigits(36)} ★</div>
                    </div>
                    <div class="p-2.5 sm:p-3 rounded-xl bg-slate-800/90 border border-cyan-400/40">
                      <div class="text-[11px] sm:text-xs text-slate-400">صندوق‌های مخفی</div>
                      <div class="text-lg sm:text-2xl font-extrabold text-cyan-300 mt-0.5">${toPersianDigits(decoyCount)} از ${toPersianDigits(2)}</div>
                    </div>
                  </div>
                </div>
              `
            }
          </div>
        </div>

        <!-- Happy Arad & Nika -->
        <div class="mt-4 sm:mt-5 flex items-center justify-center gap-3 sm:gap-4">
          <div class="w-12 h-12 sm:w-14 sm:h-14 shrink-0 animate-float">${renderCharacterAvatarSvg('arad', 'excited')}</div>
          <div class="text-xs sm:text-sm font-bold text-amber-200 bg-slate-800/85 px-3.5 py-2.5 rounded-xl border border-amber-400/35 text-right sm:text-center">
            ${
              chestOpened
                ? 'آراد و نیکا: «هورا! گنج دو جهان گشوده شد و افسانه‌مان جاودانه ماند!»'
                : bothPlaced
                ? 'آراد و نیکا: «دروازه باز شد! حالا وقت باز کردن صندوق گنج است!»'
                : 'آراد و نیکا: «نشان‌های خورشید و ماه را روی پایه‌ها بگذاریم!»'
            }
          </div>
          <div class="w-12 h-12 sm:w-14 sm:h-14 shrink-0 animate-float" style="animation-delay:0.4s">${renderCharacterAvatarSvg('nika', 'excited')}</div>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          ${
            chestOpened
              ? `<button type="button" id="victory-fireworks-replay" class="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-300/70 text-amber-200 font-extrabold text-xs sm:text-sm">
                  🎆 جشن و آتش‌بازی دوباره!
                </button>`
              : ''
          }
          <button type="button" id="victory-back-map" class="px-5 py-2.5 rounded-xl btn-secondary-slate text-xs sm:text-base">
            ${UI_TEXT.victoryReplay}
          </button>
          <button type="button" id="victory-new-game" class="px-5 py-2.5 rounded-xl btn-primary-gold text-xs sm:text-base">
            ${UI_TEXT.victoryNewQuest}
          </button>
        </div>
      </div>
    `;

    contentHost.querySelector('#place-sun-crest')?.addEventListener('click', () => {
      if (sunPlaced || isOpening) return;
      audio.playCrestActivate?.('sun');
      sunPlaced = true;
      if (sunPlaced && moonPlaced) audio.playGateOpen();
      render();
    });

    contentHost.querySelector('#place-moon-crest')?.addEventListener('click', () => {
      if (moonPlaced || isOpening) return;
      audio.playCrestActivate?.('moon');
      moonPlaced = true;
      if (sunPlaced && moonPlaced) audio.playGateOpen();
      render();
    });

    contentHost.querySelector('#open-final-chest-btn')?.addEventListener('click', () => {
      if (!bothPlaced || isOpening || chestOpened) return;
      isOpening = true;
      audio.playChestRumble?.();
      render();

      burstTimer = setTimeout(() => {
        isOpening = false;
        chestOpened = true;
        justBurst = true;
        audio.playGateOpen();
        audio.playGrandTreasureFanfare?.();
        onCompleteCeremony?.();
        render();
        triggerGrandCelebrationVolley();
      }, 650);
    });

    contentHost.querySelector('#victory-fireworks-replay')?.addEventListener('click', () => {
      audio.playGrandTreasureFanfare?.();
      triggerGrandCelebrationVolley();
    });

    contentHost.querySelector('#victory-back-map')?.addEventListener('click', () => {
      audio.playClick();
      onBackToMap?.();
    });

    contentHost.querySelector('#victory-new-game')?.addEventListener('click', () => {
      audio.playClick();
      onResetAdventure?.();
    });
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  render();
  container.appendChild(wrapper);

  if (chestOpened) {
    triggerGrandCelebrationVolley();
  }

  // Gentle periodic celebration rockets once opened
  autoVolleyTimer = setInterval(() => {
    if (!chestOpened || reducedMotion) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    rockets.push({
      x: w * (0.2 + Math.random() * 0.6),
      y: h * 0.92,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -(6.5 + Math.random() * 2.5),
      targetY: h * (0.18 + Math.random() * 0.22),
    });
    startFireworksLoop();
  }, 1900);

  return () => {
    clearTimeout(burstTimer);
    clearInterval(autoVolleyTimer);
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resizeCanvas);
  };
}
