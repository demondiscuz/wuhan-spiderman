/* 入口：GameApp 编排 —— Three.js 3D（ch1/ch3）+ 2D Canvas（ch2），
 * 自动音视频卡位、对白、存档、输入、主循环。
 */
import * as THREE from 'three';
import { createAudio } from './audio.js';
import { playVideo as slotPlayVideo } from './video.js';
import { createUI } from './ui.js';
import { create3D } from './scenes3d.js';
import { create2D } from './scenes2d.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const AUTOSTART = params.has('autostart');
const START_SCENE = params.get('scene') || 'G01';

/* ---------- 渲染器 ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(1920, 1080, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0b08);
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.3));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(20, 30, 10); scene.add(sun);

const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 500);
camera.rotation.order = 'YXZ';

/* ---------- 状态 / 输入 ---------- */
const S = {
  mode: '3d', moduleId: '', chapter: 'ch1', chapterTitle: '', state: 'title', paused: false, completed: false,
  hearts: 5, maxHearts: 5, parts: 0, intel: 0, web: 60, webMax: 60,
  objective: '', objectiveSub: '', objectiveProgress: '', dialogueQueue: [], dialogueActive: false, lockInput: 0, muted: false, time: 0, respawn: {}, comicActive: false, dialogueEndCallback: null
};
const I = { left: false, right: false, forward: false, back: false, jump: false, dodge: false, swingHeld: false, shoot: false, up: false, interact: false, dx: 0, dy: 0, jumpBuffer: 0 };

const ORDER = ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10', 'G11'];
const CHAPTERS = {
  ch1: { kicker: '第一章', title: '不打不相识', sub: '2D 像素 · 武汉高空 ↔ 绿地中心' },
  ch2: { kicker: '第二章', title: '黑液迷踪', sub: '3D · 龟山电视塔 → 纽约' },
  ch3: { kicker: '第三章', title: '黄昏与金光', sub: '3D · 擦拭战衣 → 齐天大圣降临' }
};
const chapterOf = (id) => (id <= 'G03' ? 'ch1' : (id <= 'G09' ? 'ch2' : 'ch3'));
const LOCATIONS = {
  G01: '武汉·江滩', G02: '武汉·绿地中心', G03: '武汉·绿地中心', G04: '武汉·楼顶',
  G05: '龟山电视塔', G06: '纽约·街巷', G07: '纽约·废弃工厂', G08: '纽约·废弃工厂',
  G09: '纽约·街道', G10: '黄昏天台', G11: '黄昏天台'
};
const AVATARS = { '蜘蛛侠': '🕷', '章鱼博士': '🐙', '钢铁侠': '🤖', '毒液': '👾', '毒液与小兵': '👾', '孙悟空': '🐒' };
const COMICS = {
  v1: 'comics/v1.webp',
  v2: 'comics/v2.webp',
  v3: 'comics/v3.webp',
  v4: 'comics/v4.webp'
};

