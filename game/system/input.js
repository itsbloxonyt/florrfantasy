import {
  ACTIVE_COUNT, SWAP_COUNT, SWAP_DELAY, SWAP_CD_MAX,
  activeSlots, swapSlots, petals, petalStateCache, slotCooldown,
  setSwapCooldown, setLastSwapTime, lastSwapTime,
  player,
} from './state.js';
import { rebuildPetals } from './petals.js';
import { buildPetalBarUI, attachSlotEvents } from './ui.js';

export const keys = {};
export const mouse = { x: 0, y: 0, wx: 0, wy: 0, left: false, right: false };

export function initInput(canvas) {
  mouse.x = canvas.width / 2;
  mouse.y = canvas.height / 2;

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', e => { if(e.button===0) mouse.left=true; if(e.button===2) mouse.right=true; });
  canvas.addEventListener('mouseup',   e => { if(e.button===0) mouse.left=false; if(e.button===2) mouse.right=false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Number key slot swap
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    const numMap = {
      'Digit1':0,'Digit2':1,'Digit3':2,'Digit4':3,'Digit5':4,
      'Digit6':5,'Digit7':6,'Digit8':7,'Digit9':8,'Digit0':9
    };
    if (!(e.code in numMap)) return;
    const idx = numMap[e.code];
    if (Date.now() < slotCooldown[idx]) return;
    if (activeSlots[idx] === swapSlots[idx]) return;

    for (let i = 0; i < ACTIVE_COUNT; i++) {
      petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
    }
    if (petalStateCache[idx]) petalStateCache[idx].cooldown = 120;

    const tmp = activeSlots[idx];
    activeSlots[idx] = swapSlots[idx];
    swapSlots[idx] = tmp;

    rebuildPetals();
    slotCooldown[idx] = Date.now() + SWAP_DELAY;
    for (let i = 0; i < ACTIVE_COUNT; i++) {
      petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
    }
    buildPetalBarUI();
    attachSlotEvents();
  });
}

export function keyPressed(code) {
  return keys[code] && !keys["_" + code];
}

export function trySwapActiveSwap() {
  const now = Date.now();
  if (now - lastSwapTime < SWAP_DELAY) return false;
  setLastSwapTime(now);

  for (let i = 0; i < ACTIVE_COUNT; i++) {
    petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
  }
  for (let i = 0; i < ACTIVE_COUNT; i++) {
    const tmp = activeSlots[i];
    activeSlots[i] = swapSlots[i];
    swapSlots[i] = tmp;
  }
  rebuildPetals();
  for (let p of petals) { p.cooldown = 80; }
  for (let i = 0; i < ACTIVE_COUNT; i++) {
    petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
  }
  console.log("after swap:", petals.map(p => p.cooldown));
  buildPetalBarUI();
  attachSlotEvents();
  setSwapCooldown(SWAP_CD_MAX);
  setLastSwapTime(Date.now());
  return true;
}

export function handleInput() {
  if (keyPressed("KeyR")) {
    trySwapActiveSwap();
  }
  keys['_KeyR'] = keys['KeyR'];
}
