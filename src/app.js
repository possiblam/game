import { ProgressManager } from './core/progress-manager.js';
import { AudioManager } from './core/audio-manager.js';
import { SceneManager } from './core/scene-manager.js';
import {
  applyStageCompletion,
  applyDecoyDiscovery,
  applyFinalVictory,
  getTotalCompletedStages,
  getTotalStars,
} from './core/game-state.js';
import { launchStageMiniGame } from './core/game-engine.js';
import { UI_TEXT, toPersianDigits } from './data/translations.js';
import { INTRO_SLIDES, GUIDE_SECTIONS, renderCharacterAvatarSvg } from './data/story.js';
import { getStage } from './data/stages.js';
import { renderMapView } from './map/map-view.js';
import { showStageIntroModal } from './components/stage-intro.js';
import { showStageResultModal, renderFinalTempleScene } from './components/victory-screen.js';
import { showModal, closeActiveModal } from './components/modal.js';

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
    const completed = getTotalCompletedStages(state);
    const stars = getTotalStars(state);
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
          <div class="p-3.5 rounded-xl bg-slate-800/85 border border-slate-700 text-xs sm:text-sm space-y-1 tabular-nums">
            <div>مراحل تکمیل‌شده: <strong class="text-emerald-300">${toPersianDigits(completed)} از ${toPersianDigits(12)}</strong></div>
            <div>مجموع ستاره‌ها: <strong class="text-amber-300">${toPersianDigits(stars)} از ${toPersianDigits(36)}</strong></div>
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

  function showStoryIntro() {
    audio.ensureContext();
    audio.setMusicTheme('map');
    let slideIdx = 0;

    sceneManager.mount('story', 'playing', (mountEl) => {
      const wrapper = document.createElement('div');
      wrapper.className =
        'min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden';

      function renderSlide() {
        const slide = INTRO_SLIDES[slideIdx];
        const isLast = slideIdx === INTRO_SLIDES.length - 1;

        wrapper.innerHTML = `
          <img src="/images/adventure-map.png" alt="" aria-hidden="true"
            class="absolute inset-0 w-full h-full object-cover opacity-25 scale-105 blur-[2px]"/>
          <div class="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/75 to-slate-950/90"></div>

          <div class="storybook-panel animate-modal-in relative z-10 w-full max-w-2xl rounded-3xl p-6 sm:p-8 text-slate-100">
            <div class="flex items-center justify-between gap-3 mb-4">
              <span class="text-xs font-bold text-amber-300 tabular-nums">فصل ${toPersianDigits(slideIdx + 1)} از ${toPersianDigits(INTRO_SLIDES.length)}</span>
              <button type="button" id="story-skip-btn" class="text-xs sm:text-sm text-slate-300 hover:text-amber-300 underline font-semibold">
                ${UI_TEXT.skipStory}
              </button>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-5 mb-6">
              <div class="flex items-center gap-2 shrink-0">
                ${
                  slide.speaker === 'arad' || slide.speaker === 'both' || slide.speaker === 'narrator'
                    ? `<div class="w-20 h-20 animate-float">${renderCharacterAvatarSvg('arad', 'excited')}</div>`
                    : ''
                }
                ${
                  slide.speaker === 'nika' || slide.speaker === 'both' || slide.speaker === 'narrator'
                    ? `<div class="w-20 h-20 animate-float" style="animation-delay:0.35s">${renderCharacterAvatarSvg('nika', 'happy')}</div>`
                    : ''
                }
              </div>
              <div>
                <h2 class="text-xl sm:text-2xl font-extrabold text-amber-300 mb-2">${slide.title}</h2>
                <p class="text-sm sm:text-base text-slate-100 leading-loose m-0">${slide.text}</p>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 pt-4 border-t border-slate-700/80">
              <div class="flex gap-1.5">
                ${INTRO_SLIDES.map(
                  (_, i) =>
                    `<span class="h-2 rounded-full transition-all ${
                      i === slideIdx ? 'w-7 bg-amber-400' : 'w-2 bg-slate-600'
                    }"></span>`
                ).join('')}
              </div>
              <button type="button" id="story-next-btn" data-testid="story-next-btn" class="px-6 py-3 rounded-xl btn-primary-gold text-sm sm:text-base">
                ${isLast ? 'ورود به نقشه گنج!' : UI_TEXT.continueStory}
              </button>
            </div>
          </div>
        `;

        wrapper.querySelector('#story-skip-btn')?.addEventListener('click', () => {
          audio.playClick();
          state = { ...state, hasStarted: true, introSeen: true };
          save();
          showMap();
        });

        wrapper.querySelector('#story-next-btn')?.addEventListener('click', () => {
          audio.playClick();
          if (isLast) {
            state = { ...state, hasStarted: true, introSeen: true };
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
    sceneManager.mount('map', 'playing', (mountEl) => {
      return renderMapView(mountEl, {
        state,
        audio,
        onSelectStage: (stageMeta) => {
          const hasKey =
            stageMeta.requiresKey === 'magnetic'
              ? state.keys.magnetic
              : stageMeta.requiresKey === 'silver'
              ? state.keys.silver
              : true;

          showStageIntroModal(stageMeta, {
            hasKey,
            onStart: () => showStage(stageMeta),
            onCancel: () => {},
          });
        },
        onDiscoverDecoy: (route) => {
          state = applyDecoyDiscovery(state, route);
          save();
        },
        onOpenFinalTemple: () => {
          showFinalTemple();
        },
        onBackHome: () => {
          audio.playClick();
          showTitleScreen();
        },
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

    sceneManager.mount(`stage-${stageMeta.id}`, 'playing', (mountEl) => {
      const shell = launchStageMiniGame(mountEl, stageMeta.id, {
        stage: stageMeta,
        state,
        audio,
        onBackToMap: () => showMap(),
        onToggleSound: toggleSound,
        onCompleteStage: ({ stage, stars, attempts, hintsUsed, elapsedSeconds, grantedKey }) => {
          state = applyStageCompletion(state, {
            route: stage.route,
            stageNumber: stage.number,
            stars,
            grantedKey,
          });
          save();

          const nextStageMeta = stage.number < 6 ? getStage(stage.route, stage.number + 1) : null;
          showStageResultModal({
            stage,
            stars,
            attempts,
            hintsUsed,
            elapsedSeconds,
            keyGranted: grantedKey,
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
    sceneManager.mount('victory', 'gameover', (mountEl) => {
      renderFinalTempleScene(mountEl, {
        state,
        audio,
        onCompleteCeremony: () => {
          state = applyFinalVictory(state);
          save();
        },
        onBackToMap: () => showMap(),
        onResetAdventure: () => confirmResetProgress(),
      });
    });
  }

  function showTitleScreen() {
    closeActiveModal();
    audio.setMusicTheme('none');
    const hasSave = progressManager.hasSavedProgress();

    sceneManager.mount('title', 'title', (mountEl) => {
      const screen = document.createElement('div');
      screen.className =
        'min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-950';

      screen.innerHTML = `
        <img src="/images/adventure-map.png" alt="پس‌زمینه کوهستان و گنج دو جهان"
          class="absolute inset-0 w-full h-full object-cover opacity-55 scale-105"/>
        <div class="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92"></div>

        <div class="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <!-- Left / Primary Title Lockup & Menu -->
          <div class="lg:col-span-7 storybook-panel rounded-3xl p-6 sm:p-8 text-center lg:text-right">
            <!-- Custom SVG Game Crest -->
            <div class="inline-flex items-center gap-3 mb-4">
              <svg viewBox="0 0 88 48" class="w-20 h-11 shrink-0" aria-hidden="true">
                <circle cx="24" cy="24" r="16" fill="#f59e0b" stroke="#fef3c7" stroke-width="2.5"/>
                <circle cx="24" cy="24" r="8" fill="#fde047"/>
                <circle cx="64" cy="24" r="16" fill="#0284c7" stroke="#bae6fd" stroke-width="2.5"/>
                <path d="M68 14 A11 11 0 1 0 72 32 A8 8 0 1 1 68 14 Z" fill="#e0f2fe"/>
              </svg>
              <span class="text-sm sm:text-base font-extrabold text-amber-300">ماجراجویی کوهستان افسانه‌ها</span>
            </div>

            <h1 class="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-3" style="text-wrap:balance;">
              ${UI_TEXT.gameTitle}
            </h1>
            <p class="text-base sm:text-lg font-bold text-amber-200 mb-6">
              «${UI_TEXT.gameTagline}»
            </p>

            <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              ${
                hasSave
                  ? `
                  <button type="button" id="title-continue-btn" data-start="true" data-testid="continue-game-btn"
                    class="px-7 py-3.5 rounded-2xl btn-primary-gold text-base sm:text-lg">
                    ▶ ${UI_TEXT.continueGame}
                  </button>
                  <button type="button" id="title-start-btn" data-testid="start-adventure-btn"
                    class="px-6 py-3.5 rounded-2xl btn-secondary-slate text-sm sm:text-base">
                    ✨ ${UI_TEXT.startAdventure}
                  </button>
                `
                  : `
                  <button type="button" id="title-start-btn" data-start="true" data-testid="start-adventure-btn"
                    class="px-8 py-4 rounded-2xl btn-primary-gold text-lg sm:text-xl">
                    ▶ ${UI_TEXT.startAdventure}
                  </button>
                `
              }
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-700/70">
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

          <!-- Right / Heroes Showcase (Arad & Nika) -->
          <div class="lg:col-span-5 storybook-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
            <div class="flex items-center gap-3 p-3 rounded-2xl bg-orange-950/40 border border-orange-400/35">
              <div class="w-16 h-16 shrink-0 animate-float">${renderCharacterAvatarSvg('arad', 'excited')}</div>
              <div>
                <div class="font-extrabold text-orange-300 text-base">${UI_TEXT.aradName}</div>
                <div class="text-xs sm:text-sm text-slate-200">${UI_TEXT.aradRole}</div>
              </div>
            </div>
            <div class="flex items-center gap-3 p-3 rounded-2xl bg-violet-950/40 border border-violet-400/35">
              <div class="w-16 h-16 shrink-0 animate-float" style="animation-delay:0.4s">${renderCharacterAvatarSvg('nika', 'happy')}</div>
              <div>
                <div class="font-extrabold text-violet-300 text-base">${UI_TEXT.nikaName}</div>
                <div class="text-xs sm:text-sm text-slate-200">${UI_TEXT.nikaRole}</div>
              </div>
            </div>
            <div class="text-xs text-slate-300 text-center pt-1">
              ۶ مرحله در مسیر روز ☀ · ۶ مرحله در مسیر شب 🌙
            </div>
          </div>
        </div>
      `;

      const startFreshOrIntro = () => {
        audio.ensureContext();
        audio.playClick();
        if (!state.introSeen) {
          showStoryIntro();
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
      screen.querySelector('#title-guide-btn')?.addEventListener('click', openGuideModal);
      screen.querySelector('#title-reset-btn')?.addEventListener('click', confirmResetProgress);
      screen.querySelector('#title-sound-btn')?.addEventListener('click', (e) => {
        const muted = toggleSound();
        e.currentTarget.textContent = muted ? '🔇 موسیقی خاموش است' : '🔊 موسیقی روشن است';
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

  // Boot route: support ?autostart=1 for instant verification or direct map entry
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') {
    state = { ...state, hasStarted: true, introSeen: true };
    save();
    showMap();
  } else {
    showTitleScreen();
  }
}