/* v18 章节资源预加载：跨章节过渡图片 + 每章所需音频/图片/视频清单 */
const CHAPTER_IMG = {
  ch2: `${import.meta.env.BASE_URL}comics/ch2_transition.webp`,
  ch3: `${import.meta.env.BASE_URL}comics/ch3_transition.webp`
};
const CHAPTER_ASSETS = {
  ch1: {
    audio: ['bgm_fly', 'bgm_battle', 'bgm_normal', 'sfx_wind', 'sfx_swing', 'sfx_impact', 'sfx_mech', 'sfx_jet', 'sfx_misc', 'vo_d00', 'vo_d01', 'vo_d02', 'vo_d03', 'vo_d04'],
    images: ['comics/docock.webp', 'comics/docock2.webp', 'comics/chip_pull.webp', 'comics/handshake.webp', 'comics/ch1_pixel_bg.webp'],
    video: ['v0']
  },
  ch2: {
    audio: ['bgm_normal', 'bgm_battle', 'sfx_wind', 'sfx_goo', 'sfx_portal', 'sfx_ambient_ny', 'sfx_swing', 'sfx_impact', 'sfx_mech', 'sfx_jet', 'sfx_misc', 'sfx_spider_sense', 'vo_d05', 'vo_d06', 'vo_d07', 'vo_d08', 'vo_d09', 'vo_d10'],
    images: ['comics/track.webp', 'comics/v1.webp', 'comics/v2.webp', 'comics/v3.webp', 'comics/eddie.webp'],
    video: []
  },
  ch3: {
    audio: ['bgm_normal', 'bgm_thanks', 'bgm_wukong', 'sfx_wind', 'sfx_swing', 'sfx_impact', 'sfx_mech', 'sfx_jet', 'sfx_misc', 'sfx_thunder', 'vo_d11', 'vo_d12'],
    images: ['comics/v4.webp', 'comics/wukong.webp'],
    video: []
  }
};

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = `${import.meta.env.BASE_URL}${src}`;
  });
}
function preloadVideo(id) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'auto'; v.muted = true; v.playsInline = true;
    let settled = false;
    const done = () => { if (settled) return; settled = true; v.removeAttribute('src'); v.load(); resolve(); };
    v.onloadeddata = done;
    v.onerror = done;
    v.src = `${import.meta.env.BASE_URL}video/${id}.mp4`;
    setTimeout(done, 15000); // 弱网兜底：15s 后视为完成，不阻塞进入
  });
}
function loadChapterAssets(ch, onProgress) {
  const c = CHAPTER_ASSETS[ch] || { audio: [], images: [], video: [] };
  let done = 0;
  const total = c.audio.length + c.images.length + c.video.length;
  const tick = () => { done++; if (onProgress && total) onProgress(done / total); };
  const tasks = [];
  for (const n of c.audio) tasks.push(audio.preload([n]).then(tick));
  for (const src of c.images) tasks.push(preloadImage(src).then(tick));
  for (const vid of c.video) tasks.push(preloadVideo(vid).then(tick));
  return Promise.all(tasks).then(() => done);
}

