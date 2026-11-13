import { UI_TEXT, toPersianDigits } from '../data/translations.js';
import { getRouteProgressCount, getTotalStars } from '../core/game-state.js';

export function renderKeyIconSvg(keyType, collected) {
  const color =
    keyType === 'magnetic'
      ? collected
        ? '#fbbf24'
        : '#475569'
      : collected
      ? '#e2e8f0'
      : '#475569';
  const stroke =
    keyType === 'magnetic'
      ? collected
        ? '#92400e'
        : '#334155'
      : collected
      ? '#0284c7'
      : '#334155';

  return `
    <svg viewBox="0 0 24 24" class="w-5 h-5 shrink-0" aria-hidden="true">
      <circle cx="8" cy="12" r="4.5" fill="${color}" stroke="${stroke}" stroke-width="1.8"/>
      <circle cx="8" cy="12" r="1.6" fill="#0f172a"/>
      <path d="M12.5 12 H21 V15.5 M18 12 V15" stroke="${color}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    </svg>
  `;
}

export function renderMapTopBar({
  state,
  onHome,
  onToggleSound,
  onOpenGuide,
  onOpenSettings,
}) {
  const dayCount = getRouteProgressCount(state, 'daytime');
  const nightCount = getRouteProgressCount(state, 'nighttime');
  const totalStars = getTotalStars(state);

  const bar = document.createElement('header');
  bar.className =
    'flex flex-wrap items-center justify-between gap-1.5 md:gap-3 px-2.5 sm:px-5 py-2 md:py-2.5 bg-slate-900/95 border-b border-amber-400/30 text-slate-100';

  bar.innerHTML = `
    <div class="flex items-center justify-between gap-2 w-full md:w-auto">
      <div class="flex items-center gap-2 md:gap-3 min-w-0">
        <button type="button" data-action="home" aria-label="${UI_TEXT.backToHome}" class="px-2.5 py-1.5 md:px-3 rounded-lg btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0 min-h-[34px]">
          <span class="md:hidden" aria-hidden="true">🏠</span>
          <span class="hidden md:inline">${UI_TEXT.backToHome}</span>
        </button>
        <span class="font-extrabold text-sm sm:text-base md:text-lg text-amber-300 truncate">${UI_TEXT.gameTitle}</span>
      </div>

      <div class="flex items-center gap-1.5 md:hidden shrink-0">
        <button type="button" data-action="guide" aria-label="${UI_TEXT.gameGuide}" title="${UI_TEXT.gameGuide}" class="px-2.5 py-1.5 rounded-lg btn-secondary-slate text-xs min-w-[36px] min-h-[34px]">
          <span aria-hidden="true">📖</span>
        </button>
        <button type="button" data-action="sound" aria-label="${state.muted ? UI_TEXT.soundOff : UI_TEXT.soundOn}" title="${state.muted ? UI_TEXT.soundOff : UI_TEXT.soundOn}" class="px-2.5 py-1.5 rounded-lg btn-secondary-slate text-xs min-w-[36px] min-h-[34px]">
          <span aria-hidden="true">${state.muted ? '🔇' : '🔊'}</span>
        </button>
        <button type="button" data-action="settings" aria-label="${UI_TEXT.settings}" title="${UI_TEXT.settings}" class="px-2.5 py-1.5 rounded-lg btn-secondary-slate text-xs min-w-[36px] min-h-[34px]">
          <span aria-hidden="true">⚙️</span>
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2 sm:gap-4 md:gap-5 text-[11px] sm:text-xs md:text-sm font-bold tabular-nums">
      <div class="flex items-center gap-1 md:gap-1.5 text-orange-300 whitespace-nowrap" data-testid="day-progress">
        <span aria-hidden="true">☀</span>
        <span class="hidden md:inline">${UI_TEXT.daytimeRoute}: </span>
        <span>${toPersianDigits(dayCount)}<span class="md:hidden">/</span><span class="hidden md:inline"> از </span>${toPersianDigits(6)}</span>
      </div>
      <span class="text-slate-600" aria-hidden="true">·</span>
      <div class="flex items-center gap-1 md:gap-1.5 text-cyan-300 whitespace-nowrap" data-testid="night-progress">
        <span aria-hidden="true">🌙</span>
        <span class="hidden md:inline">${UI_TEXT.nighttimeRoute}: </span>
        <span>${toPersianDigits(nightCount)}<span class="md:hidden">/</span><span class="hidden md:inline"> از </span>${toPersianDigits(6)}</span>
      </div>
      <span class="text-slate-600" aria-hidden="true">·</span>
      <div class="flex items-center gap-1 text-amber-300 whitespace-nowrap" data-testid="total-stars">
        <span aria-hidden="true">★</span>
        <span>${toPersianDigits(totalStars)}/${toPersianDigits(36)}</span>
      </div>
    </div>

    <div class="flex items-center gap-2 sm:gap-3">
      <div class="flex items-center gap-1.5 md:gap-2 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg bg-slate-800/90 border border-slate-700" aria-label="${UI_TEXT.toolkitLabel}">
        <span class="hidden md:inline text-xs text-slate-400 font-semibold">${UI_TEXT.toolkitLabel}:</span>
        <span class="inline-flex items-center gap-1 text-xs font-bold ${state.keys.magnetic ? 'text-amber-300' : 'text-slate-500'}" data-testid="key-magnetic-status" title="${UI_TEXT.magneticKey}">
          ${renderKeyIconSvg('magnetic', state.keys.magnetic)}
          <span class="hidden md:inline">${state.keys.magnetic ? UI_TEXT.magneticKey : 'ندارد'}</span>
        </span>
        <span class="text-slate-600" aria-hidden="true">|</span>
        <span class="inline-flex items-center gap-1 text-xs font-bold ${state.keys.silver ? 'text-cyan-200' : 'text-slate-500'}" data-testid="key-silver-status" title="${UI_TEXT.silverKey}">
          ${renderKeyIconSvg('silver', state.keys.silver)}
          <span class="hidden md:inline">${state.keys.silver ? UI_TEXT.silverKey : 'ندارد'}</span>
        </span>
      </div>

      <button type="button" data-action="guide" class="hidden md:inline-flex px-3 py-1.5 rounded-lg btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0">
        ${UI_TEXT.gameGuide}
      </button>
      <button type="button" data-action="sound" class="hidden md:inline-flex px-3 py-1.5 rounded-lg btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0" aria-label="${state.muted ? UI_TEXT.soundOff : UI_TEXT.soundOn}">
        ${state.muted ? '🔇 بی‌صدا' : '🔊 باصدا'}
      </button>
      <button type="button" data-action="settings" class="hidden md:inline-flex px-3 py-1.5 rounded-lg btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0">
        ${UI_TEXT.settings}
      </button>
    </div>
  `;

  bar.querySelectorAll('[data-action="home"]').forEach((el) => el.addEventListener('click', onHome));
  bar.querySelectorAll('[data-action="guide"]').forEach((el) => el.addEventListener('click', onOpenGuide));
  bar.querySelectorAll('[data-action="sound"]').forEach((el) => el.addEventListener('click', onToggleSound));
  bar.querySelectorAll('[data-action="settings"]').forEach((el) => el.addEventListener('click', onOpenSettings));

  return bar;
}
