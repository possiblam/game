import { ProgressManager } from './core/progress-manager.js';
import { AudioManager } from './core/audio-manager.js';
import { SceneManager } from './core/scene-manager.js';
import {
  applyStageCompletion,
  applyDecoyDiscovery,
  applyFinalVictory,
  getTotalCompletedStages,
  getTotalStars,
  getTotalXP,
  getWorldState,
  getWorldProgressSummary,
  isWorldUnlocked,
  setActiveWorld,
  setSelectedHero,
  markWorldIntroSeen,
} from './core/game-state.js';
import { launchStageMiniGame } from './core/game-engine.js';
import { UI_TEXT, toPersianDigits } from './data/translations.js';
import { WORLDS, getWorldConfig, getNextWorldConfig } from './data/worlds.js';
import {
  CHARACTERS,
  GUIDE_SECTIONS,
  getIntroSlidesForWorld,
  renderCharacterAvatarSvg,
} from './data/story.js';
import { getStage } from './data/stages.js';
import { renderMapView } from './map/map-view.js';
import { showStageIntroModal } from './components/stage-intro.js';
import { showStageResultModal, renderFinalTempleScene } from './components/victory-screen.js';
import { showWorldSelectorModal } from './components/world-selector.js';
import { showModal, closeActiveModal } from './components/modal.js';
import { renderSplashScreen } from './components/splash-screen.js';

