import { createStageShell } from '../stage-shell.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountDayStage2(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  // 5x5 magnetic chamber grid
  const COLS = 5;
  const ROWS = 5;
  const bumpers = new Set(['2,2', '1,4', '0,3']);

  const initialCores = [
    { id: 'blue', label: 'آبی', color: '#38bdf8', col: 0, row: 0, targetCol: 4, targetRow: 0, locked: false },
    { id: 'gold', label: 'طلایی', color: '#fbbf24', col: 0, row: 2, targetCol: 1, targetRow: 3, locked: false },
    { id: 'orange', label: 'نارنجی', color: '#fb923c', col: 4, row: 4, targetCol: 2, targetRow: 4, locked: false },
  ];

  let cores = initialCores.map((c) => ({ ...c }));
  let vaultOpen = false;
  let keyCollected = false;
  let activeMagnetDir = null;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[780px] flex flex-col items-center gap-3">
      <div class="w-full flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-amber-200 px-1">
        <span>قطعات فلزی را با آهنرباها روی جایگاه هم‌رنگ بفرستید تا محفظه کلید باز شود</span>
        <span id="d2-status" class="font-bold text-amber-300 tabular-nums">قفل‌های آماده: ۰ از ۳</span>
      </div>

      <div id="d2-chamber" class="relative w-full max-w-[520px] p-4 rounded-2xl bg-slate-900/95 border-2 border-amber-400/50 shadow-2xl">
        <!-- Top Magnet -->
        <div class="flex justify-center mb-2">
          <button type="button" data-magnet="up" class="px-4 py-2 rounded-xl btn-day-accent text-xs sm:text-sm" data-testid="magnet-up">
            🧲 جذب به بالا
          </button>
        </div>

        <div class="flex items-center justify-center gap-2">
          <!-- Right Magnet (RTL right is visual right) -->
          <button type="button" data-magnet="right" class="px-2.5 py-3 rounded-xl btn-day-accent text-xs sm:text-sm shrink-0" data-testid="magnet-right">
            🧲 راست
          </button>

          <!-- 5x5 Grid -->
          <div id="d2-grid" class="grid grid-cols-5 gap-1.5 sm:gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-700" style="direction:ltr"></div>

          <!-- Left Magnet -->
          <button type="button" data-magnet="left" class="px-2.5 py-3 rounded-xl btn-day-accent text-xs sm:text-sm shrink-0" data-testid="magnet-left">
            🧲 چپ
          </button>
        </div>

        <!-- Bottom Magnet -->
        <div class="flex justify-center mt-2">
          <button type="button" data-magnet="down" class="px-4 py-2 rounded-xl btn-day-accent text-xs sm:text-sm" data-testid="magnet-down">
            🧲 جذب به پایین
          </button>
        </div>

        <!-- Hidden Magnetic Key Vault -->
        <div id="d2-vault" class="mt-4 p-4 rounded-xl border-2 text-center transition-all ${
          vaultOpen ? 'bg-amber-950/60 border-amber-300' : 'bg-slate-800/70 border-slate-600'
        }">
          <div class="text-xs sm:text-sm font-bold text-slate-200 mb-2" id="d2-vault-label">
            محفظه شیشه‌ای کلید مغناطیسی (قفل است)
          </div>
          <button type="button" id="d2-pickup-key" data-testid="pickup-magnetic-key"
            class="px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
              vaultOpen ? 'btn-primary-gold animate-float' : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }" disabled>
            🗝️ برداشتن کلید مغناطیسی
          </button>
        </div>
      </div>
    </div>
  `;

  const gridEl = shell.playArea.querySelector('#d2-grid');
  const statusEl = shell.playArea.querySelector('#d2-status');
  const vaultEl = shell.playArea.querySelector('#d2-vault');
  const vaultLabel = shell.playArea.querySelector('#d2-vault-label');
  const pickupBtn = shell.playArea.querySelector('#d2-pickup-key');

  function resetPuzzle() {
    cores = initialCores.map((c) => ({ ...c }));
    vaultOpen = false;
    activeMagnetDir = null;
    renderBoard();
  }

  shell.onRetry(resetPuzzle);
  shell.onHint(() => renderBoard());

  function isOccupied(col, row, movingId) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    if (bumpers.has(`${col},${row}`)) return true;
    return cores.some((c) => c.id !== movingId && c.col === col && c.row === row);
  }

  function pullMagnet(dir) {
    if (vaultOpen) return;
    audio.playMechanism();
    activeMagnetDir = dir;

    const deltas = {
      up: { dc: 0, dr: -1 },
      down: { dc: 0, dr: 1 },
      left: { dc: -1, dr: 0 },
      right: { dc: 1, dr: 0 },
    };
    const { dc, dr } = deltas[dir];

    // Sort cores so leading core moves first
    const ordered = [...cores].sort((a, b) => {
      if (dc > 0) return b.col - a.col;
      if (dc < 0) return a.col - b.col;
      if (dr > 0) return b.row - a.row;
      return a.row - b.row;
    });

    for (const core of ordered) {
      if (core.locked) continue;
      while (!isOccupied(core.col + dc, core.row + dr, core.id)) {
        core.col += dc;
        core.row += dr;
        if (core.col === core.targetCol && core.row === core.targetRow) {
          core.locked = true;
          break;
        }
      }
      if (core.col === core.targetCol && core.row === core.targetRow) {
        core.locked = true;
      }
    }

    const lockedCount = cores.filter((c) => c.locked).length;
    if (lockedCount === 3) {
      vaultOpen = true;
      audio.playGateOpen();
    }
    renderBoard();
  }

  function getSuggestedHintDirection() {
    const blue = cores.find((c) => c.id === 'blue');
    const gold = cores.find((c) => c.id === 'gold');
    const orange = cores.find((c) => c.id === 'orange');
    if (blue && !blue.locked) {
      if (blue.row > 0) return 'up';
      return 'right';
    }
    if (gold && !gold.locked) {
      if (gold.col === 0) return 'right';
      if (gold.col === 1 && gold.row < 3) return 'down';
      return 'up';
    }
    if (orange && !orange.locked) {
      if (orange.row < 4) return 'down';
      return 'left';
    }
    return null;
  }

  function renderBoard() {
    const lockedCount = cores.filter((c) => c.locked).length;
    statusEl.textContent = `جایگاه‌های قفل‌شده: ${toPersianDigits(lockedCount)} از ${toPersianDigits(3)}`;

    // Hint Tier 3 glow
    const hintDir = shell.getHintLevel() >= 3 && !vaultOpen ? getSuggestedHintDirection() : null;
    shell.playArea.querySelectorAll('[data-magnet]').forEach((btn) => {
      const isHint = btn.dataset.magnet === hintDir;
      btn.classList.toggle('ring-4', isHint);
      btn.classList.toggle('ring-emerald-400', isHint);
      btn.classList.toggle('animate-pulse', isHint);
    });

    gridEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        const key = `${c},${r}`;
        const isBumper = bumpers.has(key);
        const target = cores.find((x) => x.targetCol === c && x.targetRow === r);
        const core = cores.find((x) => x.col === c && x.row === r);

        cell.className =
          'w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center relative border transition-all';

        if (isBumper) {
          cell.className += ' bg-slate-700 border-slate-500';
          cell.innerHTML = '<span class="text-slate-400 text-xs font-bold">■</span>';
        } else if (target) {
          cell.style.borderColor = target.color;
          cell.style.background = `${target.color}22`;
          cell.className += ' border-2 border-dashed';
        } else {
          cell.className += ' bg-slate-900 border-slate-800';
        }

        if (core) {
          const block = document.createElement('div');
          block.className =
            'w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-md border-2 transition-transform';
          block.style.background = core.color;
          block.style.color = '#0f172a';
          block.style.borderColor = core.locked ? '#4ade80' : '#ffffff';
          block.textContent = core.locked ? '✓' : core.label;
          cell.appendChild(block);
        } else if (target) {
          const hintLabel = document.createElement('span');
          hintLabel.className = 'text-[10px] font-bold opacity-85';
          hintLabel.style.color = target.color;
          hintLabel.textContent = target.label;
          cell.appendChild(hintLabel);
        }

        gridEl.appendChild(cell);
      }
    }

    if (vaultOpen) {
      vaultEl.className = 'mt-4 p-4 rounded-xl border-2 text-center transition-all bg-amber-950/60 border-amber-300';
      vaultLabel.textContent = keyCollected
        ? 'کلید مغناطیسی در کیف ابزار ذخیره شد!'
        : 'محفظه باز شد! روی کلید مغناطیسی کلیک کنید تا برداشته شود:';
      pickupBtn.disabled = keyCollected;
      pickupBtn.className = keyCollected
        ? 'px-5 py-2.5 rounded-xl font-extrabold text-sm bg-emerald-700 text-white'
        : 'px-5 py-2.5 rounded-xl font-extrabold text-sm btn-primary-gold ring-4 ring-amber-300/60';
    } else {
      vaultEl.className = 'mt-4 p-4 rounded-xl border-2 text-center transition-all bg-slate-800/70 border-slate-600';
      vaultLabel.textContent = 'محفظه شیشه‌ای کلید مغناطیسی (قفل است)';
      pickupBtn.disabled = true;
      pickupBtn.className = 'px-5 py-2.5 rounded-xl font-extrabold text-sm bg-slate-700 text-slate-400 cursor-not-allowed';
    }
  }

  shell.playArea.querySelectorAll('[data-magnet]').forEach((btn) => {
    btn.addEventListener('click', () => pullMagnet(btn.dataset.magnet));
  });

  function onKeyDown(e) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      pullMagnet('up');
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      pullMagnet('down');
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      pullMagnet('left');
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      pullMagnet('right');
    }
  }

  window.addEventListener('keydown', onKeyDown);

  pickupBtn.addEventListener('click', () => {
    if (!vaultOpen || keyCollected) return;
    keyCollected = true;
    audio.playKeyPickup();
    shell.refreshToolkitKey('magnetic');
    renderBoard();
    setTimeout(() => {
      shell.complete({ grantedKey: 'magnetic' });
    }, 350);
  });

  renderBoard();

  shell.registerCleanup(() => {
    window.removeEventListener('keydown', onKeyDown);
  });

  return shell;
}
