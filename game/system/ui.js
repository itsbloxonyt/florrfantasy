import {
  ACTIVE_COUNT, SWAP_COUNT, SWAP_CD_MAX,
  PETAL_TYPES, activeSlots, swapSlots, petals, petalStateCache,
  player, swapCooldown, setSwapCooldown,
} from '../state.js';
import { rebuildPetals } from '../content/petals.js';

let dragSrc = null;

export function getSlotEls() {
  return {
    active: Array.from(document.getElementById('active-slots').children),
    swap:   Array.from(document.getElementById('swap-slots').children),
  };
}

export function buildPetalBarUI() {
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

export function attachSlotEvents() {
  const {active, swap} = getSlotEls();
  const attach = (els, row) => {
    els.forEach((el, idx) => {
      el.style.cursor = 'grab';
      el.addEventListener('mousedown', e => {
        e.stopPropagation();
        dragSrc = {row, idx};
        el.style.opacity = '0.5';
      });
      el.addEventListener('mouseup', e => {
        e.stopPropagation();
        if(dragSrc && !(dragSrc.row===row && dragSrc.idx===idx)){
          const srcArr = dragSrc.row === 'active' ? activeSlots : swapSlots;
          const dstArr = row === 'active' ? activeSlots : swapSlots;

          for (let i = 0; i < ACTIVE_COUNT; i++) {
            petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
          }

          const a = dragSrc.idx;
          const b = idx;

          for (let i = 0; i < ACTIVE_COUNT; i++) {
            petalStateCache[i] = petals[i] ? { ...petals[i] } : null;
          }

          const tmp = srcArr[a];
          srcArr[a] = dstArr[b];
          dstArr[b] = tmp;

          rebuildPetals();

          if (petals[a]) petals[a].cooldown = 120;
          if (petals[b]) petals[b].cooldown = 120;

          setSwapCooldown(SWAP_CD_MAX);
          buildPetalBarUI();
          attachSlotEvents();
        }
        if(dragSrc){ getSlotEls().active.concat(getSlotEls().swap).forEach(e=>e.style.opacity='1'); }
        dragSrc = null;
      });
    });
  };
  attach(active, 'active');
  attach(swap, 'swap');
}

export function updateHUD(faceCanvas, drawSmiley) {
  document.getElementById('hp-bar-fill').style.width = (player.hp/player.maxHp*100)+'%';
  document.getElementById('hp-bar-fill').style.background = player.hp/player.maxHp>0.5?'#44ff88':player.hp/player.maxHp>0.25?'#ffcc00':'#ff4444';
  document.getElementById('xp-bar-fill').style.width = (player.xp/player.xpToNext*100)+'%';
  document.getElementById('lvl-badge').textContent = `Lv ${player.level}`;
  drawFaceIcon(faceCanvas, drawSmiley);
}

export function drawFaceIcon(faceCanvas, drawSmiley) {
  const faceCtx = faceCanvas.getContext('2d');
  faceCtx.clearRect(0,0,40,40);
  const happy = player.hp / player.maxHp > 0.3;
  drawSmiley(faceCtx, 20, 20, 18, happy, player.invincible > 0);
}
