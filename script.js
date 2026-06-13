"use strict";
/* ════════════════════════════════════════════════════════
   COIN RUNNER — чистая архитектура
   1. Данные локаций  2. Игровой стейт  3. Рендер-слои
   4. UI-система       5. Движок         6. Старт
════════════════════════════════════════════════════════ */

const $  = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);

/* ── helpers ── */
function hexToRgb(hex){
  let h = hex.replace('#','');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return parseInt(h.substr(0,2),16)+','+parseInt(h.substr(2,2),16)+','+parseInt(h.substr(4,2),16);
}

/* ═══════════════════════════════════════
   1. ЛОКАЦИИ — данные + визуальная тема + слои
═══════════════════════════════════════ */
// Доход: TON за 36 дней игры (= METERS_36 метров). Город = 1 TON. Остальные рандомятся при открытии.
// incomeMin/incomeMax = TON за METERS_36 метров. price = стоимость открытия в TON.
const LOCATIONS = {
  city:      { name:'Город',  icon:'🏙️', mult:1,   price:0,   desc:'1 TON за ~5.97 млн м',
               incomeMin:1,   incomeMax:1,   bg:'linear-gradient(135deg,#1a1535,#2d1f5e)' },
  forest:    { name:'Лес',    icon:'🌲', mult:2,   price:5,   desc:'6–6.5 TON за ~5.97 млн м',
               incomeMin:6,   incomeMax:6.5, bg:'linear-gradient(135deg,#0c2010,#1a4020)' },
  ocean:     { name:'Океан',  icon:'🌊', mult:2.5, price:10,  desc:'11–13 TON за ~5.97 млн м',
               incomeMin:11,  incomeMax:13,  bg:'linear-gradient(135deg,#040e1f,#0a2040)' },
  mountains: { name:'Горы',   icon:'⛰️', mult:3,   price:50,  desc:'55–65 TON за ~5.97 млн м',
               incomeMin:55,  incomeMax:65,  bg:'linear-gradient(135deg,#1a1010,#3d2020)' },
  volcano:   { name:'Вулкан', icon:'🌋', mult:4,   price:100, desc:'110–130 TON за ~5.97 млн м',
               incomeMin:110, incomeMax:130, bg:'linear-gradient(135deg,#2a0800,#5a1800)' },
  space:     { name:'Космос', icon:'🚀', mult:5,   price:300, desc:'350–380 TON за ~5.97 млн м',
               incomeMin:350, incomeMax:380, bg:'linear-gradient(135deg,#050520,#1a0a40)' },
};

/* Цветовые темы (небо / земля / горы / акценты) */
const THEME = {
  city:      { sky:['#020108','#0a0620','#160d3a','#1f1245'], gnd:['#18103e','#0d0828'],
               line:'#9060ff', glow:'#7c4dff', mtn:['rgba(22,10,55,.72)','rgba(14,7,42,.88)','rgba(8,4,26,.97)'],
               dust:'#c0a0ff', streak:'#a080ff', horizon:'rgba(80,30,180,.18)', sun:null, fog:'rgba(40,15,100,.09)' },
  forest:    { sky:['#020c05','#041a0a','#073318','#0a4820'], gnd:['#143818','#0a2210'],
               line:'#4ade80', glow:'#22c55e', mtn:['rgba(8,32,12,.78)','rgba(6,22,9,.90)','rgba(4,14,6,.97)'],
               dust:'#86efac', streak:'#4ade80', horizon:'rgba(30,120,50,.22)', sun:'rgba(255,240,180,.12)', fog:'rgba(20,90,35,.12)' },
  ocean:     { sky:['#010814','#03112a','#051f44','#072d5c'], gnd:['#052850','#031538'],
               line:'#38bdf8', glow:'#0ea5e9', mtn:['rgba(4,18,55,.78)','rgba(3,12,42,.90)','rgba(2,7,28,.97)'],
               dust:'#7dd3fc', streak:'#38bdf8', horizon:'rgba(14,165,233,.20)', sun:'rgba(200,240,255,.15)', fog:'rgba(10,80,140,.14)' },
  mountains: { sky:['#060510','#0e0c20','#1a1636','#231e48'], gnd:['#22203c','#161428'],
               line:'#a78bfa', glow:'#7c3aed', mtn:['rgba(34,30,72,.78)','rgba(24,20,55,.90)','rgba(15,12,38,.97)'],
               dust:'#c4b5fd', streak:'#a78bfa', horizon:'rgba(120,100,220,.15)', sun:'rgba(200,210,255,.10)', fog:'rgba(60,50,120,.12)' },
  volcano:   { sky:['#0a0000','#200500','#380a00','#4a1000'], gnd:['#3e0e00','#240700'],
               line:'#f97316', glow:'#ea580c', mtn:['rgba(70,16,4,.78)','rgba(50,10,2,.90)','rgba(32,6,1,.97)'],
               dust:'#fdba74', streak:'#f97316', horizon:'rgba(220,60,10,.28)', sun:'rgba(255,80,0,.18)', fog:'rgba(180,40,5,.14)' },
  space:     { sky:['#000003','#01000a','#030014','#04001e'], gnd:['#080022','#04000e'],
               line:'#e879f9', glow:'#a21caf', mtn:['rgba(12,4,44,.78)','rgba(8,2,32,.90)','rgba(4,1,20,.97)'],
               dust:'#f0abfc', streak:'#e879f9', horizon:'rgba(168,28,180,.18)', sun:null, fog:'rgba(80,10,100,.10)' },
};

/* ═══════════════════════════════════════
   СКИНЫ — данные
═══════════════════════════════════════ */
const SKINS = {
  runner:  { name:'Бегун',     icon:'p1', emoji:'p1', bg:'linear-gradient(135deg,#1a1535,#2d1f5e)', months:1,  price:10,  desc:'Классика в движении' },
  cyber:   { name:'Кросс',     icon:'p2', emoji:'p2', bg:'linear-gradient(135deg,#001a2e,#003355)', months:3,  price:25,  desc:'Цифровой разум' },
  ninja:   { name:'Ниндзя',    icon:'p3', emoji:'p3', bg:'linear-gradient(135deg,#0d0d0d,#1a001a)', months:6,  price:50,  desc:'Тень в ночи' },
  astro:   { name:'Сбежавшая', icon:'p4', emoji:'p4', bg:'linear-gradient(135deg,#050520,#1a0a40)', months:12, price:90,  desc:'За пределами вселенной' },
};

// Доход от монеток = единственный источник.
// Локация действует METERS_36 метров (= 36 дней непрерывного бега).
// distPerFrame = BASE_SPEED/W * 8 = 0.004 * 8 = 0.032 м/кадр
// При 60fps: 0.032 * 60 = 1.92 м/сек
// За 36 дней = 1.92 * 36*24*3600 = 5 971 968 м
const METERS_36 = 5971968; // метров = 36 дней игры

// Монет за METERS_36: COIN_SPACING/W=0.38, BASE_SPEED/W=0.004
// Монет/метр = 1 / (COIN_SPACING / (BASE_SPEED/frame * distPerFrame^-1))
// Проще: между монетами COIN_SPACING пикс, distPerFrame = BASE_SPEED
// Метров между монетами = COIN_SPACING / BASE_SPEED * distPerFrame
//   = (W*0.38) / (W*0.004) * (W*0.004/W*8) = 0.38/0.004 * 0.032 = 95 * 0.032 = 3.04 м/монету
const METERS_PER_COIN = (0.38 / 0.004) * (0.004 * 8); // = 3.04 м/монету
const SESSION_LIMIT_BASE = 27648; // 4 часа
const METERS_PER_HOUR = 6912; // 1 час = 3600 * 1.92 // базовый лимит метров

// locIncome[id] = {ratePerMeter: TON/м, startDist: м, endDist: м, totalTon, expired}
const locIncome = {};

function initLocIncome(id){
  const loc = LOCATIONS[id];
  const totalTon = loc.incomeMin + Math.random() * (loc.incomeMax - loc.incomeMin);
  const ratePerMeter = totalTon / METERS_36; // TON/метр
  const startDist = Game.totalDist;
  locIncome[id] = {
    ratePerMeter,
    startDist,
    endDist: startDist + METERS_36,
    totalTon,
    expired: false
  };
}

// Стоимость одной монетки: ratePerMeter * METERS_PER_COIN
function coinValueForLoc(id){
  const inc = locIncome[id];
  if (!inc || inc.expired) return 0;
  if (Game.totalDist >= inc.endDist) return 0;
  return inc.ratePerMeter * METERS_PER_COIN;
}

// Проверка истечения — вызывать каждый кадр (дёшево, просто сравнение)
function checkLocExpiry(){
  for (const id of Array.from(Game.unlocked)){
    const inc = locIncome[id];
    if (!inc || inc.expired) continue;
    if (Game.totalDist >= inc.endDist){
      inc.expired = true;
      if (id === 'city'){
        initLocIncome('city');
      } else {
        Game.unlocked.delete(id);
        if (Game.currentLoc === id){ Game.currentLoc = 'city'; }
        showToast(`${LOCATIONS[id].icon} ${LOCATIONS[id].name} закрылась! Открой снова.`);
        buildLocCards();
      }
    }
  }
}

const Game = {
  coins: 0,
  speedLevel: 0,
  upgrades: [false,false,false,false,false],
  currentLoc: 'city',
  unlocked: new Set(['city']),
  totalCollected: 0,
  totalDist: 0,
  sessionDist: 0,      // метры текущей сессии (сбрасывается при сборе)
  sessionLimit: 27648,  // 4 часа (4 * 3600 * 1.92)
  pendingCoins: 0,     // накопленные монеты ждущие сбора
  skinBonus: 0,
  activeSkin: null,
  playerX: 0, cameraX: 0, speed: 0, groundOffset: 0,
  frame: 0, frameTick: 0, frameDelay: 4,
};
// Город инициализируем сразу после создания Game
initLocIncome('city');
const upgradeCosts = [25, 60, 100, 150, 200];
const SPRITE_FRAMES = 8;

/* ═══════════════════════════════════════
   3. CANVAS + РАЗМЕРЫ
═══════════════════════════════════════ */
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
let W, H, GROUND_Y, COIN_Y, COIN_R, PLAYER_W, PLAYER_H, COIN_SPACING, CAM_LEAD, BASE_SPEED, magnetRadius;

function computeDimensions(){
  W = canvas.width  = innerWidth;
  H = canvas.height = innerHeight;
  GROUND_Y     = H * 0.76;
  COIN_R       = W * 0.028;
  PLAYER_W     = PLAYER_H = W * 0.22;
  COIN_Y       = GROUND_Y - COIN_R - 2;
  COIN_SPACING = W * 0.38;
  CAM_LEAD     = W * 0.28;
  BASE_SPEED   = W * 0.004;
  magnetRadius = W * 0.22;
}

/* ═══════════════════════════════════════
   4. ПЕРЕИСПОЛЬЗУЕМЫЕ ПРИМИТИВЫ ФОНА
═══════════════════════════════════════ */

/* — Звёзды — */
const STARS = Array.from({length:80}, () => ({
  nx:Math.random(), ny:Math.random()*0.88, r:rnd(0.4,1.8),
  base:Math.random(), bright:rnd(0.25,0.65),
}));
function drawStars(ox){
  const t = Date.now()/1200, tW = W*3;
  for (const s of STARS){
    const x = ((s.nx*tW - ox%tW) + tW*2) % tW;
    const y = s.ny * GROUND_Y * 0.96;
    const tw = s.bright * (0.6 + 0.4*Math.sin(t + s.base*6.28));
    ctx.beginPath(); ctx.arc(x,y,s.r,0,7);
    ctx.fillStyle = `rgba(220,220,255,${tw.toFixed(2)})`; ctx.fill();
  }
}

