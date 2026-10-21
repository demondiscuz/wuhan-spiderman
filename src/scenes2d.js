/* 第二章（G04–G09）2D 横版：正交逻辑 + 2D Canvas 渲染。
 * 与 3D 章共享 hooks（audio/视频/对白/状态/推进）。
 */
const W = 1920, H = 1080;
const TILE = 64; // 2D 关卡统一网格
const snap = (v) => Math.round(v / TILE) * TILE; // 坐标吸附到格点
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, s) => v < t ? Math.min(v + s, t) : Math.max(v - s, t);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function roundRectPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function genRoofs(width, { startY = 810, segW = 640, gap = 160, flat = false } = {}) {
  const a = []; let x = 0;
  while (x < width - 200) { const y = flat ? startY : startY - Math.round(hash(x) * 60); a.push({ x, y, w: segW, h: H - y }); x += segW + gap; }
  return a;
}
function genAnchors(width, n, y) { const a = []; for (let i = 0; i < n; i++) a.push({ x: Math.round(300 + i * (width - 600) / Math.max(1, n - 1)), y }); return a; }
function genGoo(width, plats, n) { const a = []; for (let i = 0; i < n; i++) { const p = plats[Math.floor(hash(i + 7) * plats.length)]; a.push({ x: p.x + 60 + hash(i + 13) * (p.w - 120), y: p.y, r: 40 + hash(i + 21) * 26 }); } return a; }

function buildScene(id) {
  const ch2 = {
    G01: () => {
      const platforms = genRoofs(4200, { startY: 820, segW: 620, gap: 170, flat: true });
      return {
        id, chapter: 'ch1', theme: 'pixel', pixel: true, bgm: 'bgm_fly', ambience: ['sfx_wind'],
        width: 4200, platforms, oneways: [], anchors: genAnchors(4200, 9, 360),
        goo: [], nodes: [], collectibles: [],
        tutorial: true, // v19：三段新手教学（移动 → 跳跃 → 攻击）
        enemies: [
          { x: 520, y: 728, w: 54, h: 92, hp: 1, alive: true, dir: -1, t: 0, harmless: true, minX: 300, maxX: 600 },
          { x: 1900, y: 728, w: 54, h: 92, hp: 1, alive: true, dir: -1, t: 0, harmless: true, minX: 1600, maxX: 2180, tutTarget: true }
        ],
        targets: [], goal: { x: 4000 },
        start: { x: 200, y: 670 }, carry: false,
        objective: '新手教学（1/3）· 移动', sub: '按住 ◀ ▶ 向右移动',
        dialogue: [], video: null
      };
    },
    G02: () => ({
      id, chapter: 'ch1', theme: 'pixel', pixel: true, bgm: 'bgm_battle', ambience: [],
      width: 1900, platforms: [{ x: 0, y: 820, w: 1900, h: 260 }], oneways: [], anchors: [{ x: 950, y: 300 }],
      goo: [], nodes: [], collectibles: [], enemies: [], targets: [], goal: null,
      start: { x: 240, y: 670 }, carry: false,
      objective: '反击章鱼博士（0/3）', sub: '闪避工具箱，或左键蛛网弹把它甩回去',
      dialogue: [
        { speaker: '蜘蛛侠', text: '嘿！奥托博士！这可是武汉最高楼，绿地中心，你用四根机械爪拆护栏可不太礼貌！', voice: 'vo_d01', lock: true, comic: 'comics/docock.webp' },
        { speaker: '章鱼博士', text: '走开，蜘蛛侠！我来光谷参加量子科学展，但刚才机械臂的主控芯片被一滴奇怪的黑水侵蚀了，我控制不住它们——小心！', voice: 'vo_d02', lock: true, comic: 'comics/docock2.webp' }
      ],
      video: null, boss: { hp: 0, max: 3, phase: 1, timer: 0, throwTimer: 1.8, bound: 0, maxBound: 4 }
    }),
    G03: () => ({
      id, chapter: 'ch1', theme: 'pixel', pixel: true, bgm: 'bgm_normal', ambience: [],
      width: 1900, platforms: [{ x: 0, y: 820, w: 1900, h: 260 }], oneways: [], anchors: [], goo: [], nodes: [], collectibles: [],
      enemies: [], targets: [{ x: 950, y: 640, r: 60, hit: false, label: 'F 击掌' }], goal: null,
      start: { x: 300, y: 670 }, carry: false, docX: 950, walkOut: false, walkT: 0,
      objective: '与奥托博士握手言和', sub: '听完对白，靠近博士点击提示',
      dialogue: [{ speaker: '章鱼博士', text: '太感谢你了，孩子！要不是你的蛛丝够结实，我差点在武汉闯下大祸。不打不相识，从今天起，你就是我奥托最好的朋友！', voice: 'vo_d03', lock: true, comic: 'comics/chip_pull.webp' }],
      video: null
    }),
    G04: () => {
      const platforms = [
        { x: 0, y: 820, w: 900, h: 260 }, { x: 1050, y: 780, w: 700, h: 300 }, { x: 1900, y: 720, w: 800, h: 360 },
        { x: 2850, y: 780, w: 800, h: 300 }, { x: 3800, y: 700, w: 800, h: 380 }, { x: 4750, y: 760, w: 800, h: 320 },
        { x: 5700, y: 700, w: 800, h: 380 }, { x: 6650, y: 800, w: 550, h: 280 }
      ];
      return {
        id, chapter: 'ch2', theme: 'dawn', bgm: 'bgm_normal', ambience: ['sfx_wind', 'sfx_goo'], width: 7200, platforms,
        oneways: [{ x: 1200, y: 650, w: 220, h: 18 }, { x: 2150, y: 600, w: 260, h: 18 }, { x: 4050, y: 580, w: 260, h: 18 }, { x: 6000, y: 590, w: 260, h: 18 }],
        anchors: [{ x: 1150, y: 380 }, { x: 2250, y: 350 }, { x: 3250, y: 330 }, { x: 4350, y: 370 }, { x: 5300, y: 340 }, { x: 6300, y: 350 }, { x: 6850, y: 300 }],
        goo: genGoo(7200, platforms, 9), nodes: [{ x: 1400, y: 680, l: '01', reached: false }, { x: 2500, y: 620, l: '02', reached: false }, { x: 4200, y: 600, l: '03', reached: false }, { x: 6100, y: 600, l: '04', reached: false }, { x: 6900, y: 700, l: '05', reached: false }],
        collectibles: [{ x: 1650, y: 680, taken: false }, { x: 3350, y: 660, taken: false }, { x: 5150, y: 680, taken: false }],
        goal: { x: 6900 }, start: { x: 180, y: 670 }, carry: false,
        objective: '追踪黑色粘液（0/5）', sub: '沿着黑液痕迹，前往龟山电视塔',
        dialogue: [{ speaker: '蜘蛛侠', text: '咦？这就是刚才让博士机械臂失控的东西？它在往那边爬！', voice: 'vo_d05', lock: false }]
      };
    },
    G05: () => ({
      id, chapter: 'ch2', theme: 'night', bgm: 'bgm_normal', ambience: ['sfx_portal'], width: 1800,
      platforms: [{ x: 0, y: 820, w: 1800, h: 260 }], oneways: [], anchors: [], goo: [{ x: 700, y: 820, r: 60 }],
      nodes: [], collectibles: [], targets: [{ x: 1500, y: 640, r: 70, hit: false, label: '传送门' }], goal: null, start: { x: 300, y: 670 }, carry: false,
      objective: '穿过魔法传送门', sub: '走近右侧金橙色火花圈点击提示', dialogue: [], video: 'v1'
    }),
    G06: () => {
      const platforms = genRoofs(5200);
      return {
        id, chapter: 'ch2', theme: 'night', bgm: 'bgm_normal', ambience: ['sfx_ambient_ny'], width: 5200, platforms, oneways: [], anchors: genAnchors(5200, 7, 360),
        goo: genGoo(5200, platforms, 7), nodes: (() => { const a = []; for (let i = 0; i < 4; i++) { const p = platforms[Math.floor((i + 1) * (platforms.length - 1) / 4)]; a.push({ x: Math.round(p.x + p.w / 2), y: p.y - 100, l: String(i + 1).padStart(2, '0'), reached: false }); } return a; })(),
        collectibles: [], goal: { x: 5000 }, start: { x: 200, y: 660 }, carry: false,
        objective: '追踪黑液至废弃工厂（0/4）', sub: '穿过纽约雨夜街巷', dialogue: [], video: null
      };
    },
    G07: () => ({
      id, chapter: 'ch2', theme: 'night', bgm: 'bgm_battle', ambience: ['sfx_goo'], width: 2000,
      platforms: [{ x: 0, y: 820, w: 2000, h: 260 }], oneways: [], anchors: [{ x: 1000, y: 300 }], goo: [], nodes: [], collectibles: [],
      enemies: [{ x: 1300, y: 700, w: 90, h: 120, hp: 3, dir: -1, t: 0, alive: true }, { x: 1500, y: 700, w: 90, h: 120, hp: 3, dir: -1, t: 1, alive: true }, { x: 1700, y: 700, w: 90, h: 120, hp: 3, dir: -1, t: 2, alive: true }],
      targets: [], goal: null, start: { x: 240, y: 670 }, carry: false, objective: '击败毒液小兵（0/3）', sub: '每只用 3 发蛛网弹击溃', dialogue: [], video: 'v2'
    }),
    G08: () => ({
      id, chapter: 'ch2', theme: 'night', bgm: 'bgm_battle', ambience: [], width: 2000,
      platforms: [{ x: 0, y: 820, w: 2000, h: 260 }], oneways: [], anchors: [{ x: 1000, y: 260 }], goo: [], nodes: [], collectibles: [], enemies: [], targets: [],
      goal: null, start: { x: 240, y: 670 }, carry: false, objective: '困住毒液本体（0/12）', sub: '闪避猛扑，硬直时左键连射',
      dialogue: [{ speaker: '钢铁侠', text: '这家伙块头太大，直接放脉冲波会被他躲开！彼得，困住他！', voice: 'vo_d08', lock: false }, { speaker: '蜘蛛侠', text: '看我的！', voice: 'vo_d09', lock: false }],
      video: 'v3', boss: { state: 'idle', timer: 1.5, webs: 0 }
    }),
    G09: () => {
      const platforms = genRoofs(3600, { segW: 800 });
      return {
        id, chapter: 'ch2', theme: 'dusk', bgm: 'bgm_normal', ambience: ['sfx_ambient_ny'], width: 3600, platforms, oneways: [], anchors: [], goo: [],
        nodes: [], collectibles: [], goal: { x: 3450 }, start: { x: 200, y: 670 }, carry: true,
        objective: '背埃迪回家', sub: '按住 D 缓慢前行', dialogue: [{ speaker: '蜘蛛侠', text: '埃迪？！怎么会是你！', voice: 'vo_d10', lock: true }], video: null
      };
    }
  };
  const s = ch2[id]();
  s.targets = s.targets || [];
  s.enemies = s.enemies || [];
  // 锚点网格化：所有 2D 关卡锚点统一吸附到 64px 格点，摆荡锚点始终落在格子上
  if (s.anchors) s.anchors = s.anchors.map(a => ({ x: snap(a.x), y: snap(a.y) }));
  return s;
}

