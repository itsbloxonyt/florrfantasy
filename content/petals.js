import {
  PETAL_TYPES, ACTIVE_COUNT, SWAP_COUNT,
  player, petals, setPetals, petalStateCache, activeSlots, swapSlots,
  mobs, drops, MOB_TYPES, WORLD_W, WORLD_H,
} from './state.js';
import { buildPetalBarUI, attachSlotEvents } from './ui.js';

export function rebuildPetals() {
  const newPetals = [];

  for (let i = 0; i < ACTIVE_COUNT; i++) {
    const type = activeSlots[i];
    if (!type) continue;

    const def = PETAL_TYPES[type];
    const prev = petalStateCache[i];

    newPetals.push({
      type,
      angle: 0,
      r: def.r,
      damage: def.damage,
      cooldown: (prev && prev.type === type) ? prev.cooldown : 0,
      x: prev ? prev.x : player.x,
      y: prev ? prev.y : player.y,
      poisonTimer: prev ? prev.poisonTimer : 0,
      hp: (prev && prev.type === type) ? prev.hp : def.maxHp,
      maxHp: def.maxHp,
      broken: prev ? prev.broken : false,
      respawnTimer: prev ? prev.respawnTimer : 0,
      healTimer: prev ? prev.healTimer : 0,
      justReady: prev ? prev.justReady : false,
    });
  }

  setPetals(newPetals);
}

export function spawnMob() {
  let x, y, attempts = 0;
  do {
    x = Math.random() * WORLD_W;
    y = Math.random() * WORLD_H;
    attempts++;
  } while(Math.hypot(x-player.x, y-player.y) < 300 && attempts < 20);
  const tier = Math.min(Math.floor(player.level/3), 3);
  const t = MOB_TYPES[Math.min(tier + Math.floor(Math.random()*2), 3)];
  mobs.push({ x, y, ...t, maxHp:t.hp, spinAngle:0, hitFlash:0, poisoned:0, poisonTimer:0 });
}

export function killMob(i) {
  const m = mobs[i];
  drops.push({x:m.x, y:m.y, type:'xp', xp:m.xp, r:7, life:300});
  if(Math.random() < 0.3){
    const petalTypes = Object.keys(PETAL_TYPES);
    const dropped = petalTypes[Math.floor(Math.random()*petalTypes.length)];
    drops.push({x:m.x+10, y:m.y+10, type:dropped, r:8, life:400});
  }
  mobs.splice(i, 1);
}

export function addPetalDrop(type) {
  const idx = activeSlots.indexOf(null);
  if(idx !== -1){
    activeSlots[idx] = type;
    for (let i = 0; i < petals.length; i++) {
      petalStateCache[i] = { ...petals[i] };
    }
    rebuildPetals();
    buildPetalBarUI();
    attachSlotEvents();
    return;
  }
  const si = swapSlots.indexOf(null);
  if(si !== -1){
    swapSlots[si] = type;
    buildPetalBarUI();
    attachSlotEvents();
  }
}
