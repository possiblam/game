import { UI_TEXT, toPersianDigits } from '../data/translations.js';
import { getWorldConfig } from '../data/worlds.js';
import { HintSystem } from '../components/hint-system.js';
import { renderKeyIconSvg } from '../components/progress-bar.js';
import { calculateStars, getWorldState } from '../core/game-state.js';

export function createStageShell(
  container,
  { stage, state, audio, onBackToMap, onCompleteStage, onToggleSound }
) {
  let attempts = 1;
  const startTime = Date.now();
  let hintLevel = 0;
  let finished = false;
  const cleanups = [];

  const world = getWorldConfig(stage.worldId || state.activeWorldId || 'two-worlds');
  const ws = getWorldState(state, world.id);
  const guideCharacterId = world.guideCharacterId || 'nika';
  const hasRouteKeys = world.hasRouteKeys !== false;

  const shell = document.createElement('div');
  shell.className = `stage-shell stage-shell--${stage.route}`;
  shell.dataset.stageId = stage.id;

  const routeLabel = stage.route === 'daytime' ? UI_TEXT.daytimeRoute : UI_TEXT.nighttimeRoute;
  const routeColor = stage.route === 'daytime' ? 'text-orange-300' : 'text-cyan-300';

  const toolkitPillHtml = hasRouteKeys
    ? `
      <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold">
        <span class="text-slate-400">${UI_TEXT.toolkitLabel}:</span>
        <span class="inline-flex items-center gap-1 ${ws.keys?.magnetic ? 'text-amber-300' : 'text-slate-500'}" id="toolbar-key-magnetic" title="${world.daytimeKeyName}">
          ${renderKeyIconSvg('magnetic', ws.keys?.magnetic)}
        </span>
        <span class="inline-flex items-center gap-1 ${ws.keys?.silver ? 'text-cyan-200' : 'text-slate-500'}" id="toolbar-key-silver" title="${world.nighttimeKeyName}">
          ${renderKeyIconSvg('silver', ws.keys?.silver)}
        </span>
      </div>
    `
    : `
      <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-emerald-400/35 text-xs font-bold text-emerald-200">
        <span>⚖️ ${world.title}</span>
      </div>
    `;

  const toolbar = document.createElement('header');
  toolbar.className = 'stage-toolbar';
  toolbar.innerHTML = `
    <div class="flex items-center gap-2.5">
      <button type="button" data-action="back" class="px-3.5 py-2 rounded-xl btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0">
        ← ${UI_TEXT.backToMap}
      </button>
      <div class="flex flex-col">
        <span class="text-xs font-bold ${routeColor}">${routeLabel} · ${UI_TEXT.stagePrefix} ${toPersianDigits(stage.number)}</span>
        <h1 class="text-sm sm:text-base font-extrabold text-white m-0">${stage.title}</h1>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
      <div class="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 tabular-nums" data-testid="stage-status-pill">
        تلاش: <span id="stage-attempts-count">${toPersianDigits(attempts)}</span>
      </div>

      ${toolkitPillHtml}

      <button type="button" data-action="hint" class="px-3.5 py-2 rounded-xl bg-violet-700 hover:bg-violet-600 text-white border border-violet-400/50 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0">
        💡 ${UI_TEXT.hint}
      </button>

      <button type="button" data-action="retry" class="px-3.5 py-2 rounded-xl btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0">
        ↻ ${UI_TEXT.retry}
      </button>

      <button type="button" data-action="sound" class="px-3 py-2 rounded-xl btn-secondary-slate text-xs sm:text-sm whitespace-nowrap shrink-0" aria-label="تغییر وضعیت صدا">
        ${state.muted ? '🔇 بی‌صدا' : '🔊 باصدا'}
      </button>
    </div>
  `;

  const playArea = document.createElement('main');
  playArea.className = 'stage-play-area';

  shell.appendChild(toolbar);
  shell.appendChild(playArea);
  container.appendChild(shell);

  let hintChangeHandler = null;
  let retryHandler = null;

  const hintSystem = new HintSystem(
    stage,
    (newLevel) => {
      hintLevel = newLevel;
      hintChangeHandler?.(newLevel);
    },
    guideCharacterId
  );

  toolbar.querySelector('[data-action="back"]').addEventListener('click', () => {
    audio.playClick();
    onBackToMap();
  });

  toolbar.querySelector('[data-action="hint"]').addEventListener('click', () => {
    audio.playClick();
    hintSystem.openNextHint();
  });

  toolbar.querySelector('[data-action="retry"]').addEventListener('click', () => {
    audio.playClick();
    attempts += 1;
    const countEl = toolbar.querySelector('#stage-attempts-count');
    if (countEl) countEl.textContent = toPersianDigits(attempts);
    retryHandler?.();
  });

  const soundBtn = toolbar.querySelector('[data-action="sound"]');
  soundBtn.addEventListener('click', () => {
    const muted = onToggleSound();
    soundBtn.textContent = muted ? '🔇 بی‌صدا' : '🔊 باصدا';
  });

  const api = {
    playArea,
    registerCleanup(fn) {
      if (typeof fn === 'function') cleanups.push(fn);
    },
    onHint(fn) {
      hintChangeHandler = fn;
    },
    onRetry(fn) {
      retryHandler = fn;
    },
    recordAttempt() {
      attempts += 1;
      const countEl = toolbar.querySelector('#stage-attempts-count');
      if (countEl) countEl.textContent = toPersianDigits(attempts);
    },
    refreshToolkitKey(keyType) {
      if (keyType === 'magnetic') {
        const el = toolbar.querySelector('#toolbar-key-magnetic');
        if (el) {
          el.className = 'inline-flex items-center gap-1 text-amber-300';
          el.innerHTML = renderKeyIconSvg('magnetic', true);
        }
      }
      if (keyType === 'silver') {
        const el = toolbar.querySelector('#toolbar-key-silver');
        if (el) {
          el.className = 'inline-flex items-center gap-1 text-cyan-200';
          el.innerHTML = renderKeyIconSvg('silver', true);
        }
      }
    },
    getHintLevel() {
      return hintLevel;
    },
    complete({ grantedKey = null } = {}) {
      if (finished) return;
      finished = true;
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const stars = calculateStars({
        attempts,
        hintsUsed: hintLevel,
        elapsedSeconds,
        targetSeconds: stage.targetSeconds || 45,
      });
      audio.playStageClear();
      onCompleteStage({
        stage,
        stars,
        attempts,
        hintsUsed: hintLevel,
        elapsedSeconds,
        grantedKey,
        xpReward: stage.xpReward || 120,
        skillBadge: stage.skillBadge || null,
      });
    },
    destroy() {
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    },
  };

  return api;
}
