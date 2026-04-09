// ===================== WORLD =====================
export const WORLD_W = 2400;
export const WORLD_H = 1740;

// Camera
export const cam = { x: 0, y: 0 };

export function worldToScreen(wx, wy) {
  return { x: wx - cam.x, y: wy - cam.y };
}

// ===================== PETAL TYPES =====================
export const PETAL_TYPES = {
  basic:     { name:'Basic',    color:'#ffffff', glow:'#ccccff', damage:10, cooldownAtk:120, cooldownIdle:200, r:10, emoji:'⚪', maxHp:40, respawnTime:120 },
  healing:   { name:'Healing',  color:'#ff88aa', glow:'#ff44aa', damage:2,  cooldownAtk:120, cooldownIdle:200, r:10, emoji:'💗', healAmt:5, healCooldown:180, maxHp:25, respawnTime:180 },
  lightning: { name:'Lightning',color:'#ffff44', glow:'#ffffaa', damage:14, cooldownAtk:120, cooldownIdle:200, r:10, emoji:'⚡', knockback:18, chain:true, maxHp:30, respawnTime:150 },
  poison:    { name:'Poison',   color:'#88ff44', glow:'#44ff44', damage:4,  cooldownAtk:120, cooldownIdle:200, r:10, emoji:'☠️', poisonDps:6, poisonDur:180, maxHp:35, respawnTime:140 },
};

// ===================== PLAYER =====================
export const player = {
  x: WORLD_W/2, y: WORLD_H/2,
  r: 20, speed: 2.8,
  hp: 100, maxHp: 100,
  xp: 0, level: 1, xpToNext: 30,
  invincible: 0,
  petalOrbitR: 52,
  petalAngle: 0,
  petalOrbitSpeed: 0.022,
};

// ===================== PETAL SLOTS =====================
export const ACTIVE_COUNT = 10;
export const SWAP_COUNT = 10;
export const activeSlots = [
  'basic', 'basic', 'basic', null, null, null, null, null, null, null
];
export const petalStateCache = Array(ACTIVE_COUNT).fill(null);
export const swapSlots = Array(SWAP_COUNT).fill(null);

// Orbiting petal objects
export let petals = [];
export let petalState = 'idle';
export function setPetalState(s) { petalState = s; }
export function setPetals(arr) { petals = arr; }

// ===================== SWAP STATE =====================
export let swapCooldown = 0;
export const SWAP_CD_MAX = 60;
export let slotCooldown = Array(10).fill(0);
export const SWAP_DELAY = 500;
export let lastSwapTime = 0;
export function setSwapCooldown(v) { swapCooldown = v; }
export function setLastSwapTime(v) { lastSwapTime = v; }

// ===================== MOBS =====================
export const mobs = [];
export const drops = [];

export const MOB_TYPES = [
  { color:'#ff6666', r:16, hp:20,  speed:0.9,  xp:5,  dmg:8,  name:'ladybug'  },
  { color:'#ff9944', r:21, hp:45,  speed:0.65, xp:14, dmg:13, name:'bee'      },
  { color:'#cc44ff', r:27, hp:90,  speed:0.5,  xp:28, dmg:20, name:'spider'   },
  { color:'#ff2244', r:34, hp:170, speed:0.4,  xp:55, dmg:28, name:'centipede'},
];

// ===================== WORLD DECORATIONS =====================
export const grass = [];
for(let i=0;i<600;i++){
  grass.push({
    x: Math.random()*WORLD_W, y: Math.random()*WORLD_H,
    r: 3+Math.random()*7,
    c: `hsl(${100+Math.random()*40},40%,${16+Math.random()*10}%)`,
  });
}

export const dots = [];
for(let i=0;i<1200;i++){
  dots.push({x:Math.random()*WORLD_W, y:Math.random()*WORLD_H, r:1.5+Math.random()*2, c:'rgba(0,0,0,0.12)'});
}

// ===================== GAME STATE =====================
export let frame = 0;
export let spawnTimer = 0;
export let dead = false;
export function setFrame(v) { frame = v; }
export function setSpawnTimer(v) { spawnTimer = v; }
export function setDead(v) { dead = v; }
