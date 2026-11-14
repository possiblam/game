import { WORLDS, getWorldConfig, getWorldDifficultyBadgeClass } from '../data/worlds.js';
import { getWorldProgressSummary, getTotalXP } from '../core/game-state.js';
import { CHARACTERS, renderCharacterAvatarSvg } from '../data/story.js';
import { toPersianDigits } from '../data/translations.js';
import { showModal, closeActiveModal } from './modal.js';

export function showWorldSelectorModal({ state, audio, onSelectWorld, onSelectHero }) {
  let currentHero = state.selectedHero === 'raha' ? 'raha' : 'arad';
  let activeFilter = 'all'; // 'all' | 'unlocked' | 'locked'

  function renderBody() {
    const totalXp = getTotalXP(state);
    const difficultyTrail = WORLDS.map((w) => w.difficultyLabel).join(' ← ');

    const filteredWorlds = WORLDS.filter((world) => {
      const summary = getWorldProgressSummary(state, world.id);
      if (activeFilter === 'unlocked') return summary.unlocked;
      if (activeFilter === 'locked') return !summary.unlocked;
      return true;
    });

    const worldsHtml =
      filteredWorlds.length === 0
        ? `<div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-700 text-center text-sm text-slate-300">
             هیچ نقشه‌ای در این دسته وجود ندارد.
           </div>`
        : filteredWorlds
            .map((world) => {
              const summary = getWorldProgressSummary(state, world.id);
              const isActive = state.activeWorldId === world.id;
              const reqWorld = world.unlockRequirementWorldId
                ? getWorldConfig(world.unlockRequirementWorldId)
                : null;
              const reqSummary = reqWorld ? getWorldProgressSummary(state, reqWorld.id) : null;

              const diffClass = getWorldDifficultyBadgeClass(world.difficultyColor);
              const pct = Math.round((summary.completedCount / 12) * 100);

              let actionButtonHtml = '';
              if (!summary.unlocked) {
                actionButtonHtml = `
                  <div class="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-amber-200 font-bold flex flex-col gap-1">
                    <span>🔒 قفل است — پیش‌نیاز: فتح گنج افسانه‌ای «${reqWorld?.title || 'نقشه قبلی'}»</span>
                    <span class="text-slate-400 tabular-nums">پیشرفت نقشه قبلی: ${toPersianDigits(reqSummary?.completedCount || 0)} از ${toPersianDigits(12)} مرحله</span>
                  </div>
                `;
              } else {
                actionButtonHtml = `
                  <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-3 text-xs font-bold text-slate-300 tabular-nums">
                      <span>${toPersianDigits(summary.completedCount)}/${toPersianDigits(12)} مرحله</span>
                      <span class="text-amber-300">${toPersianDigits(summary.stars)}/${toPersianDigits(world.maxStars)} ★</span>
                      ${summary.finalCompleted ? '<span class="text-emerald-300">👑 فتح‌شده</span>' : ''}
                    </div>
                    <button type="button" data-select-world="${world.id}" data-testid="select-world-${world.id}"
                      class="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold ${
                        isActive ? 'btn-primary-gold' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }">
                      ${isActive ? '✓ نقشه فعال (ورود)' : 'ورود به نقشه'}
                    </button>
                  </div>
                `;
              }

              return `
                <div class="rounded-2xl p-3.5 sm:p-4 border-2 transition-all ${
                  !summary.unlocked
                    ? 'bg-slate-900/75 border-slate-700/80 opacity-90'
                    : isActive
                    ? 'bg-slate-800/95 border-amber-400 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/90 border-slate-600 hover:border-amber-300/70'
                }" data-testid="world-card-${world.id}">
                  <div class="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center">
                    <div class="relative w-full sm:w-40 aspect-[16/9] rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-950">
                      <img src="${world.mapImage}" alt="${world.title}" class="w-full h-full object-cover ${!summary.unlocked ? 'grayscale opacity-50' : ''}"/>
                      <span class="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${diffClass}">
                        درجه: ${world.difficultyLabel}
                      </span>
                      ${
                        !summary.unlocked
                          ? '<div class="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-2xl">🔒</div>'
                          : ''
                      }
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="text-xs font-bold text-slate-400 tabular-nums">نقشه ${toPersianDigits(world.order)} از ${toPersianDigits(WORLDS.length)}</span>
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-200 tabular-nums">
                          ${toPersianDigits(summary.xp)} امتیاز تجربه
                        </span>
                      </div>
                      <h3 class="text-base sm:text-lg font-extrabold text-amber-200 mt-0.5 mb-1">${world.title}</h3>
                      <p class="text-xs text-slate-300 m-0 leading-relaxed">${world.subtitle} · «${world.tagline}»</p>

                      <div class="mt-2.5 w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                        <div class="h-full rounded-full bg-gradient-to-l from-amber-400 to-emerald-400 transition-all" style="width:${pct}%"></div>
                      </div>

                      ${actionButtonHtml}
                    </div>
                  </div>
                </div>
              `;
            })
            .join('');

    const heroCardsHtml = ['arad', 'raha']
      .map((heroId) => {
        const c = CHARACTERS[heroId];
        const selected = currentHero === heroId;
        return `
          <button type="button" data-pick-hero="${heroId}" data-testid="pick-hero-${heroId}"
            class="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border-2 text-right transition-all ${
              selected
                ? 'bg-cyan-950/50 border-amber-300 text-white shadow-md'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500'
            }">
            <div class="w-11 h-11 shrink-0">${renderCharacterAvatarSvg(heroId, selected ? 'excited' : 'happy')}</div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1">
                <span class="font-extrabold text-sm ${selected ? 'text-amber-200' : 'text-slate-100'}">${c.name}</span>
                ${selected ? '<span class="text-[11px] font-bold text-emerald-300">✓ انتخاب‌شده</span>' : ''}
              </div>
              <div class="text-[11px] text-slate-300 truncate">${c.title}</div>
            </div>
          </button>
        `;
      })
      .join('');

    const filterButtonsHtml = [
      { id: 'all', label: `همه (${toPersianDigits(WORLDS.length)})` },
      { id: 'unlocked', label: 'بازشده' },
      { id: 'locked', label: 'قفل‌شده' },
    ]
      .map(
        (f) => `
          <button type="button" data-world-filter="${f.id}"
            class="px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all ${
              activeFilter === f.id
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500'
            }">
            ${f.label}
          </button>
        `
      )
      .join('');

    return `
      <div class="space-y-3.5">
        <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs sm:text-sm">
          <span class="text-slate-200 font-bold">مسیر پلکانی: <strong class="text-amber-300">${difficultyTrail}</strong></span>
          <span class="font-extrabold text-cyan-300 tabular-nums">مجموع امتیاز تجربه: ${toPersianDigits(totalXp)}</span>
        </div>

        <div class="flex items-center gap-1.5">
          ${filterButtonsHtml}
        </div>

        <div class="space-y-3 max-h-[46vh] overflow-y-auto pl-1">
          ${worldsHtml}
        </div>

        <div class="p-3.5 rounded-2xl bg-slate-900/85 border border-cyan-400/30 space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs sm:text-sm font-extrabold text-cyan-200">انتخاب قهرمان (ویژه نقشه‌های پیشرفته)</span>
            <span class="text-[11px] text-slate-400">با همراهی ربات پیکو</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="world-selector-heroes">
            ${heroCardsHtml}
          </div>
        </div>
      </div>
    `;
  }

  function mountModal() {
    const modal = showModal({
      title: 'انتخاب نقشه ماجراجویی و قهرمان',
      maxWidth: 'max-w-3xl',
      bodyHtml: renderBody(),
      actions: [{ label: 'بستن', variant: 'secondary' }],
    });

    modal.bodyElement.querySelectorAll('[data-world-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.playClick();
        activeFilter = btn.dataset.worldFilter;
        mountModal();
      });
    });

    modal.bodyElement.querySelectorAll('[data-select-world]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.playClick();
        const worldId = btn.dataset.selectWorld;
        closeActiveModal();
        onSelectWorld?.(worldId);
      });
    });

    modal.bodyElement.querySelectorAll('[data-pick-hero]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audio.playClick();
        const heroId = btn.dataset.pickHero;
        currentHero = heroId;
        onSelectHero?.(heroId);
        mountModal();
      });
    });
  }

  mountModal();
}
