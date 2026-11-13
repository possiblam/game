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
    'flex flex-wrap items-center justify-between gap-3 px-3 sm:px-5 py-2.5 bg-slate-900/95 border-b border-amber-400/30 text-slate-100';

  bar.innerHTML = `
    <div class="flex items-center gap-3">
      <button type="button" data-action="home" class="px-3 py-1.5 rounded-lg btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0">
        ${UI_TEXT.backToHome}
      </button>
      <span class="font-extrabold text-base sm:text-lg text-amber-300 whitespace-nowrap">${UI_TEXT.gameTitle}</span>
    </div>

    <div class="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm font-bold tabular-nums">
      <div class="flex items-center gap-1.5 text-orange-300 whitespace-nowrap" data-testid="day-progress">
        <span aria-hidden="true">☀</span>
        <span>${UI_TEXT.daytimeRoute}: ${toPersianDigits(dayCount)} ${UI_TEXT.ofSix}</span>
      </div>
      <span class="text-slate-600" aria-hidden="true">·</span>
      <div class="flex items-center gap-1.5 text-cyan-300 whitespace-nowrap" data-testid="night-progress">
        <span aria-hidden="true">🌙</span>
        <span>${UI_TEXT.nighttimeRoute}: ${toPersianDigits(nightCount)} ${UI_TEXT.ofSix}</span>
      </div>
      <span class="text-slate-600" aria-hidden="true">·</span>
      <div class="flex items-center gap-1 text-amber-300 whitespace-nowrap" data-testid="total-stars">
        <span aria-hidden="true">★</span>
        <span>${toPersianDigits(totalStars)} / ${toPersianDigits(36)}</span>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
      <div class="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700" aria-label="${UI_TEXT.toolkitLabel}">
        <span class="text-xs text-slate-400 font-semibold">${UI_TEXT.toolkitLabel}:</span>
        <span class="inline-flex items-center gap-1 text-xs font-bold ${state.keys.magnetic ? 'text-amber-300' : 'text-slate-500'}" data-testid="key-magnetic-status" title="${UI_TEXT.magneticKey}">
          ${renderKeyIconSvg('magnetic', state.keys.magnetic)}
          <span>${state.keys.magnetic ? UI_TEXT.magneticKey : 'ندارد'}</span>
        </span>
        <span class="text-slate-600" aria-hidden="true">|</span>
        <span class="inline-flex items-center gap-1 text-xs font-bold ${state.keys.silver ? 'text-cyan-200' : 'text-slate-500'}" data-testid="key-silver-status" title="${UI_TEXT.silverKey}">
          ${renderKeyIconSvg('silver', state.keys.silver)}
          <span>${state.keys.silver ? UI_TEXT.silverKey : 'ندارد'}</span>
        </span>
      </div>

      <button type="button" data-action="guide" class="px-3 py-1.5 rounded-lg btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0">
        ${UI_TEXT.gameGuide}
      </button>
      <button type="button" data-action="sound" class="px-3 py-1.5 rounded-lg btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0" aria-label="${state.muted ? UI_TEXT.soundOff : UI_TEXT.soundOn}">
        ${state.muted ? '🔇 بی‌صدا' : '🔊 باصدا'}
      </button>
      <button type="button" data-action="settings" class="px-3 py-1.5 rounded-lg btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0">
        ${UI_TEXT.settings}
      </button>
    </div>
  `;

  bar.querySelector('[data-action="home"]').addEventListener('click', onHome);
  bar.querySelector('[data-action="guide"]').addEventListener('click', onOpenGuide);
  bar.querySelector('[data-action="sound"]').addEventListener('click', onToggleSound);
  bar.querySelector('[data-action="settings"]').addEventListener('click', onOpenSettings);

  return bar;
}
