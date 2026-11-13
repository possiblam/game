import { UI_TEXT, toPersianDigits } from '../data/translations.js';
import { renderCharacterAvatarSvg } from '../data/story.js';
import { showModal } from './modal.js';

function getStageArtSvg(stage) {
  const isDay = stage.route === 'daytime';
  const bg = isDay ? '#7c2d12' : '#0c4a6e';
  const accent = isDay ? '#fbbf24' : '#38bdf8';
  const symbols = {
    'daytime-1': '<path d="M18 42 L62 18 M18 22 L62 46" stroke="#f87171" stroke-width="3"/><circle cx="40" cy="32" r="8" fill="#fde047"/>',
    'daytime-2': '<path d="M26 20 V36 A14 14 0 0 0 54 36 V20" fill="none" stroke="#ef4444" stroke-width="6"/><rect x="23" y="16" width="6" height="6" fill="#cbd5e1"/><rect x="51" y="16" width="6" height="6" fill="#cbd5e1"/>',
    'daytime-3': '<rect x="20" y="14" width="40" height="36" rx="4" fill="none" stroke="#60a5fa" stroke-width="3"/><polygon points="40,21 48,37 32,37" fill="#fbbf24"/>',
    'daytime-4': '<line x1="12" y1="20" x2="68" y2="34" stroke="#e2e8f0" stroke-width="2.5"/><circle cx="40" cy="27" r="5" fill="#fb923c"/><path d="M20 52 Q30 38 40 52 Q50 38 60 52" fill="#ef4444"/>',
    'daytime-5': '<polygon points="40,14 60,34 40,42 20,34" fill="#38bdf8" stroke="#fef08a" stroke-width="2"/><path d="M16 52 Q30 46 44 52 T66 52" fill="none" stroke="#60a5fa" stroke-width="3"/>',
    'daytime-6': '<circle cx="40" cy="32" r="16" fill="none" stroke="#fbbf24" stroke-width="4" stroke-dasharray="18 8"/><circle cx="40" cy="32" r="5" fill="#fde047"/>',
    'nighttime-1': '<rect x="18" y="14" width="44" height="36" rx="4" fill="#1e1b4b" stroke="#38bdf8" stroke-width="2.5"/><circle cx="30" cy="28" r="4" fill="#67e8f9"/><polygon points="48,23 53,33 43,33" fill="#a78bfa"/>',
    'nighttime-2': '<circle cx="40" cy="32" r="18" fill="none" stroke="#38bdf8" stroke-width="3"/><circle cx="40" cy="32" r="11" fill="none" stroke="#a5f3fc" stroke-width="2.5"/><circle cx="40" cy="32" r="4" fill="#e2e8f0"/>',
    'nighttime-3': '<circle cx="40" cy="32" r="17" fill="#0f172a" stroke="#22d3ee" stroke-width="3"/><circle cx="40" cy="28" r="4" fill="#e2e8f0"/><path d="M37 32 L36 42 H44 L43 32 Z" fill="#e2e8f0"/>',
    'nighttime-4': '<rect x="12" y="38" width="16" height="8" rx="2" fill="#38bdf8"/><rect x="34" y="32" width="16" height="8" rx="2" fill="#67e8f9"/><rect x="54" y="38" width="16" height="8" rx="2" fill="#38bdf8"/><path d="M44 12 L38 22 H45 L40 30" stroke="#fde047" stroke-width="2.5" fill="none"/>',
    'nighttime-5': '<circle cx="40" cy="32" r="14" fill="none" stroke="#22d3ee" stroke-width="3"/><rect x="33" y="29" width="14" height="6" rx="3" fill="#f8fafc"/><line x1="28" y1="26" x2="36" y2="26" stroke="#fbbf24" stroke-width="2"/><line x1="44" y1="26" x2="52" y2="26" stroke="#fbbf24" stroke-width="2"/>',
    'nighttime-6': '<path d="M40 16 V48 M32 24 L40 16 L48 24 M32 40 L40 48 L48 40" stroke="#67e8f9" stroke-width="3" fill="none" stroke-linecap="round"/>',
  };

  return `
    <svg viewBox="0 0 80 64" class="w-24 h-20 rounded-xl border-2 shrink-0" style="background:${bg}; border-color:${accent};" aria-hidden="true">
      ${symbols[stage.id] || ''}
    </svg>
  `;
}

export function showStageIntroModal(stage, { hasKey = true, onStart, onCancel }) {
  const routeLabel = stage.route === 'daytime' ? UI_TEXT.daytimeRoute : UI_TEXT.nighttimeRoute;
  const keyWarning =
    stage.requiresKey && !hasKey
      ? `<div class="mt-3 p-3 rounded-xl bg-amber-950/70 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-bold">
          توجه: برای باز کردن این دروازه به ${stage.requiresKey === 'magnetic' ? UI_TEXT.magneticKey : UI_TEXT.silverKey} از مرحله دوم نیاز دارید! می‌توانید دروازه را ببینید اما تا کلید را برندارید باز نمی‌شود.
        </div>`
      : '';

  showModal({
    title: `${routeLabel} · ${UI_TEXT.stagePrefix} ${toPersianDigits(stage.number)}: ${stage.title}`,
    bodyHtml: `
      <div class="flex flex-col sm:flex-row items-center gap-4 mb-4">
        ${getStageArtSvg(stage)}
        <div>
          <p class="text-slate-100 font-semibold leading-relaxed m-0">${stage.story}</p>
        </div>
      </div>
      <div class="p-3.5 rounded-xl bg-slate-800/85 border border-slate-700 space-y-2">
        <div class="text-amber-300 font-bold text-sm">هدف مرحله:</div>
        <p class="m-0 text-slate-200 text-sm">${stage.goal}</p>
        <div class="text-xs text-slate-400 pt-1 border-t border-slate-700/80">روش بازی: ${stage.controlsHint}</div>
      </div>
      ${keyWarning}
      <div class="mt-4 flex items-center gap-2.5 text-xs text-slate-300">
        <div class="w-9 h-9 shrink-0">${renderCharacterAvatarSvg('arad', 'excited')}</div>
        <span>آراد: «ما آماده‌ایم! بزن بریم!»</span>
      </div>
    `,
    actions: [
      {
        label: UI_TEXT.backToMap,
        variant: 'secondary',
        onClick: () => onCancel?.(),
      },
      {
        label: UI_TEXT.startChallenge,
        variant: 'primary',
        testId: 'start-challenge-btn',
        onClick: () => onStart?.(),
      },
    ],
  });
}