/* v13：平面二维卡通双手（手背 / 手心两张 SVG） */
const HAND_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
<g fill="#c0392b" stroke="#2b0d0a" stroke-width="6" stroke-linejoin="round">
<rect x="58" y="84" width="84" height="104" rx="30"/>
<rect x="60" y="38" width="17" height="62" rx="8"/><rect x="82" y="30" width="17" height="70" rx="8"/>
<rect x="104" y="36" width="17" height="66" rx="8"/><rect x="126" y="48" width="16" height="56" rx="8"/>
<rect x="33" y="106" width="28" height="21" rx="10" transform="rotate(-28 33 106)"/>
</g>
<g fill="none" stroke="#3a1410" stroke-width="2.6" opacity=".55">
<path d="M72 96 L128 150 M128 96 L72 150 M70 124 L130 124 M70 152 L130 152"/>
</g>
</svg>`;
const HAND_FRONT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
<g fill="#d94a35" stroke="#2b0d0a" stroke-width="6" stroke-linejoin="round">
<rect x="58" y="84" width="84" height="104" rx="30"/>
<rect x="60" y="38" width="17" height="62" rx="8"/><rect x="82" y="30" width="17" height="70" rx="8"/>
<rect x="104" y="36" width="17" height="66" rx="8"/><rect x="126" y="48" width="16" height="56" rx="8"/>
<rect x="33" y="106" width="28" height="21" rx="10" transform="rotate(-28 33 106)"/>
</g>
<g fill="none" stroke="#8a2f22" stroke-width="3" opacity=".7" stroke-linecap="round">
<path d="M74 110 Q100 132 126 110 M74 136 Q100 160 126 136 M74 162 Q100 184 126 162"/>
<path d="M86 92 Q100 78 114 92"/>
</g>
</svg>`;
let handTimer = 0;
function svgData(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
function initHands() {
  const l = document.getElementById('handLeft'), r = document.getElementById('handRight');
  if (!l || !r) return;
  l.src = svgData(HAND_BACK_SVG); r.src = svgData(HAND_BACK_SVG);
}
function handsShoot() {
  const wrap = document.getElementById('firstPersonHands');
  if (!wrap) return;
  const l = document.getElementById('handLeft'), r = document.getElementById('handRight');
  wrap.classList.add('shooting');
  if (l) l.src = svgData(HAND_FRONT_SVG);
  if (r) r.src = svgData(HAND_FRONT_SVG);
  clearTimeout(handTimer);
  handTimer = setTimeout(() => {
    wrap.classList.remove('shooting');
    if (l) l.src = svgData(HAND_BACK_SVG);
    if (r) r.src = svgData(HAND_BACK_SVG);
  }, 280);
}

const ui = createUI();
const audio = createAudio(DEBUG);

/* ---------- 对白 ---------- */
let dialogueTimer = 0;
function hideDialogue() {
  ui.el.dialogueBubble.classList.add('hidden');
  S.dialogueActive = false; S.lockInput = 0; audio.stopVo(); clearTimeout(dialogueTimer);
  if (!S.dialogueQueue.length) {
    const cb = S.dialogueEndCallback; S.dialogueEndCallback = null;
    if (!S.comicActive) hideComic();
    if (cb) cb();
  }
}
function nextDialogue() {
  if (!S.dialogueQueue.length) { hideDialogue(); return; }
  const d = S.dialogueQueue.shift();
  ui.el.dialogueSpeaker.textContent = d.speaker;
  ui.el.dialogueText.textContent = d.text;
  ui.el.dialogueAvatar.textContent = d.avatar || AVATARS[d.speaker] || '🕷';
  ui.el.dialogueBubble.classList.remove('hidden');
  S.dialogueActive = true;
  S.lockInput = d.lock ? 9999 : 0;
  clearTimeout(dialogueTimer);
  if (d.comic) showComic(d.comic, 0, null, { lock: false, persist: true });
  else if (!S.comicActive) hideComic();
  const fallback = d.duration || (d.voice ? 12000 : Math.max(2600, d.text.length * 220));
  dialogueTimer = setTimeout(() => { hideDialogue(); nextDialogue(); }, fallback);
  if (d.voice) audio.vo(d.voice, () => { clearTimeout(dialogueTimer); if (S.dialogueActive) { hideDialogue(); nextDialogue(); } });
}
function sayQueue(q) { S.dialogueQueue = q.slice(); nextDialogue(); }
function skipDialogue() { clearTimeout(dialogueTimer); nextDialogue(); }

/* ---------- 视频 / 漫画过场 ---------- */
let comicTimer = 0, comicDone = null;
function comicUrl(src) {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('/')) return src;
  return `${import.meta.env.BASE_URL}${src}`;
}
function showComic(src, duration, onDone, opts = {}) {
  const el = document.getElementById('comic');
  const img = document.getElementById('comicImg');
  const lock = opts.lock !== false;
  const persist = !!opts.persist;
  comicDone = onDone || null;
  gameComicActive(lock);
  el.classList.toggle('persist', persist);
  el.classList.toggle('full', !!opts.full);
  img.onerror = () => { if (S.comicActive) finishComic(); };
  img.src = comicUrl(src);
  el.classList.remove('hidden');
  clearTimeout(comicTimer);
  if (duration > 0) comicTimer = setTimeout(finishComic, duration);
}
function finishComic() {
  if (!S.comicActive) return;
  clearTimeout(comicTimer);
  document.getElementById('comic').classList.add('hidden');
  gameComicActive(false);
  const cb = comicDone; comicDone = null;
  if (cb) cb();
}
function hideComic() {
  clearTimeout(comicTimer);
  const el = document.getElementById('comic');
  if (el) { el.classList.add('hidden'); el.classList.remove('persist'); el.classList.remove('full'); }
  gameComicActive(false);
  comicDone = null;
}
function gameComicActive(v) { S.comicActive = v; }

