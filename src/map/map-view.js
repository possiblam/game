import { getWorldConfig } from '../data/worlds.js';
import { getStage } from '../data/stages.js';
import { getDecoyChestsForWorld, renderCharacterAvatarSvg } from '../data/story.js';
import { UI_TEXT, toPersianDigits } from '../data/translations.js';
import {
  isStageCompleted,
  isStageUnlocked,
  isFinalUnlocked,
  getRouteProgressCount,
  getTotalCompletedStages,
  getNextRecommendedStage,
  getWorldState,
} from '../core/game-state.js';
import { renderMapTopBar, renderKeyIconSvg } from '../components/progress-bar.js';
import { showModal } from '../components/modal.js';
import {
  MIN_MAP_ZOOM,
  MAX_MAP_ZOOM,
  clampZoom,
  clampPan,
  computeZoomAroundPoint,
  computePercentFocusTransform,
} from './zoom-math.js';

export function renderMapView(
  container,
  {
    state,
    audio,
    onSelectStage,
    onDiscoverDecoy,
    onOpenFinalTemple,
    onBackHome,
    onOpenWorlds,
    onToggleSound,
    onOpenGuide,
    onOpenSettings,
  }
) {
  const world = getWorldConfig(state.activeWorldId);
  const ws = getWorldState(state, world.id);
  const mapViewbox = world.viewbox;
  const mapHotspots = world.hotspots;
  const routeSegments = world.routeSegments;
  const decoyChests = getDecoyChestsForWorld(world.id);
  const useCumulativeNumbers = world.stageNumberMode === '1-12';
  const hasRouteKeys = world.hasRouteKeys !== false;

  const shell = document.createElement('div');
  shell.className = 'map-shell';
  shell.dataset.worldId = world.id;

  const topBar = renderMapTopBar({
    state,
    worldConfig: world,
    onHome: onBackHome,
    onOpenWorlds,
    onToggleSound,
    onOpenGuide,
    onOpenSettings,
  });
  shell.appendChild(topBar);

  const stageViewport = document.createElement('main');
  stageViewport.className = 'map-stage-viewport';
  stageViewport.setAttribute('aria-label', `نقشه ${world.title}`);

  const zoomShell = document.createElement('div');
  zoomShell.className = 'map-zoom-shell';
  zoomShell.dataset.testid = 'map-zoom-shell';

  // Mobile Fullscreen Header
  const fullscreenHeader = document.createElement('div');
  fullscreenHeader.className =
    'hidden items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-900/95 border border-amber-400/30 text-slate-100 shrink-0';
  fullscreenHeader.innerHTML = `
    <button type="button" data-testid="mobile-map-close-fullscreen" class="px-3 py-1.5 rounded-lg btn-secondary-slate text-xs font-extrabold whitespace-nowrap shrink-0 min-h-[36px]">
      ✕ بستن
    </button>
    <div class="flex items-center gap-1.5 overflow-x-auto">
      <button type="button" data-testid="mobile-map-focus-day" class="px-2.5 py-1.5 rounded-lg bg-orange-950/80 border border-orange-400/60 text-orange-200 text-xs font-extrabold whitespace-nowrap min-h-[34px]">
        ☀ روز
      </button>
      <button type="button" data-testid="mobile-map-focus-night" class="px-2.5 py-1.5 rounded-lg bg-sky-950/80 border border-cyan-400/60 text-cyan-200 text-xs font-extrabold whitespace-nowrap min-h-[34px]">
        🌙 شب
      </button>
      <button type="button" data-testid="mobile-map-focus-all" class="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-xs font-extrabold whitespace-nowrap min-h-[34px]">
        🗺 کل
      </button>
    </div>
  `;
  zoomShell.appendChild(fullscreenHeader);

  const zoomViewport = document.createElement('div');
  zoomViewport.className = 'map-zoom-viewport';
  zoomViewport.dataset.testid = 'mobile-map-zoom-viewport';

  const board = document.createElement('div');
  board.className = 'map-board';
  board.dataset.testid = 'adventure-map-board';
  board.dataset.worldId = world.id;
  if (mapViewbox?.width && mapViewbox?.height) {
    board.style.aspectRatio = `${mapViewbox.width} / ${mapViewbox.height}`;
  }

  // 1. World Map Artwork
  const img = document.createElement('img');
  img.src = world.mapImage;
  img.alt = `${world.title} — ${UI_TEXT.daytimeRoute} و ${UI_TEXT.nighttimeRoute}`;
  img.className = 'map-artwork';
  img.draggable = false;
  board.appendChild(img);

  // 2. Ambient Animation Layer
  const ambient = document.createElement('div');
  ambient.className = 'map-ambient-layer';
  if (world.ambientPreset === 'chronos') {
    ambient.innerHTML = `
      <div class="animate-cloud absolute top-[4%] left-[12%] w-[14%] h-[5%] rounded-full bg-amber-100/25 blur-md"></div>
      <span class="animate-twinkle absolute top-[18%] right-[28%] w-2 h-2 rounded-full bg-cyan-300"></span>
      <span class="animate-twinkle absolute top-[26%] right-[16%] w-1.5 h-1.5 rounded-full bg-violet-200" style="animation-delay:0.7s"></span>
      <span class="animate-twinkle absolute top-[12%] left-[48%] w-2 h-2 rounded-full bg-amber-200" style="animation-delay:0.4s"></span>
    `;
  } else if (world.ambientPreset === 'two-lanterns') {
    ambient.innerHTML = `
      <div class="animate-cloud absolute top-[5%] left-[14%] w-[12%] h-[5%] rounded-full bg-white/25 blur-md"></div>
      <span class="animate-twinkle absolute top-[6%] right-[22%] w-2 h-2 rounded-full bg-cyan-200"></span>
      <span class="animate-twinkle absolute top-[12%] right-[31%] w-1.5 h-1.5 rounded-full bg-white" style="animation-delay:0.8s"></span>
      <span class="animate-twinkle absolute top-[16%] left-[48%] w-2 h-2 rounded-full bg-amber-200" style="animation-delay:0.5s"></span>
      <span class="animate-twinkle absolute top-[35%] left-[44%] w-2 h-2 rounded-full bg-sky-200/80" style="animation-delay:1.3s"></span>
    `;
  } else {
    ambient.innerHTML = `
      <div class="animate-cloud absolute top-[4%] left-[6%] w-[14%] h-[6%] rounded-full bg-white/30 blur-md"></div>
      <div class="animate-cloud absolute top-[9%] left-[22%] w-[10%] h-[4%] rounded-full bg-amber-100/25 blur-sm" style="animation-delay:-7s"></div>
      <span class="animate-twinkle absolute top-[5%] right-[16%] w-2 h-2 rounded-full bg-cyan-200"></span>
      <span class="animate-twinkle absolute top-[11%] right-[24%] w-1.5 h-1.5 rounded-full bg-white" style="animation-delay:0.9s"></span>
      <span class="animate-twinkle absolute top-[7%] right-[9%] w-2 h-2 rounded-full bg-sky-300" style="animation-delay:1.6s"></span>
      <span class="animate-twinkle absolute top-[18%] right-[18%] w-1.5 h-1.5 rounded-full bg-cyan-100" style="animation-delay:2.1s"></span>
      <span class="animate-twinkle absolute top-[38%] left-[52%] w-2 h-2 rounded-full bg-sky-100/80" style="animation-delay:0.4s"></span>
      <span class="animate-twinkle absolute top-[47%] left-[56%] w-2 h-2 rounded-full bg-cyan-200/80" style="animation-delay:1.2s"></span>
    `;
  }
  board.appendChild(ambient);

  // 3. SVG Overlay for independent Daytime & Nighttime routes
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${mapViewbox.width} ${mapViewbox.height}`);
  svg.setAttribute('class', 'map-svg-overlay');
  svg.setAttribute('aria-hidden', 'true');

  ['daytime', 'nighttime'].forEach((route) => {
    const strokeColor = route === 'daytime' ? '#fb923c' : '#22d3ee';
    const glowColor = route === 'daytime' ? '#facc15' : '#a5f3fc';

    routeSegments[route].forEach((seg) => {
      let segStatus = 'locked';
      if (seg.to === 'final') {
        segStatus = isStageCompleted(state, route, 6, world.id)
          ? isFinalUnlocked(state, world.id)
            ? 'completed'
            : 'active'
          : 'locked';
      } else if (isStageCompleted(state, route, seg.to, world.id)) {
        segStatus = 'completed';
      } else if (isStageUnlocked(state, route, seg.to, world.id)) {
        segStatus = 'active';
      }

      if (segStatus !== 'locked') {
        const glowPath = document.createElementNS(svgNS, 'path');
        glowPath.setAttribute('d', seg.d);
        glowPath.setAttribute('stroke', glowColor);
        glowPath.setAttribute('stroke-width', segStatus === 'active' ? '12' : '9');
        glowPath.setAttribute('stroke-opacity', segStatus === 'active' ? '0.45' : '0.32');
        glowPath.setAttribute('class', 'route-path-base');
        svg.appendChild(glowPath);
      }

      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', seg.d);
      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', '7');
      path.setAttribute('class', `route-path-base route-path-${segStatus}`);
      path.dataset.routeSegment = `${route}-${seg.to}`;
      svg.appendChild(path);
    });
  });

  board.appendChild(svg);

  // 4. Persian Plaques (only when artwork doesn't have built-in Persian labels)
  if (!world.hasBuiltInPersianLabels && Array.isArray(world.plaques)) {
    world.plaques.forEach((plaque) => {
      const el = document.createElement('div');
      el.className = `persian-map-plaque plaque--${plaque.variant}`;
      el.style.left = `${plaque.x}%`;
      el.style.top = `${plaque.y}%`;
      el.innerText = plaque.text;
      board.appendChild(el);
    });
  }

  // 5. Interactive Hotspots Layer
  const hotspotsLayer = document.createElement('div');
  hotspotsLayer.className = 'map-hotspots-layer';

  // Companion Avatar Marker (Arad + Nika on World 1, Selected Hero + Pico on World 2)
  const nextRec = getNextRecommendedStage(state, null, world.id);
  let compPos = { x: mapHotspots.start.x, y: mapHotspots.start.y - 4 };
  if (nextRec) {
    const hs = mapHotspots.stages[nextRec.route].find((s) => s.number === nextRec.number);
    if (hs) compPos = { x: hs.x, y: hs.y };
  } else if (isFinalUnlocked(state, world.id)) {
    compPos = { x: mapHotspots.final.x, y: mapHotspots.final.y + 4 };
  }

  const companionPair = world.supportsHeroSelection
    ? [state.selectedHero || 'arad', world.guideCharacterId || 'pico']
    : world.companionIds || ['arad', 'nika'];

  const companion = document.createElement('div');
  companion.className = 'map-companion-marker flex items-center justify-center';
  companion.innerHTML = `
    <div class="flex -space-x-2 rtl:space-x-reverse">
      <div class="w-6 h-6 sm:w-9 sm:h-9 rounded-full ring-2 ring-amber-300 bg-slate-900 overflow-hidden">${renderCharacterAvatarSvg(companionPair[0], 'happy')}</div>
      <div class="w-6 h-6 sm:w-9 sm:h-9 rounded-full ring-2 ring-cyan-300 bg-slate-900 overflow-hidden">${renderCharacterAvatarSvg(companionPair[1], 'happy')}</div>
    </div>
  `;
  companion.style.left = `${compPos.x}%`;
  companion.style.top = `${compPos.y}%`;
  hotspotsLayer.appendChild(companion);

  function handleStageSelect(stageMeta, unlocked, nodePos) {
    if (!unlocked) {
      audio.playError();
      showModal({
        title: 'این مرحله هنوز قفل است',
        bodyHtml: `<p class="m-0">برای باز کردن «${stageMeta.title}»، ابتدا باید مرحله ${toPersianDigits(stageMeta.number - 1)} در ${stageMeta.route === 'daytime' ? UI_TEXT.daytimeRoute : UI_TEXT.nighttimeRoute} را با موفقیت به پایان برسانید.</p>`,
        actions: [{ label: 'باشه', variant: 'primary' }],
      });
      return;
    }
    audio.playClick();
    const segEl = svg.querySelector(`[data-route-segment="${stageMeta.route}-${stageMeta.number}"]`);
    if (segEl) {
      segEl.setAttribute('stroke-width', '10');
      segEl.style.filter = 'drop-shadow(0 0 10px #fde047)';
    }
    if (nodePos) {
      companion.style.left = `${nodePos.x}%`;
      companion.style.top = `${nodePos.y}%`;
    }
    setTimeout(() => onSelectStage(stageMeta), 260);
  }

  function handleDecoySelect(route) {
    const decoyMeta = decoyChests[route];
    audio.playMechanism();
    onDiscoverDecoy(route);

    const secondSpeakerId = decoyMeta.picoLine ? 'pico' : 'nika';
    const secondSpeakerName = decoyMeta.picoLine ? 'پیکو' : 'نیکا';
    const secondLine = decoyMeta.picoLine || decoyMeta.nikaLine;

    showModal({
      title: UI_TEXT.decoyTitle,
      bodyHtml: `
        <div class="p-4 rounded-xl bg-amber-950/75 border-2 border-amber-400/70 text-amber-100 text-center font-extrabold text-base sm:text-lg mb-4">
          «${decoyMeta.noteText}»
        </div>
        <div class="space-y-3 text-sm">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 shrink-0">${renderCharacterAvatarSvg('arad', 'happy')}</div>
            <p class="m-0 text-slate-200"><strong>آراد:</strong> «${decoyMeta.aradLine}»</p>
          </div>
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 shrink-0">${renderCharacterAvatarSvg(secondSpeakerId, 'happy')}</div>
            <p class="m-0 text-slate-200"><strong>${secondSpeakerName}:</strong> «${secondLine}»</p>
          </div>
        </div>
      `,
      actions: [{ label: 'ادامه ماجراجویی', variant: 'primary' }],
    });
  }

  const finalUnlocked = isFinalUnlocked(state, world.id);
  const completedCount = getTotalCompletedStages(state, world.id);

  function handleFinalTempleSelect() {
    if (!finalUnlocked) {
      audio.playError();
      showModal({
        title: UI_TEXT.finalLockedTitle,
        bodyHtml: `
          <p class="m-0 leading-relaxed">${UI_TEXT.finalLockedBody}</p>
          <div class="mt-4 p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-amber-300 tabular-nums">
            پیشرفت فعلی: ${toPersianDigits(completedCount)} از ${toPersianDigits(12)} مرحله تکمیل شده
          </div>
        `,
        actions: [{ label: 'برگردیم به مسیرها', variant: 'primary' }],
      });
      return;
    }
    audio.playGateOpen();
    onOpenFinalTemple();
  }

  // Stage Nodes (6 Daytime + 6 Nighttime)
  ['daytime', 'nighttime'].forEach((route) => {
    mapHotspots.stages[route].forEach((node) => {
      const stageMeta = getStage(route, node.number, world.id);
      const completed = isStageCompleted(state, route, node.number, world.id);
      const unlocked = isStageUnlocked(state, route, node.number, world.id);
      const stars = ws.stars?.[stageMeta.id] || 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.testid = `stage-node-${stageMeta.id}`;
      btn.style.left = `${node.x}%`;
      btn.style.top = `${node.y}%`;

      const statusClass = completed
        ? 'stage-node--completed'
        : unlocked
        ? `stage-node--${route} stage-node--active`
        : 'stage-node--locked';
      btn.className = `map-hotspot-btn stage-node ${statusClass}`;

      const statusLabel = completed
        ? `${UI_TEXT.stageCompleted}`
        : unlocked
        ? `${UI_TEXT.stageActive}`
        : `${UI_TEXT.stageLocked}`;

      const displayNumber = useCumulativeNumbers && route === 'nighttime' ? node.number + 6 : node.number;

      btn.setAttribute(
        'aria-label',
        `${route === 'daytime' ? UI_TEXT.daytimeRoute : UI_TEXT.nighttimeRoute} - ${UI_TEXT.stagePrefix} ${toPersianDigits(displayNumber)}: ${stageMeta.title} (${statusLabel})`
      );

      if (completed) {
        btn.innerHTML = `
          <span>✓</span>
          <span class="stage-node-stars text-[10px] sm:text-xs text-amber-300">
            ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}
          </span>
        `;
      } else if (unlocked) {
        btn.innerHTML = `<span class="tabular-nums">${toPersianDigits(displayNumber)}</span>`;
      } else {
        btn.innerHTML = `<span aria-hidden="true">🔒</span>`;
      }

      btn.addEventListener('click', () => handleStageSelect(stageMeta, unlocked, node));
      hotspotsLayer.appendChild(btn);

      // Key badge indicator on Stage 2
      if (node.keyMarker) {
        const hasKey = route === 'daytime' ? ws.keys?.magnetic : ws.keys?.silver;
        const keyTitle = route === 'daytime' ? world.daytimeKeyName : world.nighttimeKeyName;
        const keyBadge = document.createElement('div');
        keyBadge.className =
          'map-key-marker absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold border shadow-md whitespace-nowrap';
        keyBadge.style.left = `${node.keyMarker.x}%`;
        keyBadge.style.top = `${node.keyMarker.y + 5.2}%`;
        if (hasKey) {
          keyBadge.className += ' bg-emerald-900/90 border-emerald-400 text-emerald-200';
          keyBadge.textContent = `🗝️ ${keyTitle} پیدا شد`;
        } else {
          keyBadge.className += ' bg-amber-950/90 border-amber-400/70 text-amber-200';
          keyBadge.textContent = `🗝️ ${keyTitle}`;
        }
        hotspotsLayer.appendChild(keyBadge);
      }
    });
  });

  // Decoy Chests
  ['daytime', 'nighttime'].forEach((route) => {
    const decoyMeta = decoyChests[route];
    const decoyPos = mapHotspots.decoys[route];
    const found = Boolean(ws.decoyDiscovered?.[route]);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.testid = `decoy-chest-${route}`;
    btn.style.left = `${decoyPos.x}%`;
    btn.style.top = `${decoyPos.y}%`;
    btn.className = `map-hotspot-btn map-decoy-btn w-10 h-10 sm:w-12 sm:h-12 border-2 shadow-lg ${
      found
        ? 'bg-slate-800/90 border-amber-400/60 text-amber-200'
        : 'bg-gradient-to-b from-amber-300 to-amber-600 border-amber-100 text-slate-950'
    }`;
    btn.setAttribute('aria-label', `${decoyMeta.title} - صندوق گنج`);
    btn.innerHTML = found
      ? '<span class="text-sm sm:text-lg">📜</span>'
      : '<span class="text-base sm:text-xl inline-block animate-float">🧰</span>';

    btn.addEventListener('click', () => handleDecoySelect(route));
    hotspotsLayer.appendChild(btn);
  });

  // Final Destination Hotspot
  const finalBtn = document.createElement('button');
  finalBtn.type = 'button';
  finalBtn.dataset.testid = 'final-treasure-node';
  finalBtn.style.left = `${mapHotspots.final.x}%`;
  finalBtn.style.top = `${mapHotspots.final.y}%`;
  finalBtn.className = `map-hotspot-btn map-final-btn px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-extrabold border-2 shadow-xl ${
    finalUnlocked
      ? 'btn-primary-gold'
      : 'bg-slate-900/90 border-amber-400/50 text-amber-200 hover:bg-slate-800'
  }`;
  finalBtn.setAttribute('aria-label', `${world.finalTempleTitle} (${toPersianDigits(completedCount)} از ${toPersianDigits(12)})`);
  finalBtn.innerHTML = finalUnlocked
    ? `<span class="inline-flex items-center gap-1.5"><span class="inline-block animate-float">👑</span> ${UI_TEXT.enterFinalTemple}</span>`
    : `<span>🔒 ${world.finalTempleTitle} (${toPersianDigits(completedCount)}/${toPersianDigits(12)})</span>`;

  finalBtn.addEventListener('click', handleFinalTempleSelect);

  hotspotsLayer.appendChild(finalBtn);
  board.appendChild(hotspotsLayer);
  zoomViewport.appendChild(board);
  zoomShell.appendChild(zoomViewport);

  // Mobile-Only Map Zoom & Fullscreen Toolbar
  const mobileZoomBar = document.createElement('div');
  mobileZoomBar.className =
    'md:hidden flex items-center justify-between gap-2 px-2.5 py-2 bg-slate-900/95 border-2 border-t-0 border-amber-400/35 rounded-b-xl text-slate-100 shrink-0';
  mobileZoomBar.dataset.testid = 'mobile-map-zoom-toolbar';
  mobileZoomBar.innerHTML = `
    <div class="flex items-center gap-1.5 min-w-0">
      <button type="button" data-testid="mobile-map-fullscreen-btn" class="px-2.5 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/60 text-amber-200 text-xs font-extrabold whitespace-nowrap min-h-[36px] inline-flex items-center gap-1">
        <span aria-hidden="true">🔍</span>
        <span>نمای تمام‌صفحه</span>
      </button>
      <span data-testid="mobile-map-fullscreen-hint" class="hidden text-[11px] text-slate-300 font-semibold whitespace-nowrap truncate">
        زوم دو انگشتی · کشیدن
      </span>
    </div>
    <div class="flex items-center gap-1.5 shrink-0">
      <button type="button" data-testid="mobile-map-zoom-in" aria-label="بزرگ‌نمایی نقشه" class="w-9 h-9 rounded-lg btn-secondary-slate text-base font-extrabold flex items-center justify-center">+</button>
      <span data-testid="mobile-map-zoom-label" class="min-w-[46px] text-center text-xs font-extrabold text-amber-300 tabular-nums">۱۰۰٪</span>
      <button type="button" data-testid="mobile-map-zoom-out" aria-label="کوچک‌نمایی نقشه" class="w-9 h-9 rounded-lg btn-secondary-slate text-base font-extrabold flex items-center justify-center">−</button>
      <button type="button" data-testid="mobile-map-zoom-reset" aria-label="بازنشانی نمای نقشه" class="px-2.5 h-9 rounded-lg btn-secondary-slate text-xs font-bold whitespace-nowrap">بازنشانی</button>
    </div>
  `;
  zoomShell.appendChild(mobileZoomBar);
  stageViewport.appendChild(zoomShell);

  // Interactive Zoom, Pinch, Pan, Double-Tap & Fullscreen Controller (Mobile < 768px only)
  const zoomState = { scale: MIN_MAP_ZOOM, tx: 0, ty: 0 };
  let isFullscreen = false;
  let animTimer = null;
  let suppressClickUntil = 0;

  const zoomLabelEl = mobileZoomBar.querySelector('[data-testid="mobile-map-zoom-label"]');
  const zoomOutBtn = mobileZoomBar.querySelector('[data-testid="mobile-map-zoom-out"]');
  const zoomInBtn = mobileZoomBar.querySelector('[data-testid="mobile-map-zoom-in"]');
  const zoomResetBtn = mobileZoomBar.querySelector('[data-testid="mobile-map-zoom-reset"]');
  const fullscreenBtn = mobileZoomBar.querySelector('[data-testid="mobile-map-fullscreen-btn"]');
  const fullscreenHintEl = mobileZoomBar.querySelector('[data-testid="mobile-map-fullscreen-hint"]');
  const closeFullscreenBtn = fullscreenHeader.querySelector('[data-testid="mobile-map-close-fullscreen"]');
  const focusDayBtn = fullscreenHeader.querySelector('[data-testid="mobile-map-focus-day"]');
  const focusNightBtn = fullscreenHeader.querySelector('[data-testid="mobile-map-focus-night"]');
  const focusAllBtn = fullscreenHeader.querySelector('[data-testid="mobile-map-focus-all"]');

  function isMobileViewport() {
    return window.innerWidth < 768;
  }

  function applyZoomTransform(animate = false) {
    if (!isMobileViewport()) {
      zoomState.scale = MIN_MAP_ZOOM;
      zoomState.tx = 0;
      zoomState.ty = 0;
      board.style.transform = '';
      board.classList.remove('is-map-zoomed', 'is-animating');
      zoomViewport.style.touchAction = '';
      return;
    }

    if (animate) {
      board.classList.add('is-animating');
      clearTimeout(animTimer);
      animTimer = setTimeout(() => board.classList.remove('is-animating'), 260);
    } else {
      board.classList.remove('is-animating');
    }

    const isZoomed = zoomState.scale > 1.02;
    const clamped = isZoomed
      ? clampPan({
          tx: zoomState.tx,
          ty: zoomState.ty,
          scale: zoomState.scale,
          boardW: board.offsetWidth || 1,
          boardH: board.offsetHeight || 1,
          viewW: zoomViewport.clientWidth || 1,
          viewH: zoomViewport.clientHeight || 1,
        })
      : { tx: 0, ty: 0 };

    zoomState.tx = clamped.tx;
    zoomState.ty = clamped.ty;

    board.style.transform = isZoomed
      ? `translate3d(${zoomState.tx.toFixed(1)}px, ${zoomState.ty.toFixed(1)}px, 0) scale(${zoomState.scale.toFixed(3)})`
      : '';

    board.classList.toggle('is-map-zoomed', zoomState.scale >= 1.5);
    zoomViewport.style.touchAction = isZoomed || isFullscreen ? 'none' : 'pan-y';

    const pct = Math.round(zoomState.scale * 100);
    if (zoomLabelEl) zoomLabelEl.textContent = `${toPersianDigits(pct)}٪`;
    if (zoomOutBtn) zoomOutBtn.disabled = zoomState.scale <= MIN_MAP_ZOOM + 0.01;
    if (zoomInBtn) zoomInBtn.disabled = zoomState.scale >= MAX_MAP_ZOOM - 0.01;
    if (zoomResetBtn) zoomResetBtn.disabled = !isZoomed;
  }

  function setZoom(newScale, { pointX, pointY, animate = true } = {}) {
    if (!isMobileViewport()) return;
    const clampedScale = clampZoom(newScale);
    if (clampedScale <= MIN_MAP_ZOOM + 0.01) {
      zoomState.scale = MIN_MAP_ZOOM;
      zoomState.tx = 0;
      zoomState.ty = 0;
      applyZoomTransform(animate);
      return;
    }

    const rect = zoomViewport.getBoundingClientRect();
    const viewCenterX = rect.left + rect.width / 2;
    const viewCenterY = rect.top + rect.height / 2;
    const res = computeZoomAroundPoint({
      tx: zoomState.tx,
      ty: zoomState.ty,
      oldScale: zoomState.scale,
      newScale: clampedScale,
      pointX: pointX ?? viewCenterX,
      pointY: pointY ?? viewCenterY,
      viewCenterX,
      viewCenterY,
      boardW: board.offsetWidth || rect.width || 1,
      boardH: board.offsetHeight || rect.height || 1,
      viewW: zoomViewport.clientWidth || rect.width || 1,
      viewH: zoomViewport.clientHeight || rect.height || 1,
    });

    zoomState.scale = res.scale;
    zoomState.tx = res.tx;
    zoomState.ty = res.ty;
    applyZoomTransform(animate);
  }

  function focusOnPercent(pctX, pctY, targetScale = 2.2) {
    if (!isMobileViewport()) return;
    const res = computePercentFocusTransform({
      pctX,
      pctY,
      targetScale,
      boardW: board.offsetWidth || 1,
      boardH: board.offsetHeight || 1,
      viewW: zoomViewport.clientWidth || 1,
      viewH: zoomViewport.clientHeight || 1,
    });
    zoomState.scale = res.scale;
    zoomState.tx = res.tx;
    zoomState.ty = res.ty;
    applyZoomTransform(true);
  }

  function setFullscreen(nextFullscreen) {
    isFullscreen = Boolean(nextFullscreen) && isMobileViewport();
    zoomShell.classList.toggle('is-fullscreen', isFullscreen);
    fullscreenHeader.classList.toggle('hidden', !isFullscreen);
    fullscreenHeader.classList.toggle('flex', isFullscreen);
    if (fullscreenBtn) {
      fullscreenBtn.classList.toggle('hidden', isFullscreen);
      fullscreenBtn.classList.toggle('inline-flex', !isFullscreen);
    }
    fullscreenHintEl?.classList.toggle('hidden', !isFullscreen);
    mobileZoomBar.classList.toggle('rounded-xl', isFullscreen);
    mobileZoomBar.classList.toggle('border-t-0', !isFullscreen);
    mobileZoomBar.classList.toggle('rounded-b-xl', !isFullscreen);
    document.body.style.overflow = isFullscreen ? 'hidden' : '';

    if (!isFullscreen && zoomState.scale <= 1.02) {
      zoomState.scale = MIN_MAP_ZOOM;
      zoomState.tx = 0;
      zoomState.ty = 0;
    }
    requestAnimationFrame(() => applyZoomTransform(false));
  }

  zoomInBtn?.addEventListener('click', () => {
    audio.playClick();
    setZoom(zoomState.scale + 0.55, { animate: true });
  });

  zoomOutBtn?.addEventListener('click', () => {
    audio.playClick();
    setZoom(zoomState.scale - 0.55, { animate: true });
  });

  zoomResetBtn?.addEventListener('click', () => {
    audio.playClick();
    setZoom(MIN_MAP_ZOOM, { animate: true });
  });

  fullscreenBtn?.addEventListener('click', () => {
    audio.playClick();
    setFullscreen(true);
  });

  closeFullscreenBtn?.addEventListener('click', () => {
    audio.playClick();
    setFullscreen(false);
  });

  focusDayBtn?.addEventListener('click', () => {
    audio.playClick();
    focusOnPercent(25, 54, 2.25);
  });

  focusNightBtn?.addEventListener('click', () => {
    audio.playClick();
    focusOnPercent(75, 54, 2.25);
  });

  focusAllBtn?.addEventListener('click', () => {
    audio.playClick();
    setZoom(MIN_MAP_ZOOM, { animate: true });
  });

  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let panStartX = 0;
  let panStartY = 0;
  let panStartTx = 0;
  let panStartTy = 0;
  let dragDistance = 0;
  let isTouchPanning = false;
  let isPinching = false;
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  function getTouchDist(t1, t2) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  }

  function getTouchMid(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  }

  const onTouchStart = (e) => {
    if (!isMobileViewport()) return;
    if (e.touches.length === 2) {
      isPinching = true;
      isTouchPanning = false;
      pinchStartDist = Math.max(1, getTouchDist(e.touches[0], e.touches[1]));
      pinchStartScale = zoomState.scale;
      board.classList.remove('is-animating');
    } else if (e.touches.length === 1) {
      isPinching = false;
      isTouchPanning = zoomState.scale > 1.02;
      panStartX = e.touches[0].clientX;
      panStartY = e.touches[0].clientY;
      panStartTx = zoomState.tx;
      panStartTy = zoomState.ty;
      dragDistance = 0;
    }
  };

  const onTouchMove = (e) => {
    if (!isMobileViewport()) return;
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const mid = getTouchMid(e.touches[0], e.touches[1]);
      const nextScale = clampZoom(pinchStartScale * (dist / pinchStartDist));
      setZoom(nextScale, { pointX: mid.x, pointY: mid.y, animate: false });
      dragDistance = 999;
    } else if (e.touches.length === 1 && isTouchPanning) {
      const dx = e.touches[0].clientX - panStartX;
      const dy = e.touches[0].clientY - panStartY;
      dragDistance = Math.max(dragDistance, Math.hypot(dx, dy));
      if (dragDistance > 3) {
        e.preventDefault();
        zoomState.tx = panStartTx + dx;
        zoomState.ty = panStartTy + dy;
        applyZoomTransform(false);
      }
    }
  };

  const onTouchEnd = (e) => {
    if (!isMobileViewport()) return;
    if (isPinching && e.touches.length < 2) {
      isPinching = false;
      suppressClickUntil = Date.now() + 140;
      if (e.touches.length === 1 && zoomState.scale > 1.02) {
        isTouchPanning = true;
        panStartX = e.touches[0].clientX;
        panStartY = e.touches[0].clientY;
        panStartTx = zoomState.tx;
        panStartTy = zoomState.ty;
      }
      return;
    }

    if (dragDistance > 8) {
      suppressClickUntil = Date.now() + 140;
    } else if (e.changedTouches.length === 1 && e.touches.length === 0) {
      const targetBtn = e.target instanceof Element ? e.target.closest('.map-hotspot-btn') : null;
      if (!targetBtn) {
        const now = Date.now();
        const t = e.changedTouches[0];
        if (now - lastTapTime < 280 && Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < 32) {
          e.preventDefault();
          lastTapTime = 0;
          if (zoomState.scale < 1.35) {
            setZoom(2.2, { pointX: t.clientX, pointY: t.clientY, animate: true });
          } else {
            setZoom(MIN_MAP_ZOOM, { animate: true });
          }
        } else {
          lastTapTime = now;
          lastTapX = t.clientX;
          lastTapY = t.clientY;
        }
      }
    }
    isTouchPanning = false;
  };

  let pointerDragging = false;
  let pointerId = null;
  let ptrStartX = 0;
  let ptrStartY = 0;
  let ptrStartTx = 0;
  let ptrStartTy = 0;
  let ptrDragDist = 0;

  const onPointerDown = (e) => {
    if (!isMobileViewport() || e.pointerType === 'touch' || zoomState.scale <= 1.02) return;
    pointerDragging = true;
    pointerId = e.pointerId;
    ptrStartX = e.clientX;
    ptrStartY = e.clientY;
    ptrStartTx = zoomState.tx;
    ptrStartTy = zoomState.ty;
    ptrDragDist = 0;
    board.classList.remove('is-animating');
  };

  const onPointerMove = (e) => {
    if (!pointerDragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - ptrStartX;
    const dy = e.clientY - ptrStartY;
    ptrDragDist = Math.max(ptrDragDist, Math.hypot(dx, dy));
    if (ptrDragDist > 3) {
      zoomState.tx = ptrStartTx + dx;
      zoomState.ty = ptrStartTy + dy;
      applyZoomTransform(false);
    }
  };

  const onPointerUp = (e) => {
    if (!pointerDragging || e.pointerId !== pointerId) return;
    pointerDragging = false;
    pointerId = null;
    if (ptrDragDist > 8) {
      suppressClickUntil = Date.now() + 140;
    }
  };

  const onWheel = (e) => {
    if (!isMobileViewport()) return;
    if (!isFullscreen && zoomState.scale <= 1.02 && !e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.35 : -0.35;
    setZoom(zoomState.scale + delta, { pointX: e.clientX, pointY: e.clientY, animate: false });
  };

  const onCaptureClick = (e) => {
    if (Date.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onWindowResize = () => {
    if (!isMobileViewport() && isFullscreen) {
      setFullscreen(false);
    } else {
      applyZoomTransform(false);
    }
  };

  const onWindowKeyDown = (e) => {
    if (e.defaultPrevented) return;
    if (e.key === 'Escape' && isFullscreen && !document.querySelector('[role="dialog"]')) {
      e.preventDefault();
      setFullscreen(false);
    }
  };

  zoomViewport.addEventListener('touchstart', onTouchStart, { passive: true });
  zoomViewport.addEventListener('touchmove', onTouchMove, { passive: false });
  zoomViewport.addEventListener('touchend', onTouchEnd, { passive: false });
  zoomViewport.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  zoomViewport.addEventListener('wheel', onWheel, { passive: false });
  zoomViewport.addEventListener('click', onCaptureClick, true);
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onWindowKeyDown);

  applyZoomTransform(false);

  // 6. Mobile-Only Route Explorer Panel
  const mobileExplorer = document.createElement('section');
  mobileExplorer.className = 'md:hidden w-full flex flex-col gap-3 pb-6';
  mobileExplorer.dataset.testid = 'mobile-route-explorer';
  mobileExplorer.setAttribute('aria-label', 'فهرست مراحل مسیر روز و شب');

  const dayDone = getRouteProgressCount(state, 'daytime', world.id);
  const nightDone = getRouteProgressCount(state, 'nighttime', world.id);
  const progressPct = Math.round((completedCount / 12) * 100);

  const finalCard = document.createElement('button');
  finalCard.type = 'button';
  finalCard.dataset.testid = 'mobile-final-treasure-card';
  finalCard.className = `w-full text-right rounded-2xl p-3.5 border transition-all ${
    finalUnlocked
      ? 'bg-gradient-to-l from-amber-500/25 via-amber-900/40 to-slate-900 border-amber-400 shadow-lg shadow-amber-500/15'
      : 'bg-slate-900/90 border-amber-400/35'
  }`;
  finalCard.innerHTML = `
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
          finalUnlocked ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300 border border-amber-400/30'
        }">${finalUnlocked ? '👑' : '🔒'}</span>
        <div class="min-w-0">
          <div class="font-extrabold text-sm text-amber-200 truncate">${world.finalTempleTitle}</div>
          <div class="text-xs text-slate-300 tabular-nums">
            ${
              finalUnlocked
                ? 'هر دو مسیر کامل شد! آماده ورود به معبد'
                : `${toPersianDigits(completedCount)} از ${toPersianDigits(12)} مرحله تکمیل شده`
            }
          </div>
        </div>
      </div>
      <span class="px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${
        finalUnlocked
          ? 'btn-primary-gold'
          : 'bg-slate-800 text-amber-300 border border-slate-700'
      }">
        ${finalUnlocked ? UI_TEXT.enterFinalTemple : 'قفل'}
      </span>
    </div>
    <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
      <div class="h-full rounded-full bg-gradient-to-l from-amber-400 to-emerald-400 transition-all" style="width:${progressPct}%"></div>
    </div>
  `;
  finalCard.addEventListener('click', handleFinalTempleSelect);
  mobileExplorer.appendChild(finalCard);

  let activeMobileRoute = nextRec?.route || 'daytime';

  const tabsWrap = document.createElement('div');
  tabsWrap.className = 'grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900/95 border border-slate-700/80';
  tabsWrap.setAttribute('role', 'tablist');

  const routeListWrap = document.createElement('div');
  routeListWrap.className = 'flex flex-col gap-2.5';

  function renderMobileRouteContent() {
    tabsWrap.innerHTML = '';
    [
      { id: 'daytime', icon: '☀', label: UI_TEXT.daytimeRoute, count: dayDone },
      { id: 'nighttime', icon: '🌙', label: UI_TEXT.nighttimeRoute, count: nightDone },
    ].forEach((tab) => {
      const isSelected = activeMobileRoute === tab.id;
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.role = 'tab';
      tabBtn.setAttribute('aria-selected', String(isSelected));
      tabBtn.dataset.testid = `mobile-tab-${tab.id}`;
      tabBtn.className = `min-h-[48px] px-3 py-2 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
        isSelected
          ? tab.id === 'daytime'
            ? 'bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25'
            : 'bg-gradient-to-b from-cyan-400 to-sky-600 text-slate-950 shadow-md shadow-cyan-500/25'
          : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
      }`;
      tabBtn.innerHTML = `
        <span aria-hidden="true">${tab.icon}</span>
        <span>${tab.label}</span>
        <span class="px-1.5 py-0.5 rounded-md text-[11px] tabular-nums ${
          isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-300'
        }">${toPersianDigits(tab.count)}/${toPersianDigits(6)}</span>
      `;
      tabBtn.addEventListener('click', () => {
        if (activeMobileRoute === tab.id) return;
        audio.playClick();
        activeMobileRoute = tab.id;
        renderMobileRouteContent();
      });
      tabsWrap.appendChild(tabBtn);
    });

    routeListWrap.innerHTML = '';
    const isDay = activeMobileRoute === 'daytime';
    if (hasRouteKeys) {
      const keyType = isDay ? 'magnetic' : 'silver';
      const hasRouteKey = isDay ? ws.keys?.magnetic : ws.keys?.silver;
      const keyName = isDay ? world.daytimeKeyName : world.nighttimeKeyName;

      const keyBanner = document.createElement('div');
      keyBanner.className = `flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold ${
        hasRouteKey
          ? 'bg-emerald-950/60 border-emerald-400/50 text-emerald-200'
          : 'bg-slate-900/90 border-slate-700 text-slate-300'
      }`;
      keyBanner.innerHTML = `
        <div class="flex items-center gap-2">
          ${renderKeyIconSvg(keyType, hasRouteKey)}
          <span>${keyName}</span>
        </div>
        <span class="${hasRouteKey ? 'text-emerald-300' : 'text-amber-300'}">
          ${hasRouteKey ? '✓ پیدا شد (آماده دروازه ۳)' : 'پنهان در مرحله ۲'}
        </span>
      `;
      routeListWrap.appendChild(keyBanner);
    }

    mapHotspots.stages[activeMobileRoute].forEach((node) => {
      const stageMeta = getStage(activeMobileRoute, node.number, world.id);
      const completed = isStageCompleted(state, activeMobileRoute, node.number, world.id);
      const unlocked = isStageUnlocked(state, activeMobileRoute, node.number, world.id);
      const stars = ws.stars?.[stageMeta.id] || 0;
      const displayNum = useCumulativeNumbers && activeMobileRoute === 'nighttime' ? node.number + 6 : node.number;

      const card = document.createElement('button');
      card.type = 'button';
      card.dataset.testid = `mobile-stage-card-${stageMeta.id}`;
      card.className = `w-full min-h-[64px] p-3 rounded-2xl border text-right flex items-center justify-between gap-3 transition-all ${
        completed
          ? 'bg-emerald-950/35 border-emerald-400/45 text-slate-100'
          : unlocked
          ? isDay
            ? 'bg-gradient-to-l from-orange-950/60 to-slate-900 border-amber-400/70 text-white shadow-md shadow-orange-500/10'
            : 'bg-gradient-to-l from-sky-950/60 to-slate-900 border-cyan-400/70 text-white shadow-md shadow-cyan-500/10'
          : 'bg-slate-900/70 border-slate-800 text-slate-400 opacity-85'
      }`;

      const badgeClass = completed
        ? 'bg-emerald-500 text-slate-950 border-emerald-200'
        : unlocked
        ? isDay
          ? 'bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 border-amber-100'
          : 'bg-gradient-to-b from-cyan-300 to-sky-500 text-slate-950 border-cyan-100'
        : 'bg-slate-800 text-slate-400 border-slate-700';

      let subLine = stageMeta.shortTitle;
      if (stageMeta.requiresKey) {
        const reqHasKey = stageMeta.requiresKey === 'magnetic' ? ws.keys?.magnetic : ws.keys?.silver;
        const reqKeyName = stageMeta.requiresKey === 'magnetic' ? world.daytimeKeyName : world.nighttimeKeyName;
        subLine = reqHasKey ? `🗝️ ${reqKeyName} آماده است` : `🗝️ نیازمند ${reqKeyName}`;
      } else if (stageMeta.grantsKey) {
        subLine = `🗝️ شامل ${stageMeta.grantsKey === 'magnetic' ? world.daytimeKeyName : world.nighttimeKeyName}`;
      }

      const rightBadge = completed
        ? `<div class="flex flex-col items-end shrink-0">
             <span class="text-amber-300 text-xs tracking-wide">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
             <span class="text-[11px] font-bold text-emerald-300">${UI_TEXT.stageCompleted}</span>
           </div>`
        : unlocked
        ? `<span class="px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 ${
             isDay ? 'bg-amber-400 text-slate-950' : 'bg-cyan-400 text-slate-950'
           }">شروع ◀</span>`
        : `<span class="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold shrink-0">🔒 قفل</span>`;

      card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full border-2 flex items-center justify-center font-extrabold text-sm shrink-0 tabular-nums ${badgeClass}">
            ${completed ? '✓' : unlocked ? toPersianDigits(displayNum) : '🔒'}
          </div>
          <div class="min-w-0">
            <div class="font-extrabold text-sm truncate">${UI_TEXT.stagePrefix} ${toPersianDigits(displayNum)}: ${stageMeta.title}</div>
            <div class="text-xs ${unlocked && !completed ? 'text-amber-200/90' : 'text-slate-400'} truncate">${subLine}</div>
          </div>
        </div>
        ${rightBadge}
      `;

      card.addEventListener('click', () => handleStageSelect(stageMeta, unlocked, node));
      routeListWrap.appendChild(card);
    });

    const decoyMeta = decoyChests[activeMobileRoute];
    const decoyFound = Boolean(ws.decoyDiscovered?.[activeMobileRoute]);
    const decoyCard = document.createElement('button');
    decoyCard.type = 'button';
    decoyCard.dataset.testid = `mobile-decoy-card-${activeMobileRoute}`;
    decoyCard.className = `w-full min-h-[56px] p-3 rounded-2xl border text-right flex items-center justify-between gap-3 transition-all ${
      decoyFound
        ? 'bg-slate-900/80 border-amber-400/40 text-amber-100'
        : 'bg-amber-950/35 border-amber-400/60 text-amber-100'
    }`;
    decoyCard.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <span class="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-lg shrink-0">
          ${decoyFound ? '📜' : '🧰'}
        </span>
        <div class="min-w-0">
          <div class="font-extrabold text-xs sm:text-sm text-amber-200 truncate">${decoyMeta.title}</div>
          <div class="text-xs text-slate-300 truncate">${decoyFound ? 'یادداشت صندوق خوانده شد' : 'صندوق مرموز کنار مسیر'}</div>
        </div>
      </div>
      <span class="px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
        decoyFound ? 'bg-slate-800 text-amber-300' : 'bg-amber-400 text-slate-950'
      }">
        ${decoyFound ? 'مشاهده' : 'باز کردن'}
      </span>
    `;
    decoyCard.addEventListener('click', () => handleDecoySelect(activeMobileRoute));
    routeListWrap.appendChild(decoyCard);
  }

  renderMobileRouteContent();
  mobileExplorer.appendChild(tabsWrap);
  mobileExplorer.appendChild(routeListWrap);
  stageViewport.appendChild(mobileExplorer);

  shell.appendChild(stageViewport);
  container.appendChild(shell);

  return () => {
    clearTimeout(animTimer);
    document.body.style.overflow = '';
    zoomViewport.removeEventListener('touchstart', onTouchStart);
    zoomViewport.removeEventListener('touchmove', onTouchMove);
    zoomViewport.removeEventListener('touchend', onTouchEnd);
    zoomViewport.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    zoomViewport.removeEventListener('wheel', onWheel);
    zoomViewport.removeEventListener('click', onCaptureClick, true);
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('keydown', onWindowKeyDown);
  };
}
