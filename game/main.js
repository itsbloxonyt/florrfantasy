import { WORLD_W, WORLD_H, ACTIVE_COUNT, player, mobs, drops, activeSlots, swapSlots, petals, petalStateCache, setDead, dead } from './state.js';
import { rebuildPetals, spawnMob } from './content/petals.js';
import { initInput } from './system/input.js';
import { buildPetalBarUI, attachSlotEvents, updateHUD } from '../system/ui.js';
import { draw, drawSmiley, drawCooldown } from '../system/render.js';
import { update } from '../system/update.js';

// ===================== CANVAS SETUP =====================
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const faceCanvas = document.getElementById('face-icon');
canvas.width = 800;
canvas.height = 580;

// ===================== INIT =====================
initInput(canvas);
rebuildPetals();
buildPetalBarUI();
attachSlotEvents();

// ===================== DEATH / RESET =====================
function triggerDeath() {
  setDead(true);
  document.getElementById('death-screen').style.display = 'block';
}

function resetGame() {
  setDead(false);
  document.getElementById('death-screen').style.display = 'none';
  player.x = WORLD_W/2; player.y = WORLD_H/2;
  player.hp = 100; player.maxHp = 100;
  player.xp = 0; player.level = 1; player.xpToNext = 30;
  player.invincible = 0;
  mobs.length = 0; drops.length = 0;
  for(let i = 0; i < ACTIVE_COUNT; i++) activeSlots[i] = null;
  activeSlots[0] = 'basic'; activeSlots[1] = 'basic'; activeSlots[2] = 'basic';
  for (let i = 0; i < ACTIVE_COUNT; i++) {
    petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
  }
  rebuildPetals();
  buildPetalBarUI();
  attachSlotEvents();
  for(let i = 0; i < 6; i++) spawnMob();
}
window.resetGame = resetGame;

// ===================== LOOP =====================
function loop() {
  update(canvas, faceCanvas, drawSmiley, triggerDeath, () => drawCooldown(ctx, canvas));
  draw(ctx, canvas);
  requestAnimationFrame(loop);
}

for(let i = 0; i < 6; i++) spawnMob();
updateHUD(faceCanvas, drawSmiley);
loop();