function playVideo(id, onDone) {
  if (id === 'v0') {
    slotPlayVideo(ui.el.cutscene, id, (reason) => { if (reason === 'missing' || reason === 'timeout') ui.toast('开场视频缺失，使用引擎内开场', 1600); onDone && onDone(); });
    return;
  }
  if (COMICS[id]) { showComic(COMICS[id], 4500, onDone, { full: id === 'v4' }); return; }
  slotPlayVideo(ui.el.cutscene, id, (reason) => { if (reason === 'missing' || reason === 'timeout') ui.toast(`过场 ${id} 缺失，使用实时演出`, 1600); onDone && onDone(); });
}

/* ---------- hooks / 场景 ---------- */
const hooks = {
  state: S, input: I, audio, renderer, camera, scene,
  sayQueue, skipDialogue, playVideo,
  goTo: (id) => goTo(id), goNext: () => goNext(), end: () => end(),
  toast: (t, ms, warn) => ui.toast(t, ms, warn),
  setObjective: (t, s, p) => ui.setObjective(t, s, p),
  setLocation: (t) => ui.setLocation(t),
  setEnemyBar: (name, hp, max) => ui.setEnemyBar(name, hp, max),
  hideEnemyBar: () => ui.hideEnemyBar(),
  setPrompt: (text) => ui.showInteract(text),
  hidePrompt: () => ui.hideInteract(),
  showComic: (src, duration, onDone, opts) => showComic(src, duration, onDone, opts),
  handsShoot: () => handsShoot()
};
const scenes3d = create3D(hooks);
const scenes2d = create2D(hooks);
const active = () => (S.mode === '2d' ? scenes2d : scenes3d);

function setMode(mode) {
  S.mode = mode;
  $('gl').style.display = mode === '3d' ? 'block' : 'none';
  $('flat').style.display = mode === '2d' ? 'block' : 'none';
  ui.el.stage.classList.toggle('mode-2d', mode === '2d');
  const hands = document.getElementById('firstPersonHands');
  if (hands) hands.classList.toggle('hidden', mode !== '3d');
}

function enterScene(id) {
  const ch = S.chapter;
  const mode = ch === 'ch1' ? '2d' : '3d';
  setMode(mode);
  // 切场景时清理所有“暂停/锁输入/提示/血条/对白”残留，避免传送后无法操作
  S.lockInput = 0; S.paused = false; S._hintPaused = false; S.dialogueActive = false;
  S.dialogueQueue = [];
  clearTimeout(dialogueTimer);
  ui.el.dialogueBubble.classList.add('hidden');
  audio.stopVo();
  hideComic();
  ui.hideHint(); ui.hideEnemyBar(); ui.hideInteract(); audio.resume();
  ui.el.topLocation.textContent = LOCATIONS[id] || CHAPTERS[ch].title;
  ui.el.locationLabel.textContent = id + ' · ' + (LOCATIONS[id] || '');
  if (mode === '2d') scenes2d.enter(id); else scenes3d.enter(id);
}

