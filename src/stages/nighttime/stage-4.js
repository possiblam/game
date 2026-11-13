import { createStageShell } from '../stage-shell.js';
import { toPersianDigits } from '../../data/translations.js';

export function mountNightStage4(container, ctx) {
  const shell = createStageShell(container, ctx);
  const { audio } = ctx;

  shell.playArea.innerHTML = `
    <div class="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-cyan-200 px-1">
      <span>روی سکوهای نورانی متحرک بپرید و در شب طوفانی از روی پل عبور کنید</span>
      <span id="n4-cp-label" class="font-bold text-emerald-300">پایه امن: شروع پل</span>
    </div>
    <div class="game-canvas-frame">
      <canvas id="n4-canvas" width="800" height="420" data-testid="nighttime-4-canvas"></canvas>
    </div>
    <div class="touch-controls-bar" aria-label="کنترل حرکت و پرش">
      <button type="button" class="touch-btn" data-ctrl="right" aria-label="حرکت به راست">▶ راست</button>
      <button type="button" class="touch-btn bg-cyan-600/80 border-cyan-300" data-ctrl="jump" aria-label="پرش">▲ پرش (فاصله)</button>
      <button type="button" class="touch-btn" data-ctrl="left" aria-label="حرکت به چپ">◀ چپ</button>
    </div>
  `;

  const canvas = shell.playArea.querySelector('#n4-canvas');
  const ctx2d = canvas.getContext('2d');
  const cpLabel = shell.playArea.querySelector('#n4-cp-label');

  // Fixed stone bridge piers
  const fixedPlatforms = [
    { x: 15, y: 310, w: 115, h: 110, isCheckpoint: true, cpName: 'شروع پل' },
    { x: 375, y: 295, w: 85, h: 125, isCheckpoint: true, cpName: 'میانه پل' },
    { x: 685, y: 280, w: 105, h: 140, isGoal: true, cpName: 'پایان پل' },
  ];

  // Moving luminous storm platforms
  const movingPlatforms = [
    { baseX: 165, baseY: 310, w: 78, h: 16, ampX: 48, ampY: 0, speed: 1.5, phase: 0, x: 165, y: 310, dx: 0 },
    { baseX: 280, baseY: 280, w: 74, h: 16, ampX: 0, ampY: 36, speed: 1.8, phase: 1.1, x: 280, y: 280, dx: 0 },
    { baseX: 505, baseY: 290, w: 76, h: 16, ampX: 45, ampY: 0, speed: 1.7, phase: 0.5, x: 505, y: 290, dx: 0 },
    { baseX: 605, baseY: 265, w: 72, h: 16, ampX: 0, ampY: 38, speed: 1.9, phase: 2.2, x: 605, y: 265, dx: 0 },
  ];

  let checkpoint = { x: 65, y: 270, name: 'شروع پل' };
  const player = { x: 65, y: 270, vx: 0, vy: 0, w: 22, h: 32, onGround: false, coyote: 0, jumpBuf: 0 };
  let simTime = 0;
  let completed = false;
  let rafId = null;
  let lastTs = performance.now();
  const held = new Set();

  function resetStage() {
    checkpoint = { x: 65, y: 270, name: 'شروع پل' };
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    player.vx = 0;
    player.vy = 0;
    cpLabel.textContent = 'پایه امن: شروع پل';
  }
  shell.onRetry(resetStage);

  function triggerJump() {
    player.jumpBuf = 0.13;
  }

  function onKeyDown(e) {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      held.add('right');
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      held.add('left');
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (!held.has('jump')) triggerJump();
      held.add('jump');
    }
  }
  function onKeyUp(e) {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') held.delete('right');
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') held.delete('left');
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      held.delete('jump');
      if (player.vy < -100) player.vy *= 0.55;
    }
  }
  function clearHeld() {
    held.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearHeld);

  shell.playArea.querySelectorAll('[data-ctrl]').forEach((btn) => {
    const ctrl = btn.dataset.ctrl;
    const press = (e) => {
      e.preventDefault();
      if (ctrl === 'jump') triggerJump();
      held.add(ctrl);
      btn.classList.add('is-pressed');
    };
    const release = () => {
      held.delete(ctrl);
      btn.classList.remove('is-pressed');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
  });

  function step(now) {
    const dt = Math.min((now - lastTs) / 1000, 0.05);
    lastTs = now;
    simTime += dt;

    // Update moving platforms
    movingPlatforms.forEach((p) => {
      const prevX = p.x;
      p.x = p.baseX + Math.sin(simTime * p.speed + p.phase) * p.ampX;
      p.y = p.baseY + Math.cos(simTime * p.speed + p.phase) * p.ampY;
      p.dx = p.x - prevX;
    });

    if (!completed) {
      let targetVx = 0;
      if (held.has('left')) targetVx -= 185;
      if (held.has('right')) targetVx += 185;
      player.vx = targetVx;

      player.vy += 880 * dt;
      if (player.vy > 520) player.vy = 520;

      if (player.onGround) {
        player.coyote = 0.11;
      } else {
        player.coyote = Math.max(0, player.coyote - dt);
      }

      if (player.jumpBuf > 0) {
        player.jumpBuf = Math.max(0, player.jumpBuf - dt);
        if (player.coyote > 0) {
          player.vy = -415;
          player.onGround = false;
          player.coyote = 0;
          player.jumpBuf = 0;
          audio.playJump();
        }
      }

      const prevBottom = player.y + player.h;
      player.x = Math.max(8, Math.min(792 - player.w, player.x + player.vx * dt));
      player.y += player.vy * dt;
      player.onGround = false;

      const allPlats = [...fixedPlatforms, ...movingPlatforms];
      for (const plat of allPlats) {
        const horizOverlap = player.x + player.w > plat.x + 3 && player.x < plat.x + plat.w - 3;
        const currBottom = player.y + player.h;
        if (player.vy >= 0 && horizOverlap && prevBottom <= plat.y + 12 && currBottom >= plat.y) {
          player.y = plat.y - player.h;
          player.vy = 0;
          player.onGround = true;
          if (plat.dx) player.x += plat.dx;

          if (plat.isCheckpoint && plat.x > checkpoint.x) {
            checkpoint = { x: plat.x + 28, y: plat.y - player.h - 4, name: plat.cpName };
            cpLabel.textContent = `پایه امن: ${plat.cpName}`;
            audio.playMechanism();
          }
          if (plat.isGoal) {
            completed = true;
            shell.complete();
          }
          break;
        }
      }

      // Fell into stormy chasm
      if (player.y > 435) {
        audio.playError();
        shell.recordAttempt();
        player.x = checkpoint.x;
        player.y = checkpoint.y;
        player.vx = 0;
        player.vy = 0;
      }
    }

    draw();
    if (!completed) {
      rafId = requestAnimationFrame(step);
    }
  }

  function draw() {
    ctx2d.clearRect(0, 0, 800, 420);

    // Stormy night sky
    const lightningFlash = Math.sin(simTime * 2.1) > 0.96 ? 0.25 : 0;
    const sky = ctx2d.createLinearGradient(0, 0, 0, 420);
    sky.addColorStop(0, lightningFlash ? '#1e3a8a' : '#020617');
    sky.addColorStop(1, '#0f172a');
    ctx2d.fillStyle = sky;
    ctx2d.fillRect(0, 0, 800, 420);

    // Rain streaks
    ctx2d.strokeStyle = 'rgba(125, 211, 252, 0.25)';
    ctx2d.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {
      const rx = ((i * 37 + simTime * 90) % 820) - 10;
      const ry = (i * 53 + simTime * 260) % 420;
      ctx2d.beginPath();
      ctx2d.moveTo(rx, ry);
      ctx2d.lineTo(rx - 6, ry + 16);
      ctx2d.stroke();
    }

    // Lightning bolt
    if (lightningFlash > 0) {
      ctx2d.strokeStyle = '#fde047';
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.moveTo(560, 10);
      ctx2d.lineTo(540, 65);
      ctx2d.lineTo(565, 75);
      ctx2d.lineTo(542, 130);
      ctx2d.stroke();
    }

    // Fixed stone piers
    fixedPlatforms.forEach((p) => {
      ctx2d.fillStyle = p.isGoal ? '#15803d' : '#334155';
      ctx2d.fillRect(p.x, p.y, p.w, p.h);
      ctx2d.fillStyle = p.isGoal ? '#4ade80' : '#64748b';
      ctx2d.fillRect(p.x, p.y, p.w, 8);
      if (p.isGoal) {
        ctx2d.fillStyle = '#fef08a';
        ctx2d.font = 'bold 13px Vazirmatn, sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('پایان ✓', p.x + p.w / 2, p.y - 12);
      }
    });

    // Moving glowing cyan platforms
    movingPlatforms.forEach((p) => {
      ctx2d.fillStyle = 'rgba(34, 211, 238, 0.25)';
      ctx2d.fillRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
      ctx2d.fillStyle = '#06b6d4';
      ctx2d.fillRect(p.x, p.y, p.w, p.h);
      ctx2d.strokeStyle = '#cffafe';
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(p.x, p.y, p.w, p.h);
    });

    // Tier 3 Hint: Jump arc guide
    if (shell.getHintLevel() >= 3) {
      ctx2d.save();
      ctx2d.setLineDash([5, 5]);
      ctx2d.strokeStyle = '#4ade80';
      ctx2d.lineWidth = 2.5;
      ctx2d.beginPath();
      ctx2d.moveTo(player.x + player.w / 2, player.y + player.h);
      ctx2d.quadraticCurveTo(player.x + 55, player.y - 45, player.x + 100, player.y + 20);
      ctx2d.stroke();
      ctx2d.restore();
    }

    // Player character
    ctx2d.fillStyle = '#f97316';
    ctx2d.fillRect(player.x, player.y + 10, player.w, player.h - 10);
    ctx2d.fillStyle = '#fed7aa';
    ctx2d.beginPath();
    ctx2d.arc(player.x + player.w / 2, player.y + 8, 9, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.strokeStyle = '#e0f2fe';
    ctx2d.lineWidth = 2;
    ctx2d.stroke();
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
