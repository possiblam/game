import { UI_TEXT, toPersianDigits } from '../data/translations.js';
import { getWorldConfig } from '../data/worlds.js';
import { CHARACTERS, renderCharacterAvatarSvg } from '../data/story.js';
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

    // World 2 (Two Lanterns) custom icons
    'lanterns-daytime-1': '<circle cx="20" cy="22" r="7" fill="#fde047"/><polyline points="20,22 40,42 62,18" fill="none" stroke="#fef08a" stroke-width="3"/><line x1="32" y1="44" x2="48" y2="40" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>',
    'lanterns-daytime-2': '<path d="M16 24 H40 V44 H62" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/><circle cx="62" cy="44" r="6" fill="#4ade80"/><circle cx="28" cy="24" r="5" fill="#fbbf24"/>',
    'lanterns-daytime-3': '<circle cx="28" cy="32" r="11" fill="none" stroke="#fbbf24" stroke-width="4" stroke-dasharray="5 3"/><circle cx="51" cy="32" r="13" fill="none" stroke="#fb923c" stroke-width="4" stroke-dasharray="6 3"/>',
    'lanterns-daytime-4': '<line x1="12" y1="44" x2="68" y2="44" stroke="#94a3b8" stroke-width="4"/><circle cx="24" cy="32" r="6" fill="#38bdf8"/><polygon points="44,24 51,38 37,38" fill="#f87171"/><polygon points="62,24 68,28 68,35 62,39 56,35 56,28" fill="#fbbf24"/>',
    'lanterns-daytime-5': '<line x1="40" y1="30" x2="40" y2="52" stroke="#cbd5e1" stroke-width="3"/><line x1="40" y1="28" x2="24" y2="16" stroke="#f8fafc" stroke-width="3.5" stroke-linecap="round"/><line x1="40" y1="28" x2="57" y2="19" stroke="#f8fafc" stroke-width="3.5" stroke-linecap="round"/><line x1="40" y1="28" x2="36" y2="44" stroke="#f8fafc" stroke-width="3.5" stroke-linecap="round"/>',
    'lanterns-daytime-6': '<path d="M10 46 Q25 40 40 46 T70 46" fill="none" stroke="#38bdf8" stroke-width="3"/><rect x="16" y="34" width="18" height="7" rx="2" fill="#f59e0b"/><rect x="46" y="34" width="18" height="7" rx="2" fill="#fbbf24"/><line x1="34" y1="37" x2="46" y2="37" stroke="#fef08a" stroke-width="2" stroke-dasharray="3 2"/>',

    'lanterns-nighttime-1': '<polygon points="24,46 30,20 36,46" fill="#38bdf8"/><polygon points="40,46 46,16 52,46" fill="#a78bfa"/><polygon points="56,46 61,26 66,46" fill="#22d3ee"/><path d="M16 18 Q40 8 64 18" fill="none" stroke="#e0f2fe" stroke-width="2" stroke-dasharray="4 3"/>',
    'lanterns-nighttime-2': '<circle cx="40" cy="32" r="18" fill="none" stroke="#38bdf8" stroke-width="2.5"/><circle cx="40" cy="32" r="11" fill="none" stroke="#fbbf24" stroke-width="2"/><polygon points="40,12 42,18 48,18 43,21 45,27 40,23 35,27 37,21 32,18 38,18" fill="#fde047"/>',
    'lanterns-nighttime-3': '<rect x="18" y="14" width="44" height="36" rx="6" fill="#0f172a" stroke="#67e8f9" stroke-width="2.5"/><path d="M40 20 V44 M29 26 L51 38 M51 26 L29 38" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>',
    'lanterns-nighttime-4': '<polygon points="32,20 42,38 22,38" fill="#e2e8f0" opacity="0.85"/><line x1="12" y1="30" x2="27" y2="30" stroke="#ffffff" stroke-width="3"/><line x1="37" y1="30" x2="66" y2="20" stroke="#22d3ee" stroke-width="3"/><line x1="37" y1="32" x2="64" y2="46" stroke="#e879f9" stroke-width="3"/>',
    'lanterns-nighttime-5': '<line x1="12" y1="18" x2="68" y2="26" stroke="#cbd5e1" stroke-width="2.5"/><line x1="40" y1="22" x2="40" y2="30" stroke="#94a3b8" stroke-width="2"/><rect x="28" y="30" width="24" height="16" rx="4" fill="#ef4444" stroke="#fef08a" stroke-width="2"/>',
    'lanterns-nighttime-6': '<rect x="16" y="16" width="13" height="13" rx="2" fill="#38bdf8"/><rect x="33" y="16" width="13" height="13" rx="2" fill="#1e293b" stroke="#475569"/><rect x="50" y="16" width="13" height="13" rx="2" fill="#ef4444" opacity="0.7"/><rect x="33" y="34" width="13" height="13" rx="2" fill="#38bdf8"/>',
  };

  return `
    <svg viewBox="0 0 80 64" class="w-24 h-20 rounded-xl border-2 shrink-0" style="background:${bg}; border-color:${accent};" aria-hidden="true">
      ${symbols[stage.id] || '<circle cx="40" cy="32" r="14" fill="#fbbf24"/>'}
    </svg>
  `;
}

export function showStageIntroModal(stage, { hasKey = true, selectedHero = 'arad', onStart, onCancel }) {
  const world = getWorldConfig(stage.worldId || 'two-worlds');
  const routeLabel = stage.route === 'daytime' ? UI_TEXT.daytimeRoute : UI_TEXT.nighttimeRoute;
  const neededKeyName = stage.requiresKey === 'magnetic' ? world.daytimeKeyName : world.nighttimeKeyName;

  const keyWarning =
    stage.requiresKey && !hasKey
      ? `<div class="mt-3 p-3 rounded-xl bg-amber-950/70 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-bold">
          توجه: برای باز کردن این دروازه به ${neededKeyName} از مرحله دوم نیاز دارید! می‌توانید دروازه را ببینید اما تا کلید را برندارید باز نمی‌شود.
        </div>`
      : '';

  const speakerId = stage.worldId === 'two-lanterns' ? selectedHero : 'arad';
  const speakerChar = CHARACTERS[speakerId] || CHARACTERS.arad;

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
        <div class="flex items-center justify-between gap-2">
          <span class="text-amber-300 font-bold text-sm">هدف مرحله:</span>
          ${
            stage.skillBadge
              ? `<span class="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold">نشان: ${stage.skillBadge}</span>`
              : ''
          }
        </div>
        <p class="m-0 text-slate-200 text-sm">${stage.goal}</p>
        <div class="text-xs text-slate-400 pt-1 border-t border-slate-700/80">روش بازی: ${stage.controlsHint}</div>
      </div>
      ${keyWarning}
      <div class="mt-4 flex items-center justify-between gap-2.5 text-xs text-slate-300">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 shrink-0">${renderCharacterAvatarSvg(speakerChar.id, 'excited')}</div>
          <span>${speakerChar.name}: «ما آماده‌ایم! بزن بریم!»</span>
        </div>
        ${
          stage.xpReward
            ? `<span class="text-amber-300 font-extrabold tabular-nums">+${toPersianDigits(stage.xpReward)} امتیاز</span>`
            : ''
        }
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