function goTo(id) {
  const ch = chapterOf(id);
  const firstInChapter = ch !== S.chapterTitle;
  S.moduleId = id; S.chapter = ch;
  // v18：跨章节切换 → 显示章节过渡图 + 预加载该章全部资源（进度条 + 百分比），加载完自动进入
  if (firstInChapter && ch !== 'ch1') {
    S.chapterTitle = ch; // 立即标记，避免加载期间重复触发
    const img = CHAPTER_IMG[ch];
    ui.showLoading({ img });
    loadChapterAssets(ch, (p) => ui.updateLoading(p * 100)).then(() => {
      ui.hideLoading();
      enterScene(id);
    });
    return;
  }
  // ch1 首次进入已在 boot 预加载完成；章内切换直接进入（不再显示章节文字卡片）
  S.chapterTitle = ch;
  enterScene(id);
}
function goNext() { const i = ORDER.indexOf(S.moduleId); if (i >= 0 && i < ORDER.length - 1) goTo(ORDER[i + 1]); else end(); }
let creditsTimer = 0;
function playCredits() {
  const el = document.getElementById('credits');
  const track = document.getElementById('creditsTrack');
  if (!el || !track) { ui.el.goalOverlay.classList.remove('hidden'); return; }
  el.classList.remove('hidden');
  try { audio.bgm('bgm_thanks'); } catch (e) { console.warn(e); }
  track.style.animation = 'none';
  void track.offsetWidth;
  track.style.animation = 'creditsUp 14s linear forwards';
  clearTimeout(creditsTimer);
  creditsTimer = setTimeout(finishCredits, 14500);
}
function finishCredits() {
  clearTimeout(creditsTimer);
  try { audio.stopBgm(); } catch (e) {}
  const el = document.getElementById('credits');
  if (el) el.classList.add('hidden');
  ui.el.goalOverlay.classList.remove('hidden');
}
function end() { S.completed = true; S.state = 'complete'; audio.stopAll(); hideComic(); playCredits(); }

let introVoiceTimer = 0;
function playIntro() {
  const stage = document.getElementById('stage16x9');
  if (stage) stage.classList.add('video-mode');
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch (e) {}
  clearTimeout(introVoiceTimer);
  // v0 开始 1 秒后同步播放 vo_d00
  introVoiceTimer = setTimeout(() => { try { audio.vo('vo_d00'); } catch (e) { console.warn(e); } }, 1000);
  playVideo('v0', () => {
    clearTimeout(introVoiceTimer);
    if (stage) stage.classList.remove('video-mode');
    goTo('G01');
  });
}

/* ---------- 启动 / 暂停 / 重启 ---------- */
async function startGame() {
  if (S.state !== 'title') return;
  ui.el.startBtn.disabled = true;
  try { await audio.init(); } catch (e) { console.warn(e); }
  // v18：boot 启动画面预加载第一章全部资源（进度条 + 百分比），完成后进入开场，第一章游玩零临时加载
  ui.el.startOverlay.classList.add('hidden');
  ui.showLoading({ img: `${import.meta.env.BASE_URL}boot.webp` });
  S.state = 'playing'; S.moduleId = ''; setMode('3d');
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
  await loadChapterAssets('ch1', (p) => ui.updateLoading(p * 100));
  ui.hideLoading();
  try { audio.bgm('bgm_fly'); } catch (e) { console.warn(e); }
  playIntro();
}
function setPaused(v) { if (S.state !== 'playing' || S._hintPaused) return; S.paused = v; ui.el.pauseOverlay.classList.toggle('hidden', !v); if (v) audio.suspend(); else audio.resume(); }
function togglePause() { setPaused(!S.paused); }
function showHintCard() {
  if (!S.moduleId && S.state === 'title') { ui.showHint('开始游戏', '点击“开始游戏”进入第一章；游戏中使用 WASD 移动、鼠标转视角。'); return; }
  const h = S.moduleId ? active().getHint() : { title: '提示', text: '' };
  ui.showHint(h.title, h.text);
  if (S.state === 'playing' && !S.paused) {
    S._hintPaused = true; S.paused = true; audio.suspend();
    if (document.exitPointerLock) document.exitPointerLock();
  }
}
function hideHintCard(resume = true) {
  ui.hideHint();
  if (S._hintPaused) { S._hintPaused = false; if (resume) { S.paused = false; audio.resume(); } }
}
function toggleHint() {
  if (!ui.el.hintCard.classList.contains('hidden')) { hideHintCard(); return; }
  showHintCard();
}
function restart() {
  S.completed = false; S.state = 'playing'; S.paused = false;
  S.hearts = S.maxHearts; S.parts = 0; S.intel = 0; S.web = 60; S.chapterTitle = '';
  clearTimeout(creditsTimer);
  const credits = document.getElementById('credits');
  if (credits) credits.classList.add('hidden');
  ui.el.goalOverlay.classList.add('hidden'); ui.el.pauseOverlay.classList.add('hidden'); ui.el.startOverlay.classList.add('hidden');
  S.moduleId = ''; setMode('3d');
  audio.stopAll();
  try { audio.bgm('bgm_fly'); } catch (e) {}
  playIntro();
}

