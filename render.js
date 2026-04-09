import {
  PETAL_TYPES, cam, worldToScreen,
  player, petals, petalState, mobs, drops,
  grass, dots, frame, swapCooldown, SWAP_CD_MAX,
} from './state.js';
import { mouse } from './input.js';

export function dist(a, b) { return Math.hypot(a.x-b.x, a.y-b.y); }

export function drawSmiley(c, x, y, r, happy=true, invincible=false) {
  c.beginPath(); c.arc(x,y,r,0,Math.PI*2);
  c.fillStyle = invincible ? '#fff8' : '#ffe066';
  c.fill();
  c.strokeStyle='#cc9900'; c.lineWidth=1.5; c.stroke();
  c.fillStyle='#333';
  c.beginPath(); c.arc(x-r*0.28,y-r*0.15,r*0.12,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(x+r*0.28,y-r*0.15,r*0.12,0,Math.PI*2); c.fill();
  c.beginPath();
  if(happy){
    c.arc(x,y+r*0.05,r*0.3, 0.2, Math.PI-0.2);
  } else {
    c.arc(x,y+r*0.35,r*0.3, Math.PI+0.2, -0.2);
  }
  c.strokeStyle='#333'; c.lineWidth=1.5; c.stroke();
}

export function drawMobFace(c, x, y, r, color) {
  c.beginPath(); c.arc(x,y,r,0,Math.PI*2);
  c.fillStyle=color; c.fill();
  c.strokeStyle='rgba(0,0,0,0.3)'; c.lineWidth=1.5; c.stroke();
  c.fillStyle='#000';
  c.beginPath(); c.arc(x-r*0.28,y-r*0.1,r*0.1,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(x+r*0.28,y-r*0.1,r*0.1,0,Math.PI*2); c.fill();
  c.beginPath();
  c.arc(x,y+r*0.35,r*0.25,Math.PI+0.3,-0.3);
  c.strokeStyle='#000'; c.lineWidth=1.2; c.stroke();
}

export function drawHealthBar(ctx, x, y, r, hp, maxHp) {
  const w=r*2.6, h=5, bx=x-w/2, by=y-r-14;
  ctx.fillStyle='#111'; ctx.fillRect(bx,by,w,h);
  const ratio = hp/maxHp;
  ctx.fillStyle = ratio>0.5?'#44ff88':ratio>0.25?'#ffcc00':'#ff4444';
  ctx.fillRect(bx,by,w*ratio,h);
  ctx.strokeStyle='#0004'; ctx.lineWidth=1; ctx.strokeRect(bx,by,w,h);
}

export function drawCooldown(ctx, canvas) {
  let ratio = swapCooldown / SWAP_CD_MAX;
  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, 100 * ratio, 10);
}

export function draw(ctx, canvas) {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle='#2d5a2d';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.save();
  ctx.strokeStyle='#1a3a1a'; ctx.lineWidth=4;
  ctx.strokeRect(-cam.x,-cam.y,WORLD_W,WORLD_H);
  ctx.restore();

  for(const d of dots){
    const s = worldToScreen(d.x,d.y);
    if(s.x<-5||s.x>canvas.width+5||s.y<-5||s.y>canvas.height+5) continue;
    ctx.beginPath(); ctx.arc(s.x,s.y,d.r,0,Math.PI*2);
    ctx.fillStyle=d.c; ctx.fill();
  }

  for(const g of grass){
    const s = worldToScreen(g.x,g.y);
    if(s.x<-10||s.x>canvas.width+10||s.y<-10||s.y>canvas.height+10) continue;
    ctx.beginPath(); ctx.arc(s.x,s.y,g.r,0,Math.PI*2);
    ctx.fillStyle=g.c; ctx.fill();
  }

  for(const dr of drops){
    const s = worldToScreen(dr.x,dr.y);
    if(s.x<-20||s.x>canvas.width+20||s.y<-20||s.y>canvas.height+20) continue;
    const pulse = 0.85+Math.sin(frame*0.18)*0.15;
    ctx.save();
    if(dr.type==='xp'){
      ctx.shadowColor='#ffff88'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(s.x,s.y,dr.r*pulse,0,Math.PI*2);
      ctx.fillStyle='#ffee55'; ctx.fill();
      ctx.strokeStyle='#ffffffaa'; ctx.lineWidth=1.5; ctx.stroke();
    } else {
      const def = PETAL_TYPES[dr.type];
      ctx.shadowColor=def.glow; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(s.x,s.y,dr.r*pulse,0,Math.PI*2);
      ctx.fillStyle=def.color; ctx.fill();
      ctx.strokeStyle='#ffffffaa'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.font='10px serif'; ctx.textAlign='center'; ctx.fillStyle='#000';
      ctx.fillText(def.emoji, s.x, s.y+3);
    }
    ctx.restore();
  }

  for(const m of mobs){
    const s = worldToScreen(m.x,m.y);
    if(s.x<-60||s.x>canvas.width+60||s.y<-60||s.y>canvas.height+60) continue;
    const c = m.hitFlash>0 ? '#ffffff' : m.poisoned>0 ? '#88ff44' : m.color;
    ctx.save();
    drawMobFace(ctx,s.x,s.y,m.r,c);
    if(m.poisoned>0){
      ctx.beginPath(); ctx.arc(s.x,s.y,m.r+4,0,Math.PI*2);
      ctx.strokeStyle='#88ff4466'; ctx.lineWidth=3; ctx.stroke();
    }
    ctx.restore();
    drawHealthBar(ctx,s.x,s.y,m.r,m.hp,m.maxHp);
  }

  for(let i=0;i<petals.length;i++){
    const p = petals[i];
    const def = PETAL_TYPES[p.type];
    ctx.save();
    const s = worldToScreen(p.x,p.y);

    if(p.cooldown > 0){
      ctx.globalAlpha = 0;
    } else {
      ctx.globalAlpha = 1;
    }

    const fillColor = def.color;
    if(p.broken){
      const progress = 1 - p.respawnTimer/def.respawnTime;
      ctx.globalAlpha = 0.25+progress*0.3;
      ctx.beginPath(); ctx.arc(s.x,s.y,p.r,0,Math.PI*2);
      ctx.fillStyle='#aaaaaa'; ctx.fill();
      ctx.strokeStyle='#ffffff55'; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x,s.y,p.r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);
      ctx.strokeStyle=def.color; ctx.lineWidth=2; ctx.stroke();
      ctx.globalAlpha=1;
    } else {
      ctx.shadowColor=def.glow;
      ctx.shadowBlur = petalState==='idle' ? 8 : 16;
      if(p.cooldown > 0){
        ctx.globalAlpha = 0;
      } else {
        ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(s.x,s.y,p.r+(petalState==='defend'?2.5:0),0,Math.PI*2);
      ctx.fillStyle=fillColor; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
      if(p.hp < def.maxHp){
        const ratio = p.hp/def.maxHp;
        ctx.beginPath(); ctx.arc(s.x,s.y,p.r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);
        ctx.strokeStyle = ratio>0.5?'#44ff88':ratio>0.25?'#ffcc00':'#ff4444';
        ctx.lineWidth=2; ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Player
  const ps = worldToScreen(player.x,player.y);
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