/* — Туманности — */
const NEBULAS = Array.from({length:5}, (_,i) => ({
  nx:Math.random(), ny:rnd(0.05,0.4), rw:rnd(0.25,0.55), rh:rnd(0.06,0.14),
  hue:[260,200,300,230,280][i], alpha:rnd(0.04,0.08),
}));
function drawNebulas(ox){
  const tW = W*4;
  for (const n of NEBULAS){
    const x = ((n.nx*tW - ox%tW) + tW*2) % tW;
    const y = n.ny * GROUND_Y, rw = n.rw*W, rh = n.rh*H;
    const g = ctx.createRadialGradient(x,y,0,x,y,rw);
    g.addColorStop(0, `hsla(${n.hue},70%,60%,${n.alpha*2})`);
    g.addColorStop(1,'transparent');
    ctx.save(); ctx.scale(1, rh/rw);
    ctx.beginPath(); ctx.arc(x, y*(rw/rh), rw, 0, 7);
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }
}

/* — Горы (параллакс-силуэты) — */
function genMountains(count, maxH, minH, seed){
  const pts = []; let rng = seed;
  const next = () => (rng = (rng*1664525+1013904223)&0xffffffff, (rng>>>0)/0xffffffff);
  for (let i=0; i<=count*2; i++) pts.push({ t:i/(count*2), h:minH+next()*(maxH-minH) });
  return pts;
}
const MTN = {
  far:  genMountains(8, 0.18, 0.08, 42),
  mid:  genMountains(6, 0.24, 0.10, 77),
  near: genMountains(5, 0.18, 0.06, 13),
};
function drawMtnLayer(pts, ox, parallax, color, tW){
  const off = (ox*parallax) % tW;
  let maxH = 0; for (const p of pts) if (p.h > maxH) maxH = p.h;
  const topY = GROUND_Y - maxH*H;
  for (let rep=-1; rep<=1; rep++){
    const sx = rep*tW - off;
    ctx.beginPath(); ctx.moveTo(sx, GROUND_Y);
    for (const p of pts) ctx.lineTo(sx + p.t*tW, GROUND_Y - p.h*H);
    ctx.lineTo(sx+tW, GROUND_Y); ctx.closePath();
    const mg = ctx.createLinearGradient(0, topY, 0, GROUND_Y);
    const shift = d => color.replace(/[\d.]+\)$/, m => Math.max(0,Math.min(1,parseFloat(m)+d))+')');
    mg.addColorStop(0, shift(0.12)); mg.addColorStop(0.5, color); mg.addColorStop(1, shift(-0.08));
    ctx.fillStyle = mg; ctx.fill();
  }
}

/* — Город: здания — */
// Детерминированный LCG-рандом по seed
function lcg(seed){ return ((seed*1664525+1013904223)&0xffffffff)>>>0; }
function lcgF(seed){ return lcg(seed)/0xffffffff; }

// Типы зданий: 0=офис(стекло), 1=жилой, 2=советский блок, 3=башня
const BLDG_TYPES = [0,1,2,3];

// Три слоя глубины
const CITY_LAYERS = [
  { count:14, parallax:0.10, hMul:0.55, wMin:40,  wMax:90,  gap:6,  alpha:0.55 }, // дальний
  { count:18, parallax:0.20, hMul:0.78, wMin:55,  wMax:130, gap:8,  alpha:0.80 }, // средний
  { count:22, parallax:0.38, hMul:1.00, wMin:50,  wMax:160, gap:10, alpha:1.00 }, // ближний
];

const CITY_BUILDINGS = CITY_LAYERS.map((layer, li) => {
  const arr = []; let x = 0, seed = 42 + li*7919;
  const tileW = innerWidth * 7;
  while (x < tileW){
    seed = lcg(seed);
    const w = layer.wMin + lcgF(seed)*(layer.wMax - layer.wMin);
    seed = lcg(seed);
    const hBase = (innerHeight * 0.12) + lcgF(seed) * innerHeight * 0.52 * layer.hMul;
    seed = lcg(seed);
    const type = BLDG_TYPES[Math.floor(lcgF(seed)*4)];
    seed = lcg(seed);
    const facadeHue = [220,260,200,240][type] + Math.floor(lcgF(seed)*30 - 15);

    // окна
    const wins = [];
    const wStep = type===0 ? 9 : type===1 ? 11 : 13;
    const hStep = type===0 ? 14 : 16;
    for (let wy = 8; wy < hBase - 10; wy += hStep){
      for (let wx = 6; wx < w - 10; wx += wStep){
        seed = lcg(seed);
        wins.push({ ox:wx, oy:wy, lit:lcgF(seed), ww: type===0?6:5, wh: type===0?9:7 });
      }
    }

    // балконы (только жилые и блоки)
    const balconies = [];
    if ((type===1||type===2) && w > 70){
      seed = lcg(seed);
      const bFloors = Math.floor(lcgF(seed)*3)+1;
      for (let bf=0; bf<bFloors; bf++){
        seed = lcg(seed);
        const by = hBase * (0.25 + lcgF(seed)*0.55);
        seed = lcg(seed);
        const bx = 8 + lcgF(seed)*(w-40);
        balconies.push({ ox:bx, oy:by, bw:Math.min(28, w-bx-6) });
      }
    }

    // крыша: тип
    seed = lcg(seed);
    const roofType = Math.floor(lcgF(seed)*4); // 0=плоская, 1=ступеньки, 2=башенка, 3=антенна+бак

    // неон-вывеска
    seed = lcg(seed);
    const hasSign = lcgF(seed) < 0.28 && w > 60;
    seed = lcg(seed);
    const signHue = Math.floor(lcgF(seed)*360);
    seed = lcg(seed);
    const signW = 20 + lcgF(seed)*(w*0.5);

    // водонапорный бак
    seed = lcg(seed);
    const hasTank = lcgF(seed) < 0.35 && hBase > 80 && w > 60;

    arr.push({ x, w, h:hBase, type, facadeHue, wins, balconies, roofType, hasSign, signHue, signW, hasTank });
    seed = lcg(seed);
    x += w + layer.gap + lcgF(seed)*layer.gap;
  }
  return { ...layer, buildings: arr, tileW };
});

