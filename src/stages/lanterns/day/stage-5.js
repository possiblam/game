import { createStageShell } from '../../stage-shell.js';
import { toPersianDigits } from '../../../data/translations.js';

export function mountLanternsDayStage5(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-amber-200 px-1">
      <span>وقتی چراغ توربین سبز شد از کنار پره‌های بادی بپرید و عبور کنید</span>
      <span id="ld5-status" class="font-bold text-emerald-300">سکوی اول — آماده حرکت</span>
    </div>

    <div class="game-canvas-frame">
      <canvas id="ld5-canvas" width="800" height="400" data-testid="lanterns-day-5-canvas"></canvas>
    </div>

    <div class="touch-controls-bar w-full max-w-[900px]">
      <button type="button" class="touch-btn flex-1 sm:flex-initial" data-act="right" aria-label="حرکت به راست">▶ راست</button>
      <button type="button" class="touch-btn flex-1 sm:flex-initial bg-amber-500/25 border-amber-300 text-amber-200" data-act="jump" aria-label="پرش">▲ پرش</button>
      <button type="button" class="touch-btn flex-1 sm:flex-initial" data-act="left" aria-label="حرکت به چپ">◀ چپ</button>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#ld5-canvas');
  const ctx2d = canvas.getContext('2d');
  const statusEl = shell.playArea.querySelector('#ld5-status');

  // 4 safe platforms across the high wind plateau
  const platforms = [
    { x: 18, y: 310, w: 155, h: 24, safeIdx: 0 },
    { x: 220, y: 292, w: 145, h: 24, safeIdx: 1 },
    { x: 418, y: 274, w: 145, h: 24, safeIdx: 2 },
    { x: 615, y: 256, w: 165, h: 24, safeIdx: 3 },
  ];

  // 3 Giant Wind Turbines placed between platforms
  // Each turbine has cyclic open window when blades are vertical/tilted away from horizontal passage
  const turbines = [
    { x: 196, hubY: 225, radius: 66, speed: 1.5, phase: 0.4 },
    { x: 392, hubY: 205, radius: 68, speed: 1.75, phase: 1.8 },
    { x: 588, hubY: 186, radius: 70, speed: 1.95, phase: 0.9 },
  ];

  const goalZone = { x: 725, y: 215, r: 28 };

  let checkpointIdx = 0;
  const player = { x: 70, y: 280, vx: 0, vy: 0, r: 15, onGround: false };
  let simTime = 0;
  let hitFreeze = 0;
  let completed = false;
  let rafId = null;
  let lastTs = performance.now();
  const held = new Set();

  function respawnAtCheckpoint() {
    const p = platforms[checkpointIdx];
    player.x = p.x + 48;
    player.y = p.y - player.r - 2;
    player.vx = 0;
    player.vy = 0;
    hitFreeze = 0.45;
  }

  shell.onRetry(() => {
    checkpointIdx = 0;
    respawnAtCheckpoint();
    hitFreeze = 0;
    statusEl.textContent = 'سکوی اول — آماده حرکت';
    statusEl.className = 'font-bold text-emerald-300';
  });

  const keyMap = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'jump',
    KeyW: 'jump',
    Space: 'jump',
  };

  function onKeyDown(e) {
    const act = keyMap[e.code];
    if (act) {
      e.preventDefault();
      held.add(act);
    }
  }
  function onKeyUp(e) {
    const act = keyMap[e.code];
    if (act) held.delete(act);
  }
  function clearHeld() {
    held.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearHeld);

  shell.playArea.querySelectorAll('.touch-btn').forEach((btn) => {
    const act = btn.dataset.act;
    const press = (e) => {
      e.preventDefault();
      held.add(act);
      btn.classList.add('is-pressed');
    };
    const release = () => {
      held.delete(act);
      btn.classList.remove('is-pressed');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
  });

  function isBladeBlocking(turbine, t) {
    // 3 blades spaced 120 deg apart; check if any blade tip sweeps through the crossing corridor near platform height
    const angle = (t * turbine.speed + turbine.phase) % (Math.PI * 2);
    for (let k = 0; k < 3; k++) {
      const a = angle + (k * Math.PI * 2) / 3;
      const tipX = turbine.x + Math.cos(a) * turbine.radius;
      const tipY = turbine.hubY + Math.sin(a) * turbine.radius;
      // Danger if blade dips down into the jump corridor (within 30px horizontally of turbine center and below hubY + 22)
      if (Math.abs(tipX - turbine.x) < 34 && tipY > turbine.hubY + 26) {
        return true;
      }
    }
    return false;
  }

  function step(now) {
    const dt = Math.min((now - lastTs) / 1000, 0.05);
    lastTs = now;
    simTime += dt;
    if (hitFreeze > 0) hitFreeze = Math.max(0, hitFreeze - dt);

    if (!completed) {
      let moveDir = 0;
      if (held.has('left')) moveDir -= 1;
      if (held.has('right')) moveDir += 1;

      player.vx = moveDir * 195;
      if (held.has('jump') && player.onGround) {
        player.vy = -445;
        player.onGround = false;
        audio.playJump();
      }

      player.vy += 980 * dt; // Gravity
      player.x = Math.max(20, Math.min(780, player.x + player.vx * dt));
      const prevBottom = player.y + player.r;
      player.y += player.vy * dt;
      player.onGround = false;

      // Platform landing
      for (const plat of platforms) {
        if (
          player.vy >= 0 &&
          player.x + player.r * 0.65 >= plat.x &&
          player.x - player.r * 0.65 <= plat.x + plat.w &&
          prevBottom <= plat.y + 8 &&
          player.y + player.r >= plat.y
        ) {
          player.y = plat.y - player.r;
          player.vy = 0;
          player.onGround = true;
          if (plat.safeIdx > checkpointIdx) {
            checkpointIdx = plat.safeIdx;
            audio.playMechanism();
            statusEl.textContent = `رسیدید به سکوی ${toPersianDigits(checkpointIdx + 1)} از ${toPersianDigits(4)}`;
            statusEl.className = 'font-bold text-emerald-300';
          }
        }
      }

      // Turbine blade collision check
      if (hitFreeze === 0) {
        for (const turb of turbines) {
          if (isBladeBlocking(turb, simTime)) {
            if (Math.abs(player.x - turb.x) < 28 && Math.abs(player.y - (turb.hubY + 52)) < 44) {
              audio.playError();
              shell.recordAttempt();
              statusEl.textContent = 'برخورد با باد پره‌ها! روی سکو منتظر سبز شدن چراغ بمانید.';
              statusEl.className = 'font-bold text-rose-300';
              respawnAtCheckpoint();
              break;
            }
          }
        }
      }

      // Fall check
      if (player.y > 415) {
        audio.playError();
        shell.recordAttempt();
        respawnAtCheckpoint();
      }

      // Goal check
      if (Math.hypot(player.x - goalZone.x, player.y - goalZone.y) < goalZone.r + player.r) {
        completed = true;
        statusEl.textContent = 'از تمام توربین‌های بادی عبور کردید!';
        statusEl.className = 'font-extrabold text-emerald-300';
        audio.playGateOpen();
        setTimeout(() => shell.complete(), 450);
      }
    }

    draw();
    if (!completed) {
      rafId = requestAnimationFrame(step);
    }
  }

  function draw() {
    ctx2d.clearRect(0, 0, 800, 400);
    const sky = ctx2d.createLinearGradient(0, 0, 0, 400);
    sky.addColorStop(0, '#0284c7');
    sky.addColorStop(0.65, '#0369a1');
    sky.addColorStop(1, '#0f172a');
    ctx2d.fillStyle = sky;
    ctx2d.fillRect(0, 0, 800, 400);

    // Wind streaks
    ctx2d.strokeStyle = 'rgba(224, 242, 254, 0.2)';
    ctx2d.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const wx = ((simTime * 160 + i * 150) % 860) - 60;
      const wy = 45 + i * 32;
      ctx2d.beginPath();
      ctx2d.moveTo(wx, wy);
      ctx2d.lineTo(wx + 55, wy);
      ctx2d.stroke();
    }

    // Turbines
    turbines.forEach((turb) => {
      const blocking = isBladeBlocking(turb, simTime);
      // Mast
      ctx2d.fillStyle = '#cbd5e1';
      ctx2d.fillRect(turb.x - 5, turb.hubY, 10, 175);

      // Blades
      const angle = (simTime * turb.speed + turb.phase) % (Math.PI * 2);
      ctx2d.save();
      ctx2d.translate(turb.x, turb.hubY);
      ctx2d.rotate(angle);
      for (let k = 0; k < 3; k++) {
        ctx2d.rotate((Math.PI * 2) / 3);
        ctx2d.fillStyle = blocking ? '#fca5a5' : '#f8fafc';
        ctx2d.beginPath();
        ctx2d.moveTo(0, -5);
        ctx2d.lineTo(turb.radius, -2);
        ctx2d.lineTo(turb.radius, 3);
        ctx2d.lineTo(0, 6);
        ctx2d.closePath();
        ctx2d.fill();
      }
      ctx2d.restore();

      // Status beacon on hub (Green = safe to cross, Red = blades sweeping)
      ctx2d.beginPath();
      ctx2d.arc(turb.x, turb.hubY, 11, 0, Math.PI * 2);
      ctx2d.fillStyle = blocking ? '#ef4444' : '#22c55e';
      ctx2d.fill();
      ctx2d.lineWidth = 2.5;
      ctx2d.strokeStyle = '#ffffff';
      ctx2d.stroke();

      if (shell.getHintLevel() >= 3) {
        ctx2d.fillStyle = blocking ? '#fecaca' : '#bbf7d0';
        ctx2d.font = 'bold 11px Vazirmatn, sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.fillText(blocking ? 'صبر' : 'بپر!', turb.x, turb.hubY - 18);
      }
    });

    // Platforms
    platforms.forEach((p, idx) => {
      ctx2d.fillStyle = idx <= checkpointIdx ? '#065f46' : '#334155';
      ctx2d.strokeStyle = idx <= checkpointIdx ? '#34d399' : '#94a3b8';
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.roundRect(p.x, p.y, p.w, p.h, 8);
      ctx2d.fill();
      ctx2d.stroke();
    });

    // Goal Tower Exit
    ctx2d.beginPath();
    ctx2d.arc(goalZone.x, goalZone.y, goalZone.r, 0, Math.PI * 2);
    ctx2d.fillStyle = 'rgba(251, 191, 36, 0.32)';
    ctx2d.fill();
    ctx2d.strokeStyle = '#fbbf24';
    ctx2d.lineWidth = 3;
    ctx2d.stroke();
    ctx2d.fillStyle = '#fef3c7';
    ctx2d.font = 'bold 13px Vazirmatn, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('خروج', goalZone.x, goalZone.y + 4);

    // Player Hero
    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx2d.fillStyle = hitFreeze > 0 ? '#ef4444' : '#f97316';
    ctx2d.fill();
    ctx2d.lineWidth = 3;
    ctx2d.strokeStyle = '#fef3c7';
    ctx2d.stroke();
    ctx2d.fillStyle = '#ffffff';
    ctx2d.beginPath();
    ctx2d.arc(player.x - 4, player.y - 3, 2.2, 0, Math.PI * 2);
    ctx2d.arc(player.x + 4, player.y - 3, 2.2, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
  }

  rafId = requestAnimationFrame(step);

  shell.registerCleanup(() => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', clearHeld);
  });

  return shell;
}
