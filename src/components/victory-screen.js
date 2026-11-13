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
  let chestOpened = Boolean(state.finalCompleted);

  const totalStars = getTotalStars(state);
  const totalCompleted = getTotalCompletedStages(state);

  const wrapper = document.createElement('div');
  wrapper.className =
    'min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-indigo-950 via-slate-900 to-amber-950 text-slate-100 relative overflow-hidden';

  function render() {
    const bothPlaced = sunPlaced && moonPlaced;

    wrapper.innerHTML = `
      <div class="absolute inset-0 pointer-events-none overflow-hidden" id="victory-particles"></div>

      <div class="storybook-panel relative z-10 w-full max-w-3xl rounded-3xl p-5 sm:p-8 text-center">
        <h1 class="text-2xl sm:text-4xl font-extrabold text-amber-300 mb-2">${FINAL_VICTORY_STORY.title}</h1>
        <p class="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed">
          ${
            chestOpened
              ? FINAL_VICTORY_STORY.congratulationsText
              : bothPlaced
              ? FINAL_VICTORY_STORY.emblemText
              : FINAL_VICTORY_STORY.openingText
          }
        </p>

        <div class="mt-6 relative mx-auto max-w-xl rounded-2xl p-5 bg-slate-900/90 border-2 ${
          chestOpened ? 'border-amber-300 shadow-[0_0_50px_rgba(251,191,36,0.45)]' : 'border-amber-500/40'
        }">
          <!-- Temple Gate & Crests -->
          <div class="flex items-center justify-center gap-6 sm:gap-12 mb-5">
            <button type="button" id="place-sun-crest"
              class="px-4 py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                sunPlaced
                  ? 'bg-orange-500/25 border-amber-300 text-amber-200 shadow-lg'
                  : 'bg-slate-800 hover:bg-orange-950/60 border-orange-400/70 text-orange-200 animate-pulse'
              }"
              ${sunPlaced ? 'disabled' : ''}>
              <span class="text-3xl" aria-hidden="true">☀️</span>
              <span class="text-xs sm:text-sm font-bold">${sunPlaced ? 'نشان خورشید قرار گرفت' : 'قرار دادن نشان خورشید'}</span>
            </button>

            <button type="button" id="place-moon-crest"
              class="px-4 py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                moonPlaced
                  ? 'bg-cyan-500/25 border-cyan-300 text-cyan-100 shadow-lg'
                  : 'bg-slate-800 hover:bg-cyan-950/60 border-cyan-400/70 text-cyan-200 animate-pulse'
              }"
              ${moonPlaced ? 'disabled' : ''}>
              <span class="text-3xl" aria-hidden="true">🌙</span>
              <span class="text-xs sm:text-sm font-bold">${moonPlaced ? 'نشان ماه قرار گرفت' : 'قرار دادن نشان ماه'}</span>
            </button>
          </div>

          <!-- Golden Treasure Chest SVG -->
          <div class="flex flex-col items-center">
            <svg viewBox="0 0 220 150" class="w-56 h-40 mx-auto" aria-label="صندوق گنج طلایی">
              <defs>
                <radialGradient id="goldGlow" cx="50%" cy="40%" r="55%">
                  <stop offset="0%" stop-color="#fef08a" stop-opacity="${chestOpened ? '0.95' : '0.1'}"/>
                  <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
                </radialGradient>
              </defs>
              <circle cx="110" cy="68" r="72" fill="url(#goldGlow)"/>
              ${
                chestOpened
                  ? `
                  <!-- Open lid tilted back -->
                  <path d="M40 62 C40 24 180 24 180 62 Z" fill="#b45309" stroke="#fbbf24" stroke-width="4"/>
                  <!-- Treasure coins & gems spilling out -->
                  <circle cx="75" cy="70" r="9" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>
                  <circle cx="95" cy="62" r="10" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
                  <circle cx="115" cy="65" r="11" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>
                  <circle cx="136" cy="63" r="9" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
                  <polygon points="105,46 113,56 105,66 97,56" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.5"/>
                  <polygon points="128,48 135,57 128,66 121,57" fill="#f43f5e" stroke="#ffe4e6" stroke-width="1.5"/>
                  <polygon points="84,50 90,58 84,66 78,58" fill="#34d399" stroke="#d1fae5" stroke-width="1.5"/>
                `
                  : `
                  <!-- Closed lid -->
                  <path d="M38 74 C38 36 182 36 182 74 Z" fill="#92400e" stroke="#fbbf24" stroke-width="4"/>
                `
              }
              <!-- Chest Base -->
              <rect x="38" y="72" width="144" height="58" rx="8" fill="#78350f" stroke="#fbbf24" stroke-width="4"/>
              <rect x="64" y="72" width="14" height="58" fill="#f59e0b"/>
              <rect x="142" y="72" width="14" height="58" fill="#f59e0b"/>
              <rect x="98" y="78" width="24" height="22" rx="4" fill="#fde047" stroke="#92400e" stroke-width="2.5"/>
              <circle cx="110" cy="89" r="4" fill="#451a03"/>
            </svg>

            ${
              !chestOpened
                ? `
                <button type="button" id="open-final-chest-btn"
                  class="mt-3 px-6 py-3 rounded-xl text-base ${bothPlaced ? 'btn-primary-gold' : 'btn-secondary-slate opacity-60'}"
                  ${bothPlaced ? '' : 'disabled'}>
                  ${bothPlaced ? 'باز کردن گنج افسانه‌ای!' : 'ابتدا هر دو نشان خورشید و ماه را قرار دهید'}
                </button>
              `
                : `
                <div class="mt-3 grid grid-cols-2 gap-4 w-full max-w-md tabular-nums">
                  <div class="p-3 rounded-xl bg-slate-800/90 border border-amber-400/40">
                    <div class="text-xs text-slate-400">مراحل تکمیل‌شده</div>
                    <div class="text-2xl font-extrabold text-emerald-300 mt-1">${toPersianDigits(totalCompleted)} ${UI_TEXT.ofTwelve}</div>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-800/90 border border-amber-400/40">
                    <div class="text-xs text-slate-400">مجموع ستاره‌ها</div>
                    <div class="text-2xl font-extrabold text-amber-300 mt-1">${toPersianDigits(totalStars)} از ${toPersianDigits(36)} ★</div>
                  </div>
                </div>
              `
            }
          </div>
        </div>

        <!-- Happy Arad & Nika -->
        <div class="mt-5 flex items-center justify-center gap-4">
          <div class="w-14 h-14 animate-float">${renderCharacterAvatarSvg('arad', 'excited')}</div>
          <div class="text-xs sm:text-sm font-bold text-amber-200 bg-slate-800/80 px-4 py-2 rounded-xl border border-amber-400/30">
            ${chestOpened ? 'آراد و نیکا: «هورا! راز دو جهان برای همیشه کشف شد!»' : 'آراد و نیکا: «نشان‌های خورشید و ماه را در جایگاهشان بگذاریم!»'}
          </div>
          <div class="w-14 h-14 animate-float" style="animation-delay:0.4s">${renderCharacterAvatarSvg('nika', 'excited')}</div>
        </div>

        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" id="victory-back-map" class="px-5 py-2.5 rounded-xl btn-secondary-slate text-sm sm:text-base">
            ${UI_TEXT.victoryReplay}
          </button>
          <button type="button" id="victory-new-game" class="px-5 py-2.5 rounded-xl btn-primary-gold text-sm sm:text-base">
            ${UI_TEXT.victoryNewQuest}
          </button>
        </div>
      </div>
    `;

    if (chestOpened) {
      spawnCoins();
    }

    wrapper.querySelector('#place-sun-crest')?.addEventListener('click', () => {
      audio.playMechanism();
      sunPlaced = true;
      render();
    });

    wrapper.querySelector('#place-moon-crest')?.addEventListener('click', () => {
      audio.playMechanism();
      moonPlaced = true;
      render();
    });

    wrapper.querySelector('#open-final-chest-btn')?.addEventListener('click', () => {
      if (!bothPlaced) return;
      chestOpened = true;
      audio.playGateOpen();
      audio.playVictoryFanfare();
      onCompleteCeremony?.();
      render();
    });

    wrapper.querySelector('#victory-back-map')?.addEventListener('click', () => {
      audio.playClick();
      onBackToMap?.();
    });

    wrapper.querySelector('#victory-new-game')?.addEventListener('click', () => {
      audio.playClick();
      onResetAdventure?.();
    });
  }

  function spawnCoins() {
    const host = wrapper.querySelector('#victory-particles');
    if (!host) return;
    const items = ['🪙', '💎', '✨', '⭐', '🟡'];
    for (let i = 0; i < 26; i++) {
      const el = document.createElement('span');
      el.textContent = items[i % items.length];
      el.style.position = 'absolute';
      el.style.left = `${(i * 3.8 + (i % 5) * 4) % 98}%`;
      el.style.top = `${-10 + (i % 4) * 8}%`;
      el.style.fontSize = `${18 + (i % 3) * 6}px`;
      el.style.animation = `coinFall ${2.2 + (i % 4) * 0.55}s linear ${(i % 6) * 0.25}s infinite`;
      host.appendChild(el);
    }
  }

  if (chestOpened) {
    sunPlaced = true;
    moonPlaced = true;
  }

  render();
  container.appendChild(wrapper);
}