/* ---------- 输入 ---------- */
function bindInput() {
  window.addEventListener('keydown', (e) => {
    const c = e.code;
    if (S.comicActive) {
      if (['KeyF', 'Enter', 'Space', 'Escape'].includes(c)) { e.preventDefault(); finishComic(); }
      return;
    }
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(c)) e.preventDefault();
    if (c === 'KeyW' || c === 'ArrowUp') { I.forward = true; I.up = true; }
    if (c === 'KeyS' || c === 'ArrowDown') I.back = true;
    if (c === 'KeyA' || c === 'ArrowLeft') I.left = true;
    if (c === 'KeyD' || c === 'ArrowRight') I.right = true;
    if (c === 'Space' && !e.repeat) I.jumpBuffer = 0.12;
    if ((c === 'ShiftLeft' || c === 'ShiftRight') && !e.repeat) I.dodge = true;
    if (c === 'KeyE' && !e.repeat) { I.swingHeld = true; if (S.moduleId) active().trySwing(); }
    if (c === 'KeyJ' && !e.repeat) I.shoot = true;
    if (c === 'KeyF' && !e.repeat) { if (S.dialogueActive) skipDialogue(); else if (S.moduleId) active().onInteract(); }
    if (c === 'KeyP' || c === 'Escape') togglePause();
    if (c === 'KeyH' && !e.repeat) toggleHint();
    if (c === 'KeyR' && !e.repeat) restart();
  });
  window.addEventListener('keyup', (e) => {
    const c = e.code;
    if (c === 'KeyW' || c === 'ArrowUp') { I.forward = false; I.up = false; }
    if (c === 'KeyS' || c === 'ArrowDown') I.back = false;
    if (c === 'KeyA' || c === 'ArrowLeft') I.left = false;
    if (c === 'KeyD' || c === 'ArrowRight') I.right = false;
    if (c === 'ShiftLeft' || c === 'ShiftRight') I.dodge = false;
    if (c === 'KeyE') { I.swingHeld = false; if (S.moduleId && S.mode === '3d') scenes3d.releaseSwing(); else if (S.moduleId) scenes2d.releaseSwing(); }
  });
  window.addEventListener('mousemove', (e) => { I.dx += e.movementX || 0; I.dy += e.movementY || 0; });
  $('gl').addEventListener('click', () => { if (S.mode === '3d' && $('gl').requestPointerLock) $('gl').requestPointerLock(); });
  window.addEventListener('mousedown', (e) => {
    if (e.button === 2) { e.preventDefault(); I.swingHeld = true; if (S.moduleId) active().trySwing(); }
    if (e.button === 0) I.shoot = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) { I.swingHeld = false; if (S.moduleId) active().releaseSwing(); }
    if (e.button === 0) I.shoot = false;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  document.querySelectorAll('[data-touch]').forEach((btn) => {
    const act = btn.dataset.touch;
    const down = (e) => {
      e.preventDefault();
      if (act === 'left') I.left = true;
      if (act === 'right') I.right = true;
      if (act === 'jump') I.jumpBuffer = 0.12;
      if (act === 'shoot') I.shoot = true;
      if (act === 'interact') {
        if (S.dialogueActive) skipDialogue();
        else if (S.moduleId) active().onInteract();
      }
      if (act === 'swing') { I.swingHeld = true; if (S.moduleId) active().trySwing(); }
      if (act === 'dodge') I.dodge = true;
    };
    const up = (e) => { e.preventDefault(); if (act === 'left') I.left = false; if (act === 'right') I.right = false; if (act === 'swing') { I.swingHeld = false; if (S.moduleId) active().releaseSwing(); } };
    btn.addEventListener('pointerdown', down); btn.addEventListener('pointerup', up); btn.addEventListener('pointerleave', up);
  });
  ui.el.dialogueBubble.addEventListener('click', skipDialogue);
  document.getElementById('comic').addEventListener('click', finishComic);
  const creditsEl = document.getElementById('credits');
  if (creditsEl) creditsEl.addEventListener('click', finishCredits);
  ui.el.startBtn.addEventListener('click', startGame);
  ui.el.restartBtn.addEventListener('click', restart);
  ui.el.resumeBtn.addEventListener('click', togglePause);
  ui.el.btnPause.addEventListener('click', togglePause);
  ui.el.btnAudio.addEventListener('click', () => { S.muted = !S.muted; audio.setMuted(S.muted); ui.el.btnAudio.textContent = S.muted ? '🔇' : '♪'; });
  ui.el.btnHint.addEventListener('click', toggleHint);
  ui.el.hintClose.addEventListener('click', () => hideHintCard());
  ui.el.hintOk.addEventListener('click', () => hideHintCard());
  ui.el.hintRetry.addEventListener('click', () => {
    hideHintCard(false);
    S.paused = false; audio.resume();
    if (S.moduleId) goTo(S.moduleId);
    else if (S.state === 'title') startGame();
  });
  ui.el.btnFullscreen.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else ui.el.stage.requestFullscreen && ui.el.stage.requestFullscreen(); });
  ui.el.btnJournal.addEventListener('click', () => ui.toast(S.objective + ' —— ' + S.objectiveSub));
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.state === 'playing') setPaused(true); });
}

