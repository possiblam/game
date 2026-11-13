import { MAP_VIEWBOX, ROUTE_SEGMENTS } from './routes.js';
import { MAP_HOTSPOTS, PERSIAN_MAP_PLAQUES } from './hotspots.js';
import { getStage } from '../data/stages.js';
import { DECOY_CHESTS, renderCharacterAvatarSvg } from '../data/story.js';
import { UI_TEXT, toPersianDigits } from '../data/translations.js';
import {
  isStageCompleted,
  isStageUnlocked,
  isFinalUnlocked,
  getTotalCompletedStages,
  getNextRecommendedStage,
} from '../core/game-state.js';
import { renderMapTopBar } from '../components/progress-bar.js';
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

  // 4. Persian Plaques over English labels
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
      <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-full ring-2 ring-amber-300 bg-slate-900 overflow-hidden">${renderCharacterAvatarSvg('arad', 'happy')}</div>
      <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-full ring-2 ring-violet-300 bg-slate-900 overflow-hidden">${renderCharacterAvatarSvg('nika', 'happy')}</div>
    </div>
  `;
  companion.style.left = `${compPos.x}%`;
  companion.style.top = `${compPos.y}%`;
  hotspotsLayer.appendChild(companion);

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

      btn.addEventListener('click', () => {
        if (!unlocked) {
          audio.playError();
          showModal({
            title: 'این مرحله هنوز قفل است',
            bodyHtml: `<p class="m-0">برای باز کردن «${stageMeta.title}»، ابتدا باید مرحله ${toPersianDigits(node.number - 1)} در ${route === 'daytime' ? UI_TEXT.daytimeRoute : UI_TEXT.nighttimeRoute} را با موفقیت به پایان برسانید.</p>`,
            actions: [{ label: 'باشه', variant: 'primary' }],
          });
          return;
        }
        audio.playClick();
        // Light up active path segment before entering stage
        const segEl = svg.querySelector(`[data-route-segment="${route}-${node.number}"]`);
        if (segEl) {
          segEl.setAttribute('stroke-width', '10');
          segEl.style.filter = 'drop-shadow(0 0 10px #fde047)';
        }
        companion.style.left = `${node.x}%`;
        companion.style.top = `${node.y}%`;
        setTimeout(() => onSelectStage(stageMeta), 260);
      });

      hotspotsLayer.appendChild(btn);

      // Key badge indicator on Stage 2
      if (node.keyMarker) {
        const hasKey = route === 'daytime' ? state.keys.magnetic : state.keys.silver;
        const keyBadge = document.createElement('div');
        keyBadge.className =
          'absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold border shadow-md whitespace-nowrap';
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
    btn.className = `map-hotspot-btn w-10 h-10 sm:w-12 sm:h-12 border-2 shadow-lg ${
      found
        ? 'bg-slate-800/90 border-amber-400/60 text-amber-200'
        : 'bg-gradient-to-b from-amber-300 to-amber-600 border-amber-100 text-slate-950'
    }`;
    btn.setAttribute('aria-label', `${decoyMeta.title} - صندوق گنج`);
    btn.innerHTML = found
      ? '<span class="text-lg">📜</span>'
      : '<span class="text-xl inline-block animate-float">🧰</span>';

    btn.addEventListener('click', () => {
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
    });

    hotspotsLayer.appendChild(btn);
  });

  // Final Destination Hotspot (Mountain Peak Golden Treasure)
  const finalUnlocked = isFinalUnlocked(state);
  const completedCount = getTotalCompletedStages(state);
  const finalBtn = document.createElement('button');
  finalBtn.type = 'button';
  finalBtn.dataset.testid = 'final-treasure-node';
  finalBtn.style.left = `${MAP_HOTSPOTS.final.x}%`;
  finalBtn.style.top = `${MAP_HOTSPOTS.final.y}%`;
  finalBtn.className = `map-hotspot-btn px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-extrabold border-2 shadow-xl ${
    finalUnlocked
      ? 'btn-primary-gold'
      : 'bg-slate-900/90 border-amber-400/50 text-amber-200 hover:bg-slate-800'
  }`;
  finalBtn.setAttribute('aria-label', `${UI_TEXT.finalDestination} (${toPersianDigits(completedCount)} از ${toPersianDigits(12)})`);
  finalBtn.innerHTML = finalUnlocked
    ? `<span class="inline-flex items-center gap-1.5"><span class="inline-block animate-float">👑</span> ${UI_TEXT.enterFinalTemple}</span>`
    : `<span>🔒 ${UI_TEXT.finalDestination} (${toPersianDigits(completedCount)}/${toPersianDigits(12)})</span>`;

  finalBtn.addEventListener('click', () => {
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
  });

  hotspotsLayer.appendChild(finalBtn);
  board.appendChild(hotspotsLayer);
  stageViewport.appendChild(board);
  shell.appendChild(stageViewport);

  // Subtle mobile pan hint strip
  const mobileHint = document.createElement('div');
  mobileHint.className =
    'md:hidden text-center text-xs text-slate-300 py-1.5 px-3 bg-slate-900/90 border-t border-slate-800';
  mobileHint.textContent = 'برای دیدن تمام نقشه می‌توانید صفحه را به چپ و راست بکشید · روی شماره مراحل لمس کنید';
  shell.appendChild(mobileHint);

  container.appendChild(shell);
}
