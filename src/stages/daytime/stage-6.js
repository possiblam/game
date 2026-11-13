import { createStageShell } from '../stage-shell.js';
import { evaluatePlatformPath, getRotatedPorts } from '../puzzle-logic.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountDayStage6(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  // 3 rows x 4 cols circular rotating platforms
  // Start at (1, 3) pointing Left (rotation 0 for 'start' = port [3]).
  // End at (1, 0) pointing Right (rotation 0 for 'end' = port [1]).
  // Solved path: (1,3) -> (1,2) -> (0,2) -> (0,1) -> (1,1) -> (2,1) -> (2,0) -> Wait let's make a crisp 6-step path:
  // (1,3)[start] -> (1,2)[corner: Left+Top -> rot 2] -> (0,2)[corner: Bottom+Left -> rot 1] -> (0,1)[straight: Left+Right -> rot 0] -> (0,0)[corner: Right+Bottom -> rot 0] -> (1,0)[end: Top+Right? No, end has [1] so rot 3 points Top!]
  // Let's keep End fixed pointing Right (port 1) at (1,0) so (1,1) connects right to (1,0)!
  // Path: (1,3) -> (1,2) -> (0,2) -> (0,1) -> (1,1) -> (1,0)
  // Let's verify exact target rotations:
  // (1,3) start: fixed rot 0 (port 3 = Left)
  // (1,2) corner (base [1,2]): needs Left(3) + Top(0) => rot 2 gives [(1+2)%4=3, (2+2)%4=0] = [3,0]!
  // (0,2) corner (base [1,2]): needs Bottom(2) + Left(3) => rot 1 gives [2,3]!
  // (0,1) corner (base [1,2]): needs Right(1) + Bottom(2) => rot 0 gives [1,2]!
  // (1,1) corner (base [1,2]): needs Top(0) + Left(3) => rot 2 gives [3,0]! Wait: (1,1) needs Top(0) from (0,1) AND Left(3) to (1,0)! Yes, [3,0] = rot 2!
  // (1,0) end (base [1]): fixed rot 0 (port 1 = Right)!

  const INITIAL_GRID = [
    [
      { type: 'straight', rotation: 1, fixed: false, targetRot: 0 },
      { type: 'corner', rotation: 2, fixed: false, targetRot: 0 },
      { type: 'corner', rotation: 3, fixed: false, targetRot: 1 },
      { type: 'tee', rotation: 0, fixed: false, targetRot: 0 },
    ],
    [
      { type: 'end', rotation: 0, fixed: true, targetRot: 0 },
      { type: 'corner', rotation: 0, fixed: false, targetRot: 2 },
      { type: 'corner', rotation: 0, fixed: false, targetRot: 3 },
      { type: 'start', rotation: 0, fixed: true, targetRot: 0 },
    ],
    [
      { type: 'corner', rotation: 1, fixed: false, targetRot: 0 },
      { type: 'straight', rotation: 0, fixed: false, targetRot: 0 },
      { type: 'tee', rotation: 2, fixed: false, targetRot: 0 },
      { type: 'corner', rotation: 0, fixed: false, targetRot: 0 },
    ],
  ];

  const startPos = { r: 1, c: 3 };
  const endPos = { r: 1, c: 0 };
  let grid = INITIAL_GRID.map((row) => row.map((cell) => ({ ...cell })));
  let turnsCount = 0;
  let solvedAnimating = false;
  let walkerStep = -1;
  let solvedPath = [];

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[780px] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-amber-200 px-1">
      <span>سکوهای دایره‌ای را ۹۰ درجه بچرخانید تا مسیر طلایی از «شروع» به «پایان» وصل شود</span>
      <span id="d6-turns" class="font-bold text-amber-300 tabular-nums">چرخش‌ها: ۰</span>
    </div>
    <div id="d6-board" class="grid grid-cols-4 gap-2.5 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-slate-900/95 border-2 border-amber-400/50 shadow-2xl" style="direction:ltr"></div>
  `;

  const boardEl = shell.playArea.querySelector('#d6-board');
  const turnsEl = shell.playArea.querySelector('#d6-turns');

  function resetPuzzle() {
    grid = INITIAL_GRID.map((row) => row.map((cell) => ({ ...cell })));
    turnsCount = 0;
    solvedAnimating = false;
    walkerStep = -1;
    solvedPath = [];
    render();
  }

  shell.onRetry(resetPuzzle);
  shell.onHint(() => render());

  function renderTileSvg(cell, isLit, isWalkerHere) {
    const ports = getRotatedPorts(cell.type, cell.rotation);
    const stroke = isLit ? '#fbbf24' : '#94a3b8';
    const centerFill = isLit ? '#fef08a' : '#cbd5e1';

    let lines = '';
    if (ports.includes(0)) lines += `<line x1="50" y1="50" x2="50" y2="4" stroke="${stroke}" stroke-width="14" stroke-linecap="round"/>`;
    if (ports.includes(1)) lines += `<line x1="50" y1="50" x2="96" y2="50" stroke="${stroke}" stroke-width="14" stroke-linecap="round"/>`;
    if (ports.includes(2)) lines += `<line x1="50" y1="50" x2="50" y2="96" stroke="${stroke}" stroke-width="14" stroke-linecap="round"/>`;
    if (ports.includes(3)) lines += `<line x1="50" y1="50" x2="4" y2="50" stroke="${stroke}" stroke-width="14" stroke-linecap="round"/>`;

    return `
      <svg viewBox="0 0 100 100" class="w-16 h-16 sm:w-22 sm:h-22" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="#1e293b" stroke="${isLit ? '#fbbf24' : '#475569'}" stroke-width="4"/>
        ${lines}
        <circle cx="50" cy="50" r="12" fill="${centerFill}"/>
        ${
          cell.type === 'start'
            ? '<text x="50" y="55" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">شروع</text>'
            : cell.type === 'end'
            ? '<text x="50" y="55" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">پایان</text>'
            : ''
        }
        ${
          isWalkerHere
            ? '<circle cx="50" cy="50" r="17" fill="#f97316" stroke="#ffffff" stroke-width="3"/>'
            : ''
        }
      </svg>
    `;
  }

  function findNextHintCell() {
    const keyPath = [
      { r: 1, c: 2, target: 3 },
      { r: 0, c: 2, target: 1 },
      { r: 0, c: 1, target: 0 },
      { r: 1, c: 1, target: 2 },
    ];
    return keyPath.find((p) => grid[p.r][p.c].rotation % 4 !== p.target) || null;
  }

  function render() {
    turnsEl.textContent = `چرخش‌ها: ${toPersianDigits(turnsCount)}`;
    const evaluation = evaluatePlatformPath(grid, startPos, endPos);
    const hintTarget = shell.getHintLevel() >= 3 && !solvedAnimating ? findNextHintCell() : null;

    boardEl.innerHTML = '';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = grid[r][c];
        const isLit = evaluation.reachableKeys.has(`${r},${c}`);
        const isWalkerHere =
          walkerStep >= 0 && solvedPath[walkerStep] && solvedPath[walkerStep].r === r && solvedPath[walkerStep].c === c;
        const isHinted = hintTarget && hintTarget.r === r && hintTarget.c === c;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.testid = `platform-${r}-${c}`;
        btn.className = `platform-tile rounded-full p-1 flex items-center justify-center relative ${
          cell.fixed ? 'cursor-default' : 'hover:scale-105'
        } ${isHinted ? 'ring-4 ring-emerald-400 animate-pulse' : ''}`;
        btn.disabled = cell.fixed || solvedAnimating;
        btn.setAttribute(
          'aria-label',
          cell.type === 'start' ? 'سکوی شروع' : cell.type === 'end' ? 'سکوی پایان' : `سکوی چرخان ردیف ${r + 1} ستون ${c + 1}`
        );
        btn.innerHTML = renderTileSvg(cell, isLit, isWalkerHere);

        if (!cell.fixed) {
          btn.addEventListener('click', () => {
            if (solvedAnimating) return;
            audio.playMechanism();
            cell.rotation = (cell.rotation + 1) % 4;
            turnsCount += 1;

            const nextEval = evaluatePlatformPath(grid, startPos, endPos);
            if (nextEval.solved) {
              solvedAnimating = true;
              solvedPath = nextEval.path;
              walkerStep = 0;
              audio.playGateOpen();
              render();
              const walkTimer = setInterval(() => {
                walkerStep += 1;
                if (walkerStep >= solvedPath.length) {
                  clearInterval(walkTimer);
                  shell.complete();
                } else {
                  render();
                }
              }, 240);
              shell.registerCleanup(() => clearInterval(walkTimer));
            } else {
              render();
            }
          });
        }

        boardEl.appendChild(btn);
      }
    }
  }

  render();
  return shell;
}