function drawBuildingFacade(bx, top, b, alpha, t){
  const h = b.h, w = b.w;
  ctx.save();
  ctx.globalAlpha = alpha;

  // — Корпус —
  const face = ctx.createLinearGradient(bx, top, bx+w, top+h);
  if (b.type === 0){ // стеклянный офис
    face.addColorStop(0, `hsl(${b.facadeHue},28%,11%)`);
    face.addColorStop(0.5,`hsl(${b.facadeHue},22%,8%)`);
    face.addColorStop(1, `hsl(${b.facadeHue},18%,6%)`);
  } else if (b.type === 1){ // жилой
    face.addColorStop(0, `hsl(${b.facadeHue},16%,13%)`);
    face.addColorStop(1, `hsl(${b.facadeHue},12%,8%)`);
  } else if (b.type === 2){ // блок
    face.addColorStop(0, `hsl(${b.facadeHue},10%,15%)`);
    face.addColorStop(1, `hsl(${b.facadeHue},8%,9%)`);
  } else { // башня
    face.addColorStop(0, `hsl(${b.facadeHue},30%,10%)`);
    face.addColorStop(1, `hsl(${b.facadeHue},25%,5%)`);
  }
  ctx.fillStyle = face;
  ctx.fillRect(bx, top, w, h);

  // — Горизонтальные плиты (офис и блок) —
  if (b.type === 0 || b.type === 2){
    ctx.strokeStyle = `hsla(${b.facadeHue},40%,40%,.09)`;
    ctx.lineWidth = 1;
    const floorH = b.type===0 ? 14 : 16;
    for (let fy = top+floorH; fy < top+h; fy += floorH){
      ctx.beginPath(); ctx.moveTo(bx, fy); ctx.lineTo(bx+w, fy); ctx.stroke();
    }
  }

  // — Вертикальные колонны (офис и башня) —
  if (b.type === 0 || b.type === 3){
    ctx.strokeStyle = `hsla(${b.facadeHue},50%,60%,.07)`;
    ctx.lineWidth = 1;
    const cols = Math.floor(w/18);
    for (let ci=1; ci<cols; ci++){
      ctx.beginPath(); ctx.moveTo(bx+ci*(w/cols), top); ctx.lineTo(bx+ci*(w/cols), top+h); ctx.stroke();
    }
  }

  // — Боковая тень (объём) —
  const side = ctx.createLinearGradient(bx, 0, bx+w, 0);
  side.addColorStop(0,'rgba(0,0,0,.32)'); side.addColorStop(0.08,'transparent'); side.addColorStop(0.92,'transparent'); side.addColorStop(1,'rgba(0,0,0,.22)');
  ctx.fillStyle = side; ctx.fillRect(bx, top, w, h);

  // — Окна —
  for (let wi=0; wi<b.wins.length; wi++){
    const win = b.wins[wi];
    const wx = bx+win.ox, wy = top+win.oy;
    if (win.lit > 0.52){
      const flicker = 0.6 + 0.4*(0.7 + 0.3*Math.sin(t + wi*0.9 + b.facadeHue));
      let wCol;
      if (win.lit > 0.82)      wCol = `rgba(255,235,140,${(flicker*0.9).toFixed(2)})`;
      else if (win.lit > 0.68) wCol = `rgba(200,220,255,${(flicker*0.8).toFixed(2)})`;
      else                     wCol = `rgba(255,200,100,${(flicker*0.7).toFixed(2)})`;
      ctx.fillStyle = wCol;
      ctx.fillRect(wx, wy, win.ww, win.wh);
      // оконная рама
      ctx.strokeStyle = `rgba(255,255,255,.06)`;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(wx, wy, win.ww, win.wh);
    } else if (win.lit > 0.35){
      // тёмное окно с отблеском
      ctx.fillStyle = `hsla(${b.facadeHue},40%,20%,.18)`;
      ctx.fillRect(wx, wy, win.ww, win.wh);
      ctx.fillStyle = 'rgba(120,160,255,.06)';
      ctx.fillRect(wx, wy, win.ww, win.wh*0.4);
    }
  }

  // — Балконы —
  for (const bal of b.balconies){
    const bbalX = bx+bal.ox, bbalY = top+h-bal.oy;
    ctx.fillStyle = `hsla(${b.facadeHue},15%,18%,.9)`;
    ctx.fillRect(bbalX-2, bbalY, bal.bw+4, 3);
    ctx.fillStyle = `hsla(${b.facadeHue},15%,22%,.7)`;
    ctx.fillRect(bbalX, bbalY, bal.bw, 6);
    // перила
    ctx.strokeStyle = `hsla(${b.facadeHue},30%,50%,.25)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(bbalX, bbalY); ctx.lineTo(bbalX+bal.bw, bbalY); ctx.stroke();
    for (let ri=0; ri<bal.bw; ri+=5){
      ctx.beginPath(); ctx.moveTo(bbalX+ri, bbalY); ctx.lineTo(bbalX+ri, bbalY+6); ctx.stroke();
    }
  }

  // — Крыша —
  ctx.fillStyle = `hsla(${b.facadeHue},20%,16%,1)`;
  if (b.roofType === 1){ // ступеньки
    ctx.fillRect(bx+w*0.1, top-4, w*0.8, 5);
    ctx.fillRect(bx+w*0.2, top-8, w*0.6, 5);
  } else if (b.roofType === 2){ // башенка
    ctx.fillRect(bx+w*0.3, top-10, w*0.4, 11);
    ctx.fillRect(bx+w*0.35, top-14, w*0.3, 5);
  } else { // плоская с бортиком
    ctx.fillStyle = `hsla(${b.facadeHue},15%,18%,.9)`;
    ctx.fillRect(bx, top-3, w, 4);
    ctx.fillStyle = `hsla(${b.facadeHue},20%,22%,.5)`;
    ctx.fillRect(bx, top-3, w, 1);
  }

  // — Водонапорный бак —
  if (b.hasTank){
    const tx = bx+w*0.6, ty = top-14;
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(tx-5, ty, 11, 10);
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(tx-6, ty+9, 13, 2);
    // ноги
    ctx.strokeStyle = 'rgba(100,70,50,.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(tx-5,ty+11); ctx.lineTo(tx-3,top-3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx+5,ty+11); ctx.lineTo(tx+3,top-3); ctx.stroke();
  }

  // — Неон-вывеска —
  if (b.hasSign && h > 50){
    const sa = (0.55 + 0.45*Math.sin(t*2.2 + b.facadeHue)).toFixed(2);
    const sy = top + h*0.22;
    ctx.save();
    ctx.shadowColor = `hsl(${b.signHue},100%,60%)`; ctx.shadowBlur = 10;
    ctx.fillStyle = `hsla(${b.signHue},100%,65%,${sa})`;
    ctx.fillRect(bx + (w-b.signW)*0.5, sy, b.signW, 3);
    // вторая строка
    ctx.fillStyle = `hsla(${b.signHue+40},100%,65%,${(sa*0.7).toFixed(2)})`;
    ctx.fillRect(bx + (w-b.signW*0.6)*0.5, sy+6, b.signW*0.6, 2);
    ctx.restore();
  }

  // — Антенна (высокие здания) —
  if (h > 100){
    const ax = bx+w*0.5;
    ctx.strokeStyle = 'rgba(160,130,200,.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(ax, top-3); ctx.lineTo(ax, top-h*0.14); ctx.stroke();
    const blink = Math.sin(t*3.2 + b.facadeHue*0.1) > 0 ? 0.95 : 0.12;
    ctx.beginPath(); ctx.arc(ax, top-h*0.14, 1.8, 0, 7);
    ctx.fillStyle = `rgba(255,70,70,${blink.toFixed(2)})`;
    ctx.shadowColor = '#ff4040'; ctx.shadowBlur = 5; ctx.fill(); ctx.shadowBlur = 0;
  }

  // — Отражение в мокром асфальте —
  if (alpha > 0.75){
    ctx.save();
    ctx.globalAlpha = alpha * 0.08;
    ctx.scale(1, -1);
    ctx.translate(0, -(GROUND_Y*2));
    const rfH = Math.min(h*0.35, 40);
    const rfg = ctx.createLinearGradient(0, -top-h, 0, -top-h+rfH);
    rfg.addColorStop(0, `hsla(${b.facadeHue},40%,30%,.0)`);
    rfg.addColorStop(1, `hsla(${b.facadeHue},40%,30%,.5)`);
    ctx.fillStyle = rfg;
    ctx.fillRect(bx+2, top+h, w-4, rfH);
    ctx.restore();
  }

  ctx.restore();
}

function drawBuildings(ox){
  const t = Date.now()/1200;
  // дальний → средний → ближний
  for (const layer of CITY_BUILDINGS){
    const tileOff = (ox * layer.parallax) % layer.tileW;
    for (const b of layer.buildings){
      let base = (((b.x - tileOff) % layer.tileW) + layer.tileW) % layer.tileW;
      for (let rep=0; rep<2; rep++){
        const bx = base + rep*layer.tileW - layer.tileW;
        if (bx > W+200 || bx+b.w < -200) continue;
        const top = GROUND_Y - b.h;
        drawBuildingFacade(bx, top, b, layer.alpha, t);
      }
    }
  }
}

/* — Дерево (переиспользуемая функция) — */
function drawTree(x, baseY, trH, crR, lit){
  ctx.save();
  const tk = ctx.createLinearGradient(x, baseY-trH, x, baseY);
  tk.addColorStop(0,'#1a3010'); tk.addColorStop(1,'#0d1a08');
  ctx.fillStyle = tk;
  ctx.beginPath();
  ctx.moveTo(x-crR*0.08, baseY); ctx.lineTo(x-crR*0.14, baseY-trH);
  ctx.lineTo(x+crR*0.14, baseY-trH); ctx.lineTo(x+crR*0.08, baseY);
  ctx.closePath(); ctx.fill();
  const blobs = [[0,-0.55,1],[-0.55,-0.15,0.75],[0.55,-0.15,0.75],[0,0.1,0.6]];
  const ty = baseY-trH;
  for (const [dx,dy,rs] of blobs){
    const bx = x+crR*dx, by = ty+crR*dy, r = crR*rs;
    const cg = ctx.createRadialGradient(bx,by,0,bx,by,r);
    cg.addColorStop(0,'#1a6b38'); cg.addColorStop(0.5,'#0e4a22'); cg.addColorStop(1,'#052e16');
    ctx.beginPath(); ctx.arc(bx,by,r,0,7); ctx.fillStyle=cg; ctx.fill();
  }
  if (lit){
    ctx.globalAlpha = 0.18;
    const hl = ctx.createRadialGradient(x-crR*0.4,ty-crR*0.3,0,x,ty,crR*1.1);
    hl.addColorStop(0,'rgba(180,220,200,.7)'); hl.addColorStop(1,'transparent');
    ctx.beginPath(); ctx.arc(x,ty,crR*1.05,0,7); ctx.fillStyle=hl; ctx.fill();
  }
  ctx.restore();
}

/* — Светящийся диск (солнце / луна / планета) — */
function drawGlowDisc(x, y, r, core, glowR, glowCol){
  if (glowCol){
    const g = ctx.createRadialGradient(x,y,0,x,y,glowR);
    g.addColorStop(0, glowCol); g.addColorStop(0.5, glowCol); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,glowR,0,7); ctx.fill();
  }
  if (core){
    ctx.save(); ctx.shadowColor=core; ctx.shadowBlur=r*0.9;
    ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fillStyle=core; ctx.fill(); ctx.restore();
  }
}

/* — Дрейфующие частицы (снег / пепел / искры) — */
function drawDrift(count, ox, color, opts){
  const { speed=15, fall=22, glow=0, size=1, yMax=GROUND_Y } = opts || {};
  const t = Date.now()/1000;
  for (let i=0; i<count; i++){
    const x = ((i*197+300 - ox*0.15 - t*speed) % (W+20) + W+20) % (W+20);
    const y = (i*73 + t*fall) % yMax;
    const a = (0.3 + 0.4*Math.sin(t+i)).toFixed(2);
    ctx.beginPath(); ctx.arc(x, y, size + i%2*0.5, 0, 7);
    ctx.fillStyle = color.replace('A', a);
    if (glow){ ctx.shadowColor=color.replace('A','1'); ctx.shadowBlur=glow; }
    ctx.fill();
    if (glow) ctx.shadowBlur=0;
  }
}

/* — Sparkles (блики на воде / снегу) — */
function drawSparkles(count, ox, baseY, ampY, color, glowCol){
  const t = Date.now()/800;
  for (let i=0; i<count; i++){
    const x = ((i*211 - ox*1.1) % (W+60) + W+60) % (W+60);
    const y = baseY + Math.sin(t*1.2+i)*ampY;
    const a = 0.2 + 0.8*Math.abs(Math.sin(t*2.2+i*0.85));
    ctx.beginPath(); ctx.arc(x,y, 1.2+a*1.2, 0, 7);
    ctx.fillStyle = color.replace('A', a.toFixed(2));
    ctx.shadowColor=glowCol; ctx.shadowBlur=8+a*6; ctx.fill(); ctx.shadowBlur=0;
  }
}

/* ── частицы вулкана (живут между кадрами) ── */
let VOLCANO_EMBERS = [];
function initEmbers(){
  VOLCANO_EMBERS = Array.from({length:22}, () => ({
    x:Math.random()*W*2, y:GROUND_Y-Math.random()*H*0.5,
    vx:rnd(-0.5,0.5), vy:rnd(-1,-0.3), r:rnd(0.8,3.3), life:Math.random(),
  }));
}

/* ═══════════════════════════════════════
   5. РЕНДЕР НЕБА И ДЕКОРАЦИЙ ПО ЛОКАЦИЯМ
═══════════════════════════════════════ */
function drawSky(th){
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0, th.sky[0]); sky.addColorStop(0.35, th.sky[1]);
  sky.addColorStop(0.72, th.sky[2]); sky.addColorStop(1, th.sky[3]);
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

  if (th.horizon){
    const hg = ctx.createLinearGradient(0, GROUND_Y*0.55, 0, GROUND_Y);
    hg.addColorStop(0,'transparent'); hg.addColorStop(0.6, th.horizon); hg.addColorStop(1,'transparent');
    ctx.fillStyle=hg; ctx.fillRect(0,0,W,H);
  }
  if (th.sun) drawGlowDisc(W*0.78, GROUND_Y*0.28, 0, null, W*0.18, th.sun);
}

/* Декорации каждой локации (mid-слой) */
const DECOR = {
  city(ox){
    drawNebulas(ox*0.05);
    drawStars(ox*0.06);
  },

  forest(ox){
    const t = Date.now()/1000;

    // Луна
    drawGlowDisc(W*0.15, GROUND_Y*0.12, W*0.022, '#ddeeff', W*0.12, 'rgba(200,220,255,.16)');

    // Горы вдалеке за лесом
    const mTileW = W*5;
    const mOff = (ox*0.06) % mTileW;
    for (let rep=-1; rep<=1; rep++){
      const sx = rep*mTileW - mOff;
      ctx.beginPath(); ctx.moveTo(sx, GROUND_Y);
      for (const p of MTN.far) ctx.lineTo(sx + p.t*mTileW, GROUND_Y - p.h*H*0.55);
      ctx.lineTo(sx+mTileW, GROUND_Y); ctx.closePath();
      const mg = ctx.createLinearGradient(0, GROUND_Y-H*0.12, 0, GROUND_Y);
      mg.addColorStop(0,'rgba(8,22,10,.82)'); mg.addColorStop(1,'rgba(5,14,7,.55)');
      ctx.fillStyle=mg; ctx.fill();
    }
    const m2TileW = W*4;
    const m2Off = (ox*0.09) % m2TileW;
    for (let rep=-1; rep<=1; rep++){
      const sx = rep*m2TileW - m2Off;
      ctx.beginPath(); ctx.moveTo(sx, GROUND_Y);
      for (const p of MTN.mid) ctx.lineTo(sx + p.t*m2TileW, GROUND_Y - p.h*H*0.45);
      ctx.lineTo(sx+m2TileW, GROUND_Y); ctx.closePath();
      const mg2 = ctx.createLinearGradient(0, GROUND_Y-H*0.10, 0, GROUND_Y);
      mg2.addColorStop(0,'rgba(6,20,8,.92)'); mg2.addColorStop(1,'rgba(4,12,5,.65)');
      ctx.fillStyle=mg2; ctx.fill();
    }

    // Слой 1: очень дальние силуэты-ели (parallax 0.07)
    const tW0 = W*5, off0 = (ox*0.07) % tW0;
    for (let rep=-1; rep<=1; rep++){
      const sx = rep*tW0 - off0;
      for (let i=0; i<18; i++){
        let s0 = lcg(i*311+1); const nx = lcgF(s0);
        s0 = lcg(s0); const sc = 0.22 + lcgF(s0)*0.18;
        const tx = sx + nx*tW0;
        if (tx < -40 || tx > W+40) continue;
        const trH = H*0.09*sc, trR = W*0.032*sc;
        ctx.fillStyle='#021205';
        ctx.fillRect(tx-trR*0.08, GROUND_Y-trH, trR*0.16, trH);
        ctx.beginPath();
        ctx.moveTo(tx, GROUND_Y-trH-trR*0.9);
        ctx.lineTo(tx+trR*0.55, GROUND_Y-trH+trR*0.3);
        ctx.lineTo(tx+trR*0.35, GROUND_Y-trH+trR*0.3);
        ctx.lineTo(tx+trR*0.65, GROUND_Y-trH+trR*0.85);
        ctx.lineTo(tx-trR*0.65, GROUND_Y-trH+trR*0.85);
        ctx.lineTo(tx-trR*0.35, GROUND_Y-trH+trR*0.3);
        ctx.lineTo(tx-trR*0.55, GROUND_Y-trH+trR*0.3);
        ctx.closePath();
        ctx.fillStyle='rgba(3,16,7,.9)'; ctx.fill();
      }
    }

    // Слой 2: дальние ели с ярусами (parallax 0.13)
    const tW1 = W*5, off1 = (ox*0.13) % tW1;
    for (let rep=-1; rep<=1; rep++){
      const sx = rep*tW1 - off1;
      for (let i=0; i<22; i++){
        let s1 = lcg(i*479+3); const nx = lcgF(s1);
        s1 = lcg(s1); const sc = 0.28 + lcgF(s1)*0.22;
        const tx = sx + nx*tW1;
        if (tx < -60 || tx > W+60) continue;
        const trH = H*0.13*sc, trR = W*0.042*sc;
        ctx.fillStyle='#031508';
        ctx.fillRect(tx-trR*0.10, GROUND_Y-trH, trR*0.20, trH);
        for (let tier=0; tier<3; tier++){
          const ty0 = GROUND_Y-trH + (trH*0.55)*tier/2.5;
          const tw  = trR*(0.9 - tier*0.22);
          const th2 = trH*0.55 - tier*trH*0.08;
          ctx.beginPath();
          ctx.moveTo(tx, ty0 - th2*0.9);
          ctx.lineTo(tx+tw, ty0+th2*0.1);
          ctx.lineTo(tx-tw, ty0+th2*0.1);
          ctx.closePath();
          const cg = ctx.createLinearGradient(tx-tw, ty0, tx+tw, ty0);
          cg.addColorStop(0,`rgba(4,${18+tier*4},8,.88)`);
          cg.addColorStop(1,`rgba(3,${14+tier*3},6,.88)`);
          ctx.fillStyle=cg; ctx.fill();
        }
      }
    }

    // Слой 3: средние деревья (parallax 0.22)
    const tW2 = W*5, off2 = (ox*0.22) % tW2;
    for (let rep=-1; rep<=1; rep++){
      const sx = rep*tW2 - off2;
      for (let i=0; i<20; i++){
        let s2 = lcg(i*613+7); const nx = lcgF(s2);
        s2 = lcg(s2); const sc = 0.45 + lcgF(s2)*0.45;
        const tx = sx + nx*tW2;
        if (tx < -120 || tx > W+120) continue;
        drawTree(tx, GROUND_Y, H*0.20*sc, W*0.072*sc, false);
      }
    }

    // Туман у земли
    for (let f=0; f<4; f++){
      const fog = ctx.createLinearGradient(0, GROUND_Y-H*(0.03+f*0.035), 0, GROUND_Y+10);
      fog.addColorStop(0,'transparent');
      fog.addColorStop(1,`rgba(18,55,28,${0.07+f*0.025})`);
      ctx.fillStyle=fog; ctx.fillRect(0,0,W,H);
    }

    // Слой 4: ближние крупные деревья (parallax 0.40)
    const tW3 = W*5, off3 = (ox*0.40) % tW3;
    for (let rep=-1; rep<=1; rep++){
      const sx = rep*tW3 - off3;
      for (let i=0; i<14; i++){
        let s3 = lcg(i*797+11); const nx = lcgF(s3);
        s3 = lcg(s3); const sc = 0.70 + lcgF(s3)*0.55;
        const tx = sx + nx*tW3;
        if (tx < -160 || tx > W+160) continue;
        drawTree(tx, GROUND_Y, H*0.26*sc, W*0.095*sc, true);
      }
    }

    // Светлячки
    for (let i=0;i<14;i++){
      const x=((i*137-ox*0.9)%(W*2)+W*2)%(W*2);
      const y=GROUND_Y-H*0.04-Math.abs(Math.sin(t*0.6+i*1.3))*H*0.14;
      const a=0.3+0.7*Math.abs(Math.sin(t*1.8+i*0.8)), r=1.5+Math.sin(t+i)*0.5;
      ctx.beginPath(); ctx.arc(x,y,r,0,7);
      ctx.fillStyle=`rgba(186,255,200,${a.toFixed(2)})`;
      ctx.shadowColor='#a0ffb0'; ctx.shadowBlur=10+r*3; ctx.fill(); ctx.shadowBlur=0;
    }
  },

  ocean(ox){
    const t = Date.now()/1000;

    // Луна
    drawGlowDisc(W*0.72, GROUND_Y*0.13, W*0.025, '#e8f4ff', W*0.13, 'rgba(180,220,255,.14)');

    // Лунная дорожка на воде
    ctx.save();
    ctx.globalAlpha = 0.09 + 0.03*Math.sin(t*0.4);
    const mp = ctx.createLinearGradient(W*0.38, GROUND_Y-H*0.32, W*0.62, GROUND_Y);
    mp.addColorStop(0,'transparent');
    mp.addColorStop(0.4,'rgba(180,225,255,.6)');
    mp.addColorStop(1,'transparent');
    ctx.fillStyle = mp;
    ctx.beginPath();
    ctx.moveTo(W*0.4, GROUND_Y); ctx.lineTo(W*0.6, GROUND_Y);
    ctx.lineTo(W*0.67, GROUND_Y-H*0.32); ctx.lineTo(W*0.77, GROUND_Y-H*0.32);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Далёкий горизонт
    ctx.save();
    const hg = ctx.createLinearGradient(0, GROUND_Y-H*0.28, 0, GROUND_Y-H*0.22);
    hg.addColorStop(0,'transparent');
    hg.addColorStop(0.5,'rgba(100,180,240,.10)');
    hg.addColorStop(1,'transparent');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Скалы вдалеке (parallax 0.05)
    const ROCKS = [
      {nx:0.08,hw:0.028,hh:0.055},{nx:0.21,hw:0.018,hh:0.038},
      {nx:0.44,hw:0.035,hh:0.072},{nx:0.60,hw:0.022,hh:0.044},
      {nx:0.78,hw:0.030,hh:0.060},{nx:0.91,hw:0.016,hh:0.032},
    ];
    const rockTile = W*6, rockOff = (ox*0.05) % rockTile;
    for (let rep=-1; rep<=1; rep++){
      const sx = rep*rockTile - rockOff;
      for (const r of ROCKS){
        const rx = sx + r.nx*rockTile, rw = r.hw*W, rh = r.hh*H;
        const ry = GROUND_Y - rh;
        if (rx+rw < -10 || rx-rw > W+10) continue;
        ctx.save();
        const rg = ctx.createLinearGradient(rx-rw, ry, rx+rw, GROUND_Y);
        rg.addColorStop(0,'rgba(8,20,40,.70)');
        rg.addColorStop(1,'rgba(5,14,28,.85)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(rx-rw, GROUND_Y);
        ctx.lineTo(rx-rw*0.6, ry+rh*0.3);
        ctx.lineTo(rx-rw*0.1, ry);
        ctx.lineTo(rx+rw*0.2, ry+rh*0.1);
        ctx.lineTo(rx+rw*0.7, ry+rh*0.2);
        ctx.lineTo(rx+rw, GROUND_Y);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = 'rgba(120,180,255,.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rx-rw*0.1, ry); ctx.lineTo(rx+rw*0.2, ry+rh*0.1); ctx.stroke();
        ctx.restore();
      }
    }

    // Корабль вдали (parallax 0.03)
    const shipTile = W*8, shipOff = (ox*0.03) % shipTile;
    for (let rep=-1; rep<=1; rep++){
      const shx = rep*shipTile - shipOff + 0.35*shipTile;
      if (shx < -60 || shx > W+60) continue;
      ctx.save(); ctx.globalAlpha = 0.30;
      const shy = GROUND_Y - H*0.055;
      ctx.fillStyle = '#04112a';
      ctx.beginPath();
      ctx.moveTo(shx-22, shy+H*0.022);
      ctx.lineTo(shx-18, shy);
      ctx.lineTo(shx+18, shy);
      ctx.lineTo(shx+24, shy+H*0.022);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(shx-6, shy-H*0.028, 14, H*0.028);
      ctx.fillRect(shx-2, shy-H*0.048, 5, H*0.022);
      ctx.strokeStyle = '#04112a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(shx+4, shy-H*0.048); ctx.lineTo(shx+4, shy-H*0.075); ctx.stroke();
      const blink = 0.4 + 0.6*Math.abs(Math.sin(t*1.2));
      ctx.beginPath(); ctx.arc(shx+4, shy-H*0.076, 1.5, 0, 7);
      ctx.fillStyle = `rgba(255,220,80,${blink.toFixed(2)})`;
      ctx.shadowColor = '#ffdd50'; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Волны — медленные, только по времени, ox не влияет на скорость
    for (let wl=0; wl<6; wl++){
      const phase = t * (0.18 + wl*0.04);
      const amp   = H * (0.006 + wl*0.003);
      const yBase = GROUND_Y - H*0.005 - wl*H*0.003;
      const freq  = 0.018 - wl*0.001;
      ctx.save();
      ctx.globalAlpha = 0.07 + wl*0.012;
      ctx.strokeStyle = wl < 3 ? '#bae6fd' : '#93c5fd';
      ctx.lineWidth   = Math.max(0.5, 1.8 - wl*0.2);
      ctx.beginPath();
      for (let x=0; x<=W; x+=4){
        const y = yBase
          + Math.sin(x*freq + phase)*amp
          + Math.sin(x*freq*1.6 + phase*1.3)*amp*0.35
          + Math.sin(x*freq*0.7 + phase*0.8)*amp*0.2;
        x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.stroke(); ctx.restore();
    }

    // Пена у берега
    ctx.save();
    const foamA = 0.06 + 0.04*Math.sin(t*0.9);
    const foam = ctx.createLinearGradient(0, GROUND_Y-4, 0, GROUND_Y+4);
    foam.addColorStop(0,'transparent');
    foam.addColorStop(0.5,`rgba(210,235,255,${foamA.toFixed(2)})`);
    foam.addColorStop(1,'transparent');
    ctx.fillStyle = foam; ctx.fillRect(0, GROUND_Y-4, W, 8);
    ctx.restore();

    // Блики на воде (медленный ox)
    drawSparkles(10, ox*0.12, GROUND_Y-H*0.018, H*0.010, 'rgba(186,230,253,A)', '#7dd3fc');

    // Морской туман у горизонта
    ctx.save();
    const mf = ctx.createLinearGradient(0, GROUND_Y-H*0.35, 0, GROUND_Y-H*0.18);
    mf.addColorStop(0,'transparent');
    mf.addColorStop(1,'rgba(10,30,60,.13)');
    ctx.fillStyle = mf; ctx.fillRect(0,0,W,H);
    ctx.restore();

    // Чайки (parallax 0.06)
    const gullTile = W*5, gullOff = (ox*0.06) % gullTile;
    for (let gi=0; gi<2; gi++){
      const gx = ((gi*0.55 + 0.15)*gullTile - gullOff + gullTile*2) % gullTile;
      if (gx > W+20) continue;
      const gy = H*(0.18 + gi*0.07) + Math.sin(t*0.55+gi*2)*H*0.025;
      const ws = W*0.018, wing = Math.sin(t*2.2+gi)*0.3;
      ctx.save(); ctx.strokeStyle = 'rgba(180,210,240,.50)'; ctx.lineWidth=1.2; ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(gx-ws, gy - wing*ws*0.5);
      ctx.quadraticCurveTo(gx, gy, gx+ws, gy - wing*ws*0.5);
      ctx.stroke(); ctx.restore();
    }
  },

  mountains(ox){
    const t=Date.now()/1000;
    // Аврора
    ctx.save(); ctx.globalAlpha=0.13;
    for (let au=0; au<3; au++){
      const y0=H*(0.08+au*0.05)+Math.sin(t*0.4+au)*H*0.03;
      const g=ctx.createLinearGradient(0,y0-H*0.04,0,y0+H*0.04);
      g.addColorStop(0,'transparent');
      g.addColorStop(0.4, au===1?'rgba(100,255,160,.6)':'rgba(140,100,255,.5)');
      g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(0,y0);
      for (let x=0;x<=W;x+=12){
        const y=y0+Math.sin((x-(ox*0.03)*30)/80+t*0.6+au*2)*H*0.025;
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.lineTo(W,y0+H*0.04); ctx.lineTo(0,y0+H*0.04); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // Снежные шапки
    const off=(ox*0.45)%(W*3);
    for (let rep=-1; rep<=1; rep++){
      const sx=rep*W*3-off;
      ctx.save(); ctx.beginPath(); ctx.moveTo(sx,GROUND_Y);
      for (const p of MTN.near) ctx.lineTo(sx+p.t*W*3, GROUND_Y-p.h*H);
      ctx.lineTo(sx+W*3,GROUND_Y); ctx.closePath();
      const sg=ctx.createLinearGradient(0,GROUND_Y-H*0.18,0,GROUND_Y-H*0.04);
      sg.addColorStop(0,'rgba(240,245,255,.75)'); sg.addColorStop(0.6,'rgba(210,225,255,.45)'); sg.addColorStop(1,'rgba(180,195,240,.08)');
      ctx.fillStyle=sg; ctx.globalAlpha=0.7; ctx.fill(); ctx.restore();
    }
    // Снег
    drawDrift(20, ox, 'rgba(220,230,255,A)', { speed:18, fall:22, size:0.8 });
    // Орлы
    for (let en=0; en<2; en++){
      const ex=((200+en*400-ox*0.07)%(W*3)+W*3)%(W*3);
      if (ex>W+30) continue;
      const ey=H*(0.14+en*0.09)+Math.sin(t*0.5+en*2)*H*0.04;
      const wing=Math.sin(t*2.5+en)*0.25, ws=W*(0.022+en*0.008);
      ctx.save(); ctx.strokeStyle='rgba(180,190,230,.45)'; ctx.lineWidth=1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(ex-ws,ey-wing*ws*0.5);
      ctx.quadraticCurveTo(ex,ey,ex+ws,ey-wing*ws*0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex,ey,ws*0.12,0,7); ctx.fillStyle='rgba(160,175,210,.4)'; ctx.fill();
      ctx.restore();
    }
  },

  volcano(ox){
    const t = Date.now()/1000;

    // Зарево — пульсирует
    const lga = 0.10 + 0.04*Math.sin(t*0.8);
    const lg = ctx.createLinearGradient(0, GROUND_Y-H*0.55, 0, GROUND_Y);
    lg.addColorStop(0,'transparent');
    lg.addColorStop(0.5,`rgba(200,50,5,${lga.toFixed(2)})`);
    lg.addColorStop(1,`rgba(234,88,12,${(lga*2.2).toFixed(2)})`);
    ctx.fillStyle=lg; ctx.fillRect(0,0,W,H);

    // Вулканы (3 конуса, parallax 0.07/0.12/0.18)
    const VOLCS = [
      {nx:0.18, tw:W*6, par:0.07, hw:0.13, hh:0.42, craterW:0.018},
      {nx:0.55, tw:W*5, par:0.12, hw:0.09, hh:0.32, craterW:0.013},
      {nx:0.80, tw:W*6, par:0.18, hw:0.07, hh:0.24, craterW:0.010},
    ];
    for (let vi=0; vi<VOLCS.length; vi++){
      const v = VOLCS[vi];
      const tileOff = (ox*v.par) % v.tw;
      for (let rep=-1; rep<=1; rep++){
        const vx = rep*v.tw - tileOff + v.nx*v.tw;
        if (vx < -W*0.3 || vx > W*1.3) continue;
        const vhw = v.hw*W, vhh = v.hh*H;
        const vTop = GROUND_Y - vhh;
        // тело конуса
        ctx.beginPath();
        ctx.moveTo(vx - vhw, GROUND_Y);
        ctx.lineTo(vx - v.craterW*W, vTop);
        ctx.lineTo(vx + v.craterW*W, vTop);
        ctx.lineTo(vx + vhw, GROUND_Y);
        ctx.closePath();
        const vg = ctx.createLinearGradient(vx-vhw, vTop, vx+vhw, GROUND_Y);
        vg.addColorStop(0,`rgba(${28+vi*6},${8+vi*2},${2+vi},0.95)`);
        vg.addColorStop(0.45,`rgba(${40+vi*8},${12+vi*3},3,0.95)`);
        vg.addColorStop(1,`rgba(${20+vi*4},6,1,0.95)`);
        ctx.fillStyle=vg; ctx.fill();
        // боковая тень
        ctx.save();
        const sh = ctx.createLinearGradient(vx-vhw, 0, vx+vhw, 0);
        sh.addColorStop(0,'rgba(0,0,0,.35)'); sh.addColorStop(0.15,'transparent');
        sh.addColorStop(0.85,'transparent'); sh.addColorStop(1,'rgba(0,0,0,.25)');
        ctx.fillStyle=sh;
        ctx.beginPath();
        ctx.moveTo(vx-vhw,GROUND_Y); ctx.lineTo(vx-v.craterW*W,vTop);
        ctx.lineTo(vx+v.craterW*W,vTop); ctx.lineTo(vx+vhw,GROUND_Y);
        ctx.closePath(); ctx.fill(); ctx.restore();
        // кратер — светящийся
        const ca = 0.5 + 0.4*Math.sin(t*1.5+vi);
        ctx.save();
        ctx.shadowColor=`rgba(255,100,10,${ca.toFixed(2)})`; ctx.shadowBlur=18;
        const cg = ctx.createRadialGradient(vx,vTop,0,vx,vTop,v.craterW*W*2.5);
        cg.addColorStop(0,`rgba(255,180,20,${ca.toFixed(2)})`);
        cg.addColorStop(0.5,`rgba(255,80,5,${(ca*0.6).toFixed(2)})`);
        cg.addColorStop(1,'transparent');
        ctx.beginPath(); ctx.arc(vx,vTop,v.craterW*W*2.5,0,7);
        ctx.fillStyle=cg; ctx.fill(); ctx.restore();
        // лавовый поток по склону
        const flowA = 0.25 + 0.2*Math.sin(t*0.7+vi*1.3);
        ctx.save(); ctx.globalAlpha = flowA;
        const flg = ctx.createLinearGradient(vx, vTop, vx+vhw*0.35, GROUND_Y);
        flg.addColorStop(0,'rgba(255,160,10,.9)');
        flg.addColorStop(0.5,'rgba(220,60,5,.6)');
        flg.addColorStop(1,'rgba(140,20,2,.0)');
        ctx.strokeStyle = flg; ctx.lineWidth = Math.max(2, vhw*0.04);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(vx + v.craterW*W*0.5, vTop+4);
        ctx.quadraticCurveTo(vx+vhw*0.22, vTop+vhh*0.45, vx+vhw*0.38, GROUND_Y-4);
        ctx.stroke(); ctx.restore();
      }
    }

    // Скалы на переднем плане (parallax 0.30)
    const VROCKS = [
      {nx:0.06,hw:0.055,hh:0.14},{nx:0.19,hw:0.038,hh:0.09},
      {nx:0.33,hw:0.065,hh:0.18},{nx:0.50,hw:0.030,hh:0.08},
      {nx:0.64,hw:0.050,hh:0.13},{nx:0.77,hw:0.042,hh:0.11},
      {nx:0.90,hw:0.028,hh:0.07},
    ];
    const vrTile = W*5, vrOff = (ox*0.30) % vrTile;
    for (let rep=-1; rep<=1; rep++){
      const sx = rep*vrTile - vrOff;
      for (const r of VROCKS){
        const rx = sx + r.nx*vrTile, rw = r.hw*W, rh = r.hh*H;
        if (rx+rw < -10 || rx-rw > W+10) continue;
        const ry = GROUND_Y - rh;
        ctx.beginPath();
        ctx.moveTo(rx-rw, GROUND_Y);
        ctx.lineTo(rx-rw*0.7, ry+rh*0.35);
        ctx.lineTo(rx-rw*0.15, ry);
        ctx.lineTo(rx+rw*0.25, ry+rh*0.12);
        ctx.lineTo(rx+rw*0.6, ry+rh*0.28);
        ctx.lineTo(rx+rw, GROUND_Y);
        ctx.closePath();
        const rg = ctx.createLinearGradient(rx-rw, ry, rx+rw, GROUND_Y);
        rg.addColorStop(0,'rgba(55,18,5,.97)');
        rg.addColorStop(0.5,'rgba(38,12,3,.97)');
        rg.addColorStop(1,'rgba(22,7,1,.97)');
        ctx.fillStyle=rg; ctx.fill();
        // раскалённый край — лавовое свечение снизу
        const ea = 0.18 + 0.12*Math.sin(t*1.8+r.nx*10);
        ctx.save();
        ctx.shadowColor=`rgba(255,80,5,${ea.toFixed(2)})`; ctx.shadowBlur=10;
        ctx.strokeStyle=`rgba(255,100,10,${ea.toFixed(2)})`; ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(rx-rw*0.15, ry);
        ctx.lineTo(rx+rw*0.25, ry+rh*0.12);
        ctx.stroke(); ctx.restore();
      }
    }

    // Лавовые озёра (между скалами)
    for (let lp=0; lp<3; lp++){
      const lx = ((lp*340+120 - ox*0.15) % (W*3) + W*3) % (W*3);
      if (lx > W+80) continue;
      const la = 0.35 + 0.25*Math.sin(t*1.8+lp);
      drawGlowDisc(lx, GROUND_Y-H*0.012, 0, null, W*0.07, `rgba(255,110,8,${la.toFixed(2)})`);
    }

    // Дым из кратеров
    for (let sc=0; sc<3; sc++){
      const v = VOLCS[sc];
      const tileOff2 = (ox*v.par) % v.tw;
      for (let rep=-1; rep<=1; rep++){
        const vx = rep*v.tw - tileOff2 + v.nx*v.tw;
        if (vx < -60 || vx > W+60) continue;
        const vTop = GROUND_Y - v.hh*H;
        for (let s=0; s<7; s++){
          const sy = vTop - s*H*0.065 + Math.sin(t*0.35+sc+s)*W*0.018;
          const sr = W*(0.012+s*0.010), sa = Math.max(0,0.10-s*0.012);
          ctx.beginPath();
          ctx.arc(vx + Math.sin(t*0.25+s)*sr*0.5, sy, sr, 0, 7);
          ctx.fillStyle=`rgba(45,22,10,${sa.toFixed(3)})`; ctx.fill();
        }
      }
    }

    // Искры (VOLCANO_EMBERS)
    for (const e of VOLCANO_EMBERS){
      e.x += e.vx - Game.speed*0.15; e.y += e.vy; e.life -= 0.005;
      if (e.life<0 || e.y<0){
        e.x=Math.random()*W*2; e.y=GROUND_Y-H*0.04;
        e.vx=rnd(-0.5,0.5); e.vy=rnd(-1.4,-0.4); e.r=rnd(0.8,3.3); e.life=rnd(0.5,1);
      }
      const sx=e.x-Game.cameraX*0.01;
      if (sx<-10||sx>W+10) continue;
      ctx.save(); ctx.globalAlpha=e.life*0.92;
      const col=e.life>0.6?'#ffa040':e.life>0.35?'#f97316':'#dc2626';
      ctx.beginPath(); ctx.arc(sx,e.y,e.r,0,7);
      ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=8; ctx.fill(); ctx.restore();
    }

    // Пепел
    drawDrift(18, ox, 'rgba(80,45,25,A)', { speed:10, fall:50, size:0.9, yMax:GROUND_Y*0.92 });
  },

  space(ox){
    drawNebulas(ox*0.02);
    drawStars(ox*0.04);
    const t=Date.now()/1000;
    // Галактика
    ctx.save(); ctx.globalAlpha=0.08; ctx.translate(W*0.6,H*0.3); ctx.rotate(0.5); ctx.scale(1,0.3);
    const gg=ctx.createRadialGradient(0,0,0,0,0,W*0.22);
    gg.addColorStop(0,'rgba(200,180,255,.9)'); gg.addColorStop(0.4,'rgba(140,120,220,.5)'); gg.addColorStop(1,'transparent');
    ctx.beginPath(); ctx.arc(0,0,W*0.22,0,7); ctx.fillStyle=gg; ctx.fill(); ctx.restore();
    // Планеты
    const PL=[
      {nx:0.15,ny:0.12,r:0.04, c:'#818cf8',c2:'#4338ca',ring:false},
      {nx:0.72,ny:0.08,r:0.025,c:'#fb923c',c2:'#c2410c',ring:true},
      {nx:0.45,ny:0.22,r:0.015,c:'#34d399',c2:'#065f46',ring:false},
    ];
    for (const p of PL){
      const x=((p.nx*W*2-ox*0.03)%(W*2)+W*2)%(W*2), y=p.ny*H, r=p.r*W;
      ctx.save(); ctx.shadowColor=p.c; ctx.shadowBlur=r*1.2;
      const pg=ctx.createRadialGradient(x-r*0.35,y-r*0.35,0,x,y,r);
      pg.addColorStop(0,'rgba(255,255,255,.25)'); pg.addColorStop(0.15,p.c); pg.addColorStop(0.7,p.c); pg.addColorStop(1,p.c2);
      ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fillStyle=pg; ctx.fill();
      if (p.ring){
        ctx.save(); ctx.translate(x,y); ctx.scale(1,0.28);
        ctx.beginPath(); ctx.arc(0,0,r*1.7,0,7);
        ctx.strokeStyle=p.c+'88'; ctx.lineWidth=r*0.35; ctx.stroke(); ctx.restore();
      }
      ctx.shadowBlur=0; ctx.restore();
    }
    // Метеоры
    const mt=t/3.5;
    for (let m=0; m<4; m++){
      const ph=(mt+m*0.85)%2.5; if (ph>1) continue;
      const x=W*(1.05-ph*0.9)+m*W*0.22, y=ph*GROUND_Y*0.45+m*H*0.08, len=W*(0.06+m*0.02);
      ctx.save(); ctx.globalAlpha=(1-ph)*0.85;
      const g=ctx.createLinearGradient(x,y,x+len,y-H*0.035);
      g.addColorStop(0,'transparent'); g.addColorStop(0.5,'rgba(200,210,255,.6)'); g.addColorStop(1,'#fff');
      ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.shadowColor='#c8d8ff'; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+len,y-H*0.035); ctx.stroke(); ctx.restore();
    }
  },
};

/* ── Земля (единый рендер для всех локаций) ── */
function drawGround(th){
  const grd = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  grd.addColorStop(0, th.gnd[0]); grd.addColorStop(0.4, th.gnd[1]); grd.addColorStop(1,'#000');
  ctx.fillStyle=grd; ctx.fillRect(0, GROUND_Y, W, H-GROUND_Y);

  if (th.fog){
    const fg = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y+(H-GROUND_Y)*0.4);
    fg.addColorStop(0, th.fog); fg.addColorStop(1,'transparent');
    ctx.fillStyle=fg; ctx.fillRect(0, GROUND_Y, W, (H-GROUND_Y)*0.4);
  }

  // Линия горизонта (двойное свечение)
  ctx.save();
  ctx.shadowColor=th.glow; ctx.shadowBlur=28;
  ctx.strokeStyle=th.line+'55'; ctx.lineWidth=6;
  ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(W,GROUND_Y); ctx.stroke();
  ctx.shadowBlur=10; ctx.strokeStyle=th.line+'cc'; ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(W,GROUND_Y); ctx.stroke();
  ctx.shadowBlur=0; ctx.restore();

  // Перспективная сетка
  const TILE=56, off=Game.groundOffset%TILE, vpx=W*0.5;
  ctx.save(); ctx.globalAlpha=0.07; ctx.strokeStyle=th.line; ctx.lineWidth=1;
  for (let x=-off-TILE; x<W+TILE*2; x+=TILE){
    ctx.beginPath(); ctx.moveTo(x,GROUND_Y); ctx.lineTo(vpx+(x-vpx)*0.08, H); ctx.stroke();
  }
  for (const f of [0.15,0.32,0.52,0.70,0.85,0.95]){
    const y=GROUND_Y+(H-GROUND_Y)*f;
    ctx.globalAlpha=0.04+f*0.055;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  }
  ctx.restore();

  // Полосы скорости
  const dustOff=Game.groundOffset%W;
  const rgb = hexToRgb(th.dust);
  ctx.save(); ctx.globalAlpha=0.14;
  for (let i=0; i<8; i++){
    const y=GROUND_Y+3+i*3.2, len=25+i*18;
    const sx=((i*137-dustOff*1.9)%(W+len)+W+len)%(W+len)-len;
    const g=ctx.createLinearGradient(sx,y,sx+len,y);
    g.addColorStop(0,'transparent'); g.addColorStop(0.35,th.dust); g.addColorStop(0.65,th.dust); g.addColorStop(1,'transparent');
    ctx.strokeStyle=g; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(sx,y); ctx.lineTo(sx+len,y); ctx.stroke();
  }
  ctx.restore();
}

/* ═══════════════════════════════════════
   6. ИГРОВЫЕ ОБЪЕКТЫ
═══════════════════════════════════════ */

/* — Линии скорости — */
let speedLines = [];
function updateSpeedLines(th){
  const ratio = Game.speed / BASE_SPEED;
  if (ratio > 1.3 && Math.random() < 0.3)
    speedLines.push({ x:W+20, y:Math.random()*GROUND_Y*0.85, len:rnd(40,120*ratio),
      life:1, alpha:rnd(0.15,0.30), col:th.streak });
  for (let i=speedLines.length-1; i>=0; i--){
    const s=speedLines[i]; s.x-=Game.speed*4; s.life-=0.08;
    if (s.life<=0 || s.x+s.len<0) speedLines.splice(i,1);
  }
}
function drawSpeedLines(){
  for (const s of speedLines){
    ctx.save(); ctx.globalAlpha=s.alpha*s.life;
    const g=ctx.createLinearGradient(s.x-s.len,s.y,s.x,s.y);
    g.addColorStop(0,'transparent'); g.addColorStop(1,s.col);
    ctx.strokeStyle=g; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(s.x-s.len,s.y); ctx.lineTo(s.x,s.y); ctx.stroke();
    ctx.restore();
  }
}

/* — Персонаж — */
// Спрайты: по умолчанию 1.png (8 кадров), скины — run2/run3/run4.png
const SKIN_SPRITES = {
  runner: { src:'1.png',    frames:8 },
  cyber:  { src:'run2.png', frames:8 },
  ninja:  { src:'run3.png', frames:8 },
  astro:  { src:'run4.png', frames:6 },
};

const spriteImg = new Image();
let spriteLoaded = false;
let SPRITE_FRAMES_CURRENT = 8; // объявляем ДО loadSprite

function loadSprite(skinId){
  const def = SKIN_SPRITES[skinId] || SKIN_SPRITES.runner;
  SPRITE_FRAMES_CURRENT = def.frames;
  spriteLoaded = false;
  spriteImg.onload  = () => spriteLoaded = true;
  spriteImg.onerror = () => spriteLoaded = false;
  spriteImg.src = 'images/' + def.src;
}
loadSprite('runner');

function drawStickman(cx, gy, fr){
  const phase=(fr/SPRITE_FRAMES)*Math.PI*2, h=PLAYER_H, top=gy-h, hr=h*0.13;
  ctx.save(); ctx.strokeStyle='#7ee8fa'; ctx.lineWidth=Math.max(2,W*0.006); ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(cx, top+hr, hr, 0, 7); ctx.fillStyle='#7ee8fa'; ctx.fill();
  const bt=top+hr*2, bb=top+h*0.6;
  ctx.beginPath(); ctx.moveTo(cx,bt); ctx.lineTo(cx,bb); ctx.stroke();
  const arm=Math.sin(phase)*h*0.22;
  ctx.beginPath(); ctx.moveTo(cx,bt+h*0.1); ctx.lineTo(cx-h*0.18+arm*0.4,bt+h*0.32); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,bt+h*0.1); ctx.lineTo(cx+h*0.18-arm*0.4,bt+h*0.32); ctx.stroke();
  const leg=Math.sin(phase)*h*0.2;
  ctx.beginPath(); ctx.moveTo(cx,bb); ctx.lineTo(cx-leg,bb+h*0.24); ctx.lineTo(cx-leg-h*0.06,gy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,bb); ctx.lineTo(cx+leg,bb+h*0.24); ctx.lineTo(cx+leg+h*0.06,gy); ctx.stroke();
  ctx.restore();
}
function drawPlayer(){
  const sx=Game.playerX-Game.cameraX;
  ctx.save(); ctx.translate(sx, GROUND_Y);
  if (spriteLoaded){
    const frame = Game.frame % SPRITE_FRAMES_CURRENT;
    ctx.drawImage(spriteImg, frame*128,0,128,128, -PLAYER_W/2,-PLAYER_H, PLAYER_W,PLAYER_H);
  } else drawStickman(0,0,Game.frame);
  ctx.restore();
  ctx.save(); ctx.globalAlpha=0.25;
  const sg=ctx.createRadialGradient(sx,GROUND_Y+2,0,sx,GROUND_Y+2,PLAYER_W*0.5);
  sg.addColorStop(0,'#000'); sg.addColorStop(1,'transparent');
  ctx.fillStyle=sg; ctx.beginPath(); ctx.ellipse(sx,GROUND_Y+3,PLAYER_W*0.42,7,0,0,7); ctx.fill();
  ctx.restore();
}

/* — Монеты — */
const coinImg = new Image();
let coinLoaded = false;
coinImg.onload  = () => coinLoaded = true;
coinImg.onerror = () => coinLoaded = false;
coinImg.src = 'images/ton.png';

let coinList = [];
function initCoins(){
  coinList = [];
  for (let i=0; i<10; i++) coinList.push({ x:W*0.9+i*COIN_SPACING, active:true });
  Game.playerX=W*0.28; Game.cameraX=0; Game.speed=BASE_SPEED; Game.frameDelay=4; Game.groundOffset=0;
}
function respawnCoin(c){
  let maxX = Game.playerX + W*0.6;
  for (const k of coinList) if (k.active && k.x > maxX) maxX = k.x;
  c.x = maxX + COIN_SPACING + rnd(-20,20); c.active = true;
}
function drawCoin(c){
  if (!c.active) return;
  const sx=c.x-Game.cameraX;
  if (sx<-COIN_R*2 || sx>W+COIN_R*2) return;
  const cy=COIN_Y+Math.sin(Date.now()/480+c.x*0.04)*COIN_R*0.18;
  ctx.save(); ctx.translate(sx,cy);
  if (coinLoaded){
    ctx.shadowColor='#0098ea'; ctx.shadowBlur=COIN_R*0.9;
    ctx.drawImage(coinImg,-COIN_R,-COIN_R,COIN_R*2,COIN_R*2);
  } else {
    ctx.shadowColor='#f0a500'; ctx.shadowBlur=COIN_R*0.9;
    ctx.beginPath(); ctx.arc(0,0,COIN_R,0,7);
    const cg=ctx.createRadialGradient(-COIN_R*.28,-COIN_R*.28,COIN_R*.08,0,0,COIN_R);
    cg.addColorStop(0,'#fff8bb'); cg.addColorStop(0.45,'#f0a500'); cg.addColorStop(1,'#7a4000');
    ctx.fillStyle=cg; ctx.fill();
  }
  ctx.shadowBlur=0; ctx.restore();
}

/* — Частицы и текст — */
let particles=[], floatTexts=[];
function drawParticles(){
  for (let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    ctx.save(); ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(p.x-Game.cameraX,p.y,p.r,0,7); ctx.fill(); ctx.restore();
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.25; p.life-=0.035;
    if (p.life<=0) particles.splice(i,1);
  }
}
function drawFloatTexts(){
  for (let i=floatTexts.length-1;i>=0;i--){
    const f=floatTexts[i];
    ctx.save(); ctx.globalAlpha=f.life;
    ctx.fillStyle=f.color; ctx.font=`bold ${f.size}px sans-serif`; ctx.textAlign='center';
    ctx.shadowColor=f.color; ctx.shadowBlur=12;
    ctx.fillText(f.text, f.x-Game.cameraX, f.y); ctx.restore();
    f.y-=1.6; f.life-=0.02;
    if (f.life<=0) floatTexts.splice(i,1);
  }
}

/* — Магнит — */
function drawMagnetField(){
  if (!Game.upgrades[1]) return;
  const sx=Game.playerX-Game.cameraX, cy=GROUND_Y-PLAYER_H*0.5, t=Date.now()/800;
  for (let r=0;r<3;r++){
    const rad=magnetRadius*(0.5+r*0.25+Math.sin(t+r*1.2)*0.08);
    ctx.beginPath(); ctx.arc(sx,cy,rad,0,7);
    ctx.strokeStyle=`rgba(124,77,255,${0.06-r*0.015})`; ctx.lineWidth=2; ctx.stroke();
  }
  const g=ctx.createRadialGradient(sx,cy,0,sx,cy,magnetRadius);
  g.addColorStop(0,'rgba(124,77,255,.08)'); g.addColorStop(1,'transparent');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,cy,magnetRadius,0,7); ctx.fill();
}

/* — Коллизии / сбор — */
function checkCollisions(){
  const cR = Game.upgrades[1] ? magnetRadius : COIN_R+PLAYER_W*0.45;
  for (const c of coinList)
    if (c.active && Math.abs(c.x-Game.playerX) < cR) collectCoin(c);
}
function collectCoin(c){
  c.active=false;
  // Если лимит метров достигнут — монеты не накапливаются
  if (Game.sessionDist < Game.sessionLimit){
    const baseValue = coinValueForLoc(Game.currentLoc);
    const skinMult = Game.skinBonus > Date.now() ? 1.05 : 1;
    const mult = ((Game.upgrades[2] ? 2 : 1) + (Game.upgrades[3] ? 5 : 0)) * skinMult;
    const value = baseValue * mult;
    Game.pendingCoins += value;
    updateCollector();
  }
  for (let i=0;i<12;i++) particles.push({
    x:c.x, y:COIN_Y, vx:rnd(-3,3), vy:rnd(-6,-1),
    r:rnd(1,COIN_R*0.28+1), color:Math.random()>0.5?'#ffe066':'#f0a500', life:1,
  });
  setTimeout(() => respawnCoin(c), rnd(1400,2300));
}

function collectPending(){
  if (Game.pendingCoins <= 0) return;
  const amount      = Game.pendingCoins;
  const sessionDist = Game.sessionDist;
  Game.coins          += amount;
  Game.totalCollected += amount;
  Game.pendingCoins    = 0;
  Game.sessionDist     = 0;
  Game.sessionRuns    += 1;
  updateUI();
  updateCollector();
  showToast('Монеты собраны! 💰');
  // Сохраняем на сервер асинхронно
  if (getInitData()){
    apiRequest('POST', '/api/collect', { amount, sessionDist }).catch(console.warn);
  }
}

function updateCollector(){
  const limited = isFinite(Game.sessionLimit);
  const pct  = limited ? Math.min(1, Game.sessionDist / Game.sessionLimit) : 0;
  const full = limited && pct >= 1;
  const fillEl = $('coll-fill');
  const btnEl  = $('coll-btn');
  const valEl  = $('coll-val');
  const limEl  = $('coll-lim');
  if (valEl) valEl.textContent = Game.pendingCoins.toFixed(8);
  if (limEl){
    const done = Math.round(Game.sessionDist);
    limEl.textContent = limited
      ? done.toLocaleString() + ' / ' + Game.sessionLimit.toLocaleString() + ' м'
      : done.toLocaleString() + ' м  ♾️';
  }
  if (fillEl){
    fillEl.style.width = limited ? (pct*100).toFixed(1)+'%' : '0%';
    fillEl.classList.toggle('full', full);
  }
  if (btnEl){
    btnEl.disabled = Game.pendingCoins <= 0;
    btnEl.classList.toggle('full', full);
    btnEl.textContent = full ? '⚡ Собрать' : 'Собрать';
  }
}
function autoCollect(){
  if (!Game.upgrades[4]) return;
  let near=null, d=Infinity;
  for (const c of coinList){
    if (!c.active) continue;
    const dist=Math.abs(c.x-Game.playerX);
    if (dist<d){ d=dist; near=c; }
  }
  if (near) collectCoin(near);
}

/* ── Limit modal ── */
const LIMIT_UPGRADES = [
  { icon:'⏱️', name:'+1 час',   add:6912,    price:1,  desc:'+6 912 м',  unlimited:false },
  { icon:'⏰', name:'+5 часов', add:34560,   price:5,  desc:'+34 560 м', unlimited:false },
  { icon:'🕐', name:'+10 часов',add:69120,   price:10, desc:'+69 120 м', unlimited:false },
  { icon:'♾️', name:'Безлимит', add:Infinity, price:30, desc:'Навсегда', unlimited:true  },
];

function fmtLimit(m){
  if (!isFinite(m)) return '♾️ Безлимит';
  const h = Math.round(m / 6912);
  return h + ' ч';
}

function openLimitModal(){
  const grid = $('lim-upgrades');
  $('lim-cur-val').textContent = fmtLimit(Game.sessionLimit);
  const isUnlimited = !isFinite(Game.sessionLimit);
  grid.innerHTML = LIMIT_UPGRADES.map((u,i) => {
    const bought = u.unlimited && isUnlimited;
    return `
    <div class="lim-upg${bought?' lim-upg-done':''}" onclick="${bought?'':` buyLimitUpgrade(${i})`}">
      <div class="lim-upg-ico">${u.icon}</div>
      <div class="lim-upg-body">
        <div class="lim-upg-name">${u.name}</div>
        <div class="lim-upg-desc">${u.desc}</div>
      </div>
      <div class="lim-upg-price">
        ${bought
          ? '<span class="badge b-green">Куплено</span>'
          : `<img src="images/ton.png" style="width:14px;height:14px"> ${u.price}`}
      </div>
    </div>`;
  }).join('');
  $('limit-modal').classList.add('open');
}

function closeLimitModal(){
  $('limit-modal').classList.remove('open');
}

function buyLimitUpgrade(i){
  const u = LIMIT_UPGRADES[i];
  if (Game.coins < u.price){ showToast('Не хватает монет 💰'); return; }
  Game.coins -= u.price;
  if (u.unlimited){
    Game.sessionLimit = Infinity;
  } else {
    Game.sessionLimit += u.add;
  }
  updateUI();
  updateCollector();
  closeLimitModal();
  showToast(`${u.icon} Лимит: ${fmtLimit(Game.sessionLimit)}`);
}

/* ═══════════════════════════════════════
   7. ГЛАВНЫЙ ЦИКЛ
═══════════════════════════════════════ */
let _collFrame = 0;
function loop(){
  const th = THEME[Game.currentLoc];

  Game.playerX += Game.speed;
  Game.groundOffset += Game.speed;
  Game.totalDist += Game.speed / (W||400) * 8;
  if (Game.sessionDist < Game.sessionLimit)
    Game.sessionDist += Game.speed / (W||400) * 8;

  // Обновлять коллектор раз в 10 кадров
  if (++_collFrame >= 10){ _collFrame = 0; updateCollector(); }
  if (++Game.frameTick >= Game.frameDelay){ Game.frameTick=0; Game.frame=(Game.frame+1)%SPRITE_FRAMES; }
  Game.cameraX += (Game.playerX-CAM_LEAD-Game.cameraX)*0.12;

  // Проверка истечения локаций по метрам
  checkLocExpiry();

  checkCollisions();
  updateSpeedLines(th);

  ctx.clearRect(0,0,W,H);

  drawSky(th);

  const isCity = Game.currentLoc === 'city';
  const isMountains = Game.currentLoc === 'mountains';
  if (isMountains){
    drawMtnLayer(MTN.far, Game.cameraX, 0.12, th.mtn[0], W*4);
    drawMtnLayer(MTN.mid, Game.cameraX, 0.20, th.mtn[1], W*3.5);
  }
  DECOR[Game.currentLoc](Game.cameraX);
  if (isCity) drawBuildings(Game.cameraX);
  if (isMountains) drawMtnLayer(MTN.near, Game.cameraX, 0.45, th.mtn[2], W*3);

  drawSpeedLines();
  drawGround(th);

  drawMagnetField();
  for (const c of coinList) drawCoin(c);
  drawParticles();
  drawPlayer();
  drawFloatTexts();

  requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════
   8. UI: магазин, табы, апгрейды, тосты
═══════════════════════════════════════ */
function fmtMetersLeft(m){
  if (m <= 0) return 'Истекло';
  if (m >= 1000000) return (m/1000000).toFixed(2) + ' млн м';
  if (m >= 1000) return (m/1000).toFixed(1) + ' км';
  return Math.round(m) + ' м';
}

function buildLocCards(){
  const grid = $('loc-grid');
  grid.innerHTML = Object.entries(LOCATIONS).map(([id,l]) => {
    const unlocked = Game.unlocked.has(id);
    const inc = locIncome[id];
    const metersLeft = inc ? Math.max(0, inc.endDist - Game.totalDist) : 0;
    const progress = inc ? Math.min(1, (Game.totalDist - inc.startDist) / METERS_36) : 0;
    let incomeLabel = id === 'city'
      ? `~1 TON / 5.97 млн м`
      : `${l.incomeMin}–${l.incomeMax} TON / 5.97 млн м`;
    return `
    <div class="loc-card" id="loc-${id}" onclick="selectLocation('${id}')">
      <div class="loc-banner" style="background:${l.bg}">
        ${l.icon}<div class="loc-check">✓</div>
        ${id!=='city' ? `<div class="loc-lock" id="lock-${id}">🔒</div>` : ''}
      </div>
      <div class="loc-body">
        <div class="loc-name">${l.name}</div>
        <div class="loc-income"><img class="c-dot" src="images/ton.png" alt="TON">${incomeLabel}</div>
        ${unlocked && inc
          ? `<div class="loc-desc" id="timer-${id}">🏃 осталось ${fmtMetersLeft(metersLeft)}</div>
             <div class="prog" style="margin-top:4px"><div class="prog-fill" id="prog-${id}" style="width:${(progress*100).toFixed(1)}%"></div></div>`
          : `<div class="loc-desc">${l.desc}</div>`}
        <div class="loc-cost">
          ${id==='city'
            ? '<span class="badge b-green">Открыта</span>'
            : unlocked
              ? `<span class="badge b-acc" id="lbl-${id}">Активна</span>`
              : `<span class="badge b-muted" id="lbl-${id}">Открыть</span>
                 <span class="c-chip" id="price-${id}"><img class="c-dot" src="images/ton.png" alt="TON">${l.price}</span>`}
        </div>
      </div>
    </div>`;
  }).join('');
  updateLocCards();
  // Обновлять прогресс-бары каждую секунду
  clearInterval(window._locTimerInterval);
  window._locTimerInterval = setInterval(() => {
    for (const id of Object.keys(LOCATIONS)){
      const elTimer = document.getElementById('timer-'+id);
      const elProg  = document.getElementById('prog-'+id);
      const inc = locIncome[id];
      if (!inc || !elTimer) continue;
      const mLeft = Math.max(0, inc.endDist - Game.totalDist);
      const prog  = Math.min(1, (Game.totalDist - inc.startDist) / METERS_36);
      elTimer.textContent = '🏃 осталось ' + fmtMetersLeft(mLeft);
      if (elProg) elProg.style.width = (prog*100).toFixed(1)+'%';
    }
  }, 1000);
}

function selectLocation(id){
  const loc = LOCATIONS[id];
  if (!loc) return;
  if (!Game.unlocked.has(id)){
    if (Game.coins < loc.price){ showToast('Не хватает монет 💰'); return; }
    Game.coins -= loc.price;
    Game.unlocked.add(id);
    initLocIncome(id);
    const inc = locIncome[id];
    showToast(`${loc.icon} ${loc.name} открыта! ${inc.totalTon.toFixed(2)} TON за 5.97 млн м`);
    updateUI();
    buildLocCards();
  }
  Game.currentLoc = id;
  if (id === 'volcano') initEmbers();
  updateLocCards();
}

function updateLocCards(){
  for (const id of Object.keys(LOCATIONS)){
    const card=$('loc-'+id); if (!card) continue;
    const unlocked=Game.unlocked.has(id), active=Game.currentLoc===id;
    card.classList.toggle('active-loc', active);
    card.classList.toggle('locked', !unlocked && id !== 'city');
    const lock=$('lock-'+id);
    if (lock) lock.style.display = unlocked?'none':'block';
  }
}

/* — Табы — */
const TABS = ['game','shop','skins','friends','tasks','wallet'];
function setTab(id){
  for (const t of TABS){
    $('tab-'+t).classList.toggle('active', t===id);
    $('screen-'+t).classList.toggle('active', t===id);
  }
  document.body.classList.toggle('screen-open', id !== 'game');
  $('collector').classList.toggle('hidden', id !== 'game');
  if (id==='wallet')  refreshWallet();
  if (id==='shop')    updateLocCards();
  if (id==='skins')   buildSkinCards();
}

function copyRefLink(){
  const link = 'https://t.me/CoinRunnerBot?start=ref_player';
  if (navigator.clipboard){ navigator.clipboard.writeText(link); }
  showToast('Ссылка скопирована! 🔗');
}

function refreshWallet(){
  const el = $('w-balance');
  if (el) el.textContent = Game.coins.toFixed(8);
}

function showWalletAction(type){
  if (Game.coins < 1 && type === 'withdraw'){
    showToast('Минимальная сумма вывода: 1 TON');
    return;
  }
  showToast(type === 'deposit' ? 'Пополнение — скоро! 🚀' : 'Вывод — скоро! 🚀');
}

function fmtDuration(ms){
  if (ms <= 0) return 'Истёк';
  const d = Math.floor(ms/86400000), h = Math.floor((ms%86400000)/3600000);
  if (d >= 30) return Math.floor(d/30)+'мес '+d%30+'д';
  if (d > 0)   return d+'д '+h+'ч';
  return h+'ч';
}

function buildSkinCards(){
  const grid = $('skin-grid');
  const now = Date.now();
  const bonusActive = Game.skinBonus > now;

  // Баннер активного бонуса
  const banner = $('skin-bonus-banner');
  if (bonusActive && Game.activeSkin){
    banner.style.display = '';
    $('skin-bonus-left').textContent = 'Осталось: ' + fmtDuration(Game.skinBonus - now);
    $('skin-active-name').textContent = SKINS[Game.activeSkin]?.name || '—';
  } else {
    banner.style.display = 'none';
  }

  grid.innerHTML = Object.entries(SKINS).map(([id, s]) => {
    const isActive = Game.activeSkin === id && bonusActive;
    const daysLeft = isActive ? fmtDuration(Game.skinBonus - now) : null;
    return `
    <div class="skin-card${isActive?' active-skin':''}" onclick="buySkin('${id}')">
      <div class="skin-banner" style="background:${s.bg}"><img src="images/${s.emoji}.png" style="width:72px;height:72px;object-fit:contain;position:relative;z-index:1"></div>
      <div class="skin-body">
        <div class="skin-name">${s.name}</div>
        <div class="skin-bonus">⚡ +5% к доходу</div>
        <div class="skin-dur">${s.months} мес${s.months===1?'':s.months<5?'а':'ев'}</div>
        <div class="skin-cost">
          ${isActive
            ? `<span class="badge b-acc">Активен</span><span style="font-size:10px;color:var(--t3)">${daysLeft}</span>`
            : `<span class="badge b-muted">${s.price} TON</span>
               <button class="btn btn-accent btn-sm" onclick="event.stopPropagation();buySkin('${id}')">Купить</button>`
          }
        </div>
      </div>
    </div>`;
  }).join('');
}

function buySkin(id){
  const s = SKINS[id];
  if (!s) return;
  if (Game.coins < s.price){ showToast('Не хватает монет 💰'); return; }
  Game.coins -= s.price;
  const ms = s.months * 30 * 24 * 3600 * 1000;
  const base = Game.skinBonus > Date.now() ? Game.skinBonus : Date.now();
  Game.skinBonus = base + ms;
  Game.activeSkin = id;
  loadSprite(id);
  updateUI();
  buildSkinCards();
  showToast(`${s.name} активирован! +5% на ${s.months} мес.`);
}



/* — UI обновление — */
function updateUI(){
  $('balance').textContent = Game.coins.toFixed(8);
  $('top-level').textContent = (window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name) || 'Игрок';
  updateLocCards();
}

/* — Тосты — */
let toastTimer;
function showToast(msg){
  const el=$('toast');
  el.textContent=msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),2000);
}

/* ═══════════════════════════════════════
   9. СТАРТ
═══════════════════════════════════════ */

/* ── API — связь с сервером ── */
const API_URL = 'https://runton-production.up.railway.app'; // ← замени на свой Railway URL

function getInitData(){
  return window.Telegram?.WebApp?.initData || '';
}

async function apiRequest(method, path, body){
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Init-Data':  getInitData(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function syncFromServer(){
  try {
    const data = await apiRequest('GET', '/api/user');
    if (!data.ok) return;
    const u = data.user;
    Game.coins          = u.coins;
    Game.totalCollected = u.totalCollected;
    Game.totalDist      = u.totalDist;
    Game.sessionLimit   = u.sessionLimit;
    Game.sessionRuns    = u.sessionRuns;
    Game.unlocked       = new Set(u.unlockedLocations);
    Game.currentLoc     = u.currentLoc;
    Game.activeSkin     = u.activeSkin;
    Game.skinBonus      = u.skinBonus;
    if (u.activeSkin) loadSprite(u.activeSkin);
    updateUI(); buildLocCards(); updateCollector();
  } catch(e){ console.warn('syncFromServer failed:', e); }
}

function start(){
  computeDimensions();
  initCoins();
  buildLocCards();
  updateUI();
  setTab('game');
  loop();
}

window.addEventListener('resize', () => { computeDimensions(); initCoins(); });

window.addEventListener('load', async () => {
  if (window.Telegram?.WebApp){
    const tg = Telegram.WebApp;
    tg.ready();
    tg.expand();
    // Fullscreen — поддерживается в Telegram 8.0+
    if (tg.requestFullscreen) tg.requestFullscreen();
    // Отключаем свайп вниз чтобы не закрывал приложение
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
  }
  // Авторизация + загрузка данных с сервера
  if (getInitData()){
    try {
      const ref = window.Telegram?.WebApp?.initDataUnsafe?.start_param || null;
      await apiRequest('POST', '/api/auth', { ref });
      await syncFromServer();
    } catch(e){ console.warn('Backend offline, running locally:', e); }
  }
  start();
});

/* ═══════════════════════════════════════
   ЧАСТИЦЫ В МЕНЮ
═══════════════════════════════════════ */
(function(){
  function initParticles(canvasId){
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const parent = cv.parentElement;
    const ctx = cv.getContext('2d');

    function resize(){
      cv.width  = parent.offsetWidth  || 400;
      cv.height = parent.offsetHeight || 62;
    }
    resize();
    window.addEventListener('resize', resize, {passive:true});

    const ANG   = Math.PI * 0.16;
    const cosA  = Math.cos(ANG), sinA = Math.sin(ANG);

    /* ── слой 1: пылевые точки ── */
    const DUST = Array.from({length:22}, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.0,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: -0.00006 - Math.random() * 0.00010,
      phase: Math.random() * Math.PI * 2,
      spd:   0.008 + Math.random() * 0.012,
      hue:  [260, 220, 280, 200][i % 4],
    }));

    /* ── слой 2: метеориты ── */
    function spawnMeteor(){
      const W = cv.width, H = cv.height;
      const fromTop = Math.random() > 0.45;
      return {
        x: fromTop ? W * (0.1 + Math.random() * 1.2) : W + 20 + Math.random() * 80,
        y: fromTop ? -10 : Math.random() * H,
        len: 18 + Math.random() * 38,
        speed: 0.35 + Math.random() * 0.55,
        alpha: 0, fadeIn: true,
        maxA: 0.20 + Math.random() * 0.20,
        hue: [260, 220, 240, 200][Math.floor(Math.random()*4)],
        hw: 0.6 + Math.random() * 0.8,
      };
    }
    const METEORS = Array.from({length:12}, () => {
      const m = spawnMeteor();
      const W = cv.width, H = cv.height;
      m.x = Math.random() * W; m.y = Math.random() * H;
      m.alpha = Math.random() * m.maxA;
      m.fadeIn = Math.random() > 0.5;
      return m;
    });

    /* ── слой 3: длинные редкие росчерки ── */
    function spawnStreak(){
      const W = cv.width, H = cv.height;
      return {
        x: W + 60 + Math.random() * 120,
        y: -10 + Math.random() * H * 0.7,
        len: 60 + Math.random() * 80,
        speed: 0.6 + Math.random() * 0.6,
        alpha: 0, fadeIn: true,
        maxA: 0.10 + Math.random() * 0.10,
        hue: [255, 200, 270][Math.floor(Math.random()*3)],
        delay: Math.random() * 300,
      };
    }
    const STREAKS = Array.from({length:4}, () => {
      const s = spawnStreak();
      s.delay = Math.random() * 400;
      return s;
    });

    let frame = 0;
    function tick(){
      frame++;
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);

      /* — пыль — */
      for (const d of DUST){
        d.x += d.vx; d.y += d.vy; d.phase += d.spd;
        if (d.x < -0.05) d.x = 1.05;
        if (d.x > 1.05)  d.x = -0.05;
        if (d.y < -0.05) d.y = 1.05;
        const a = 0.06 + Math.abs(Math.sin(d.phase)) * 0.18;
        ctx.beginPath();
        ctx.arc(d.x*W, d.y*H, d.r, 0, Math.PI*2);
        ctx.fillStyle = `hsla(${d.hue},75%,72%,${a.toFixed(3)})`;
        ctx.fill();
      }

      /* — метеориты — */
      for (const m of METEORS){
        m.x -= m.speed * cosA;
        m.y += m.speed * sinA;
        if (m.fadeIn){ m.alpha += 0.004; if (m.alpha >= m.maxA) m.fadeIn = false; }
        else          { m.alpha -= 0.0025; }
        if (m.x < -m.len*2 || m.y > H+m.len || m.alpha <= 0){
          Object.assign(m, spawnMeteor()); m.alpha = 0; m.fadeIn = true; continue;
        }
        const tx = m.x + m.len*cosA, ty = m.y - m.len*sinA;
        const g = ctx.createLinearGradient(tx, ty, m.x, m.y);
        g.addColorStop(0,   `hsla(${m.hue},90%,80%,0)`);
        g.addColorStop(0.55,`hsla(${m.hue},90%,82%,${(m.alpha*0.45).toFixed(3)})`);
        g.addColorStop(1,   `hsla(${m.hue},100%,96%,${m.alpha.toFixed(3)})`);
        const nx = -sinA, ny = cosA;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx + nx*m.hw, ty + ny*m.hw);
        ctx.lineTo(tx - nx*m.hw, ty - ny*m.hw);
        ctx.closePath();
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty);
        ctx.strokeStyle = `hsla(${m.hue},100%,92%,${(m.alpha*0.35).toFixed(3)})`;
        ctx.lineWidth = 0.4; ctx.stroke();
        ctx.restore();
      }

      /* — длинные росчерки — */
      for (const s of STREAKS){
        if (s.delay > 0){ s.delay--; continue; }
        s.x -= s.speed * cosA;
        s.y += s.speed * sinA;
        if (s.fadeIn){ s.alpha += 0.0015; if (s.alpha >= s.maxA) s.fadeIn = false; }
        else          { s.alpha -= 0.001; }
        if (s.x < -s.len*2 || s.y > H+s.len || s.alpha <= 0){
          Object.assign(s, spawnStreak()); continue;
        }
        const tx = s.x + s.len*cosA, ty = s.y - s.len*sinA;
        const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0, `hsla(${s.hue},80%,80%,0)`);
        g.addColorStop(1, `hsla(${s.hue},80%,90%,${s.alpha.toFixed(3)})`);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty);
        ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('load', function(){
    initParticles('nav-particles-top');
    initParticles('nav-particles-bot');
  });
})();