export function initApp(rootEl) {
  const progressManager = new ProgressManager();
  let state = progressManager.load();
  const audio = new AudioManager(state.muted);
  const sceneManager = new SceneManager(rootEl);

  function save() {
    progressManager.save(state);
  }

  function toggleSound() {
    audio.ensureContext();
    const nextMuted = !state.muted;
    state = { ...state, muted: nextMuted };
    audio.setMuted(nextMuted);
    save();
    return nextMuted;
  }

  function enterWorld(worldId) {
    if (!isWorldUnlocked(state, worldId)) return;
    state = setActiveWorld(state, worldId);
    save();
    const ws = getWorldState(state, worldId);
    if (!ws.introSeen) {
      showStoryIntro(worldId);
    } else {
      showMap();
    }
  }

  function openWorldSelector({ fromScene = 'map' } = {}) {
    audio.playClick();
    showWorldSelectorModal({
      state,
      audio,
      onSelectHero: (heroId) => {
        state = setSelectedHero(state, heroId);
        save();
        if (fromScene === 'title') {
          // Keep state fresh; title screen updates on modal close or next enter
        }
      },
      onSelectWorld: (worldId) => {
        enterWorld(worldId);
      },
    });
  }

  function openGuideModal() {
    audio.playClick();
    showModal({
      title: UI_TEXT.gameGuide,
      maxWidth: 'max-w-xl',
      bodyHtml: `
        <div class="space-y-3">
          ${GUIDE_SECTIONS.map(
            (sec, idx) => `
              <div class="p-3.5 rounded-xl bg-slate-800/85 border border-slate-700">
                <div class="font-extrabold text-amber-300 text-sm mb-1">${toPersianDigits(idx + 1)}. ${sec.title}</div>
                <p class="m-0 text-xs sm:text-sm text-slate-200 leading-relaxed">${sec.body}</p>
              </div>
            `
          ).join('')}
        </div>
      `,
      actions: [{ label: 'بسیار خب!', variant: 'primary' }],
    });
  }

  function openSettingsModal() {
    audio.playClick();
    const world = getWorldConfig(state.activeWorldId);
    const completed = getTotalCompletedStages(state, world.id);
    const stars = getTotalStars(state, world.id);
    const totalXp = getTotalXP(state);

    showModal({
      title: UI_TEXT.settings,
      bodyHtml: `
        <div class="space-y-4">
          <div class="p-3.5 rounded-xl bg-slate-800/85 border border-slate-700 flex items-center justify-between">
            <span class="font-bold text-sm">موسیقی و افکت‌های صوتی</span>
            <button type="button" id="modal-toggle-sound" class="px-4 py-2 rounded-xl btn-secondary-slate text-xs sm:text-sm">
              ${state.muted ? '🔇 صدا قطع است (روشن کن)' : '🔊 صدا روشن است (قطع کن)'}
            </button>
          </div>
          <div class="p-3.5 rounded-xl bg-slate-800/85 border border-slate-700 text-xs sm:text-sm space-y-1.5 tabular-nums">
            <div>نقشه فعال: <strong class="text-amber-200">${world.title} (${world.difficultyLabel})</strong></div>
            <div>مراحل تکمیل‌شده نقشه فعلی: <strong class="text-emerald-300">${toPersianDigits(completed)} از ${toPersianDigits(12)}</strong></div>
            <div>ستاره‌های نقشه فعلی: <strong class="text-amber-300">${toPersianDigits(stars)} از ${toPersianDigits(world.maxStars)}</strong></div>
            <div>مجموع امتیاز تجربه کل: <strong class="text-cyan-300">${toPersianDigits(totalXp)}</strong></div>
          </div>
          <div class="p-3.5 rounded-xl bg-red-950/35 border border-red-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div class="font-bold text-red-200 text-sm">${UI_TEXT.newGame}</div>
              <div class="text-xs text-slate-300">پاک کردن ذخیره فعلی و شروع ماجراجویی از ابتدا</div>
            </div>
            <button type="button" id="modal-request-reset" data-testid="request-new-game-btn" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm whitespace-nowrap">
              ${UI_TEXT.newGame}
            </button>
          </div>
        </div>
      `,
      actions: [{ label: UI_TEXT.close, variant: 'secondary' }],
    });

    document.getElementById('modal-toggle-sound')?.addEventListener('click', (e) => {
      const muted = toggleSound();
      e.currentTarget.textContent = muted ? '🔇 صدا قطع است (روشن کن)' : '🔊 صدا روشن است (قطع کن)';
    });

    document.getElementById('modal-request-reset')?.addEventListener('click', () => {
      confirmResetProgress();
    });
  }

  function confirmResetProgress() {
    audio.playClick();
    showModal({
      title: UI_TEXT.newGameConfirmTitle,
      bodyHtml: `<p class="m-0 leading-relaxed text-slate-200">${UI_TEXT.newGameConfirmMessage}</p>`,
      actions: [
        { label: UI_TEXT.cancel, variant: 'secondary' },
        {
          label: UI_TEXT.confirmReset,
          variant: 'danger',
          testId: 'confirm-reset-btn',
          onClick: () => {
            const wasMuted = state.muted;
            state = progressManager.reset();
            state.muted = wasMuted;
            save();
            showTitleScreen();
          },
        },
      ],
    });
  }

  function showStoryIntro(worldId = state.activeWorldId) {
    audio.ensureContext();
    audio.setMusicTheme('map');
    const world = getWorldConfig(worldId);
    const slides = getIntroSlidesForWorld(world.id);
    const isLanterns = world.id === 'two-lanterns';
    let slideIdx = 0;

    sceneManager.mount('story', 'playing', (mountEl) => {
      const wrapper = document.createElement('div');
      wrapper.className =
        'min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden';

      function getSlideAvatars(speaker) {
        if (speaker === 'arad') {
          return `<div class="w-20 h-20 animate-float">${renderCharacterAvatarSvg('arad', 'excited')}</div>`;
        }
        if (speaker === 'nika') {
          return `<div class="w-20 h-20 animate-float">${renderCharacterAvatarSvg('nika', 'happy')}</div>`;
        }
        if (speaker === 'raha') {
          return `<div class="w-20 h-20 animate-float">${renderCharacterAvatarSvg('raha', 'excited')}</div>`;
        }
        if (speaker === 'pico') {
          return `<div class="w-20 h-20 animate-float">${renderCharacterAvatarSvg('pico', 'happy')}</div>`;
        }
        if (isLanterns) {
          return `
            <div class="w-16 h-16 sm:w-20 sm:h-20 animate-float">${renderCharacterAvatarSvg(state.selectedHero || 'arad', 'excited')}</div>
            <div class="w-16 h-16 sm:w-20 sm:h-20 animate-float" style="animation-delay:0.35s">${renderCharacterAvatarSvg('pico', 'happy')}</div>
          `;
        }
        return `
          <div class="w-16 h-16 sm:w-20 sm:h-20 animate-float">${renderCharacterAvatarSvg('arad', 'excited')}</div>
          <div class="w-16 h-16 sm:w-20 sm:h-20 animate-float" style="animation-delay:0.35s">${renderCharacterAvatarSvg('nika', 'happy')}</div>
        `;
      }

      function renderSlide() {
        const slide = slides[slideIdx];
        const isLast = slideIdx === slides.length - 1;

        wrapper.innerHTML = `
          <img src="${world.mapImage}" alt="" aria-hidden="true"
            class="absolute inset-0 w-full h-full object-cover opacity-25 scale-105 blur-[2px]"/>
          <div class="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/75 to-slate-950/90"></div>

          <div class="storybook-panel animate-modal-in relative z-10 w-full max-w-2xl rounded-3xl p-6 sm:p-8 text-slate-100">
            <div class="flex items-center justify-between gap-3 mb-4">
              <span class="text-xs font-bold text-amber-300 tabular-nums">${world.title} · فصل ${toPersianDigits(slideIdx + 1)} از ${toPersianDigits(slides.length)}</span>
              <button type="button" id="story-skip-btn" class="text-xs sm:text-sm text-slate-300 hover:text-amber-300 underline font-semibold">
                ${UI_TEXT.skipStory}
              </button>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-5 mb-6">
              <div class="flex items-center gap-2 shrink-0">
                ${getSlideAvatars(slide.speaker)}
              </div>
              <div>
                <h2 class="text-xl sm:text-2xl font-extrabold text-amber-300 mb-2">${slide.title}</h2>
                <p class="text-sm sm:text-base text-slate-100 leading-loose m-0">${slide.text}</p>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 pt-4 border-t border-slate-700/80">
              <div class="flex gap-1.5">
                ${slides
                  .map(
                    (_, i) =>
                      `<span class="h-2 rounded-full transition-all ${
                        i === slideIdx ? 'w-7 bg-amber-400' : 'w-2 bg-slate-600'
                      }"></span>`
                  )
                  .join('')}
              </div>
              <button type="button" id="story-next-btn" data-testid="story-next-btn" class="px-6 py-3 rounded-xl btn-primary-gold text-sm sm:text-base">
                ${isLast ? 'ورود به نقشه گنج!' : UI_TEXT.continueStory}
              </button>
            </div>
          </div>
        `;

        wrapper.querySelector('#story-skip-btn')?.addEventListener('click', () => {
          audio.playClick();
          state = markWorldIntroSeen(state, world.id);
          save();
          showMap();
        });

        wrapper.querySelector('#story-next-btn')?.addEventListener('click', () => {
          audio.playClick();
          if (isLast) {
            state = markWorldIntroSeen(state, world.id);
            save();
            showMap();
          } else {
            slideIdx += 1;
            renderSlide();
          }
        });
      }

      renderSlide();
      mountEl.appendChild(wrapper);
    });
  }

  function showMap() {
    closeActiveModal();
    audio.setMusicTheme('map');
    const world = getWorldConfig(state.activeWorldId);
    const ws = getWorldState(state, world.id);

    sceneManager.mount('map', 'playing', (mountEl) => {
      return renderMapView(mountEl, {
        state,
        audio,
        onSelectStage: (stageMeta) => {
          const hasKey =
            stageMeta.requiresKey === 'magnetic'
              ? Boolean(ws.keys?.magnetic)
              : stageMeta.requiresKey === 'silver'
              ? Boolean(ws.keys?.silver)
              : true;

          showStageIntroModal(stageMeta, {
            hasKey,
            selectedHero: state.selectedHero,
            onStart: () => showStage(stageMeta),
            onCancel: () => {},
          });
        },
        onDiscoverDecoy: (route) => {
          state = applyDecoyDiscovery(state, route, world.id);
          save();
        },
        onOpenFinalTemple: () => {
          showFinalTemple();
        },
        onBackHome: () => {
          audio.playClick();
          showTitleScreen();
        },
        onOpenWorlds: () => openWorldSelector({ fromScene: 'map' }),
        onToggleSound: () => {
          toggleSound();
          showMap();
        },
        onOpenGuide: openGuideModal,
        onOpenSettings: openSettingsModal,
      });
    });
  }

  function showStage(stageMeta) {
    closeActiveModal();
    audio.setMusicTheme(stageMeta.route);
    const targetWorldId = stageMeta.worldId || state.activeWorldId;

    sceneManager.mount(`stage-${stageMeta.id}`, 'playing', (mountEl) => {
      const shell = launchStageMiniGame(mountEl, stageMeta.id, {
        stage: stageMeta,
        state,
        audio,
        onBackToMap: () => showMap(),
        onToggleSound: toggleSound,
        onCompleteStage: ({
          stage,
          stars,
          attempts,
          hintsUsed,
          elapsedSeconds,
          grantedKey,
          xpReward,
          skillBadge,
        }) => {
          const wId = stage.worldId || targetWorldId;
          const prevXp = getWorldState(state, wId).xp || 0;
          state = applyStageCompletion(state, {
            route: stage.route,
            stageNumber: stage.number,
            stars,
            grantedKey,
            worldId: wId,
            xpReward: xpReward || stage.xpReward || 120,
            skillBadge: skillBadge || stage.skillBadge || null,
          });
          save();

          const earnedDelta = Math.max(20, (getWorldState(state, wId).xp || 0) - prevXp);
          const nextStageMeta = stage.number < 6 ? getStage(stage.route, stage.number + 1, wId) : null;

          showStageResultModal({
            stage,
            stars,
            attempts,
            hintsUsed,
            elapsedSeconds,
            keyGranted: grantedKey,
            xpEarned: earnedDelta,
            skillBadge: skillBadge || stage.skillBadge || null,
            hasNextStage: Boolean(nextStageMeta),
            onReplay: () => showStage(stage),
            onNextStage: () => {
              if (nextStageMeta) showStage(nextStageMeta);
              else showMap();
            },
            onBackToMap: () => showMap(),
          });
        },
      });

      return () => shell.destroy();
    });
  }

  function showFinalTemple() {
    closeActiveModal();
    audio.setMusicTheme('map');
    const world = getWorldConfig(state.activeWorldId);
    const nextWorld = getNextWorldConfig(world.id);

    sceneManager.mount('victory', 'gameover', (mountEl) => {
      return renderFinalTempleScene(mountEl, {
        state,
        worldConfig: world,
        nextWorld,
        audio,
        onCompleteCeremony: () => {
          state = applyFinalVictory(state, world.id);
          save();
        },
        onBackToMap: () => showMap(),
        onEnterNextWorld: (nextWorldId) => enterWorld(nextWorldId),
        onResetAdventure: () => confirmResetProgress(),
      });
    });
  }

  function showTitleScreen() {
    closeActiveModal();
    audio.setMusicTheme('none');
    const hasSave = progressManager.hasSavedProgress();
    const activeWorld = getWorldConfig(state.activeWorldId);
    const isLanternsActive = activeWorld.id === 'two-lanterns';

    const ladderHtml = WORLDS.map((w) => {
      const sum = getWorldProgressSummary(state, w.id);
      const active = state.activeWorldId === w.id;
      const badgeClass =
        w.difficultyColor === 'rose'
          ? 'bg-rose-500/20 text-rose-200 border-rose-400/50'
          : 'bg-amber-500/20 text-amber-200 border-amber-400/50';
      return `
        <button type="button" data-title-world="${w.id}" data-testid="title-world-pill-${w.id}"
          class="w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
            !sum.unlocked
              ? 'bg-slate-900/65 border-slate-700/80 text-slate-400'
              : active
              ? 'bg-slate-800/95 border-amber-400 text-white shadow-md'
              : 'bg-slate-900/85 border-slate-700 hover:border-amber-400/60 text-slate-200'
          }">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-xs sm:text-sm truncate">${sum.unlocked ? '🗺' : '🔒'} ${w.title}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold border shrink-0 ${badgeClass}">${w.difficultyLabel}</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5 tabular-nums">
              ${
                sum.unlocked
                  ? `${toPersianDigits(sum.completedCount)}/${toPersianDigits(12)} مرحله · ${toPersianDigits(sum.stars)}/${toPersianDigits(w.maxStars)} ★`
                  : 'پیش‌نیاز: فتح گنج نقشه اول'
              }
            </div>
          </div>
          <span class="text-xs font-extrabold shrink-0 ${
            !sum.unlocked ? 'text-slate-500' : active ? 'text-amber-300' : 'text-emerald-300'
          }">
            ${!sum.unlocked ? 'قفل' : active ? 'فعال ✓' : 'انتخاب'}
          </span>
        </button>
      `;
    }).join('');

    const heroesHtml = isLanternsActive
      ? `
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-400/35">
          <div class="w-14 h-14 shrink-0 animate-float">${renderCharacterAvatarSvg(state.selectedHero || 'arad', 'excited')}</div>
          <div>
            <div class="font-extrabold text-cyan-200 text-sm sm:text-base">${CHARACTERS[state.selectedHero || 'arad'].name}</div>
            <div class="text-xs text-slate-200">${CHARACTERS[state.selectedHero || 'arad'].title}</div>
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-amber-950/35 border border-amber-400/35">
          <div class="w-14 h-14 shrink-0 animate-float" style="animation-delay:0.4s">${renderCharacterAvatarSvg('pico', 'happy')}</div>
          <div>
            <div class="font-extrabold text-amber-300 text-sm sm:text-base">${CHARACTERS.pico.name}</div>
            <div class="text-xs text-slate-200">${CHARACTERS.pico.title}</div>
          </div>
        </div>
      `
      : `
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-orange-950/40 border border-orange-400/35">
          <div class="w-14 h-14 shrink-0 animate-float">${renderCharacterAvatarSvg('arad', 'excited')}</div>
          <div>
            <div class="font-extrabold text-orange-300 text-sm sm:text-base">${UI_TEXT.aradName}</div>
            <div class="text-xs text-slate-200">${UI_TEXT.aradRole}</div>
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-violet-950/40 border border-violet-400/35">
          <div class="w-14 h-14 shrink-0 animate-float" style="animation-delay:0.4s">${renderCharacterAvatarSvg('nika', 'happy')}</div>
          <div>
            <div class="font-extrabold text-violet-300 text-sm sm:text-base">${UI_TEXT.nikaName}</div>
            <div class="text-xs text-slate-200">${UI_TEXT.nikaRole}</div>
          </div>
        </div>
      `;

    sceneManager.mount('title', 'title', (mountEl) => {
      const screen = document.createElement('div');
      screen.className =
        'min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-950';

      screen.innerHTML = `
        <img src="${activeWorld.mapImage}" alt="پس‌زمینه ${activeWorld.title}"
          class="absolute inset-0 w-full h-full object-cover opacity-55 scale-105"/>
        <div class="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92"></div>

        <div class="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <!-- Primary Title Lockup & Menu -->
          <div class="lg:col-span-7 storybook-panel rounded-3xl p-6 sm:p-8 text-center lg:text-right">
            <div class="inline-flex items-center gap-3 mb-4">
              <svg viewBox="0 0 88 48" class="w-20 h-11 shrink-0" aria-hidden="true">
                <circle cx="24" cy="24" r="16" fill="#f59e0b" stroke="#fef3c7" stroke-width="2.5"/>
                <circle cx="24" cy="24" r="8" fill="#fde047"/>
                <circle cx="64" cy="24" r="16" fill="#0284c7" stroke="#bae6fd" stroke-width="2.5"/>
                <path d="M68 14 A11 11 0 1 0 72 32 A8 8 0 1 1 68 14 Z" fill="#e0f2fe"/>
              </svg>
              <span class="text-xs sm:text-sm font-extrabold text-amber-300">${activeWorld.subtitle}</span>
            </div>

            <h1 class="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-3" style="text-wrap:balance;">
              ${activeWorld.title}
            </h1>
            <p class="text-base sm:text-lg font-bold text-amber-200 mb-6">
              «${activeWorld.tagline}»
            </p>

            <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              ${
                hasSave
                  ? `
                  <button type="button" id="title-continue-btn" data-start="true" data-testid="continue-game-btn"
                    class="px-7 py-3.5 rounded-2xl btn-primary-gold text-base sm:text-lg">
                    ▶ ${UI_TEXT.continueGame}
                  </button>
                  <button type="button" id="title-worlds-btn" data-testid="open-world-selector-btn"
                    class="px-6 py-3.5 rounded-2xl btn-secondary-slate text-sm sm:text-base">
                    🗺 نقشه‌ها و قهرمان
                  </button>
                `
                  : `
                  <button type="button" id="title-start-btn" data-start="true" data-testid="start-adventure-btn"
                    class="px-8 py-4 rounded-2xl btn-primary-gold text-lg sm:text-xl">
                    ▶ ${UI_TEXT.startAdventure}
                  </button>
                  <button type="button" id="title-worlds-btn" data-testid="open-world-selector-btn"
                    class="px-6 py-3.5 rounded-2xl btn-secondary-slate text-sm sm:text-base">
                    🗺 نقشه‌های ماجراجویی
                  </button>
                `
              }
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-700/70">
              <button type="button" id="title-guide-btn" class="px-4 py-2 rounded-xl btn-secondary-slate text-xs sm:text-sm">
                📖 ${UI_TEXT.gameGuide}
              </button>
              <button type="button" id="title-sound-btn" class="px-4 py-2 rounded-xl btn-secondary-slate text-xs sm:text-sm">
                ${state.muted ? '🔇 موسیقی خاموش است' : '🔊 موسیقی روشن است'}
              </button>
              ${
                hasSave
                  ? `<button type="button" id="title-reset-btn" class="px-4 py-2 rounded-xl btn-secondary-slate text-xs sm:text-sm text-red-200 border-red-500/40">
                      ↻ ${UI_TEXT.newGame}
                    </button>`
                  : ''
              }
            </div>
          </div>

          <!-- Right / Multi-Map Progression Ladder & Heroes -->
          <div class="lg:col-span-5 storybook-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-3">
            <div class="flex items-center justify-between text-xs font-extrabold text-amber-200 px-1">
              <span>نقشه‌های بازی (سخت ← سخت‌تر)</span>
              <span class="text-slate-400 tabular-nums">${toPersianDigits(WORLDS.length)} نقشه</span>
            </div>
            <div class="space-y-2">
              ${ladderHtml}
            </div>
            <div class="pt-2 border-t border-slate-700/70 space-y-2.5">
              ${heroesHtml}
            </div>
          </div>
        </div>
      `;

      const startFreshOrIntro = () => {
        audio.ensureContext();
        audio.playClick();
        const ws = getWorldState(state, activeWorld.id);
        if (!ws.introSeen) {
          showStoryIntro(activeWorld.id);
        } else {
          state = { ...state, hasStarted: true };
          save();
          showMap();
        }
      };

      const continueExisting = () => {
        audio.ensureContext();
        audio.playClick();
        showMap();
      };

      screen.querySelector('#title-start-btn')?.addEventListener('click', startFreshOrIntro);
      screen.querySelector('#title-continue-btn')?.addEventListener('click', continueExisting);
      screen.querySelector('#title-worlds-btn')?.addEventListener('click', () => openWorldSelector({ fromScene: 'title' }));
      screen.querySelector('#title-guide-btn')?.addEventListener('click', openGuideModal);
      screen.querySelector('#title-reset-btn')?.addEventListener('click', confirmResetProgress);
      screen.querySelector('#title-sound-btn')?.addEventListener('click', (e) => {
        const muted = toggleSound();
        e.currentTarget.textContent = muted ? '🔇 موسیقی خاموش است' : '🔊 موسیقی روشن است';
      });

      screen.querySelectorAll('[data-title-world]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const wId = btn.dataset.titleWorld;
          if (!isWorldUnlocked(state, wId)) {
            audio.playError();
            openWorldSelector({ fromScene: 'title' });
            return;
          }
          audio.playClick();
          state = setActiveWorld(state, wId);
          save();
          showTitleScreen();
        });
      });

      const onTitleKey = (e) => {
        if (document.querySelector('[role="dialog"]')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (hasSave) continueExisting();
          else startFreshOrIntro();
        }
      };
      window.addEventListener('keydown', onTitleKey);

      mountEl.appendChild(screen);
      return () => window.removeEventListener('keydown', onTitleKey);
    });
  }

  function showSplashScreen() {
    closeActiveModal();
    audio.setMusicTheme('none');
    sceneManager.mount('splash', 'splash', (mountEl) => {
      return renderSplashScreen(mountEl, {
        state,
        onFinish: () => {
          showTitleScreen();
        },
      });
    });
  }

  // Boot route: support ?autostart=1 (and optional ?world=two-lanterns when unlocked)
  const params = new URLSearchParams(window.location.search);
  const requestedWorld = params.get('world');
  if (requestedWorld && isWorldUnlocked(state, requestedWorld)) {
    state = setActiveWorld(state, requestedWorld);
    save();
  }

  if (params.get('autostart') === '1') {
    state = markWorldIntroSeen(state, state.activeWorldId);
    save();
    showMap();
  } else {
    showSplashScreen();
  }
}