export function create2D(hooks) {
  const canvas = document.getElementById('flat');
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * DPR; canvas.height = H * DPR;

  const S = hooks.state;
  let scene = null, camX = 0, camTarget = 0;
  const pixelBg = new Image();
  let pixelBgReady = false;
  pixelBg.onload = () => { pixelBgReady = true; };
  pixelBg.src = `${import.meta.env.BASE_URL}comics/ch1_pixel_bg.webp`;
  const player = { x: 200, y: 670, w: 58, h: 150, vx: 0, vy: 0, grounded: false, coyote: 0, jumpBuffer: 0, facing: 1, anim: 0, swing: null, swingCd: 0, dodge: 0, dodgeCd: 0, invuln: 0, carry: false };
  let enemies = [], targets = [], shots = [], projectiles = [], particles = [], shake = 0;

  function toast(t, ms, warn) { hooks.toast(t, ms, warn); }

  function enter(id) {
    scene = buildScene(id);
    S.chapter = scene.chapter;
    S.lockInput = 0; S.paused = false; S._hintPaused = false; S.dialogueActive = false;
    enemies = scene.enemies.map(e => ({ ...e }));
    targets = (scene.targets || []).map(t => ({ ...t }));
    shots = []; projectiles = []; particles = [];
    camX = camTarget = 0;
    player.x = scene.start.x; player.y = scene.start.y; player.vx = 0; player.vy = 0; player.swing = null; player.carry = !!scene.carry;
    // 开场安全落地：若出生点下方有平台，直接落在平台上，避免“开局持续下坠”
    const under = scene.platforms.find(p => player.x + player.w / 2 > p.x && player.x + player.w / 2 < p.x + p.w);
    if (under) { player.y = under.y - player.h; player.grounded = true; }
    S.respawn = { x: scene.start.x, y: scene.start.y };
    S.web = 60; S.objectiveProgress = ''; S.dialogueEndCallback = null;
    scene.heart = null; scene.heartCd = 0; // v19：爱心刷新区
    scene.webPack = null; scene.webPackCd = 0; // v22：蛛网液补充包刷新区
    hooks.hideEnemyBar();
    hooks.setObjective(scene.objective, scene.sub, '');
    if (scene.tutorial) { scene.tutStep = 0; } // v19：第一章教学状态机
    if (scene.id === 'G02') {
      // 先自由行动；碰到章鱼博士后触发两段对白 + 两张独立漫画；对话结束才开战
      scene.combatStarted = false; scene.introStarted = false;
      hooks.audio.stopBgm();
      hooks.setObjective('接近章鱼博士', '走到博士身边触发对话', '');
      S.lockInput = 0;
    } else if (scene.bgm) hooks.audio.bgm(scene.bgm);
    else hooks.audio.stopBgm();
    hooks.audio.ambience(scene.ambience || []);
    if (scene.dialogue && scene.dialogue.length && scene.id !== 'G02') hooks.sayQueue(scene.dialogue.slice());
    if (scene.boss) { scene.boss.state = 'idle'; scene.boss.timer = 1.5; scene.boss.webs = 0; scene.boss.lastSec = -1; }
  }

  function nearestAnchor() {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    let best = null, bestD = 1e9;
    for (const a of scene.anchors) { if (a.y > player.y + 40) continue; const d = dist(a.x, a.y, cx, cy); if (d < 520 && d < bestD) { best = a; bestD = d; } }
    return best;
  }
  function trySwing() {
    if (player.swing || player.swingCd > 0) return false;
    const a = nearestAnchor(); if (!a) { toast('附近没有可吸附的锚点', 1400, true); return false; }
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    player.swing = { a, len: clamp(dist(a.x, a.y, cx, cy), 160, 520) };
    player.grounded = false; player.vy = Math.min(player.vy, -120);
    hooks.audio.sfx('sfx_swing', 0.8);
    return true;
  }
  function releaseSwing() { if (!player.swing) return; player.vx += player.facing * 40; player.vy -= 160; player.swing = null; player.swingCd = 0.22; }
  function shootWeb() {
    if (S.web <= 0) { toast('蛛网液不足', 1200, true); return; }
    S.web--;
    shots.push({ x: player.x + player.w / 2, y: player.y + 96, vx: player.facing * 1400, vy: 0, life: 0.9 });
    hooks.audio.sfx('sfx_swing', 0.6);
  }
  function hurt(n) {
    if (player.invuln > 0) return;
    S.hearts -= n; player.invuln = 1;
    if (S.hearts <= 0) { S.hearts = S.maxHearts; toast('重新出发，心回满'); } else toast('受伤了！', 1300, true);
    respawn();
  }
  function respawn() {
    const r = S.respawn && Number.isFinite(S.respawn.x) ? S.respawn : scene.start;
    player.x = r.x; player.y = r.y; player.vx = 0; player.vy = 0; player.swing = null; player.grounded = false;
    const under = scene.platforms.find(p => player.x + player.w / 2 > p.x && player.x + player.w / 2 < p.x + p.w);
    if (under) { player.y = under.y - player.h; player.grounded = true; }
    player.invuln = Math.max(player.invuln, 0.8);
    camX = camTarget = clamp(player.x - W * 0.4, 0, scene.width - W);
  }

  function rectOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function updatePlayer(dt) {
    if (S.lockInput > 0) { S.lockInput -= dt; return; }
    const I = hooks.input;
    const move = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    const ACC = 2600, MAX = player.carry ? 260 : 520;
    if (move !== 0) { player.vx += move * ACC * dt * (player.grounded ? 1 : 0.7); player.facing = move; }
    else if (player.grounded && !player.swing) player.vx = approach(player.vx, 0, 2600 * dt);
    player.vx = clamp(player.vx, -MAX, MAX);
    if (I.dodge && player.dodgeCd <= 0 && !player.swing) { player.dodge = 0.22; player.dodgeCd = 1; player.invuln = 0.35; player.vx = player.facing * 780; player.vy = Math.min(player.vy, -60); }
    if (I.jumpBuffer > 0 && (player.grounded || player.coyote > 0)) { player.vy = -920; player.grounded = false; player.coyote = 0; I.jumpBuffer = 0; }
    player.vy += 2400 * dt; player.vy = Math.min(player.vy, 1800);
    if (player.swing) { player.vx += move * ACC * 0.3 * dt; if (!I.swingHeld) releaseSwing(); }
    player.x = clamp(player.x + player.vx * dt, 0, scene.width - player.w);
    for (const p of scene.platforms) if (rectOverlap(player, p)) { if (player.vx > 0) player.x = p.x - player.w; else if (player.vx < 0) player.x = p.x + p.w; player.vx = 0; }
    const prevBottom = player.y + player.h;
    player.y += player.vy * dt;
    let landed = false, landY = -1e9;
    for (const p of scene.platforms.concat(scene.oneways)) {
      if (p.oneway && player.vy < 0) continue;
      if (player.x + player.w > p.x + 2 && player.x < p.x + p.w - 2 && player.vy >= 0 && prevBottom <= p.y + 4 && player.y + player.h >= p.y) if (p.y > landY) { landY = p.y; landed = true; }
    }
    if (landed) { player.y = landY - player.h; player.vy = 0; player.grounded = true; player.coyote = 0.1; }
    else { player.grounded = false; player.coyote = Math.max(0, player.coyote - dt); }
    if (player.swing) {
      const a = player.swing.a, cx = player.x + player.w / 2, cy = player.y + player.h / 2;
      const dx = cx - a.x, dy = cy - a.y, dd = Math.hypot(dx, dy) || 1;
      if (dd > player.swing.len) { const nx = dx / dd, ny = dy / dd; player.x = a.x + nx * player.swing.len - player.w / 2; player.y = a.y + ny * player.swing.len - player.h / 2; const r = player.vx * nx + player.vy * ny; if (r > 0) { player.vx -= r * nx; player.vy -= r * ny; } }
      if (player.grounded) releaseSwing();
    }
    player.dodge = Math.max(0, player.dodge - dt); player.dodgeCd = Math.max(0, player.dodgeCd - dt); player.swingCd = Math.max(0, player.swingCd - dt); player.invuln = Math.max(0, player.invuln - dt);
    I.jumpBuffer = Math.max(0, I.jumpBuffer - dt);
    player.anim += dt * (Math.abs(player.vx) > 20 ? 1 : 0);
    if (I.shoot) { I.shoot = false; shootWeb(); }
    I.dodge = false;
    if (player.y > 980) {
      const under = scene.platforms.find(p => player.x + player.w / 2 > p.x && player.x + player.w / 2 < p.x + p.w);
      if (under) { player.y = under.y - player.h; player.vy = 0; player.grounded = true; toast('蛛丝把你拉了回来'); }
      else respawn();
    }
  }

  function setupClaws2D() {
    const b = scene.boss;
    targets = [
      { x: 1240, y: 560, r: 46, hit: false, claw: true, label: '爪 1' },
      { x: 1490, y: 500, r: 46, hit: false, claw: true, label: '爪 2' },
      { x: 1240, y: 400, r: 46, hit: false, claw: true, label: '爪 3' },
      { x: 1490, y: 340, r: 46, hit: false, claw: true, label: '爪 4' }
    ];
    b.bound = 0; b.timer = 30; b.lastSec = -1;
    hooks.setObjective('绑住 4 根机械爪（0/4）', '30 秒内朝发光爪点各射 1 发蛛网', '');
    hooks.setEnemyBar('机械爪', 4, 4);
  }
  function checkBind2D() {
    const b = scene.boss;
    if (b.bound >= 4) {
      b.phase = 3;
      hooks.hideEnemyBar();
      hooks.setObjective('拔除故障芯片', '靠近章鱼博士点击提示', '');
      toast('4 根机械爪已绑死！靠近博士点击提示');
    } else {
      hooks.setObjective('绑住 4 根机械爪（' + b.bound + '/4）', '30 秒内朝发光爪点各射 1 发蛛网', '');
    }
  }
  function hitDoc2D() {
    const b = scene.boss;
    if (!b || b.phase !== 1) return;
    b.hp = Math.min(3, b.hp + 1);
    hooks.setEnemyBar('章鱼博士', 3 - b.hp, 3);
    hooks.audio.sfx('sfx_mech');
    if (b.hp >= 3) { b.phase = 2; setupClaws2D(); toast('章鱼博士僵直！30 秒内射 4 个爪点'); }
  }
  function updateBoss2D(dt) {
    const b = scene.boss;
    if (!b) return;
    if (b.phase === 1) {
      b.throwTimer -= dt;
      if (b.throwTimer <= 0) {
        b.throwTimer = 2.4;
        projectiles.push({ x: 1580, y: 730, vx: -420, vy: 0, life: 8, reflected: false });
        hooks.audio.sfx('sfx_mech', 0.6);
      }
    } else if (b.phase === 2) {
      b.timer -= dt;
      const sec = Math.max(0, Math.ceil(b.timer));
      if (sec !== b.lastSec) {
        b.lastSec = sec;
        hooks.setObjective('绑住 4 根机械爪（' + b.bound + '/4）', '剩余 ' + sec + ' 秒', '');
      }
      if (b.timer <= 0) setupClaws2D();
    }
    // 工具箱投射物
    projectiles = projectiles.filter(p => (p.life -= dt) > 0);
    for (const p of projectiles) {
      p.x += p.vx * dt; p.y += (p.vy || 0) * dt;
      if (p.reflected) {
        if (p.x > 1520) { p.life = 0; hitDoc2D(); }
      } else if (player.invuln <= 0 && dist(p.x, p.y, player.x + player.w / 2, player.y + player.h / 2) < 60) {
        p.life = 0; hurt(1);
      }
    }
  }
  function onHandshake2D() {
    hooks.audio.sfx('sfx_mech');
    hooks.sayQueue([{ speaker: '蜘蛛侠', text: '一言为定，拐子！我现在就带你去楼下吃完热干面！', voice: 'vo_d04', lock: true, comic: 'comics/handshake.webp' }]);
    // D04 语音结束后，两人一起向右走出画面
    S.dialogueEndCallback = () => {
      scene.walkOut = true; scene.walkT = 0; S.lockInput = 9999;
      hooks.audio.sfx('sfx_jet');
    };
  }

  function checkG07() {
    const alive = enemies.filter(e => e.alive).length;
    hooks.setObjective('击败毒液小兵（' + (3 - alive) + '/3）', scene.sub, (3 - alive) + ' / 3');
    if (alive === 0) {
      toast('毒液小兵被清空，钢铁侠破门救场！');
      hooks.playVideo('v2', () => {
        hooks.audio.sfx('sfx_impact'); hooks.audio.sfx('sfx_jet');
        hooks.sayQueue([{ speaker: '钢铁侠', text: '退后，小蜘蛛！神盾局一检测到跨国传送门和共生体反应就通知我了，剩下的交给我！', voice: 'vo_d07', lock: true }]);
        setTimeout(() => hooks.goTo('G08'), 8500);
      });
    }
  }
  function hitVenom() {
    scene.boss.webs++;
    hooks.setObjective('困住毒液本体（' + scene.boss.webs + '/12）', scene.sub, scene.boss.webs + ' / 12');
    if (scene.boss.webs >= 12) { toast('毒液已被死死困住！点击提示呼叫钢铁侠！'); scene.boss.state = 'bound'; }
  }
  function callIronMan() { hooks.playVideo('v3', () => { hooks.audio.sfx('sfx_impact'); hooks.audio.sfx('sfx_misc'); hooks.goTo('G09'); }); }

  function startDocIntro() {
    if (!scene || scene.id !== 'G02' || scene.introStarted) return;
    scene.introStarted = true;
    S.lockInput = 9999;
    hooks.audio.stopBgm();
    hooks.hideEnemyBar();
    hooks.setObjective('与章鱼博士对峙', '听完两段对白，漫画与语音同步', '');
    S.dialogueEndCallback = () => {
      scene.combatStarted = true;
      S.lockInput = 0;
      hooks.setEnemyBar('章鱼博士', 3, 3);
      hooks.audio.bgm('bgm_battle');
      hooks.setObjective('反击章鱼博士（0/3）', '闪避工具箱，或左键蛛网弹把它甩回去', '');
    };
    hooks.sayQueue(scene.dialogue.slice());
  }

  /* v19：第一章三段教学（移动 → 跳跃 → 攻击），随玩家 x 推进 */
  function updateTutorial() {
    if (!scene.tutorial) return;
    const cx = player.x + player.w / 2;
    if (scene.tutStep === 0 && cx > 760) {
      scene.tutStep = 1;
      toast('跳！跨过楼顶间的缝隙', 1400);
      hooks.setObjective('新手教学（2/3）· 跳跃', '按「跳」跳过楼顶缝隙', '');
    } else if (scene.tutStep === 1 && cx > 1500) {
      scene.tutStep = 2;
      // v22：只激活教学目标小怪（tutTarget），装饰小怪始终 harmless，不挡玩家跳缝隙路线
      enemies.forEach(e => { if (e.tutTarget) e.harmless = false; });
      toast('用「网」发射蛛网弹！', 1400);
      hooks.setObjective('新手教学（3/3）· 攻击', '点「网」发射蛛网弹击中黑色小怪', '');
    } else if (scene.tutStep === 2) {
      const t = enemies.find(e => e.tutTarget);
      if (!t || !t.alive) {
        scene.tutStep = 3;
        toast('教学完成！向绿地中心进发！', 1800);
        hooks.setObjective('飞向武汉最高楼·绿地中心', '像素风 · 按住 E/右键摆荡', '');
      }
    }
  }

  function update(dt) {
    scene.t = (scene.t || 0) + dt;
    if (scene.walkOut) {
      scene.walkT += dt;
      player.x += 320 * dt; player.facing = 1; player.anim += dt * 10;
      scene.docX = (scene.docX || 950) + 280 * dt;
      if (scene.walkT > 6) { hooks.goTo('G04'); return; }
    }
    updatePlayer(dt);
    if (scene.id === 'G01') updateTutorial(); // v19：第一章三段教学
    if (scene.id === 'G02') {
      if (!scene.combatStarted) {
        if (!scene.introStarted && Math.abs(player.x + player.w / 2 - 1600) < 220) startDocIntro();
      } else {
        updateBoss2D(dt);
      }
    }
    // 小兵
    for (const e of enemies) {
      if (!e.alive) continue;
      // v21：教学阶段 harmless 的小怪静止不动；tutTarget 教学目标激活后也固定位置不巡逻（只等玩家射击），其余小怪正常移动
      if (!e.harmless && !e.tutTarget) {
        e.t += dt; e.x += e.dir * (85 + Math.sin(e.t * 1.6) * 26) * dt; // v19：移动速度减慢约 40%
        if (e.x < (e.minX ?? 60) || e.x > (e.maxX ?? scene.width - 120)) e.dir *= -1;
      }
      // v20：蘑菇怪贴地——跟随下方平台顶面移动，不再穿模/悬空
      const underP = scene.platforms.find(p => e.x + e.w / 2 > p.x && e.x + e.w / 2 < p.x + p.w);
      if (underP) e.y = underP.y - e.h;
      if (!e.harmless && player.invuln <= 0 && dist(player.x + player.w / 2, player.y + player.h / 2, e.x + e.w / 2, e.y + e.h / 2) < 78) hurt(1);
    }
    // 蛛网弹
    shots = shots.filter(s => (s.life -= dt) > 0);
    for (const s of shots) {
      s.x += s.vx * dt;
      if (s.x < 0 || s.x > scene.width) s.life = 0;
      for (const p of projectiles) if (!p.reflected && p.life > 0 && dist(s.x, s.y, p.x, p.y) < 40) { p.reflected = true; p.vx = 900; p.vy = -80; s.life = 0; }
      for (const t of targets) if (!t.hit && t.claw && dist(s.x, s.y, t.x, t.y) < (t.r || 40)) { t.hit = true; scene.boss.bound++; checkBind2D(); s.life = 0; break; }
      for (const e of enemies) if (e.alive && s.x > e.x && s.x < e.x + e.w && s.y > e.y && s.y < e.y + e.h) { s.life = 0; e.hp--; if (e.hp <= 0) { e.alive = false; if (scene.id === 'G01') toast('小怪被击飞！', 900); if (scene.id === 'G07') checkG07(); } break; }
      for (const t of targets) if (!t.hit && dist(s.x, s.y, t.x, t.y) < (t.r || 40)) { s.life = 0; if (scene.id === 'G05') { t.hit = true; hooks.playVideo('v1', () => { hooks.sayQueue([{ speaker: '蜘蛛侠', text: '哇哦！这金橙色的火花圈……不管了，黑色液体钻进去了，我得跟过去看看！', voice: 'vo_d06', lock: true }]); setTimeout(() => hooks.goTo('G06'), 9000); }); } break; }
      if (scene.id === 'G08' && s.x > scene.width - 560 && s.y > 440 && s.y < 800) { s.life = 0; hitVenom(); }
    }
    // G08 毒液状态机
    if (scene.id === 'G08' && scene.boss.state !== 'bound') {
      const b = scene.boss;
      if (b.state === 'idle' || b.state === 'stagger') { b.timer -= dt; if (b.timer <= 0) { b.state = b.state === 'idle' ? 'lunge' : 'idle'; b.timer = b.state === 'lunge' ? 0.8 : 1.4; if (b.state === 'stagger') b.state = 'idle'; } }
      else if (b.state === 'lunge') { b.timer -= dt; if (b.timer <= 0) { b.state = 'stagger'; b.timer = 1.6; toast('毒液陷入硬直，连按左键射网！'); } }
    }
    // 目标点
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    // v19：爱心加血——血量 1~2 颗时持续随机刷爱心，拾取 +1 心并播放“噔噔噔”
    scene.heartCd = Math.max(0, (scene.heartCd || 0) - dt);
    if (S.hearts <= 2 && !scene.heart && scene.heartCd <= 0) {
      const plats = scene.platforms.filter(p => Math.abs(p.x + p.w / 2 - cx) < 560);
      if (plats.length) {
        const p = plats[Math.floor(hash(scene.t + 31) * plats.length)];
        scene.heart = { x: clamp(p.x + 60 + hash(scene.t + 17) * Math.max(20, p.w - 140), 0, scene.width - 44), y: p.y, t: 0 };
      }
    }
    if (scene.heart) {
      scene.heart.t += dt;
      if (dist(cx, cy, scene.heart.x + 22, scene.heart.y - 20) < 64) {
        S.hearts = Math.min(S.maxHearts, S.hearts + 1);
        hooks.audio.sfx('sfx_heart');
        toast('恢复 1 颗心！', 1000);
        scene.heart = null; scene.heartCd = 1.4;
      }
    }
    // v22：蛛网液不足 10 时随机掉落补充包，拾取 +30（机制同爱心）
    scene.webPackCd = Math.max(0, (scene.webPackCd || 0) - dt);
    if (S.web < 10 && !scene.webPack && scene.webPackCd <= 0) {
      const plats = scene.platforms.filter(p => Math.abs(p.x + p.w / 2 - cx) < 560);
      if (plats.length) {
        const p = plats[Math.floor(hash(scene.t + 71) * plats.length)];
        scene.webPack = { x: clamp(p.x + 60 + hash(scene.t + 57) * Math.max(20, p.w - 140), 0, scene.width - 44), y: p.y, t: 0 };
      }
    }
    if (scene.webPack) {
      scene.webPack.t += dt;
      if (dist(cx, cy, scene.webPack.x + 22, scene.webPack.y - 20) < 64) {
        S.web = Math.min(S.webMax, S.web + 30);
        hooks.audio.sfx('sfx_misc');
        toast('蛛网液 +30！', 1000);
        scene.webPack = null; scene.webPackCd = 1.4;
      }
    }
    if (scene.goal && cx >= scene.goal.x - 60) {
      if (scene.id === 'G01') { hooks.audio.sfx('sfx_spider_sense'); hooks.goTo('G02'); }
      else if (scene.id === 'G04') hooks.goTo('G05');
      else if (scene.id === 'G06') hooks.goTo('G07');
      else if (scene.id === 'G09') hooks.goTo('G10');
    }
    // 节点
    if (scene.nodes && scene.nodes.length) { let reached = 0; for (const n of scene.nodes) if (n.reached) reached++; for (const n of scene.nodes) if (!n.reached && dist(cx, cy, n.x, n.y) < 110) { n.reached = true; reached++; hooks.audio.sfx('sfx_spider_sense', 0.5); } if (reached !== S._lastNodes) { S._lastNodes = reached; hooks.setObjective((scene.id === 'G04' ? '追踪黑色粘液（' + reached + '/5）' : '追踪黑液至废弃工厂（' + reached + '/4）'), scene.sub, reached + ' / ' + (scene.nodes.length)); } }
    // 收集
    for (const c of scene.collectibles) if (!c.taken && dist(cx, cy, c.x, c.y) < 64) { c.taken = true; S.parts++; hooks.audio.sfx('sfx_misc', 0.6); }
    // 相机
    camTarget = clamp(player.x + player.w / 2 - W * 0.42, 0, Math.max(0, scene.width - W));
    camX += (camTarget - camX) * Math.min(1, dt * 6);
    // 粒子
    particles = particles.filter(p => (p.life -= dt) > 0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }
    // F 交互提示（抖动）
    const cx0 = player.x + player.w / 2;
    if (S.dialogueActive || S.comicActive) hooks.hidePrompt();
    else if (scene.id === 'G02' && scene.combatStarted && scene.boss.phase === 3 && Math.abs(cx0 - 1600) < 180) hooks.setPrompt('拔除故障芯片');
    else if (scene.id === 'G03' && !scene.walkOut && targets[0] && !targets[0].hit && Math.abs(cx0 - targets[0].x) < 170) hooks.setPrompt('与章鱼博士握手');
    else hooks.hidePrompt();
  }

  function onInteract() {
    if (S.dialogueActive) { hooks.skipDialogue(); return; }
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    for (const t of targets) if (!t.hit && dist(cx, cy, t.x, t.y) < t.r + 80) {
      t.hit = true;
      if (scene.id === 'G03') { onHandshake2D(); return; }
      if (scene.id === 'G05') { hooks.playVideo('v1', () => { hooks.sayQueue([{ speaker: '蜘蛛侠', text: '哇哦！这金橙色的火花圈……不管了，黑色液体钻进去了，我得跟过去看看！', voice: 'vo_d06', lock: true }]); setTimeout(() => hooks.goTo('G06'), 9000); }); return; }
      return;
    }
    if (scene.id === 'G02' && scene.boss.phase === 3 && Math.abs(cx - 1600) < 160) { hooks.goTo('G03'); return; }
    if (scene.id === 'G08' && scene.boss.state === 'bound') callIronMan();
  }

  function px(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function drawPixelPlayer() {
    // v20：玩家像素精细度提升——明暗层次、面罩网纹、高光
    const x = Math.round(player.x + player.w / 2 - 20), y = Math.round(player.y + player.h);
    const red = '#c0392b', redL = '#d95a48', redD = '#7d2417', blue = '#2e4c8a', blueL = '#4a6cb0', dark = '#141018', eye = '#f4f1e8';
    const run = player.grounded && Math.abs(player.vx) > 20 ? Math.sin(player.anim * 14) : 0;
    const lean = Math.max(-4, Math.min(4, run * 4));
    // 腿：蓝裤 + 高光 + 靴
    px(x - 13 + lean * 0.5, y - 42, 11, 42, blue);
    px(x + 2 + lean * 0.5, y - 42, 11, 42, blue);
    px(x - 11 + lean * 0.5, y - 40, 4, 12, blueL); px(x + 4 + lean * 0.5, y - 40, 4, 12, blueL);
    px(x - 16 + lean * 0.5, y - 6, 16, 6, dark); px(x + 0 + lean * 0.5, y - 6, 16, 6, dark);
    // 身体：红甲 + 侧影 + 腰带
    px(x - 14, y - 96, 28, 56, redD);
    px(x - 14, y - 96, 28, 8, redL);
    px(x - 12, y - 88, 24, 30, red);
    px(x + 4, y - 88, 8, 30, redL);
    px(x - 14, y - 58, 28, 16, blue);
    px(x - 12, y - 56, 24, 4, blueL);
    // 手臂：红袖 + 手
    px(x - 24, y - 92, 9, 30, redD); px(x + 15, y - 92, 9, 30, redD);
    px(x - 23, y - 92, 6, 12, redL); px(x + 17, y - 92, 6, 12, redL);
    // 头罩：红 + 网纹 + 大眼
    px(x - 10, y - 122, 20, 22, redD);
    px(x - 10, y - 122, 20, 6, redL);
    px(x - 7, y - 116, 6, 8, eye); px(x + 1, y - 116, 6, 8, eye);
    px(x - 5, y - 115, 2, 4, '#ffffff'); px(x + 3, y - 115, 2, 4, '#ffffff');
    // 面罩网纹
    px(x - 10, y - 112, 20, 1, 'rgba(20,16,24,0.55)');
    px(x - 6, y - 108, 12, 1, 'rgba(20,16,24,0.55)');
    // 蛛网液喷射手部动作（摆荡时手部高亮）
    if (player.swing) { px(x + 18, y - 100, 6, 6, redL); px(x + 21, y - 98, 2, 2, '#fff2d4'); }
  }
  function drawPixelDocOck(ox, oy, t = 0) {
    // v22：按参考图——白色实验服、棕色短发、圆形黑墨镜；4 根红色大弧形机械臂（分段管、关节发光圆盘、末端三爪），缓慢波浪摆动
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // 三次贝塞尔曲线采样为折线点
    function cubicPts(p0, p1, p2, p3, n) {
      const out = [];
      for (let k = 0; k <= n; k++) {
        const u = k / n, u2 = u * u, u3 = u2 * u;
        const mt = 1 - u;
        out.push({
          x: mt * mt * mt * p0.x + 3 * mt * mt * u * p1.x + 3 * mt * u2 * p2.x + u3 * p3.x,
          y: mt * mt * mt * p0.y + 3 * mt * mt * u * p1.y + 3 * mt * u2 * p2.y + u3 * p3.y
        });
      }
      return out;
    }
    // 红色分段管机械臂
    function drawArm(pts) {
      const stroke = (w, c) => {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
        ctx.stroke();
      };
      stroke(17, '#4a0e14');    // 暗红底
      stroke(13, '#c0302b');    // 红主体
      stroke(5, '#e85a4a');     // 亮红高光
      // 分段环纹（黑色环）
      ctx.strokeStyle = '#4a0e14'; ctx.lineWidth = 3;
      for (let k = 1; k < pts.length - 1; k += 2) {
        const a = pts[k], b = pts[k + 1] || a;
        const dx = b.x - a.x, dy = b.y - a.y;
        const L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        ctx.beginPath();
        ctx.moveTo(a.x - nx * 7, a.y - ny * 7);
        ctx.lineTo(a.x + nx * 7, a.y + ny * 7);
        ctx.stroke();
      }
    }
    // 关节发光圆盘
    function joint(x, y) {
      ctx.fillStyle = '#7a1a1a';
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e84a3a';
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff4e0';
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // 末端三爪（张开的机械指）
    function clawTip(x, y, side, phase) {
      const open = 0.55 + Math.sin(phase) * 0.1;
      for (const a of [-open, 0, open]) {
        const ex = x + side * Math.cos(a) * 13;
        const ey = y + Math.sin(a) * 13;
        ctx.strokeStyle = '#4a0e14'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#d84030'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      }
    }

    // 4 根机械臂：0/1 为上爪（头顶两侧大弧），2/3 为下爪（身体侧下弯出）
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      const isUp = i === 0 || i === 1;
      const phase = t * 1.0 + i * 1.6;
      const sw = Math.sin(phase) * 6, cw = Math.cos(phase * 0.9) * 6;
      let pts;
      if (isUp) {
        pts = cubicPts(
          { x: ox + side * 6, y: oy - 88 },
          { x: ox + side * 66 + sw * 0.6, y: oy - 118 },
          { x: ox + side * 52 + sw * 0.8, y: oy - 205 },
          { x: ox + side * 92 + sw, y: oy - 185 + cw },
          12);
      } else {
        pts = cubicPts(
          { x: ox + side * 6, y: oy - 80 },
          { x: ox + side * 60 + sw * 0.5, y: oy - 50 },
          { x: ox + side * 78 + sw * 0.7, y: oy + 18 },
          { x: ox + side * 100 + sw, y: oy - 20 + cw },
          12);
      }
      drawArm(pts);
      // 关节圆盘：弧中段
      const jp = pts[Math.floor(pts.length * 0.55)];
      joint(jp.x, jp.y);
      // 末端三爪
      const tp = pts[pts.length - 1];
      clawTip(tp.x, tp.y, side, phase);
    }

    // 背部红色机械基座（身体两侧露出，与爪相连）
    px(ox - 30, oy - 100, 6, 22, '#a82820');
    px(ox + 24, oy - 100, 6, 22, '#a82820');
    px(ox - 26, oy - 100, 52, 14, '#8a2020');
    // 身体：白色实验服
    px(ox - 30, oy - 112, 60, 84, '#e6e6e2');
    px(ox - 30, oy - 112, 4, 84, '#b8b8b4');   // 外套左阴影
    px(ox + 26, oy - 112, 4, 84, '#f4f4f0');   // 右侧高光
    // 黑色内搭（外套敞开）
    px(ox - 10, oy - 102, 20, 64, '#26262e');
    // 白色翻领
    px(ox - 28, oy - 110, 13, 42, '#f4f4f0');
    px(ox + 15, oy - 110, 13, 42, '#f4f4f0');
    px(ox - 28, oy - 110, 3, 42, '#c8c8c4');
    px(ox + 25, oy - 110, 3, 42, '#c8c8c4');
    // 腰带
    px(ox - 30, oy - 42, 60, 8, '#3a3a30');
    px(ox - 4, oy - 40, 8, 4, '#c9a050');
    // 头：肤色 + 后脑阴影
    px(ox - 22, oy - 146, 44, 36, '#c9a27a');
    px(ox - 22, oy - 146, 44, 5, '#e0bd92');
    px(ox - 26, oy - 128, 6, 16, '#b08a62');
    // 棕色短发
    px(ox - 22, oy - 152, 44, 9, '#4a2c1a');
    px(ox - 24, oy - 146, 6, 12, '#4a2c1a');
    px(ox + 18, oy - 146, 6, 12, '#4a2c1a');
    px(ox - 16, oy - 150, 10, 5, '#5e3a24');
    px(ox + 6, oy - 150, 10, 5, '#5e3a24');
    // 圆形黑墨镜（细金属框 + 反光 + 镜桥）
    px(ox - 17, oy - 139, 16, 14, '#96969e'); px(ox + 1, oy - 139, 16, 14, '#96969e');
    px(ox - 15, oy - 137, 12, 10, '#1a1a24'); px(ox + 3, oy - 137, 12, 10, '#1a1a24');
    px(ox - 12, oy - 134, 3, 3, '#ffffff'); px(ox + 6, oy - 134, 3, 3, '#ffffff');
    px(ox - 1, oy - 136, 2, 8, '#96969e');
    // 嘴线 + 下巴
    px(ox - 8, oy - 126, 16, 2, '#8a5a3a');
    px(ox - 30, oy - 28, 60, 6, '#d8d8d4');    // 外套下摆
    // 腿：黑裤 + 深色鞋
    px(ox - 24, oy - 24, 18, 24, '#2a2a30');
    px(ox + 6, oy - 24, 18, 24, '#2a2a30');
    px(ox - 26, oy - 2, 20, 6, '#1a1410'); px(ox + 6, oy - 2, 20, 6, '#1a1410');
    ctx.restore();
  }
  function drawPixelMonster(e) {
    const x = Math.round(e.x), y = Math.round(e.y);
    // v19：蘑菇形小怪（体积变高）——圆顶帽 + 帽檐 + 柄身 + 白眼红瞳
    px(x + 14, y - 8, 26, 10, '#17111c');
    px(x + 6, y, 42, 16, '#17111c');
    px(x, y + 14, 54, 24, '#17111c');
    px(x - 2, y + 34, 58, 10, '#17111c');
    px(x + 10, y + 42, 34, 46, '#17111c');
    px(x + 6, y + 84, 42, 8, '#17111c');
    px(x + 12, y + 48, 12, 17, '#f4f1e8'); px(x + 30, y + 48, 12, 17, '#f4f1e8');
    px(x + 16, y + 52, 4, 8, '#c0392b'); px(x + 34, y + 52, 4, 8, '#c0392b');
    px(x + 18, y + 72, 18, 4, '#3a1410');
    // 帽上斑点
    px(x + 12, y + 10, 6, 6, '#241d2c'); px(x + 34, y + 16, 6, 6, '#241d2c');
  }
  function renderPixel() {
    // v20：画面比例自适应——画布跟随视口，逻辑坐标 1920×1080 居中等比缩放
    const cw = canvas.clientWidth || W, ch = canvas.clientHeight || H;
    const sc = Math.min(cw / W, ch / H) || 1;
    const ox = (cw - W * sc) / 2, oy = (ch - H * sc) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR * sc, 0, 0, DPR * sc, DPR * ox, DPR * oy);
    ctx.imageSmoothingEnabled = false;
    if (pixelBgReady) {
      // 参考图：废墟街道像素背景（视差）
      const scale = H / pixelBg.naturalHeight;
      const iw = pixelBg.naturalWidth * scale;
      const off = -((camX * 0.35) % iw);
      ctx.drawImage(pixelBg, off, -100, iw, H);
      ctx.drawImage(pixelBg, off + iw, -100, iw, H);
      ctx.fillStyle = 'rgba(20,12,10,0.18)';
      ctx.fillRect(0, 0, W, H);
    } else {
      const bands = ['#1b2a4a', '#2b4560', '#4f6a7a', '#a97a5a', '#e8b06a', '#f7d6a4'];
      for (let i = 0; i < bands.length; i++) px(0, i * 180, W, 181, bands[i]);
      px(1450 - camX * 0.04, 420, 72, 72, '#ffe3a0');
      px(1462 - camX * 0.04, 432, 48, 48, '#fff0c8');
      const f2 = (camX * 0.2) % 120;
      for (let i = 0; i < 42; i++) {
        const bx = i * 120 - f2 - 120, bh = 120 + Math.floor(hash(i) * 5) * 40;
        px(bx, 760 - bh, 96, bh, i % 2 ? '#26364a' : '#2f4158');
        for (let w = 0; w < 3; w++) {
          if (hash(i * 7 + w) > 0.42) px(bx + 18 + w * 24, 760 - bh + 26, 6, 9, '#e8c27a');
          if (hash(i * 11 + w) > 0.6) px(bx + 18 + w * 24, 760 - bh + 58, 6, 9, '#b8d0d8');
        }
      }
      px(0, 700, W, 140, '#2f5f74');
      for (let i = 0; i < 26; i++) { const wx = (i * 90 - camX * 0.3) % (W + 120); px(wx, 720 + (i % 4) * 12, 46, 3, 'rgba(220,240,240,0.35)'); }
      const bx0 = 220 - camX * 0.15;
      px(bx0, 620, 1100, 10, '#b8462f'); px(bx0, 610, 1100, 6, '#d9774f');
      for (let i = 0; i < 12; i++) { px(bx0 + i * 90, 590, 8, 50, '#8a2f22'); px(bx0 + i * 90 + 4, 596, 2, 38, '#5a1f16'); }
      for (let i = 0; i < 11; i++) px(bx0 + i * 90 + 8, 600, 82, 2, '#e8a06a');
      const pg = 780 - camX * 0.2;
      px(pg - 26, 560, 52, 120, '#6b3a2a');
      for (let i = 0; i < 4; i++) { px(pg - 44 - i * 4, 560 - i * 22, 88 + i * 8, 8, '#8a3a2a'); px(pg - 30, 552 - i * 22, 60, 10, '#5a2a20'); }
      px(pg - 4, 430, 8, 40, '#e8b04a');
    }

    ctx.save(); ctx.translate(-camX, 0);
    for (const p of scene.platforms) {
      px(p.x, p.y, p.w, H - p.y, '#3a2e24');
      // 石砖护岸纹理（与参考图江滩石阶衔接）
      for (let yy = p.y + 24; yy < H; yy += 34) {
        for (let xx = p.x + 4; xx < p.x + p.w - 4; xx += 56) {
          px(xx, yy, 48, 24, hash(xx + yy) > 0.5 ? '#4a3a2c' : '#43342a');
          px(xx + 6, yy + 5, 32, 2, '#5a4735');
        }
      }
      px(p.x, p.y, p.w, 16, '#6b5640');
      px(p.x, p.y, p.w, 4, '#8a6a4a');
      px(p.x, p.y - 8, p.w, 8, '#4f7a3a');
      for (let gx = p.x; gx < p.x + p.w; gx += 18) { px(gx, p.y - 14, 6, 6, '#6f9a4a'); px(gx + 9, p.y - 10, 4, 4, '#8ab85a'); }
    }
    for (const o of scene.oneways) { px(o.x, o.y, o.w, o.h, '#6b5640'); px(o.x, o.y, o.w, 4, '#8a6a4a'); }
    for (const a of scene.anchors) {
      // v20：锚点摆荡范围圈（半透明 20%，隐约可见）
      ctx.fillStyle = 'rgba(255,214,138,0.20)';
      ctx.beginPath(); ctx.arc(a.x, a.y, 260, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,138,0.10)';
      ctx.beginPath(); ctx.arc(a.x, a.y, 380, 0, Math.PI * 2); ctx.fill();
      px(a.x - 14, a.y - 4, 28, 8, '#ffd68a'); px(a.x - 4, a.y - 14, 8, 28, '#ffd68a'); px(a.x - 6, a.y - 6, 12, 12, '#fff2d4');
    }
    for (const t of targets) if (!t.hit) { px(t.x - 22, t.y - 22, 44, 44, '#332a1a'); px(t.x - 16, t.y - 16, 32, 32, '#ffd68a'); px(t.x - 6, t.y - 6, 12, 12, '#fff2d4'); }
    if (scene.id === 'G02') drawPixelDocOck(1600, 820, scene.t || 0);
    if (scene.id === 'G03') drawPixelDocOck(scene.docX || 950, 820, scene.t || 0);
    for (const p of projectiles) px(p.x - 16, p.y - 12, 32, 24, p.reflected ? '#ff8a3a' : '#d98a3a');
    for (const e of enemies) if (e.alive) drawPixelMonster(e);
    // v19：爱心（低血量持续刷新，浮动 + 白色高光）
    if (scene.heart) {
      const hx = Math.round(scene.heart.x + 22), hy = Math.round(scene.heart.y - 24 + Math.sin(scene.heart.t * 4) * 3);
      px(hx - 12, hy - 6, 24, 18, '#c0392b');
      px(hx - 8, hy - 12, 16, 10, '#c0392b');
      px(hx - 4, hy - 16, 8, 6, '#c0392b');
      px(hx - 10, hy - 8, 7, 8, '#ff8a92'); px(hx + 3, hy - 8, 7, 8, '#ff8a92');
      px(hx - 12, hy + 10, 24, 4, '#3a1410');
    }
    // v22：蛛网液补充包（蓝色液罐 + 金属盖 + 白色蛛网标识）
    if (scene.webPack) {
      const wx = Math.round(scene.webPack.x + 22), wy = Math.round(scene.webPack.y - 22 + Math.sin(scene.webPack.t * 4) * 3);
      px(wx - 11, wy - 8, 22, 22, '#2f6f8f');          // 罐体
      px(wx - 9, wy - 6, 8, 9, '#7ac0e0');              // 玻璃高光
      px(wx - 8, wy - 14, 16, 7, '#96969e');            // 金属盖
      px(wx - 5, wy - 16, 10, 3, '#d8d8e0');            // 盖顶
      px(wx - 6, wy - 2, 12, 10, '#e8f2f6');            // 白色标签
      px(wx - 4, wy - 1, 2, 2, '#2f6f8f'); px(wx + 2, wy - 1, 2, 2, '#2f6f8f');
      px(wx - 3, wy + 3, 6, 2, '#2f6f8f');
      px(wx - 11, wy + 12, 22, 4, '#16323f');           // 阴影
    }
    // v19：第一章教学标记（黄箭头 + 文字提示）
    // v20：显眼化——半透明背景卡片 + 粗描边文字 + 发光箭头（与「点击交互」提示同等醒目）
    if (scene.id === 'G01' && scene.tutorial) {
      ctx.textAlign = 'center';
      const tutCard = (cx, cy, w, h) => {
        ctx.fillStyle = 'rgba(20,14,10,0.85)';
        roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, 14); ctx.fill();
        ctx.strokeStyle = 'rgba(246,238,220,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      };
      const tutText = (txt, tx, ty, size) => {
        ctx.font = `800 ${size}px sans-serif`;
        ctx.strokeStyle = 'rgba(20,14,10,0.95)'; ctx.lineWidth = 5; ctx.strokeText(txt, tx, ty);
        ctx.fillStyle = '#fff2d4'; ctx.fillText(txt, tx, ty);
      };
      const tutArrow = (ax, ay, dir) => {
        ctx.save();
        ctx.strokeStyle = '#ffd68a'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(255,214,138,0.9)'; ctx.shadowBlur = 14;
        ctx.beginPath();
        if (dir === 'right') { ctx.moveTo(ax - 30, ay); ctx.lineTo(ax + 18, ay); ctx.lineTo(ax + 6, ay - 13); ctx.moveTo(ax + 18, ay); ctx.lineTo(ax + 6, ay + 13); }
        else { ctx.moveTo(ax, ay + 30); ctx.lineTo(ax, ay - 18); ctx.lineTo(ax - 13, ay - 6); ctx.moveTo(ax, ay - 18); ctx.lineTo(ax + 13, ay - 6); }
        ctx.stroke();
        ctx.restore();
      };
      if (scene.tutStep === 0) {
        const ax = 700, ay = 680;
        tutArrow(ax, ay, 'right');
        tutCard(ax, ay - 58, 250, 44);
        tutText('向右移动 ▶', ax, ay - 47, 24);
      } else if (scene.tutStep === 1) {
        const ax = 1280, ay = 630;
        tutArrow(ax, ay, 'down');
        tutCard(ax, ay + 46, 280, 44);
        tutText('按「跳」跨过缝隙 ⤒', ax, ay + 57, 24);
      } else if (scene.tutStep === 2) {
        const t = enemies.find(e => e.tutTarget);
        if (t && t.alive) {
          const ax = Math.round(t.x + 27), ay = Math.round(t.y - 34);
          px(ax - 16, ay - 8, 32, 8, '#ffd68a'); px(ax - 4, ay - 16, 8, 8, '#ffd68a');
          tutCard(ax, ay + 30, 240, 44);
          tutText('点「射」击败蘑菇怪！', ax, ay + 41, 24);
          ctx.font = '800 34px sans-serif';
          ctx.strokeStyle = 'rgba(20,14,10,0.95)'; ctx.lineWidth = 6; ctx.strokeText('!', ax, ay - 2);
          ctx.fillStyle = '#ffd68a'; ctx.fillText('!', ax, ay - 2);
        }
      }
    }
    // 白色蜘蛛丝（v19：一根细白线，2px 虚线）
    if (player.swing) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(player.x + player.w / 2, player.y + 44);
      ctx.lineTo(player.swing.a.x, player.swing.a.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawPixelPlayer();
    for (const s of shots) px(s.x - 4, s.y - 4, 8, 8, '#f3f1e8');
    for (const p of particles) px(p.x - 2, p.y - 2, 4, 4, p.color);
    ctx.restore();
  }

  function render() {
    if (scene.pixel) { renderPixel(); return; }
    // v20：画面比例自适应（与 renderPixel 相同映射）
    const cw = canvas.clientWidth || W, ch = canvas.clientHeight || H;
    const sc = Math.min(cw / W, ch / H) || 1;
    const ox = (cw - W * sc) / 2, oy = (ch - H * sc) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR * sc, 0, 0, DPR * sc, DPR * ox, DPR * oy);
    // 天空
    const themes = { dawn: ['#2b4d54', '#7f9385', '#f7d6a4'], dusk: ['#4a2c4f', '#b06a54', '#e8a86a'], night: ['#14222a', '#2b4a54', '#4a5560'] };
    const t = themes[scene.theme] || themes.dawn;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, t[0]); g.addColorStop(0.5, t[1]); g.addColorStop(1, t[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (scene.theme !== 'night') { const sx = 1500 - camX * 0.06; ctx.fillStyle = '#fff1c8'; ctx.beginPath(); ctx.arc(sx, 460, 52, 0, Math.PI * 2); ctx.fill(); }
    // 远景
    ctx.save(); ctx.translate(-camX * 0.18, 0);
    ctx.fillStyle = scene.theme === 'night' ? '#26363a' : '#9fb0a2'; ctx.fillRect(-400, 620, scene.width + 800, 220);
    for (let i = 0; i < 40; i++) { const bx = i * 200 - 200, bh = 150 + hash(i) * 240; ctx.fillStyle = scene.theme === 'night' ? '#26363a' : '#4b5d5c'; ctx.fillRect(bx, 660 - bh, 150, bh + 200); }
    ctx.restore();
    // 平台
    ctx.save(); ctx.translate(-camX, 0);
    for (const p of scene.platforms) { const b = ctx.createLinearGradient(0, p.y, 0, H); b.addColorStop(0, '#8a7255'); b.addColorStop(1, '#4c3c2d'); ctx.fillStyle = b; ctx.fillRect(p.x, p.y, p.w, H - p.y); ctx.fillStyle = '#b3936f'; ctx.fillRect(p.x, p.y, p.w, 12); ctx.fillStyle = '#e2c99c'; ctx.fillRect(p.x, p.y, p.w, 3); }
    for (const o of scene.oneways) { ctx.fillStyle = '#b3936f'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.fillStyle = '#e2c99c'; ctx.fillRect(o.x, o.y, o.w, 3); }
    for (let i = 0; i < scene.goo.length; i++) { const gg = scene.goo[i]; ctx.fillStyle = '#17111c'; ctx.beginPath(); ctx.ellipse(gg.x, gg.y - 4, gg.r, gg.r * 0.26, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const a of scene.anchors) { ctx.strokeStyle = 'rgba(255,214,140,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fff2d4'; ctx.beginPath(); ctx.arc(a.x, a.y, 4, 0, Math.PI * 2); ctx.fill(); }
    for (const n of scene.nodes || []) { if (!n.reached) { ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(n.x, n.y - 20, 24, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fff2d4'; ctx.font = '700 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n.l, n.x, n.y - 20); } else { ctx.strokeStyle = '#8fd8b0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(n.x - 10, n.y - 20); ctx.lineTo(n.x - 2, n.y - 12); ctx.lineTo(n.x + 12, n.y - 28); ctx.stroke(); } }
    for (const t of targets) if (!t.hit) { ctx.strokeStyle = '#ffb14a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fff2d4'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.label, t.x, t.y - t.r - 8); }
    for (const e of enemies) if (e.alive) { ctx.fillStyle = '#17111c'; ctx.beginPath(); ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f4f1e8'; ctx.beginPath(); ctx.ellipse(e.x + e.w / 2 - 14, e.y + 40, 10, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(e.x + e.w / 2 + 14, e.y + 40, 10, 16, 0, 0, Math.PI * 2); ctx.fill(); }
    if (scene.id === 'G08') { const vx = scene.width - 340, vy = 700; ctx.fillStyle = '#17111c'; ctx.beginPath(); ctx.ellipse(vx, vy, 150, 170, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f4f1e8'; ctx.beginPath(); ctx.ellipse(vx - 40, vy - 60, 26, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(vx + 40, vy - 60, 26, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd98a'; ctx.font = '700 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('毒液 ' + scene.boss.webs + '/12', vx, vy - 180); }
    // 玩家
    const px = player.x + player.w / 2, py = player.y + player.h;
    if (player.swing) { ctx.strokeStyle = 'rgba(240,240,220,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([10, 6]); ctx.beginPath(); ctx.moveTo(px + player.facing * 10, py - 108); ctx.lineTo(player.swing.a.x, player.swing.a.y); ctx.stroke(); ctx.setLineDash([]); }
    ctx.save(); ctx.translate(px, py); ctx.scale(player.facing, 1);
    if (player.invuln > 0 && Math.floor(S.time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
    const run = player.grounded && Math.abs(player.vx) > 20 ? Math.sin(player.anim * 14) : 0;
    const RED = '#c0392b', DARK = '#1d1a1c', BLUE = '#2e4c8a', EYE = '#f4f1e8';
    ctx.lineCap = 'round';
    ctx.strokeStyle = BLUE; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(-4, -56); ctx.lineTo(-4 - run * 16, -14); ctx.stroke();
    ctx.strokeStyle = RED; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-12, -96); ctx.lineTo(-16, -68); ctx.stroke();
    roundRectPath(ctx, -17, -108, 34, 52, 12); ctx.fillStyle = RED; ctx.fill(); ctx.strokeStyle = DARK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = BLUE; ctx.fillRect(-17, -72, 34, 16);
    ctx.strokeStyle = BLUE; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(4, -56); ctx.lineTo(4 + run * 16, -14); ctx.stroke();
    ctx.strokeStyle = RED; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(12, -96); ctx.lineTo(16, -68); ctx.stroke();
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, -128, 19, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = DARK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = EYE; ctx.beginPath(); ctx.ellipse(-7, -130, 7, 9, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(7, -130, 7, 9, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
    for (const s of shots) { ctx.fillStyle = '#f3f1e8'; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill(); }
    for (const p of particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function getHint() {
    const id = scene ? scene.id : '';
    if (id === 'G01') return { title: 'G01 · 飞向绿地中心', text: '像素风横版：按住 E / 右键吸附头顶发光锚点摆荡，A/D 移动、Space 跳跃；地面小怪碰到会扣血，左键 / J 蛛网弹可一击击飞。' };
    if (id === 'G02') {
      if (!scene.combatStarted) return { title: 'G02 · 接近章鱼博士', text: '沿天台向右走到章鱼博士身边，会触发两段对白和两张独立漫画；听完后战斗开始。' };
      const b = scene.boss;
      if (b.phase === 1) return { title: 'G02 · 反击章鱼博士', text: '等博士扔出工具箱。它飞近时按 Shift 闪避，或按左键 / J 射蛛网把工具箱反弹回去。命中 3 次后博士僵直。' };
      if (b.phase === 2) return { title: 'G02 · 绑住 4 根机械爪', text: '30 秒内朝 4 个发光爪点各射 1 发蛛网（左键 / J）；屏幕中心十字准星用来瞄准。超时会重置，可重试。' };
      return { title: 'G02 · 拔除芯片', text: '走到章鱼博士身边（画面右侧），点击提示拔掉后颈芯片。' };
    }
    if (id === 'G03') return { title: 'G03 · 握手言和', text: '听完博士的道谢，走到他身边点击提示击掌，剧情会进入 3D 第二章。' };
    if (id === 'G04') return { title: 'G04 · 追踪黑液', text: '沿地面的黑色粘液一路向右，经过 5 个发光节点即可抵达龟山电视塔。掉下去会回到最近检查点，不会卡关。' };
    if (id === 'G05') return { title: 'G05 · 穿过传送门', text: '走到右侧金橙色的传送门旁边，点击提示（或直接走进门里）触发过场。' };
    if (id === 'G06') return { title: 'G06 · 纽约追踪', text: '继续沿黑液痕迹向右穿过雨夜街巷，走到废弃工厂大门即可进入下一段。' };
    if (id === 'G07') return { title: 'G07 · 清掉毒液小兵', text: '用左键 / J 发射蛛网弹，每只小兵需要 3 发；清完 3 只钢铁侠就会破门救场。' };
    if (id === 'G08') return { title: 'G08 · 困住毒液', text: '躲开毒液的猛扑；它硬直时连续按左键 / J 射网，累计 12 层后点击提示呼叫钢铁侠。' };
    if (id === 'G09') return { title: 'G09 · 背埃迪回家', text: '按住 D / → 背着他向右走，走到公寓门口就会进入第三章。' };
    return { title: '提示', text: '继续向右推进剧情。' };
  }

  // v20：点击画面中的交互对象（章鱼博士/握手目标/传送门）同样触发交互（手机端无 F 键）
  function clickPick(nx, ny) {
    const wx = nx * W + camX, wy = ny * H;
    if (scene.id === 'G02' && scene.boss.phase === 3 && Math.abs(wx - 1600) < 230 && wy > 480) { onInteract(); return true; }
    if (scene.id === 'G03' && targets[0] && !targets[0].hit && dist(wx, wy, targets[0].x, targets[0].y) < 190) { onInteract(); return true; }
    if (scene.id === 'G05' && targets[0] && !targets[0].hit && dist(wx, wy, targets[0].x, targets[0].y) < 190) { onInteract(); return true; }
    return false;
  }

  return { enter, update, render, onInteract, trySwing, releaseSwing, shootWeb, getHint, clickPick };
}
