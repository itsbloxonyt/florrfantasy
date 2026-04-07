// ================ IMPORT ================
import "./game/input.js";
import "./game/update.js";
import "./game/render.js";
import "./game/petals.js";
// ===================== CANVAS SETUP =====================
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const faceCanvas = document.getElementById('face-icon');
const faceCtx = faceCanvas.getContext('2d');
canvas.width = 800;
canvas.height = 580;

// ===================== WORLD =====================
const WORLD_W = 2400;
const WORLD_H = 1740;

// Camera
const cam = { x: 0, y: 0 };

function worldToScreen(wx, wy) {
  return { x: wx - cam.x, y: wy - cam.y };
}

// ===================== INPUT =====================
const keys = {};
const mouse = { x: canvas.width/2, y: canvas.height/2, wx: 0, wy: 0, left: false, right: false };
window.addEventListener('keydown', e => { keys[e.code]=true; if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); });
window.addEventListener('keyup',   e => { keys[e.code]=false; });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  mouse.wx = mouse.x + cam.x;
  mouse.wy = mouse.y + cam.y;
});
canvas.addEventListener('mousedown', e => { if(e.button===0) mouse.left=true; if(e.button===2) mouse.right=true; });
canvas.addEventListener('mouseup',   e => { if(e.button===0) mouse.left=false; if(e.button===2) mouse.right=false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ===================== PETAL TYPES =====================
const PETAL_TYPES = {
  basic:     { name:'Basic',    color:'#ffffff', glow:'#ccccff', damage:10, cooldownAtk:120, cooldownIdle:200, r:10, emoji:'⚪', maxHp:40, respawnTime:120 },
  healing:   { name:'Healing',  color:'#ff88aa', glow:'#ff44aa', damage:2,  cooldownAtk:120, cooldownIdle:200, r:10, emoji:'💗', healAmt:5, healCooldown:180, maxHp:25, respawnTime:180 },
  lightning: { name:'Lightning',color:'#ffff44', glow:'#ffffaa', damage:14, cooldownAtk:120, cooldownIdle:200, r:10, emoji:'⚡', knockback:18, chain:true, maxHp:30, respawnTime:150 },
  poison:    { name:'Poison',   color:'#88ff44', glow:'#44ff44', damage:4,  cooldownAtk:120, cooldownIdle:200, r:10, emoji:'☠️', poisonDps:6, poisonDur:180, maxHp:35, respawnTime:140 },
};

// ===================== PLAYER =====================
const player = {
  x: WORLD_W/2, y: WORLD_H/2,
  r: 20, speed: 2.8,
  hp: 100, maxHp: 100,
  xp: 0, level: 1, xpToNext: 30,
  invincible: 0,
  petalOrbitR: 52,
  petalAngle: 0,
  petalOrbitSpeed: 0.022,
};

// Active slots (what orbits you) and swap slots
const ACTIVE_COUNT = 10;
const SWAP_COUNT = 10;
const activeSlots = [
  'basic', 'basic', 'basic', null, null, null, null, null, null, null
];
const petalStateCache = Array(ACTIVE_COUNT).fill(null);
const swapSlots = Array(SWAP_COUNT).fill(null);

// Inventory of collected petals
const inventory = { basic:3, healing:0, lightning:0, poison:0 };

// Orbiting petal objects
let petals = [];
let petalState = 'idle';

function rebuildPetals() {
  const old = petals;
  petals = [];
  justReady: false;

  for (let i = 0; i < ACTIVE_COUNT; i++) {
    const type = activeSlots[i];
    if (!type) continue;

    const def = PETAL_TYPES[type];
    const prev = petalStateCache[i];

    petals.push({
  type,
  angle: 0,
  r: def.r,
  damage: def.damage,
  cooldown: (prev && prev.type === type) ? prev.cooldown : 0,
  x: prev ? prev.x : player.x,
  y: prev ? prev.y : player.y,
  poisonTimer: prev ? prev.poisonTimer : 0,

  hp: (prev && prev.type === type) ? prev.hp : def.maxHp, // ✅ FIX
  maxHp: def.maxHp,

  broken: prev ? prev.broken : false,
  respawnTimer: prev ? prev.respawnTimer : 0,
  healTimer: prev ? prev.healTimer : 0,

  justReady: prev ? prev.justReady : false, // ⚠️ you were missing this
});
  }
}

// SAVE
for (let i = 0; i < ACTIVE_COUNT; i++) {
  petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
}

rebuildPetals();

// ===================== MOBS =====================
const mobs = [];
const drops = []; // { x,y,wx,wy, type:'xp'|petalType, xp?, r, life, collected }

const MOB_TYPES = [
  { color:'#ff6666', r:16, hp:20,  speed:0.9,  xp:5,  dmg:8,  name:'ladybug'  },
  { color:'#ff9944', r:21, hp:45,  speed:0.65, xp:14, dmg:13, name:'bee'      },
  { color:'#cc44ff', r:27, hp:90,  speed:0.5,  xp:28, dmg:20, name:'spider'   },
  { color:'#ff2244', r:34, hp:170, speed:0.4,  xp:55, dmg:28, name:'centipede'},
];

function spawnMob() {
  // Spawn randomly in world, not too close to player
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

// ===================== WORLD DECORATIONS =====================
const grass = [];
for(let i=0;i<600;i++){
  grass.push({
    x: Math.random()*WORLD_W, y: Math.random()*WORLD_H,
    r: 3+Math.random()*7,
    c: `hsl(${100+Math.random()*40},40%,${16+Math.random()*10}%)`,
  });
}
// Dot texture pattern
const dots = [];
for(let i=0;i<1200;i++){
  dots.push({x:Math.random()*WORLD_W, y:Math.random()*WORLD_H, r:1.5+Math.random()*2, c:'rgba(0,0,0,0.12)'});
}

// ===================== HELPERS =====================
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}

function drawSmiley(c, x, y, r, happy=true, invincible=false){
  // face
  c.beginPath(); c.arc(x,y,r,0,Math.PI*2);
  c.fillStyle = invincible ? '#fff8' : '#ffe066';
  c.fill();
  c.strokeStyle='#cc9900'; c.lineWidth=1.5; c.stroke();
  // eyes
  c.fillStyle='#333';
  c.beginPath(); c.arc(x-r*0.28,y-r*0.15,r*0.12,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(x+r*0.28,y-r*0.15,r*0.12,0,Math.PI*2); c.fill();
  // mouth
  c.beginPath();
  if(happy){
    c.arc(x,y+r*0.05,r*0.3, 0.2, Math.PI-0.2);
  } else {
    c.arc(x,y+r*0.35,r*0.3, Math.PI+0.2, -0.2);
  }
  c.strokeStyle='#333'; c.lineWidth=1.5; c.stroke();
}

function drawMobFace(c, x, y, r, color){
  c.beginPath(); c.arc(x,y,r,0,Math.PI*2);
  c.fillStyle=color; c.fill();
  c.strokeStyle='rgba(0,0,0,0.3)'; c.lineWidth=1.5; c.stroke();
  // angry eyes
  c.fillStyle='#000';
  c.beginPath(); c.arc(x-r*0.28,y-r*0.1,r*0.1,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(x+r*0.28,y-r*0.1,r*0.1,0,Math.PI*2); c.fill();
  // frown
  c.beginPath();
  c.arc(x,y+r*0.35,r*0.25,Math.PI+0.3,-0.3);
  c.strokeStyle='#000'; c.lineWidth=1.2; c.stroke();
}

function drawHealthBar(x,y,r,hp,maxHp){
  const w=r*2.6,h=5,bx=x-w/2,by=y-r-14;
  ctx.fillStyle='#111'; ctx.fillRect(bx,by,w,h);
  const ratio=hp/maxHp;
  ctx.fillStyle=ratio>0.5?'#44ff88':ratio>0.25?'#ffcc00':'#ff4444';
  ctx.fillRect(bx,by,w*ratio,h);
  ctx.strokeStyle='#0004'; ctx.lineWidth=1; ctx.strokeRect(bx,by,w,h);
}

// ===================== PETAL TARGETS =====================
function getPetalTarget(i, state, n) {
  const a = petals[i].angle;
  if(state==='attack'){
    return { x: player.x+Math.cos(a)*72, y: player.y+Math.sin(a)*72 };
  } else if(state==='defend'){
    return { x: player.x+Math.cos(a)*(player.r+11), y: player.y+Math.sin(a)*(player.r+11) };
  } else {
    return { x: player.x+Math.cos(a)*player.petalOrbitR, y: player.y+Math.sin(a)*player.petalOrbitR };
  }
}

// ===================== PETAL BAR UI =====================
function buildPetalBarUI() {
  const activeEl = document.getElementById('active-slots');
  const swapEl   = document.getElementById('swap-slots');
  activeEl.innerHTML = '';
  swapEl.innerHTML   = '';

  for(let i=0;i<ACTIVE_COUNT;i++){
    const slot = document.createElement('div');
    slot.className = 'pslot' + (activeSlots[i] ? ' filled' : '');
    const type = activeSlots[i];
    const def = type ? PETAL_TYPES[type] : null;
    slot.innerHTML = def
      ? `<div class="picon" style="background:${def.color}22;border:2px solid ${def.color}">${def.emoji}</div><div class="plabel">${def.name}</div>`
      : '';
    const num = document.createElement('span');
    num.className = 'pnum';
    num.textContent = i < 9 ? i+1 : '0';
    slot.appendChild(num);
    activeEl.appendChild(slot);
  }
  for(let i=0;i<SWAP_COUNT;i++){
    const slot = document.createElement('div');
    slot.className = 'pslot' + (swapSlots[i] ? ' filled' : '');
    const type = swapSlots[i];
    const def = type ? PETAL_TYPES[type] : null;
    slot.innerHTML = def
      ? `<div class="picon" style="background:${def.color}22;border:2px solid ${def.color}">${def.emoji}</div><div class="plabel">${def.name}</div>`
      : '';
    swapEl.appendChild(slot);
  }
}
buildPetalBarUI();

// ===================== SLOT DRAG & CLICK =====================
let dragSrc = null; // { row:'active'|'swap', idx }

function getSlotEls(){
  return {
    active: Array.from(document.getElementById('active-slots').children),
    swap:   Array.from(document.getElementById('swap-slots').children),
  };
}

function attachSlotEvents(){
  const {active, swap} = getSlotEls();
  const attach = (els, row) => {
    els.forEach((el, idx) => {
      el.style.cursor='grab';
      el.addEventListener('mousedown', e => {
        e.stopPropagation();
        dragSrc={row,idx};
        el.style.opacity='0.5';
      });
      el.addEventListener('mouseup', e => {
        e.stopPropagation();
        if(dragSrc && !(dragSrc.row===row && dragSrc.idx===idx)){

const srcArr = dragSrc.row === 'active' ? activeSlots : swapSlots;
const dstArr = row === 'active' ? activeSlots : swapSlots;

// SAVE petal state BEFORE changing anything
for (let i = 0; i < ACTIVE_COUNT; i++) {
  petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
}

const a = dragSrc.idx;
const b = idx;

// SAVE
for (let i = 0; i < ACTIVE_COUNT; i++) {
  petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
}

// swap slots
const tmp = srcArr[a];
srcArr[a] = dstArr[b];
dstArr[b] = tmp;

// rebuild
rebuildPetals();

// ✅ APPLY cooldown AFTER rebuild (THIS FIXES NULL BUG)
if (petals[a]) petals[a].cooldown = 120;
if (petals[b]) petals[b].cooldown = 120;

swapCooldown = SWAP_CD_MAX;

buildPetalBarUI();
attachSlotEvents();
        }
        if(dragSrc){ getSlotEls().active.concat(getSlotEls().swap).forEach(e=>e.style.opacity='1'); }
        dragSrc=null;
      });
    });
  };
  attach(active,'active');
  attach(swap,'swap');
}
attachSlotEvents();

window.addEventListener('keydown', e => {
  if (e.repeat) return;

  const numMap = {
    'Digit1':0,'Digit2':1,'Digit3':2,'Digit4':3,'Digit5':4,
    'Digit6':5,'Digit7':6,'Digit8':7,'Digit9':8,'Digit0':9
  };

  if (!(e.code in numMap)) return;

  // ✅ ONLY ONE cooldown system
  const idx = numMap[e.code];

  if (Date.now() < slotCooldown[idx]) return;

  // (optional) prevent useless swap
  if (activeSlots[idx] === swapSlots[idx]) return;

  // SAVE
  for (let i = 0; i < ACTIVE_COUNT; i++) {
    petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
  }

  if (petalStateCache[idx]) {
    petalStateCache[idx].cooldown = 120;
  }

  // swap
  const tmp = activeSlots[idx];
  activeSlots[idx] = swapSlots[idx];
  swapSlots[idx] = tmp;

  rebuildPetals();

  // ✅ SET cooldown ONLY AFTER SUCCESS
  slotCooldown[idx] = Date.now() + SWAP_DELAY;

  for (let i = 0; i < ACTIVE_COUNT; i++) {
    petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
  }

  buildPetalBarUI();
  attachSlotEvents();
});

// Add petal to inventory / slot
function addPetalDrop(type) {
  // Find first empty active slot
  const idx = activeSlots.indexOf(null);
  if(idx !== -1){
    activeSlots[idx] = type;
    // SAVE
  for (let i = 0; i < petals.length; i++) {
    petalStateCache[i] = { ...petals[i] };
  }
    rebuildPetals();
    buildPetalBarUI(); attachSlotEvents();
    return;
  }
  // else find empty swap slot
  const si = swapSlots.indexOf(null);
  if(si !== -1){ swapSlots[si] = type; buildPetalBarUI(); attachSlotEvents(); }
}

// ===================== FACE ICON =====================
function drawFaceIcon(){
  faceCtx.clearRect(0,0,40,40);
  const happy = player.hp / player.maxHp > 0.3;
  drawSmiley(faceCtx,20,20,18,happy,player.invincible>0);
}

// ===================== GAME STATE =====================
let frame=0, spawnTimer=0, dead=false;

let swapCooldown = 0;
const SWAP_CD_MAX = 60;
let slotCooldown = Array(10).fill(0);
const SWAP_DELAY = 500; // ms

// ======================== HANDLE INPUT ========================
function trySwapActiveSwap() {

    const now = Date.now();
    if (now - lastSwapTime < SWAP_DELAY) return false;
    lastSwapTime = now;

// save state
for (let i = 0; i < ACTIVE_COUNT; i++) {
  petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
}

// swap
for (let i = 0; i < ACTIVE_COUNT; i++) {
  const tmp = activeSlots[i];
  activeSlots[i] = swapSlots[i];
  swapSlots[i] = tmp;
}

rebuildPetals();

// apply cooldown to petals
for (let p of petals) {
  p.cooldown = 80;
}

// 🔥 IMPORTANT: SAVE AFTER APPLYING
for (let i = 0; i < ACTIVE_COUNT; i++) {
  petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
}
console.log("after swap:", petals.map(p => p.cooldown));

buildPetalBarUI();
attachSlotEvents();

swapCooldown = SWAP_CD_MAX;
lastSwapTime = Date.now()

return true;
}

function keyPressed(code){
  return keys[code] && !keys["_" + code];
}

function handleInput(){
  if (keyPressed("KeyR")) {
    trySwapActiveSwap();
  }
}
// ======================== DRAW COOLDOWN (ANIMATION FOR CD) ========================
function drawCooldown(){
  let ratio = swapCooldown / SWAP_CD_MAX;

  // simple bar (top-left)
  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, 100 * ratio, 10);
}
// ===================== UPDATE =====================
function update(){
  if(dead) return;
  frame++;

  // cooldown ticks down
  if (swapCooldown > 0) swapCooldown--;

  handleInput();   // 👈 we'll make this
  
  drawCooldown();  // 👈 optional UI

  // Petal state
  const attacking = mouse.left || keys['Space'];
  const defending  = mouse.right || keys['ShiftLeft'] || keys['ShiftRight'];
  petalState = defending ? 'defend' : attacking ? 'attack' : 'idle';
  document.getElementById('state-indicator').textContent =
    petalState==='attack' ? '⚔️ ATTACK' : petalState==='defend' ? '🛡️ DEFEND' : '🌸 IDLE';

  // WASD movement
  let vx=0,vy=0;
  if(keys['KeyW']||keys['ArrowUp'])    vy-=1;
  if(keys['KeyS']||keys['ArrowDown'])  vy+=1;
  if(keys['KeyA']||keys['ArrowLeft'])  vx-=1;
  if(keys['KeyD']||keys['ArrowRight']) vx+=1;
  const vl=Math.hypot(vx,vy);
  if(vl>0){vx/=vl;vy/=vl;}
  player.x = Math.max(player.r, Math.min(WORLD_W-player.r, player.x+vx*player.speed));
  player.y = Math.max(player.r, Math.min(WORLD_H-player.r, player.y+vy*player.speed));

  // Camera — center on player, clamp to world edges
  cam.x = Math.max(0, Math.min(WORLD_W-canvas.width,  player.x - canvas.width/2));
  cam.y = Math.max(0, Math.min(WORLD_H-canvas.height, player.y - canvas.height/2));

  // Mouse world pos
  mouse.wx = mouse.x + cam.x;
  mouse.wy = mouse.y + cam.y;

  // Petal orbit spin
  const spinSpeed = petalState==='defend'
    ? player.petalOrbitSpeed*3
    : petalState==='attack'
      ? player.petalOrbitSpeed*2.2
      : player.petalOrbitSpeed;
  player.petalAngle += spinSpeed;
  for(let i=0;i<petals.length;i++)
    petals[i].angle = player.petalAngle + (Math.PI*2/petals.length)*i;
    console.log("cooldowns:", petals.map(p => p.cooldown));

  // Move petals (lerp), handle broken/respawn
  for(let i=0;i<petals.length;i++){
    const p=petals[i];
    const def=PETAL_TYPES[p.type];
    // Broken: count down respawn
    if(p.broken){
      p.respawnTimer--;
      // Sit at player center while broken
      p.x+=(player.x-p.x)*0.2; p.y+=(player.y-p.y)*0.2;
      if(p.respawnTimer<=0){ p.broken=false; p.hp=def.maxHp; p.cooldown=0; }
      continue;
    }
    const t=getPetalTarget(i,petalState,petals.length);
    const spd = petalState==='defend' ? 0.32 : petalState==='attack' ? 0.18 : 0.2;
    p.x+=(t.x-p.x)*spd;
    p.y+=(t.y-p.y)*spd;
    if(p.justReady){
  const dx = p.x - player.x;
  const dy = p.y - player.y;
  const len = Math.hypot(dx, dy) || 1;

  // push outward
  p.x += (dx / len) * 25;
  p.y += (dy / len) * 25;

  p.justReady = false;
}
    if(p.cooldown>0){
      p.cooldown--;
      if(p.cooldown === 0){
        p.justReady = true; //trigger bounce
      }
    }
    // Healing petal: heal on cooldown, not every frame
    if(p.type==='healing'){
      if(p.healTimer>0) p.healTimer--;
      if(p.healTimer<=0 && player.hp<player.maxHp){
        player.hp=Math.min(player.maxHp, player.hp+def.healAmt);
        p.healTimer=def.healCooldown;
      }
    }
  }

  // Spawn mobs (nerfed rate)
  spawnTimer++;
  const spawnRate = Math.max(180, 420 - player.level*12);
  if(spawnTimer>=spawnRate && mobs.length < 40){ spawnMob(); spawnTimer=0; }

  // Update mobs
  for(let i=mobs.length-1;i>=0;i--){
    const m=mobs[i];
    m.spinAngle+=0.04;
    if(m.hitFlash>0) m.hitFlash--;

    // Poison tick
    if(m.poisoned>0){
      m.poisonTimer++;
      if(m.poisonTimer%60===0){ m.hp-=PETAL_TYPES.poison.poisonDps; m.hitFlash=4; }
      m.poisoned--;
      if(m.hp<=0){ killMob(i); continue; }
    }

    // Chase player (world coords)
    const mdx=player.x-m.x, mdy=player.y-m.y, md=Math.hypot(mdx,mdy);
    if(md>1){ m.x+=(mdx/md)*m.speed; m.y+=(mdy/md)*m.speed; }
    m.x=Math.max(m.r,Math.min(WORLD_W-m.r,m.x));
    m.y=Math.max(m.r,Math.min(WORLD_H-m.r,m.y));

    // Mob damages player
    if(player.invincible<=0 && Math.hypot(player.x-m.x,player.y-m.y)<m.r+player.r-2){
      player.hp-=m.dmg; player.invincible=55;
      if(player.hp<=0){ player.hp=0; triggerDeath(); return; }
    }

    // Petals hit mob
    for(const p of petals){
      if(p.broken) continue;
      if(p.cooldown === 0 && Math.hypot(p.x-m.x,p.y-m.y)<p.r+m.r){
        // Mob damages petal
        p.hp -= m.dmg * 0.15;
        if(p.hp<=0){ p.broken=true; p.respawnTimer=PETAL_TYPES[p.type].respawnTime; continue; }
        if(p.cooldown === 0){
          const dmgMult = petalState==='defend' ? 0.35 : 1;
          m.hp -= p.damage * dmgMult;
          const def = PETAL_TYPES[p.type];
          p.cooldown = petalState==='attack' ? def.cooldownAtk : def.cooldownIdle;
          m.hitFlash=10;

        // Type effects
        if(p.type==='lightning'){
          // Knockback
          const bx=m.x-player.x, by=m.y-player.y, bl=Math.hypot(bx,by)||1;
          m.x+=bx/bl*def.knockback; m.y+=by/bl*def.knockback;
          // Chain to nearest other mob
          let nearest=null, nd=999;
          for(const m2 of mobs){ if(m2===m) continue; const d2=Math.hypot(m2.x-m.x,m2.y-m.y); if(d2<nd){nd=d2;nearest=m2;} }
          if(nearest && nd<120){ nearest.hp-=def.damage*0.6; nearest.hitFlash=8; }
        }
        if(p.type==='poison'){
          m.poisoned = def.poisonDur;
          m.poisonTimer = 0;
        }
        if(petalState==='defend'){
          const bx=m.x-player.x,by=m.y-player.y,bl=Math.hypot(bx,by)||1;
          m.x+=bx/bl*9; m.y+=by/bl*9;
        }
          if(m.hp<=0){ killMob(i); break; }
        }
      }
    }
  }

  // Drops update (world coords, attract when close)
  for(let i=drops.length-1;i>=0;i--){
    const dr=drops[i]; dr.life--;
    const dd=Math.hypot(dr.x-player.x,dr.y-player.y);
    if(dd<100){ dr.x+=(player.x-dr.x)*0.14; dr.y+=(player.y-dr.y)*0.14; }
    if(dd<player.r+dr.r || dr.life<=0){
      if(dr.life>0){
        if(dr.type==='xp'){
          player.xp+=dr.xp;
          while(player.xp>=player.xpToNext){
            player.xp-=player.xpToNext; player.level++;
            player.xpToNext=Math.floor(player.xpToNext*1.4);
            player.maxHp+=10; player.hp=Math.min(player.hp+20,player.maxHp);
          }
        } else {
          addPetalDrop(dr.type);
        }
      }
      drops.splice(i,1);
    }
  }

  if(player.invincible>0) player.invincible--;
  if(frame%240===0 && player.hp<player.maxHp) player.hp=Math.min(player.maxHp,player.hp+1);

  updateHUD();

keys['_KeyR'] = keys['KeyR'];
}

function killMob(i){
  const m=mobs[i];
  drops.push({x:m.x,y:m.y,type:'xp',xp:m.xp,r:7,life:300});
  // Chance to drop a petal
  if(Math.random()<0.3){
    const petalTypes = Object.keys(PETAL_TYPES);
    const dropped = petalTypes[Math.floor(Math.random()*petalTypes.length)];
    drops.push({x:m.x+10,y:m.y+10,type:dropped,r:8,life:400});
  }
  mobs.splice(i,1);
}

// ===================== HUD =====================
function updateHUD(){
  document.getElementById('hp-bar-fill').style.width=(player.hp/player.maxHp*100)+'%';
  document.getElementById('hp-bar-fill').style.background=player.hp/player.maxHp>0.5?'#44ff88':player.hp/player.maxHp>0.25?'#ffcc00':'#ff4444';
  document.getElementById('xp-bar-fill').style.width=(player.xp/player.xpToNext*100)+'%';
  document.getElementById('lvl-badge').textContent=`Lv ${player.level}`;
  drawFaceIcon();
}

// ===================== DRAW =====================
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Background fill
  ctx.fillStyle='#2d5a2d';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // World boundary
  ctx.save();
  ctx.strokeStyle='#1a3a1a';
  ctx.lineWidth=4;
  ctx.strokeRect(-cam.x,-cam.y,WORLD_W,WORLD_H);
  ctx.restore();

  // Dots (texture)
  for(const d of dots){
    const s=worldToScreen(d.x,d.y);
    if(s.x<-5||s.x>canvas.width+5||s.y<-5||s.y>canvas.height+5) continue;
    ctx.beginPath(); ctx.arc(s.x,s.y,d.r,0,Math.PI*2);
    ctx.fillStyle=d.c; ctx.fill();
  }

  // Grass blobs
  for(const g of grass){
    const s=worldToScreen(g.x,g.y);
    if(s.x<-10||s.x>canvas.width+10||s.y<-10||s.y>canvas.height+10) continue;
    ctx.beginPath(); ctx.arc(s.x,s.y,g.r,0,Math.PI*2);
    ctx.fillStyle=g.c; ctx.fill();
  }

  // Drops
  for(const dr of drops){
    const s=worldToScreen(dr.x,dr.y);
    if(s.x<-20||s.x>canvas.width+20||s.y<-20||s.y>canvas.height+20) continue;
    const pulse=0.85+Math.sin(frame*0.18)*0.15;
    ctx.save();
    if(dr.type==='xp'){
      ctx.shadowColor='#ffff88'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(s.x,s.y,dr.r*pulse,0,Math.PI*2);
      ctx.fillStyle='#ffee55'; ctx.fill();
      ctx.strokeStyle='#ffffffaa'; ctx.lineWidth=1.5; ctx.stroke();
    } else {
      const def=PETAL_TYPES[dr.type];
      ctx.shadowColor=def.glow; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(s.x,s.y,dr.r*pulse,0,Math.PI*2);
      ctx.fillStyle=def.color; ctx.fill();
      ctx.strokeStyle='#ffffffaa'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.font='10px serif'; ctx.textAlign='center'; ctx.fillStyle='#000';
      ctx.fillText(def.emoji, s.x, s.y+3);
    }
    ctx.restore();
  }

  // Mobs (smiley face style)
  for(const m of mobs){
    const s=worldToScreen(m.x,m.y);
    if(s.x<-60||s.x>canvas.width+60||s.y<-60||s.y>canvas.height+60) continue;
    const c = m.hitFlash>0 ? '#ffffff' : m.poisoned>0 ? '#88ff44' : m.color;
    ctx.save();
    drawMobFace(ctx,s.x,s.y,m.r,c);
    // Poison aura
    if(m.poisoned>0){
      ctx.beginPath(); ctx.arc(s.x,s.y,m.r+4,0,Math.PI*2);
      ctx.strokeStyle='#88ff4466'; ctx.lineWidth=3; ctx.stroke();
    }
    ctx.restore();
    drawHealthBar(s.x,s.y,m.r,m.hp,m.maxHp);
  }

  // Petals
  for(let i=0;i<petals.length;i++){
    const p=petals[i];
    const def=PETAL_TYPES[p.type];

 ctx.save();
 const s=worldToScreen(p.x,p.y);

    if(p.cooldown > 0){
  ctx.globalAlpha = 0; // invisible
} else {
  ctx.globalAlpha = 1;
}
    
    ;
   
    const fillColor = def.color;
    if(p.broken){
      // Ghost / respawning petal
      const progress = 1 - p.respawnTimer/def.respawnTime;
      ctx.globalAlpha=0.25+progress*0.3;
      ctx.beginPath(); ctx.arc(s.x,s.y,p.r,0,Math.PI*2);
      ctx.fillStyle='#aaaaaa'; ctx.fill();
      ctx.strokeStyle='#ffffff55'; ctx.lineWidth=1; ctx.stroke();
      // Respawn arc
      ctx.beginPath(); ctx.arc(s.x,s.y,p.r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);
      ctx.strokeStyle=def.color; ctx.lineWidth=2; ctx.stroke();
      ctx.globalAlpha=1;
    } else {
      ctx.shadowColor=def.glow;
      ctx.shadowBlur=petalState==='idle'?8:16;
      if(p.cooldown > 0){
        ctx.globalAlpha = 0; //invisible
      } else {
        ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(s.x,s.y,p.r+(petalState==='defend'?2.5:0),0,Math.PI*2);
      ctx.fillStyle=fillColor; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
      // HP arc (only show when damaged)
      if(p.hp < def.maxHp){
        const ratio=p.hp/def.maxHp;
        ctx.beginPath(); ctx.arc(s.x,s.y,p.r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);
        ctx.strokeStyle=ratio>0.5?'#44ff88':ratio>0.25?'#ffcc00':'#ff4444';
        ctx.lineWidth=2; ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Player (smiley)
  const ps=worldToScreen(player.x,player.y);
  ctx.save();
  if(player.invincible>0 && frame%6<3) ctx.globalAlpha=0.3;
  drawSmiley(ctx,ps.x,ps.y,player.r,player.hp/player.maxHp>0.3,false);
  ctx.globalAlpha=1;
  ctx.restore();

  // Crosshair
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(mouse.x-9,mouse.y); ctx.lineTo(mouse.x+9,mouse.y);
  ctx.moveTo(mouse.x,mouse.y-9); ctx.lineTo(mouse.x,mouse.y+9);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(mouse.x,mouse.y,3,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fill();
  ctx.restore();
}

// ===================== DEATH / RESET =====================
function triggerDeath(){
  dead=true;
  document.getElementById('death-screen').style.display='block';
}

function resetGame(){
  dead=false;
  document.getElementById('death-screen').style.display='none';
  player.x=WORLD_W/2; player.y=WORLD_H/2;
  player.hp=100; player.maxHp=100;
  player.xp=0; player.level=1; player.xpToNext=30;
  player.invincible=0;
  mobs.length=0; drops.length=0;
  for(let i=0;i<ACTIVE_COUNT;i++) activeSlots[i]=null;
  activeSlots[0]='basic'; activeSlots[1]='basic'; activeSlots[2]='basic';
  // SAVE
  for (let i = 0; i < ACTIVE_COUNT; i++) {
  petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
}
rebuildPetals();
buildPetalBarUI();
attachSlotEvents();
  for(let i=0;i<6;i++) spawnMob();
}
window.resetGame=resetGame;

// ===================== LOOP =====================
function loop(){ update(); draw(); requestAnimationFrame(loop); }
for(let i=0;i<6;i++) spawnMob();
updateHUD();
loop();
