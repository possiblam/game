import { MAP_VIEWBOX, ROUTE_SEGMENTS } from './routes.js';
import { MAP_HOTSPOTS, PERSIAN_MAP_PLAQUES } from './hotspots.js';
import { getStage } from '../data/stages.js';
import { DECOY_CHESTS, renderCharacterAvatarSvg } from '../data/story.js';
import { UI_TEXT, toPersianDigits } from '../data/translations.js';
import {
  isStageCompleted,
  isStageUnlocked,
  isFinalUnlocked,
  getRouteProgressCount,
  getTotalCompletedStages,
  getNextRecommendedStage,
} from '../core/game-state.js';
import { renderMapTopBar, renderKeyIconSvg } from '../components/progress-bar.js';
import { showModal } from '../components/modal.js';

export function renderMapView(
  container,
  {
    state,
    audio,
    onSelectStage,
    onDiscoverDecoy,
    onOpenFinalTemple,
    onBackHome,
    onToggleSound,
    onOpenGuide,
    onOpenSettings,
  }
) {
  const shell = document.createElement('div');
  shell.className = 'map-shell';

  const topBar = renderMapTopBar({
    state,
    onHome: onBackHome,
    onToggleSound,
    onOpenGuide,
    onOpenSettings,
  });
  shell.appendChild(topBar);

  const stageViewport = document.createElement('main');
  stageViewport.className = 'map-stage-viewport';
  stageViewport.setAttribute('aria-label', 'نقشه ماجراجویی دو جهان');

  const board = document.createElement('div');
  board.className = 'map-board';
  board.dataset.testid = 'adventure-map-board';

  // 1. Original Map Artwork (unstretched 1672:941)
  const img = document.createElement('img');
  img.src = '/images/adventure-map.png';
  img.alt = 'نقشه گنج دو جهان — مسیر روز و مسیر شب';
  img.className = 'map-artwork';
  img.draggable = false;
  board.appendChild(img);

  // 2. Ambient Animation Layer (clouds on day sky, twinkling stars on night sky, waterfall shimmer)
  const ambient = document.createElement('div');
  ambient.className = 'map-ambient-layer';
  ambient.innerHTML = `
    <!-- Daytime drifting clouds -->
    <div class="animate-cloud absolute top-[4%] left-[6%] w-[14%] h-[6%] rounded-full bg-white/30 blur-md"></div>
    <div class="animate-cloud absolute top-[9%] left-[22%] w-[10%] h-[4%] rounded-full bg-amber-100/25 blur-sm" style="animation-delay:-7s"></div>
    <!-- Nighttime twinkling stars -->
    <span class="animate-twinkle absolute top-[5%] right-[16%] w-2 h-2 rounded-full bg-cyan-200"></span>
    <span class="animate-twinkle absolute top-[11%] right-[24%] w-1.5 h-1.5 rounded-full bg-white" style="animation-delay:0.9s"></span>
    <span class="animate-twinkle absolute top-[7%] right-[9%] w-2 h-2 rounded-full bg-sky-300" style="animation-delay:1.6s"></span>
    <span class="animate-twinkle absolute top-[18%] right-[18%] w-1.5 h-1.5 rounded-full bg-cyan-100" style="animation-delay:2.1s"></span>
    <!-- Waterfall sparkle -->
    <span class="animate-twinkle absolute top-[38%] left-[52%] w-2 h-2 rounded-full bg-sky-100/80" style="animation-delay:0.4s"></span>
    <span class="animate-twinkle absolute top-[47%] left-[56%] w-2 h-2 rounded-full bg-cyan-200/80" style="animation-delay:1.2s"></span>
  `;
  board.appendChild(ambient);

  // 3. SVG Overlay for independent Daytime & Nighttime routes
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`);
  svg.setAttribute('class', 'map-svg-overlay');
  svg.setAttribute('aria-hidden', 'true');

  ['daytime', 'nighttime'].forEach((route) => {
    const strokeColor = route === 'daytime' ? '#fb923c' : '#22d3ee';
    const glowColor = route === 'daytime' ? '#facc15' : '#a5f3fc';

    ROUTE_SEGMENTS[route].forEach((seg) => {
      let segStatus = 'locked';
      if (seg.to === 'final') {
        segStatus = isStageCompleted(state, route, 6)
          ? isFinalUnlocked(state)
            ? 'completed'
            : 'active'
          : 'locked';
      } else if (isStageCompleted(state, route, seg.to)) {
        segStatus = 'completed';
      } else if (isStageUnlocked(state, route, seg.to)) {
        segStatus = 'active';
      }

      // Outer glow for active or completed path
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

  // 4. Persian Plaques over English labels (hidden on mobile via CSS)
  PERSIAN_MAP_PLAQUES.forEach((plaque) => {
    const el = document.createElement('div');
    el.className = `persian-map-plaque plaque--${plaque.variant}`;
    el.style.left = `${plaque.x}%`;
    el.style.top = `${plaque.y}%`;
    el.innerText = plaque.text;
    board.appendChild(el);
  });

  // 5. Interactive Hotspots Layer
  const hotspotsLayer = document.createElement('div');
  hotspotsLayer.className = 'map-hotspots-layer';

  // Companion Avatar Marker (Arad & Nika)
  const nextRec = getNextRecommendedStage(state);
  let compPos = { x: MAP_HOTSPOTS.start.x, y: MAP_HOTSPOTS.start.y - 4 };
  if (nextRec) {
    const hs = MAP_HOTSPOTS.stages[nextRec.route].find((s) => s.number === nextRec.number);
    if (hs) compPos = { x: hs.x, y: hs.y };
  } else if (isFinalUnlocked(state)) {
    compPos = { x: MAP_HOTSPOTS.final.x, y: MAP_HOTSPOTS.final.y + 4 };
  }

  const companion = document.createElement('div');
  companion.className = 'map-companion-marker flex items-center justify-center';
  companion.innerHTML = `
    <div class="flex -space-x-2 rtl:space-x-reverse">
      <div class="w-6 h-6 sm:w-9 sm:h-9 rounded-full ring-2 ring-amber-300 bg-slate-900 overflow-hidden">${renderCharacterAvatarSvg('arad', 'happy')}</div>
      <div class="w-6 h-6 sm:w-9 sm:h-9 rounded-full ring-2 ring-violet-300 bg-slate-900 overflow-hidden">${renderCharacterAvatarSvg('nika', 'happy')}</div>
    </div>
  `;
  companion.style.left = `${compPos.x}%`;
  companion.style.top = `${compPos.y}%`;
  hotspotsLayer.appendChild(companion);

  // Shared Stage, Decoy, and Final Temple handlers
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
    const decoyMeta = DECOY_CHESTS[route];
    audio.playMechanism();
    onDiscoverDecoy(route);
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
            <div class="w-10 h-10 shrink-0">${renderCharacterAvatarSvg('nika', 'happy')}</div>
            <p class="m-0 text-slate-200"><strong>نیکا:</strong> «${decoyMeta.nikaLine}»</p>
          </div>
        </div>
      `,
      actions: [{ label: 'ادامه ماجراجویی', variant: 'primary' }],
    });
  }

  const finalUnlocked = isFinalUnlocked(state);
  const completedCount = getTotalCompletedStages(state);

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
    MAP_HOTSPOTS.stages[route].forEach((node) => {
      const stageMeta = getStage(route, node.number);
      const completed = isStageCompleted(state, route, node.number);
      const unlocked = isStageUnlocked(state, route, node.number);
      const stars = state.stars[stageMeta.id] || 0;

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

      btn.setAttribute(
        'aria-label',
        `${route === 'daytime' ? UI_TEXT.daytimeRoute : UI_TEXT.nighttimeRoute} - ${UI_TEXT.stagePrefix} ${toPersianDigits(node.number)}: ${stageMeta.title} (${statusLabel})`
      );

      if (completed) {
        btn.innerHTML = `
          <span>✓</span>
          <span class="stage-node-stars text-[10px] sm:text-xs text-amber-300">
            ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}
          </span>
        `;
      } else if (unlocked) {
        btn.innerHTML = `<span class="tabular-nums">${toPersianDigits(node.number)}</span>`;
      } else {
        btn.innerHTML = `<span aria-hidden="true">🔒</span>`;
      }

      btn.addEventListener('click', () => handleStageSelect(stageMeta, unlocked, node));
      hotspotsLayer.appendChild(btn);

      // Key badge indicator on Stage 2 (hidden on mobile via CSS)
      if (node.keyMarker) {
        const hasKey = route === 'daytime' ? state.keys.magnetic : state.keys.silver;
        const keyBadge = document.createElement('div');
        keyBadge.className =
          'map-key-marker absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold border shadow-md whitespace-nowrap';
        keyBadge.style.left = `${node.keyMarker.x}%`;
        keyBadge.style.top = `${node.keyMarker.y + 5.2}%`;
        if (hasKey) {
          keyBadge.className += ' bg-emerald-900/90 border-emerald-400 text-emerald-200';
          keyBadge.textContent = route === 'daytime' ? '🗝️ کلید مغناطیسی پیدا شد' : '🗝️ کلید نقره‌ای پیدا شد';
        } else {
          keyBadge.className += ' bg-amber-950/90 border-amber-400/70 text-amber-200';
          keyBadge.textContent = route === 'daytime' ? '🗝️ کلید مغناطیسی' : '🗝️ کلید نقره‌ای';
        }
        hotspotsLayer.appendChild(keyBadge);
      }
    });
  });

  // Decoy Chests (one in Daytime, one in Nighttime)
  ['daytime', 'nighttime'].forEach((route) => {
    const decoyMeta = DECOY_CHESTS[route];
    const decoyPos = MAP_HOTSPOTS.decoys[route];
    const found = Boolean(state.decoyDiscovered?.[route]);

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

  // Final Destination Hotspot (Mountain Peak Golden Treasure)
  const finalBtn = document.createElement('button');
  finalBtn.type = 'button';
  finalBtn.dataset.testid = 'final-treasure-node';
  finalBtn.style.left = `${MAP_HOTSPOTS.final.x}%`;
  finalBtn.style.top = `${MAP_HOTSPOTS.final.y}%`;
  finalBtn.className = `map-hotspot-btn map-final-btn px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-extrabold border-2 shadow-xl ${
    finalUnlocked
      ? 'btn-primary-gold'
      : 'bg-slate-900/90 border-amber-400/50 text-amber-200 hover:bg-slate-800'
  }`;
  finalBtn.setAttribute('aria-label', `${UI_TEXT.finalDestination} (${toPersianDigits(completedCount)} از ${toPersianDigits(12)})`);
  finalBtn.innerHTML = finalUnlocked
    ? `<span class="inline-flex items-center gap-1.5"><span class="inline-block animate-float">👑</span> ${UI_TEXT.enterFinalTemple}</span>`
    : `<span>🔒 ${UI_TEXT.finalDestination} (${toPersianDigits(completedCount)}/${toPersianDigits(12)})</span>`;

  finalBtn.addEventListener('click', handleFinalTempleSelect);

  hotspotsLayer.appendChild(finalBtn);
  board.appendChild(hotspotsLayer);
  stageViewport.appendChild(board);

  // 6. Mobile-Only Route Explorer Panel (strictly hidden on md: / >= 768px desktop)
  const mobileExplorer = document.createElement('section');
  mobileExplorer.className = 'md:hidden w-full flex flex-col gap-3 pb-6';
  mobileExplorer.dataset.testid = 'mobile-route-explorer';
  mobileExplorer.setAttribute('aria-label', 'فهرست مراحل مسیر روز و شب');

  const dayDone = getRouteProgressCount(state, 'daytime');
  const nightDone = getRouteProgressCount(state, 'nighttime');
  const progressPct = Math.round((completedCount / 12) * 100);

  // Final Temple Progress Card
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
          <div class="font-extrabold text-sm text-amber-200 truncate">${UI_TEXT.finalDestination}</div>
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

  // Segmented Route Tabs
  let activeMobileRoute = nextRec?.route || 'daytime';

  const tabsWrap = document.createElement('div');
  tabsWrap.className = 'grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900/95 border border-slate-700/80';
  tabsWrap.setAttribute('role', 'tablist');

  const routeListWrap = document.createElement('div');
  routeListWrap.className = 'flex flex-col gap-2.5';

  function renderMobileRouteContent() {
    // Update Tab Styling
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

    // Update Route Content List
    routeListWrap.innerHTML = '';
    const isDay = activeMobileRoute === 'daytime';
    const keyType = isDay ? 'magnetic' : 'silver';
    const hasRouteKey = isDay ? state.keys.magnetic : state.keys.silver;
    const keyName = isDay ? UI_TEXT.magneticKey : UI_TEXT.silverKey;

    // Key Status Banner
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

    // 6 Stages for the active route
    MAP_HOTSPOTS.stages[activeMobileRoute].forEach((node) => {
      const stageMeta = getStage(activeMobileRoute, node.number);
      const completed = isStageCompleted(state, activeMobileRoute, node.number);
      const unlocked = isStageUnlocked(state, activeMobileRoute, node.number);
      const stars = state.stars[stageMeta.id] || 0;

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
        const reqHasKey = stageMeta.requiresKey === 'magnetic' ? state.keys.magnetic : state.keys.silver;
        const reqKeyName = stageMeta.requiresKey === 'magnetic' ? UI_TEXT.magneticKey : UI_TEXT.silverKey;
        subLine = reqHasKey ? `🗝️ ${reqKeyName} آماده است` : `🗝️ نیازمند ${reqKeyName}`;
      } else if (stageMeta.grantsKey) {
        subLine = `🗝️ شامل ${stageMeta.grantsKey === 'magnetic' ? UI_TEXT.magneticKey : UI_TEXT.silverKey}`;
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
            ${completed ? '✓' : unlocked ? toPersianDigits(node.number) : '🔒'}
          </div>
          <div class="min-w-0">
            <div class="font-extrabold text-sm truncate">${UI_TEXT.stagePrefix} ${toPersianDigits(node.number)}: ${stageMeta.title}</div>
            <div class="text-xs ${unlocked && !completed ? 'text-amber-200/90' : 'text-slate-400'} truncate">${subLine}</div>
          </div>
        </div>
        ${rightBadge}
      `;

      card.addEventListener('click', () => handleStageSelect(stageMeta, unlocked, node));
      routeListWrap.appendChild(card);
    });

    // Decoy Chest Card for active route
    const decoyMeta = DECOY_CHESTS[activeMobileRoute];
    const decoyFound = Boolean(state.decoyDiscovered?.[activeMobileRoute]);
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
}