/* ---------- HUD ---------- */
function updateHUD() {
  ui.setHearts(S.hearts, S.maxHearts);
  ui.el.webFluid.textContent = S.web;
  ui.el.parts.textContent = S.parts;
  ui.el.intel.textContent = S.intel;
}

/* ---------- 主循环 ---------- */
let last = 0, fpsAcc = 0, fpsN = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
  if (S.state === 'playing' && !S.paused && S.moduleId) {
    S.time += dt;
    if (S.mode === '2d') { scenes2d.update(dt); scenes2d.render(); I.dx = 0; I.dy = 0; }
    else { scenes3d.update(dt); renderer.render(scene, camera); }
    updateHUD();
  } else if (S.mode === '2d') { scenes2d.render(); }
  else { renderer.render(scene, camera); }
  if (DEBUG) { fpsAcc += dt; fpsN++; if (fpsAcc >= 0.5) { ui.el.fps.textContent = Math.round(fpsN / fpsAcc); ui.el.fps.classList.remove('hidden'); fpsAcc = 0; fpsN = 0; } }
  requestAnimationFrame(frame);
}

/* ---------- 启动 ---------- */
ui.buildHearts(S.maxHearts);
ui.setHearts(S.hearts, S.maxHearts);
initHands();
bindInput();
setMode('3d');
requestAnimationFrame(frame);

if (AUTOSTART) {
  ui.el.startOverlay.classList.add('hidden');
  S.state = 'playing';
  goTo(START_SCENE);
} else if (params.has('start')) {
  // 测试用：自动触发开场视频
  setTimeout(() => { startGame(); }, 200);
}
// 测试用：?comic=v1 直接预览漫画过场
const TEST_COMIC = params.get('comic');
if (TEST_COMIC) {
  ui.el.startOverlay.classList.add('hidden');
  S.state = 'playing';
  showComic(COMICS[TEST_COMIC] || 'comics/wukong.webp', 0, () => {});
}
