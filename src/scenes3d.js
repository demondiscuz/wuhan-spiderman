/* 第一章/第三章（G01,G02,G03,G10,G11）3D 第一人称。
 * 程序化低模 + 简化碰撞 + 摆荡 + 蛛网弹 + 触发。无 GLB 依赖。
 * 约定：yaw=0 时朝 -Z 前进；场景推进沿 -Z 或 -X（本文件统一用 -Z 前向 + X 右向）。
 */
import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function create3D(hooks) {
  const { scene, camera, state: S, audio, input: I } = hooks;
  let group = null;
  let mod = null;
  const P = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    yaw: 0, pitch: 0, grounded: false, swing: null, swingCd: 0, dodge: 0, dodgeCd: 0, invuln: 0
  };
  let colliders = [], anchors = [], targets = [], projectiles = [], boss = null, shots = [];
  let enemies = [], nodes = [], portal = null, venom = null;
  let pedestrians = [];
  let webLine = null;
  let respawn = new THREE.Vector3(), started = false;

  const toast = (t, ms, warn) => hooks.toast(t, ms, warn);

  function clear() {
    if (group) { scene.remove(group); group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    group = new THREE.Group(); scene.add(group);
    colliders = []; anchors = []; targets = []; projectiles = []; shots = []; boss = null;
    enemies = []; nodes = []; portal = null; venom = null; pedestrians = [];
    if (webLine) { scene.remove(webLine); webLine.geometry.dispose(); webLine.material.dispose(); webLine = null; }
    if (mod && mod.heart) { scene.remove(mod.heart.m); mod.heart = null; }
    P.vel.set(0, 0, 0); P.swing = null; P.dodge = 0; P.dodgeCd = 0; P.invuln = 0; started = false;
  }

  function box(w, h, d, color, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color })); m.position.set(x, y, z); group.add(m); return m; }
  function sphere(r, color, x, y, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.4 })); m.position.set(x, y, z); group.add(m); return m; }
  function addCollider(cx, cz, w, d, topY = 0) { colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, top: topY }); }

  /* ---------- 武汉场景细化：江景 / 长江大桥 / 黄鹤楼 / 绿地中心 ---------- */
  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });

  function cyl(rt, rb, h, color, x, y, z, seg = 12, opts = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts));
    m.position.set(x, y, z); group.add(m); return m;
  }
  function cone(r, h, color, x, y, z, seg = 8, opts = {}) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color, opts));
    m.position.set(x, y, z); group.add(m); return m;
  }
  function plane(w, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); group.add(m); return m;
  }

  function buildPagoda(x, z) {
    // 石台基
    box(16, 3, 16, 0x6b4a35, x, 1.5, z);
    box(17, 0.4, 17, 0x8a6a4a, x, 3.2, z);
    let y = 3.4;
    // 五层楼阁：塔身上下宽度基本一致，不做上小下大的锥形
    for (let i = 0; i < 5; i++) {
      const w = 11;
      box(w, 4.2, w, 0x8a3a2a, x, y + 2.1, z);
      // 四角红柱
      for (const sx of [-w / 2 + 0.35, w / 2 - 0.35]) for (const sz of [-w / 2 + 0.35, w / 2 - 0.35]) {
        cyl(0.18, 0.22, 4.2, 0x5a1f16, x + sx, y + 2.1, z + sz, 8);
      }
      // 平座 / 腰檐（宽度一致，仅出檐）
      box(w + 3.4, 0.30, w + 3.4, 0x5a2a20, x, y + 4.25, z);
      box(w + 2.2, 0.16, w + 2.2, 0xd8a23f, x, y + 4.44, z);
      // 四角起翘
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        box(1.0, 0.22, 1.0, 0x7a3a26, x + sx * (w / 2 + 1.5), y + 4.55, z + sz * (w / 2 + 1.5));
      }
      // 正面窗 / 门
      box(2.2, 1.8, 0.10, 0x2a1a12, x, y + 2.05, z + w / 2 + 0.06);
      box(0.7, 2.2, 0.10, 0x3a241a, x, y + 1.35, z - w / 2 - 0.06);
      y += 5.4;
    }
    // 顶层攒尖顶 + 金塔刹
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 4.2, 8), mat(0x4a241c));
    roof.position.set(x, y + 2.1, z); group.add(roof);
    box(15.8, 0.3, 15.8, 0x5a2a20, x, y + 0.15, z);
    cyl(0.16, 0.4, 5, 0xe8b04a, x, y + 5.4, z, 6);
    cone(1.1, 3.0, 0xffd68a, x, y + 8.0, z, 6);
  }

  function buildGreenland(x, z) {
    // 裙楼 / 基座
    box(30, 8, 30, 0x6f7f8a, x, 4, z);
    box(24, 4, 24, 0x8fa2ad, x, 10, z);
    const glass = mat(0x6f93aa, { emissive: 0x1a2e3c, emissiveIntensity: 0.35 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 8.6, 96, 16), glass);
    tower.position.set(x, 58, z); group.add(tower);
    for (let i = 0; i < 16; i++) {
      const r = 4.6 + (8.6 - 4.6) * (1 - i / 16);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.08, r + 0.28, 1.15, 16), mat(0xc3d8e4, { emissive: 0x223a4a, emissiveIntensity: 0.25 }));
      band.position.set(x, 14 + i * 6.0, z); group.add(band);
    }
    // 竖向玻璃肋
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      box(0.55, 88, 0.55, 0xb8d0dc, x + Math.cos(a) * 5.6, 60, z + Math.sin(a) * 5.6);
    }
    cyl(3.6, 4.6, 10, 0x8fa6b5, x, 111, z, 16);
    cone(3.2, 12, 0x9fc0d2, x, 122, z, 16);
    cyl(0.18, 0.4, 20, 0xd8e6ee, x, 138, z, 6);
    // 顶部发光环
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.18, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffe0a0, fog: false }));
    ring.rotation.x = Math.PI / 2; ring.position.set(x, 110, z); group.add(ring);
  }

  function buildWuhanBackdrop() {
    // 长江江面（右侧）
    plane(430, 540, 0x2f5f74, 235, -1.4, -160);
    // 长江大桥（红色钢桁架）
    const bz = -120;
    box(420, 2.4, 10, 0xb8462f, 230, 7, bz);
    box(420, 1.4, 2, 0xd9774f, 230, 15, bz);
    for (let i = 0; i < 14; i++) box(1.2, 8, 1.2, 0xa33826, 30 + i * 30, 11, bz);
    for (const tx of [110, 350]) { box(7, 28, 9, 0x8a2f22, tx, 14, bz); box(3, 3, 2, 0xffd98a, tx, 27, bz); }
    // 黄鹤楼（左岸地标）
    buildPagoda(-30, -78);
    // 左岸 / 右岸 / 远景城市
    for (let i = 0; i < 26; i++) { const sx = -70 - (i % 6) * 18, sz = -30 - i * 11; const h = 26 + ((i * 37) % 55); box(14, h, 14, i % 2 ? 0x7b8790 : 0x8a969d, sx, h / 2, sz); box(10, h * 0.62, 0.14, 0xc6d8de, sx, h * 0.5, sz + 7.08); }
    for (let i = 0; i < 20; i++) { const sx = 60 + (i % 5) * 22, sz = -210 - i * 7; const h = 30 + ((i * 29) % 60); box(16, h, 16, i % 2 ? 0x6f7c86 : 0x7d8a92, sx, h / 2, sz); box(11, h * 0.6, 0.14, 0xb8ccd4, sx, h * 0.5, sz + 8.08); }
    for (let i = 0; i < 16; i++) { const sx = -140 + i * 24, sz = -300; const h = 20 + ((i * 41) % 50); box(18, h, 18, 0x9aa6ad, sx, h / 2, sz); }
    // 太阳
    const sun = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c8, fog: false }));
    sun.position.set(150, 62, -280); group.add(sun);
  }

  function buildRooftop() {
    // 直升机停机坪
    cyl(6.4, 6.4, 0.12, 0x5f5f5f, 0, 0.06, -6, 32);
    // 围栏
    for (let x = -14; x <= 14; x += 2) box(0.12, 1.2, 0.12, 0xb0a28e, x, 0.6, -19);
    for (let z = -18; z <= 8; z += 2) { box(0.12, 1.2, 0.12, 0xb0a28e, -14, 0.6, z); box(0.12, 1.2, 0.12, 0xb0a28e, 14, 0.6, z); }
    // 空调外机 / 天线
    for (const [x, z] of [[-9, -14], [9, -14], [11, 6]]) {
      box(2.6, 1.5, 2.6, 0x8a8278, x, 0.75, z);
      cyl(0.7, 0.7, 0.1, 0x2c2620, x, 1.55, z, 12);
    }
    cyl(0.08, 0.12, 9, 0xcccccc, 12.5, 4.5, -18, 6);
  }

  function buildDocOck(x, z) {
    const doc = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 2.3, 16), mat(0x2c3d2c)); body.position.y = 1.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), mat(0xc9a27a)); head.position.y = 2.65;
    doc.add(body); doc.add(head);
    // 圆形眼镜：外环 + 玻璃微光（v19 新增）
    const glasses = new THREE.Group();
    for (const gx of [-0.24, 0.24]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 10, 20), mat(0x222222));
      ring.position.set(gx, 2.72, 0.52); ring.rotation.y = Math.PI / 2;
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat(0x66ccff, { emissive: 0x66ccff, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 }));
      glass.position.set(gx, 2.72, 0.52);
      glasses.add(ring); glasses.add(glass);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.07), mat(0x222222));
    bridge.position.set(0, 2.72, 0.52); glasses.add(bridge);
    doc.add(glasses);
    // 灰白背头/发丝：头顶后部束起 + 两侧垂发（v19 新增）
    const hair = new THREE.Group();
    const hairMat = mat(0xcfc8c0);
    for (let i = 0; i < 6; i++) {
      const strand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52 - i * 0.05, 0.09), hairMat);
      strand.position.set(-0.26 + i * 0.1, 2.98 + (i % 2) * 0.05, -0.3);
      strand.rotation.x = 0.38 + (i % 3) * 0.14;
      hair.add(strand);
    }
    for (const sx of [-0.52, 0.52]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.58, 0.12), hairMat);
      side.position.set(sx, 2.6, -0.32); side.rotation.x = 0.5; side.rotation.z = sx * 0.35;
      hair.add(side);
    }
    doc.add(hair);
    // 红芯片
    const chip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0x1a1a1a, { emissive: 0xff3b2f, emissiveIntensity: 1.2 }));
    chip.position.set(0, 2.2, 0.45); doc.add(chip);
    // 4 根机械爪从身体背后伸出：海带式波浪摆动 + 末端张开成机械爪花（v19 重构）
    const arms = [];
    const armXs = [-0.72, -0.34, 0.34, 0.72];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.5, 8), mat(0xa83228));
      s1.position.y = 0.75; s1.rotation.x = 0.5; g.add(s1);
      const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.3, 8), mat(0xc0392b));
      s2.position.set(0, 1.9, -0.2); s2.rotation.x = 0.95; g.add(s2);
      const s3 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.0, 8), mat(0xd94a35));
      s3.position.set(0, 3.05, -0.5); s3.rotation.x = 1.35; g.add(s3);
      // 末端花瓣（4 瓣机械爪张开）
      const petalMat = mat(0xe05a42);
      for (let p = 0; p < 4; p++) {
        const petal = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 6), petalMat);
        petal.position.set(0, 3.78, -0.64);
        petal.rotation.x = 1.35 + Math.PI * (p % 2);
        petal.rotation.z = (p - 1.5) * 0.28;
        g.add(petal);
      }
      g.position.set(armXs[i], 1.3, -0.9);
      g.rotation.y = (armXs[i] > 0 ? -1 : 1) * (0.25 + Math.abs(armXs[i]) * 0.5);
      g.userData.baseRx = 0; g.userData.baseRz = 0; g.userData.phase = i * 1.3;
      doc.add(g);
      arms.push(g);
    }
    doc.position.set(x, 0, z); group.add(doc);
    doc.userData.arms = arms;
    return doc;
  }

  function buildSkyDome(top, mid, bottom) {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, top); grd.addColorStop(0.55, mid); grd.addColorStop(1, bottom);
    g.fillStyle = grd; g.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(430, 32, 20),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
    );
    group.add(dome);
  }

  function buildEnv(theme, opts = {}) {
    if (theme === 'night') {
      scene.background = new THREE.Color(0x0e1820);
      scene.fog = new THREE.Fog(0x1a2a33, 30, 190);
      buildSkyDome('#0b141c', '#1d3440', '#3a4a4a');
    } else if (theme === 'dusk') {
      scene.background = new THREE.Color(0x4a2c4f);
      scene.fog = new THREE.Fog(0x8a5a52, 40, 230);
      buildSkyDome('#3a2240', '#b06a54', '#f0b06a');
    } else {
      scene.background = new THREE.Color(0x9fc6d8);
      scene.fog = new THREE.Fog(0xd6c6ae, 50, 300);
      buildSkyDome('#2b4d54', '#a8b9ad', '#f7d6a4');
    }
    for (const r of opts.rows || []) { box(r.w, r.h, r.d, r.color, r.x, -r.h / 2, r.z); addCollider(r.x, r.z, r.w, r.d, 0); }
    // v20：3D 锚点——半透明摆荡范围圈（20% 隐约可见）+ 锚点金色光点
    for (const a of opts.anchors || []) {
      const v = new THREE.Vector3(a.x, a.y, a.z);
      anchors.push(v);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 5.0, 36),
        new THREE.MeshBasicMaterial({ color: 0xffd68a, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(v);
      group.add(ring);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd68a }));
      dot.position.copy(v);
      group.add(dot);
    }
  }

  function buildWorkbench(x, z) {
    box(3.6, 0.14, 1.6, 0x6a4a2a, x, 1.08, z);
    for (const lx of [-1.5, 1.5]) for (const lz of [-0.55, 0.55]) box(0.12, 1.0, 0.12, 0x3a2a1a, x + lx, 0.5, z + lz);
    // 战衣支架 + 战衣
    box(0.12, 2.0, 0.12, 0x555555, x - 1.1, 1.0, z - 0.2);
    box(0.12, 2.0, 0.12, 0x555555, x + 1.1, 1.0, z - 0.2);
    box(1.1, 1.5, 0.28, 0xc0392b, x, 2.0, z - 0.2);
    sphere(0.30, 0xc0392b, x, 2.85, z - 0.2);
    box(0.7, 0.8, 0.22, 0x2e4c8a, x, 1.45, z - 0.2);
    // 工作灯
    cyl(0.06, 0.08, 2.2, 0x444444, x + 1.8, 1.1, z + 0.4, 6);
    sphere(0.18, 0xffd68a, x + 1.8, 2.3, z + 0.4);
  }

  function buildCozyHouse(x, z) {
    // 两层小楼 + 亮灯窗户 + 暖光
    box(9, 6.5, 8, 0x8a6a4a, x, 3.2, z);
    box(9.6, 0.5, 8.6, 0x4a2a20, x, 6.6, z);
    box(7.6, 0.5, 7.0, 0x5a2f22, x, 7.1, z);
    box(5.4, 0.5, 5.0, 0x6b3a2a, x, 7.6, z);
    for (const wx of [-2.2, 2.2]) {
      box(1.8, 1.8, 0.1, 0x6a4a2a, x + wx, 4.4, z + 3.62);
      box(1.8, 1.8, 0.1, 0x6a4a2a, x + wx, 1.9, z + 3.62);
      box(1.5, 1.5, 0.12, 0xffd68a, x + wx, 4.4, z + 3.68);
      box(1.5, 1.5, 0.12, 0xffd68a, x + wx, 1.9, z + 3.68);
    }
    box(1.7, 2.6, 0.12, 0x3a241a, x, 1.3, z + 3.62);
    const warm = new THREE.PointLight(0xffb060, 3.2, 26);
    warm.position.set(x, 4.2, z + 3.4); group.add(warm);
  }

  function buildPagodaLow(x, z, baseY) {
    box(14, 3, 14, 0x6b4a35, x, baseY + 1.5, z);
    let y = baseY + 3;
    for (let i = 0; i < 5; i++) {
      box(9, 4, 9, 0x8a3a2a, x, y + 2, z);
      box(12.5, 0.28, 12.5, 0x4a241c, x, y + 4.1, z);
      box(10.5, 0.14, 10.5, 0xd8a23f, x, y + 4.28, z);
      y += 5.0;
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 3.6, 8), mat(0x4a241c));
    roof.position.set(x, y + 1.8, z); group.add(roof);
    cone(1.0, 2.6, 0xffd68a, x, y + 4.6, z, 6);
  }

  function buildWuhanPanorama() {
    // 高空视角：江面 / 三镇 / 长江大桥 / 黄鹤楼 / 龟山电视塔
    plane(900, 900, 0x2f5f74, 160, -42, -180);
    for (let i = 0; i < 34; i++) { const wx = -180 + i * 22; box(14, 0.04, 2, 0x5f8fa0, wx, -41.9, -150 + (i % 4) * 16); }
    // 长江大桥
    box(500, 2.6, 10, 0xb8462f, 170, -38, -120);
    box(500, 1.2, 1.8, 0xd9774f, 170, -32, -120);
    for (let i = 0; i < 16; i++) box(1.2, 7, 1.2, 0xa33826, -40 + i * 28, -35, -120);
    for (const tx of [60, 300]) { box(7, 24, 9, 0x8a2f22, tx, -30, -120); }
    // 三镇楼群
    for (let i = 0; i < 60; i++) {
      const cluster = i % 3;
      const sx = cluster === 0 ? -130 - (i % 8) * 13 : cluster === 1 ? -20 + (i % 8) * 12 : 70 + (i % 8) * 14;
      const sz = -60 - Math.floor(i / 3) * 8;
      const h = 18 + ((i * 37) % 46);
      box(11, h, 11, i % 2 ? 0x6f7c86 : 0x7d8a92, sx, -42 + h / 2, sz);
      box(7, h * 0.55, 0.12, 0xb8ccd4, sx, -42 + h * 0.5, sz + 5.55);
    }
    buildPagodaLow(-78, -92, -42);
    // 龟山电视塔：塔身从高空平台下方贯穿，顶部天线
    cyl(4.4, 7.2, 44, 0xd8d8d8, -20, -22, -6, 16);
    cyl(7.0, 7.0, 2.4, 0xcfd8dc, -20, 0.8, -6, 16);
    cyl(3.4, 4.6, 10, 0xb8c4c8, -20, 7, -6, 16);
    cone(1.4, 9, 0xcfd8dc, -20, 16.5, -6, 8);
    // 平台护栏
    for (let x = -15; x <= 15; x += 3) { box(0.10, 1.1, 0.10, 0xb0a28e, x, 0.55, -15); box(0.10, 1.1, 0.10, 0xb0a28e, x, 0.55, 15); }
    for (let z = -15; z <= 15; z += 3) { box(0.10, 1.1, 0.10, 0xb0a28e, -15, 0.55, z); box(0.10, 1.1, 0.10, 0xb0a28e, 15, 0.55, z); }
  }

  /* v19：纽约天际线——帝国大厦（退台+尖顶天线）、自由女神像（绿色远景剪影）、街道霓虹灯 */
  function buildNewYorkBackdrop() {
    // 帝国大厦（远景左上方）：退台式楼体 + 尖顶天线 + 红色航标灯
    const emp = new THREE.Group();
    const tiers = [[9, 16, 0x39454c], [7.4, 13, 0x3d4d5a], [5.6, 10, 0x414f5e], [4, 7, 0x455464]];
    let ey = 0;
    for (const [w, h, c] of tiers) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(c));
      m.position.y = ey + h / 2; emp.add(m); ey += h;
    }
    const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 9, 8), mat(0x4a5a68));
    spike.position.y = ey + 4.5; emp.add(spike);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5544, fog: false }));
    beacon.position.y = ey + 9.2; emp.add(beacon);
    emp.position.set(-58, 0, -168); group.add(emp);
    // 帝国大厦窗灯
    for (let i = 0; i < 14; i++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffd98a : 0x9ad0d8 }));
      win.position.set(-58 + (i % 4) * 2 - 3, 4 + Math.floor(i / 4) * 5, -169.3); group.add(win);
    }
    // 自由女神像（远景右下方，绿色剪影清晰可辨：基座+裙身+身体+头冠+高举火炬）
    const st = new THREE.Group();
    const green = mat(0x5fa083, { emissive: 0x2f6a4f, emissiveIntensity: 0.4 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.2, 3.6), mat(0x6a6a72)); base.position.y = 2.1; st.add(base);
    const gown = new THREE.Mesh(new THREE.ConeGeometry(1.7, 4.2, 4), green); gown.position.y = 6.2; st.add(gown);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.4, 1.15), green); body.position.y = 9.3; st.add(body);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 0.4), green); lArm.position.set(0.85, 9.9, 0); lArm.rotation.z = -0.62; st.add(lArm);
    const torch = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xffb14a, fog: false }));
    torch.position.set(1.92, 11.2, 0); st.add(torch);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), green); head.position.y = 11.5; st.add(head);
    for (let c = -1; c <= 1; c++) {
      const cr = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 6), green);
      cr.position.set(c * 0.18, 11.9, 0); cr.rotation.z = c * 0.22; st.add(cr);
    }
    st.position.set(62, 0, -240); group.add(st);
    // 街道霓虹灯招牌（两侧彩色发光牌 + 光点）
    mod.neonSigns = [];
    const neonCols = [0xff3b5c, 0x3be8ff, 0xffd23b, 0x9bff5a, 0xff7ae0];
    for (let i = 0; i < 7; i++) {
      const side = i % 2 ? 1 : -1;
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.6, 0.22), mat(0x2a2a2e));
      pole.position.set(side * 5.8, 1.8, -18 - i * 14); group.add(pole);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.14), new THREE.MeshBasicMaterial({ color: neonCols[i % neonCols.length] }));
      sign.position.set(side * 5.8, 3.9, -18 - i * 14); group.add(sign);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: neonCols[i % neonCols.length], transparent: true, opacity: 0.55 }));
      glow.position.set(side * 5.8, 3.9, -18 - i * 14); group.add(glow);
      mod.neonSigns.push(sign);
    }
  }

  function buildPedestrians(count, xAbs, zMin, zMax) {
    const shirts = [0x5a6f8a, 0x8a5a4a, 0x4a6a5a, 0x7a6a9a, 0x9a6a4a];
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const shirt = shirts[i % shirts.length];
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.0, 0.30), mat(shirt)); body.position.y = 0.95;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 8), mat(0xd9b08a)); head.position.y = 1.58;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.16), mat(0x2a2a33)); legL.position.set(-0.12, 0.34, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.16), mat(0x2a2a33)); legR.position.set(0.12, 0.34, 0);
      g.add(body); g.add(head); g.add(legL); g.add(legR);
      const side = i % 2 ? 1 : -1;
      g.position.set(side * (xAbs - (i % 3) * 0.8), 0, zMin + (zMax - zMin) * ((i + 1) / (count + 1)));
      group.add(g);
      const a = Math.random() * Math.PI * 2;
      pedestrians.push({ g, xAbs, zMin, zMax, vx: Math.cos(a) * 0.65, vz: Math.sin(a) * 0.65, change: 1 + Math.random() * 2 });
    }
  }
  function buildStreetLamps(x, zMin, zMax) {
    for (let z = zMin; z >= zMax; z -= 16) {
      for (const sx of [-x, x]) {
        cyl(0.05, 0.07, 4.2, 0x26262c, sx, 2.1, z, 6);
        sphere(0.14, 0xffd68a, sx, 4.25, z);
      }
    }
  }
  function buildStreetFurniture(x, zMin, zMax) {
    for (let z = zMin; z >= zMax; z -= 24) {
      for (const sx of [-x, x]) {
        box(1.8, 0.14, 0.6, 0x6a4a2a, sx, 0.55, z);
        box(1.8, 0.5, 0.10, 0x5a3a22, sx, 0.8, z - 0.26);
        box(0.10, 0.55, 0.55, 0x3a2a1a, sx - 0.8, 0.28, z);
        box(0.10, 0.55, 0.55, 0x3a2a1a, sx + 0.8, 0.28, z);
      }
    }
  }

  function buildGrassField(y = -2) {
    plane(1100, 1100, 0x466b34, 0, y, -120);
    for (let i = 0; i < 36; i++) { const gx = -160 + (i % 12) * 28, gz = -30 - Math.floor(i / 12) * 42; box(7, 0.8, 7, 0x5f8a42, gx, y + 0.4, gz); }
    for (let i = 0; i < 22; i++) { const gx = -150 + (i % 11) * 30, gz = -30 - Math.floor(i / 11) * 30; cyl(0.25, 0.35, 4, 0x3f6b2e, gx, y + 2, gz, 5); }
  }

  function enter(id) {
    clear(); mod = { id }; started = false;
    S.lockInput = 0; S.paused = false; S._hintPaused = false; S.dialogueActive = false;
    hooks.hideEnemyBar();
    S.chapter = (id <= 'G03') ? 'ch1' : (id <= 'G09' ? 'ch2' : 'ch3');
    if (id === 'G01') {
      const rows = []; for (let i = 0; i < 10; i++) rows.push({ x: 0, z: -i * 16, w: 12, h: 40, d: 24, color: 0x9aa0a6 });
      const anchors3 = []; for (let i = 0; i < 9; i++) anchors3.push({ x: 0, y: 9, z: -i * 16 - 8 });
      buildEnv('dawn', { rows, anchors: anchors3 });
      buildWuhanBackdrop();
      buildGreenland(0, -150);
      mod.goal = -150;
      P.pos.set(0, 0, -2); P.yaw = 0; respawn.set(0, 0, -2);
      hooks.setObjective('飞向武汉最高楼·绿地中心', 'WASD 移动 · 鼠标视角 · E/右键摆荡', '');
      hooks.audio.bgm('bgm_fly'); hooks.audio.ambience(['sfx_wind']);
    }
    else if (id === 'G02') {
      buildEnv('dawn', { rows: [{ x: 0, z: 0, w: 30, h: 40, d: 40, color: 0x8f8778 }], anchors: [{ x: 0, y: 8, z: 0 }] });
      buildWuhanBackdrop();
      buildRooftop();
      const doc = buildDocOck(0, -10); mod.docArms = doc.userData.arms;
      boss = { hp: 0, phase: 1, timer: 0, throwTimer: 1.5, bound: 0 };
      P.pos.set(0, 0, 12); P.yaw = 0; respawn.set(0, 0, 12);
      hooks.setObjective('反击章鱼博士（0/3）', '闪避工具箱，或左键蛛网弹把它甩回去', '');
      hooks.audio.bgm('bgm_battle'); hooks.audio.ambience([]);
      hooks.sayQueue([
        { speaker: '蜘蛛侠', text: '嘿！奥托博士！这可是武汉最高楼，绿地中心，你用四根机械爪拆护栏可不太礼貌！', voice: 'vo_d01', lock: false },
        { speaker: '章鱼博士', text: '走开，蜘蛛侠！我来光谷参加量子科学展，但刚才机械臂的主控芯片被一滴奇怪的黑水侵蚀了，我控制不住它们——小心！', voice: 'vo_d02', lock: false }
      ]);
    }
    else if (id === 'G03') {
      buildEnv('dawn', { rows: [{ x: 0, z: 0, w: 30, h: 40, d: 40, color: 0x8f8778 }] });
      buildWuhanBackdrop();
      buildRooftop();
      const doc = buildDocOck(0, -10); mod.docArms = doc.userData.arms;
      targets.push({ x: 0, z: -6, r: 2, hit: false, mesh: sphere(0.7, 0xffd68a, 0, 1.4, -6) });
      P.pos.set(0, 0, 8); P.yaw = 0; respawn.set(0, 0, 8);
      hooks.setObjective('与奥托博士握手言和', '靠近博士，点击提示交互', '');
      hooks.audio.bgm('bgm_normal'); hooks.audio.ambience([]);
      hooks.sayQueue([{ speaker: '章鱼博士', text: '太感谢你了，孩子！要不是你的蛛丝够结实，我差点在武汉闯下大祸。不打不相识，从今天起，你就是我奥托最好的朋友！', voice: 'vo_d03', lock: true }]);
    }
    else if (id === 'G04') {
      const rows = []; for (let i = 0; i < 9; i++) rows.push({ x: 0, z: -i * 16, w: 14, h: 40, d: 24, color: 0x8f8778 });
      const an = []; for (let i = 0; i < 8; i++) an.push({ x: 0, y: 9, z: -i * 16 - 8 });
      buildEnv('dawn', { rows, anchors: an });
      buildGrassField(-2);
      buildWuhanBackdrop();
      buildGreenland(-70, -120);
      buildRooftop();
      // 纯黑色粘液痕迹
      for (let i = 0; i < 7; i++) {
        const g = new THREE.Mesh(new THREE.CircleGeometry(1.15 + (i % 3) * 0.25, 18), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
        g.rotation.x = -Math.PI / 2; g.position.set((i % 2 ? 1.4 : -1.2), 0.035, -12 - i * 18); group.add(g);
        box(2.0 + (i % 2) * 0.8, 0.04, 2.0 + (i % 2) * 0.6, 0x000000, (i % 2 ? 1.4 : -1.2), 0.03, -12 - i * 18);
      }
      buildPedestrians(5, 5.6, -14, -108);
      buildStreetLamps(6.2, -16, -120);
      buildStreetFurniture(5.4, -20, -104);
      mod.goal = -140;
      P.pos.set(0, 0, -2); P.yaw = 0; respawn.set(0, 0, -2);
      hooks.setObjective('追踪黑色粘液', '沿黑液痕迹前往龟山电视塔', '');
      hooks.audio.bgm('bgm_normal'); hooks.audio.ambience(['sfx_wind', 'sfx_goo']);
      hooks.sayQueue([{ speaker: '蜘蛛侠', text: '咦？这就是刚才让博士机械臂失控的东西？它在往那边爬！', voice: 'vo_d05', lock: false, comic: 'comics/track.webp' }]);
    }
    else if (id === 'G05') {
      buildEnv('dusk', { rows: [{ x: 0, z: 0, w: 30, h: 40, d: 30, color: 0x6a5a4c }] });
      buildWuhanPanorama();
      const torus = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 10, 32), new THREE.MeshBasicMaterial({ color: 0xffb14a, fog: false }));
      torus.position.set(0, 2.4, -12); group.add(torus); portal = torus;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, fog: false }));
      disc.position.set(0, 2.4, -12); group.add(disc);
      P.pos.set(0, 0, 10); P.yaw = 0; respawn.set(0, 0, 10);
      hooks.setObjective('俯瞰武汉三镇 · 穿过魔法传送门', '龟山电视塔高空平台，走近金橙色传送门', '');
      hooks.audio.bgm('bgm_normal'); hooks.audio.ambience(['sfx_portal']);
    }
    else if (id === 'G06') {
      const rows = []; for (let i = 0; i < 10; i++) rows.push({ x: 0, z: -i * 15, w: 14, h: 36, d: 22, color: 0x4e5a60 });
      const an = []; for (let i = 0; i < 8; i++) an.push({ x: 0, y: 9, z: -i * 15 - 7 });
      buildEnv('night', { rows, anchors: an });
      buildGrassField(-2);
      for (let i = 0; i < 24; i++) { const sx = i % 2 ? -40 - (i % 4) * 12 : 40 + (i % 4) * 12; box(14, 40 + (i * 7) % 40, 14, 0x39454c, sx, 22, -20 - i * 6); }
      buildNewYorkBackdrop(); // v19：帝国大厦远景 + 自由女神像 + 街道霓虹灯
      buildPedestrians(6, 6.0, -10, -120);
      buildStreetLamps(6.4, -16, -130);
      buildStreetFurniture(5.6, -20, -112);
      mod.goal = -140;
      P.pos.set(0, 0, -2); P.yaw = 0; respawn.set(0, 0, -2);
      hooks.setObjective('追踪黑液至废弃工厂（0/4）', '穿过纽约雨夜街巷', '');
      hooks.audio.bgm('bgm_normal'); hooks.audio.ambience(['sfx_ambient_ny']);
    }
    else if (id === 'G07') {
      buildEnv('night', { rows: [{ x: 0, z: 0, w: 30, h: 40, d: 30, color: 0x5a4c44 }] });
      buildGrassField(-2);
      for (let i = 0; i < 3; i++) {
        const m = box(1.8, 2.2, 1.8, 0x000000, -4 + i * 4, 1.1, -8 - i * 2);
        enemies.push({ mesh: m, hp: 3, alive: true, speed: 1.1 + i * 0.2 });
      }
      P.pos.set(0, 0, 10); P.yaw = 0; respawn.set(0, 0, 10);
      hooks.setObjective('击败毒液小兵（0/3）', '左键 / J 蛛网弹，每只 3 发', '');
      hooks.audio.bgm('bgm_battle'); hooks.audio.ambience(['sfx_goo']);
    }
    else if (id === 'G08') {
      buildEnv('night', { rows: [{ x: 0, z: 0, w: 30, h: 40, d: 30, color: 0x4a3a34 }] });
      buildGrassField(-2);
      const v = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 16), mat(0x000000)); body.position.y = 2.4;
      const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), mat(0xf4f1e8)); e1.position.set(-0.9, 3.4, 1.8);
      const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), mat(0xf4f1e8)); e2.position.set(0.9, 3.4, 1.8);
      v.add(body); v.add(e1); v.add(e2); v.position.set(0, 0, -12); group.add(v); venom = v;
      boss = { state: 'idle', timer: 1.5, webs: 0, max: 12 };
      mod.venomX = 0; mod.venomZ = -12; mod.venomRetarget = 1.2;
      mod.venomTarget = { x: 0, z: -12 };
      P.pos.set(0, 0, 10); P.yaw = 0; respawn.set(0, 0, 10);
      hooks.setObjective('困住毒液本体（0/12）', '闪避猛扑，硬直时左键连射蛛网', '');
      hooks.setEnemyBar('毒液', 12, 12);
      hooks.audio.bgm('bgm_battle'); hooks.audio.ambience([]);
      hooks.sayQueue([
        { speaker: '钢铁侠', text: '这家伙块头太大，直接放脉冲波会被他躲开！彼得，困住他！', voice: 'vo_d08', lock: false },
        { speaker: '蜘蛛侠', text: '看我的！', voice: 'vo_d09', lock: false }
      ]);
    }
    else if (id === 'G09') {
      const rows = []; for (let i = 0; i < 9; i++) rows.push({ x: 0, z: -i * 16, w: 14, h: 40, d: 24, color: 0x6a5a4c });
      buildEnv('dusk', { rows });
      buildGrassField(-2);
      buildWuhanBackdrop();
      buildGreenland(70, -100);
      box(22, 1, 26, 0x5a4a3a, 0, -0.5, -150);
      addCollider(0, -150, 22, 26, 0);
      buildCozyHouse(0, -150);
      buildPedestrians(4, 6.0, -10, -110);
      buildStreetLamps(6.4, -16, -120);
      buildStreetFurniture(5.6, -20, -104);
      mod.goal = -140;
      P.pos.set(0, 0, -2); P.yaw = 0; respawn.set(0, 0, -2);
      hooks.setObjective('背埃迪回家', '沿街道向前走', '');
      hooks.audio.bgm('bgm_normal'); hooks.audio.ambience(['sfx_ambient_ny']);
      hooks.sayQueue([{ speaker: '蜘蛛侠', text: '埃迪？！怎么会是你！', voice: 'vo_d10', lock: true, comic: 'comics/eddie.webp' }]);
    }
    else if (id === 'G10') {
      buildEnv('dusk', { rows: [{ x: 0, z: 0, w: 30, h: 40, d: 30, color: 0x6a5a4c }] });
      buildWuhanBackdrop();
      buildGreenland(-80, -120);
      buildWorkbench(0, -6);
      mod.suitStage = 0;
      P.pos.set(0, 0, 8); P.yaw = 0; respawn.set(0, 0, 8);
      hooks.setObjective('整理战衣（0/3）', '靠近工作台，点击提示：除尘 → 缝补 → 晾干', '');
      hooks.audio.bgm('bgm_normal'); hooks.audio.ambience(['sfx_wind']);
    }
    else if (id === 'G11') {
      buildEnv('dusk', { rows: [{ x: 0, z: 0, w: 30, h: 40, d: 30, color: 0x6a5a4c }] });
      buildWuhanBackdrop();
      P.pos.set(0, 0, 0); P.yaw = 0; respawn.set(0, 0, 0);
      hooks.setObjective('抬头看天上', '向上移动鼠标仰望天空', '');
      hooks.audio.stopBgm(); hooks.audio.ambience([]);
    }
  }

  function nearestAnchor() { let best = null, bestD = 1e9; for (const a of anchors) { const d = P.pos.distanceTo(a); if (a.y > P.pos.y + 0.5 && d < 10 && d < bestD) { best = a; bestD = d; } } return best; }
  function trySwing() { if (P.swing || P.swingCd > 0) return false; const a = nearestAnchor(); if (!a) { toast('附近没有可吸附的锚点', 1400, true); return false; } P.swing = { a, len: clamp(P.pos.distanceTo(a), 3, 10) }; P.grounded = false; P.vel.y = Math.min(P.vel.y, -2); audio.sfx('sfx_swing', 0.8); return true; }
  function releaseSwing() { if (!P.swing) return; const f = forward(); P.vel.add(new THREE.Vector3(f.x * 3, 2, f.z * 3)); P.swing = null; P.swingCd = 0.22; }
  function forward() { return new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); }
  function right() { return new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); }

  function shootWeb() {
    if (S.web <= 0) { toast('蛛网液不足', 1200, true); return; }
    S.web--;
    const dir = camera.getWorldDirection(new THREE.Vector3());
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf3f1e8 }));
    m.position.copy(camera.position).addScaledVector(dir, 1);
    scene.add(m);
    shots.push({ m, vel: dir.clone().multiplyScalar(40), life: 10 });
    hooks.handsShoot();
    audio.sfx('sfx_swing', 0.6);
  }
  function repairSuitStep() {
    if (!mod || mod.id !== 'G10') return;
    mod.suitStage = Math.min(3, (mod.suitStage || 0) + 1);
    audio.sfx('sfx_misc');
    const label = ['除尘完成', '缝补完成', '晾干完成'][mod.suitStage - 1] || '整理完成';
    toast(label);
    hooks.setObjective('整理战衣（' + mod.suitStage + '/3）', '靠近工作台，点击提示：除尘 → 缝补 → 晾干', '');
    if (mod.suitStage >= 3) setTimeout(() => hooks.goTo('G11'), 900);
  }

  function respawnPlayer() {
    P.pos.copy(respawn);
    P.pos.y = 0;
    P.vel.set(0, 0, 0);
    P.swing = null; P.grounded = true;
    P.invuln = Math.max(P.invuln, 1.2);
    camera.position.copy(P.pos).add(new THREE.Vector3(0, 1.6, 0));
  }
  function hurt(n) { if (P.invuln > 0) return; S.hearts -= n; P.invuln = 1; if (S.hearts <= 0) { S.hearts = S.maxHearts; toast('重新出发，心回满'); } else toast('受伤了！', 1300, true); respawnPlayer(); }

  function move3D(dt) {
    if (S.lockInput > 0) { S.lockInput -= dt; camera.rotation.order = 'YXZ'; camera.rotation.y = P.yaw; camera.rotation.x = P.pitch; camera.position.copy(P.pos).add(new THREE.Vector3(0, 1.6, 0)); I.dx = 0; I.dy = 0; return; }
    P.yaw -= I.dx * 0.0024; P.pitch -= I.dy * 0.0024; P.pitch = clamp(P.pitch, -1.45, 1.45);
    camera.rotation.order = 'YXZ'; camera.rotation.y = P.yaw; camera.rotation.x = P.pitch;
    const f = forward(), r = right();
    const mx = (I.forward ? 1 : 0) - (I.back ? 1 : 0), mz = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    const mv = new THREE.Vector3(f.x * mx + r.x * mz, 0, f.z * mx + r.z * mz);
    if (mv.lengthSq() > 0) mv.normalize().multiplyScalar(14 * dt);
    P.pos.x += mv.x; P.pos.z += mv.z;
    for (const c of colliders) if (P.pos.x > c.minX && P.pos.x < c.maxX && P.pos.z > c.minZ && P.pos.z < c.maxZ && P.pos.y < c.top) {
      const pushX = Math.min(P.pos.x - c.minX, c.maxX - P.pos.x), pushZ = Math.min(P.pos.z - c.minZ, c.maxZ - P.pos.z);
      if (pushX < pushZ) P.pos.x = (P.pos.x - c.minX < c.maxX - P.pos.x) ? c.minX - 0.1 : c.maxX + 0.1; else P.pos.z = (P.pos.z - c.minZ < c.maxZ - P.pos.z) ? c.minZ - 0.1 : c.maxZ + 0.1;
    }
    if (I.jumpBuffer > 0 && P.grounded) { P.vel.y = 12; P.grounded = false; I.jumpBuffer = 0; }
    if (I.dodge && P.dodgeCd <= 0) { P.dodge = 0.22; P.dodgeCd = 1; P.invuln = 0.35; }
    if (P.swing && !I.swingHeld) releaseSwing();
    P.vel.y -= 30 * dt; P.vel.y = Math.max(P.vel.y, -50);
    P.pos.y += P.vel.y * dt;
    P.grounded = false;
    for (const c of colliders) if (P.pos.x > c.minX && P.pos.x < c.maxX && P.pos.z > c.minZ && P.pos.z < c.maxZ && P.pos.y <= c.top && P.pos.y >= c.top - 0.8 && P.vel.y <= 0) { P.pos.y = c.top; P.vel.y = 0; P.grounded = true; }
    if (P.swing) { const a = P.swing.a, d = P.pos.distanceTo(a) || 1; if (d > P.swing.len) { const n = P.pos.clone().sub(a).divideScalar(d); P.pos.copy(a).addScaledVector(n, P.swing.len); const rv = P.vel.dot(n); if (rv > 0) P.vel.addScaledVector(n, -rv); } }
    P.dodge = Math.max(0, P.dodge - dt); P.dodgeCd = Math.max(0, P.dodgeCd - dt); P.swingCd = Math.max(0, P.swingCd - dt); P.invuln = Math.max(0, P.invuln - dt);
    I.jumpBuffer = Math.max(0, I.jumpBuffer - dt);
    if (I.shoot) { I.shoot = false; shootWeb(); }
    I.dodge = false; I.dx = 0; I.dy = 0;
    if (P.pos.y < -6) { respawnPlayer(); toast('蛛丝把你拉了回来'); }
    camera.position.copy(P.pos).add(new THREE.Vector3(0, 1.6, 0));
  }

  function updateWebLine() {
    if (P.swing) {
      const pts = [camera.position.clone(), P.swing.a.clone()];
      if (!webLine) {
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        webLine = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }));
        scene.add(webLine);
      } else {
        webLine.geometry.setFromPoints(pts);
      }
    } else if (webLine) {
      scene.remove(webLine); webLine.geometry.dispose(); webLine.material.dispose(); webLine = null;
    }
  }

  /* v19：爱心加血——血量 1~2 颗时持续随机刷爱心（3D），拾取 +1 心并播放“噔噔噔” */
  let heartTex = null;
  function heartSpriteTexture() {
    if (heartTex) return heartTex;
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#e74c5c';
    g.beginPath();
    g.moveTo(64, 112);
    g.bezierCurveTo(6, 60, 24, 10, 64, 44);
    g.bezierCurveTo(104, 10, 122, 60, 64, 112);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.ellipse(42, 40, 10, 7, -0.6, 0, Math.PI * 2); g.fill();
    heartTex = new THREE.CanvasTexture(c); heartTex.colorSpace = THREE.SRGBColorSpace;
    return heartTex;
  }
  function updateHeart3D(dt) {
    mod.heartCd = (mod.heartCd || 0) - dt;
    if (S.hearts > 2) {
      if (mod.heart) { scene.remove(mod.heart.m); mod.heart = null; }
      return;
    }
    if (!mod.heart && mod.heartCd <= 0) {
      const ang = Math.random() * Math.PI * 2;
      const dd = 2.5 + Math.random() * 4;
      const hx = clamp(P.pos.x + Math.cos(ang) * dd, -8, 8);
      const hz = clamp(P.pos.z + Math.sin(ang) * dd - 2, -16, 6);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartSpriteTexture(), transparent: true, depthWrite: false }));
      sp.scale.set(1.15, 1.15, 1); sp.position.set(hx, 1.0, hz);
      scene.add(sp); mod.heart = { m: sp, t: 0 };
    }
    if (mod.heart) {
      mod.heart.t += dt;
      mod.heart.m.position.y = 1.0 + Math.sin(mod.heart.t * 2.6) * 0.24;
      mod.heart.m.material.rotation = Math.sin(mod.heart.t * 1.6) * 0.2;
      if (P.pos.distanceTo(mod.heart.m.position) < 1.7) {
        S.hearts = Math.min(S.maxHearts, S.hearts + 1);
        audio.sfx('sfx_heart');
        toast('恢复 1 颗心！', 1000);
        scene.remove(mod.heart.m); mod.heart = null; mod.heartCd = 1.6;
      }
    }
  }

  function update(dt) {
    mod.t = (mod.t || 0) + dt;
    // v19：章鱼博士四根机械爪海带式摆动（背后伸出，波浪起伏）
    if (mod.docArms) for (const arm of mod.docArms) {
      arm.rotation.x = arm.userData.baseRx + Math.sin(mod.t * 2.1 + arm.userData.phase) * 0.24;
      arm.rotation.z = arm.userData.baseRz + Math.cos(mod.t * 1.7 + arm.userData.phase * 1.2) * 0.16;
    }
    // v19：纽约霓虹灯招牌变色闪烁
    if (mod.neonSigns && mod.neonSigns.length) {
      const cycle = Math.floor(mod.t / 1.1);
      if (cycle !== mod._neonCycle) {
        mod._neonCycle = cycle;
        const cols = [0xff3b5c, 0x3be8ff, 0xffd23b, 0x9bff5a, 0xff7ae0];
        mod.neonSigns.forEach((s, i) => { s.material.color.setHex(cols[(i + cycle) % cols.length]); });
      }
    }
    updateHeart3D(dt);
    move3D(dt);
    for (const p of pedestrians) {
      p.change -= dt;
      if (p.change <= 0) {
        p.change = 1.2 + Math.random() * 2.2;
        const a = Math.random() * Math.PI * 2;
        p.vx = Math.cos(a) * (0.45 + Math.random() * 0.5);
        p.vz = Math.sin(a) * (0.45 + Math.random() * 0.5);
      }
      p.g.position.x += p.vx * dt;
      p.g.position.z += p.vz * dt;
      if (Math.abs(p.g.position.x) > p.xAbs) { p.vx *= -1; p.g.position.x = Math.sign(p.g.position.x) * p.xAbs; }
      if (p.g.position.z > p.zMax) { p.vz *= -1; p.g.position.z = p.zMax; }
      if (p.g.position.z < p.zMin) { p.vz *= -1; p.g.position.z = p.zMin; }
      p.g.rotation.y = Math.atan2(p.vx, p.vz);
      p.g.position.y = Math.abs(Math.sin((p.g.position.x + p.g.position.z) * 1.4)) * 0.03;
    }
    updateWebLine();
    shots = shots.filter(s => (s.life -= dt) > 0);
    for (const s of shots) {
      s.m.position.addScaledVector(s.vel, dt);
      if (s.life <= 0) { scene.remove(s.m); continue; }
      // G07 小兵
      for (const e of enemies) {
        if (e.alive && s.m.position.distanceTo(e.mesh.position) < 1.7) {
          s.life = 0; scene.remove(s.m); e.hp--;
          if (e.hp <= 0) { e.alive = false; scene.remove(e.mesh); }
          break;
        }
      }
      // G08 毒液
      if (mod.id === 'G08' && boss && boss.state !== 'bound' && venom && s.m.position.distanceTo(venom.position) < 2.9) {
        s.life = 0; scene.remove(s.m); hitVenom3D();
      }
      // 目标点（旧 G02，保留兼容）
      for (const t of targets) if (!t.hit && t.bind && s.m.position.distanceTo(t.mesh.position) < 1.2) { t.hit = true; scene.remove(t.mesh); if (boss) boss.bound++; checkBind(); s.life = 0; scene.remove(s.m); break; }
    }
    projectiles = projectiles.filter(p => p.life > 0);
    for (const p of projectiles) {
      p.pos.addScaledVector(p.vel, dt); if (p.mesh) p.mesh.position.copy(p.pos);
      if (p.pos.distanceTo(P.pos) < 1.4 && P.invuln <= 0) { p.life = 0; scene.remove(p.mesh); hurt(1); }
      for (const s of shots) if (s.life > 0 && s.m.position.distanceTo(p.pos) < 1) { s.life = 0; scene.remove(s.m); p.reflected = true; p.vel.set(0, 0, -20); }
      if (p.reflected && Math.abs(p.pos.z + 10) < 2) { p.life = 0; scene.remove(p.mesh); hitDoc(); }
    }

    // G04 追踪终点
    if (mod.id === 'G04') {
      if (P.pos.z <= mod.goal + 3 && !started) { started = true; hooks.goTo('G05'); }
    }
    // G05 传送门（靠近自动触发，传送后强制清锁）
    if (mod.id === 'G05' && portal && !mod.portalUsed && P.pos.distanceTo(portal.position) < 3.4) { triggerPortal(); }
    // G06 / G09 终点
    if ((mod.id === 'G06' || mod.id === 'G09') && P.pos.z <= mod.goal + 3 && !started) {
      started = true; hooks.goTo(mod.id === 'G06' ? 'G07' : 'G10');
    }
    // G07 小兵
    if (mod.id === 'G07') {
      for (const e of enemies) if (e.alive) {
        const d = new THREE.Vector3(P.pos.x, 0, P.pos.z).sub(new THREE.Vector3(e.mesh.position.x, 0, e.mesh.position.z));
        if (d.length() > 1.6) e.mesh.position.addScaledVector(d.normalize(), e.speed * dt);
        if (e.mesh.position.distanceTo(P.pos) < 1.8 && P.invuln <= 0) hurt(1);
      }
      if (!mod.g07Done && enemies.every(e => !e.alive)) {
        mod.g07Done = true;
        audio.sfx('sfx_impact'); audio.sfx('sfx_jet');
        hooks.sayQueue([{
          speaker: '钢铁侠',
          text: '退后，小蜘蛛！神盾局一检测到跨国传送门和共生体反应就通知我了，剩下的交给我！',
          voice: 'vo_d07', lock: true, comic: 'comics/v2.webp'
        }]);
        S.dialogueEndCallback = () => setTimeout(() => hooks.goTo('G08'), 1200);
      }
    }
    // G08 毒液：随机游走 + 主动扑击
    if (mod.id === 'G08' && boss && boss.state !== 'bound') {
      mod.venomT = (mod.venomT || 0) + dt;
      mod.venomRetarget -= dt;
      if (mod.venomRetarget <= 0) {
        mod.venomRetarget = 1.0 + Math.random() * 1.8;
        mod.venomTarget = { x: (Math.random() * 2 - 1) * 7, z: -12 + Math.random() * 18 };
      }
      const tx = boss.state === 'lunge' ? P.pos.x : mod.venomTarget.x;
      const tz = boss.state === 'lunge' ? P.pos.z - 2 : mod.venomTarget.z;
      const dx = tx - mod.venomX, dz = tz - mod.venomZ;
      const dd = Math.hypot(dx, dz) || 1;
      const sp = boss.state === 'lunge' ? 12 : 1.5;
      mod.venomX = clamp(mod.venomX + dx / dd * sp * dt, -8, 8);
      mod.venomZ = clamp(mod.venomZ + dz / dd * sp * dt, -12, 8);
      if (venom) {
        venom.position.x = mod.venomX + Math.sin(mod.venomT * 2.4) * 0.25;
        venom.position.z = mod.venomZ;
        venom.rotation.y = Math.sin(mod.venomT * 1.7) * 0.18;
      }
      boss.timer -= dt;
      if (boss.timer <= 0) {
        if (boss.state === 'idle') { boss.state = 'lunge'; boss.timer = 1.8; }
        else if (boss.state === 'lunge') { boss.state = 'stagger'; boss.timer = 1.6; toast('毒液硬直，左键连射蛛网！'); }
        else { boss.state = 'idle'; boss.timer = 1.2; }
      }
      if (boss.state === 'lunge' && venom && P.pos.distanceTo(venom.position) < 2.7 && P.invuln <= 0) hurt(1);
    }

    // 旧 3D 章（当前由 2D 接管，保留兼容）
    if (mod.id === 'G01') { if (P.pos.z <= mod.goal + 3 && !started) { started = true; audio.sfx('sfx_spider_sense'); toast('蜘蛛感应触发！前方绿地中心楼顶', 1600); setTimeout(() => hooks.goTo('G02'), 1600); } }
    else if (mod.id === 'G02' && boss && boss.phase === 1) { boss.throwTimer -= dt; if (boss.throwTimer <= 0) { boss.throwTimer = 2.4; const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0xd98a3a })); m.position.set(0, 2, -9); scene.add(m); projectiles.push({ pos: new THREE.Vector3(0, 2, -9), vel: new THREE.Vector3(0, 0, 4), life: 8, reflected: false, mesh: m }); audio.sfx('sfx_mech', 0.6); } }
    else if (mod.id === 'G02' && boss && boss.phase === 2) { boss.timer -= dt; const sec = Math.max(0, Math.ceil(boss.timer)); if (sec !== boss.lastSec) { boss.lastSec = sec; hooks.setObjective('绑住 4 根机械爪（' + boss.bound + '/4）', '剩余 ' + sec + ' 秒', ''); } if (boss.timer <= 0) setupClaws(); }
    else if (mod.id === 'G11' && !started) { if (I.up || P.pitch > 0.8) { started = true; triggerWukong(); } }

    // F 交互提示（抖动）
    if (S.dialogueActive || S.comicActive) hooks.hidePrompt();
    else if (mod.id === 'G05' && portal && P.pos.distanceTo(portal.position) < 4.2) hooks.setPrompt('穿过魔法传送门');
    else if (mod.id === 'G10' && P.pos.distanceTo(new THREE.Vector3(0, 0, -6)) < 4.5) hooks.setPrompt('整理战衣');
    else hooks.hidePrompt();
  }

  function hitVenom3D() {
    if (!boss || boss.state === 'bound') return;
    boss.webs = Math.min(boss.max, boss.webs + 1);
    hooks.setEnemyBar('毒液', boss.max - boss.webs, boss.max);
    hooks.setObjective('困住毒液本体（' + boss.webs + '/12）', '闪避猛扑，硬直时左键连射蛛网', '');
    if (boss.webs >= boss.max) {
      boss.state = 'bound';
      toast('毒液已被死死困住！自动收容中……');
      if (!mod.v3Done) {
        mod.v3Done = true;
        setTimeout(() => {
          hooks.playVideo('v3', () => { audio.sfx('sfx_impact'); audio.sfx('sfx_misc'); hooks.goTo('G09'); });
        }, 700);
      }
    }
  }
  function triggerPortal() {
    if (mod.portalUsed) return;
    mod.portalUsed = true;
    // v1 漫画 + vo_d06 同步播放（14 秒），播完安全传送
    hooks.audio.vo('vo_d06');
    hooks.sayQueue([{
      speaker: '蜘蛛侠',
      text: '哇哦！这金橙色的火花圈……不是奇异博士才会画的魔法传送门吗？怎么会出现在龟山电视塔？不管了，黑色液体钻进去了，我得跟过去看看！',
      voice: null, lock: false, duration: 14000
    }]);
    hooks.showComic('comics/v1.webp', 14000, () => {
      S.lockInput = 0; S.paused = false; S.dialogueActive = false;
      hooks.goTo('G06');
    });
  }

  function hitDoc() {
    if (boss.phase !== 1) return;
    boss.hp = Math.min(3, boss.hp + 1);
    hooks.setObjective('反击章鱼博士（' + boss.hp + '/3）', '闪避工具箱，或左键蛛网弹把它甩回去', '');
    audio.sfx('sfx_mech');
    if (boss.hp >= 3) { boss.phase = 2; setupClaws(); toast('章鱼博士陷入僵直！射网绑住 4 根机械爪'); }
  }
  function setupClaws() { targets = []; for (let i = 0; i < 4; i++) { const ang = i * Math.PI / 2 + 0.4; targets.push({ x: Math.cos(ang) * 3.5, z: -10 + Math.sin(ang) * 3.5, r: 1, hit: false, bind: true, mesh: sphere(0.7, 0xffd68a, Math.cos(ang) * 3.5, 1 + (i % 2), -10 + Math.sin(ang) * 3.5) }); } boss.bound = 0; boss.timer = 30; boss.lastSec = -1; hooks.setObjective('绑住 4 根机械爪（0/4）', '30 秒内朝发光爪点各射 1 发蛛网', ''); }
  function checkBind() { if (boss.bound >= 4) { boss.phase = 3; hooks.setObjective('拔除故障芯片', '走到章鱼博士身边，点击提示交互', ''); toast('4 根机械爪已绑死！靠近并点击提示拔除故障芯片'); } else { hooks.setObjective('绑住 4 根机械爪（' + boss.bound + '/4）', '30 秒内朝发光爪点各射 1 发蛛网', ''); } }
  function removeChip() { if (boss.phase !== 3) return; audio.sfx('sfx_mech'); hooks.goTo('G03'); }
  function onHandshake() { audio.sfx('sfx_mech'); hooks.sayQueue([{ speaker: '蜘蛛侠', text: '一言为定，拐子！我现在就带你克楼下骑碗热干面！', voice: 'vo_d04', lock: true }]); setTimeout(() => { audio.sfx('sfx_jet'); hooks.goTo('G04'); }, 4500); }
  function triggerWukong() {
    audio.bgm('bgm_wukong'); audio.sfx('sfx_thunder');
    hooks.playVideo('v4', () => {
      // 与 v4 连续衔接：不再等待，立刻切换到悟空全屏分镜
      hooks.audio.vo('vo_d11');
      hooks.showComic('comics/wukong.webp', 8000, () => hooks.end(), { full: true });
    });
  }

  function onInteract() {
    if (S.dialogueActive) { hooks.skipDialogue(); return; }
    if (mod.id === 'G05' && portal && P.pos.distanceTo(portal.position) < 4) { triggerPortal(); return; }
    if (mod.id === 'G02' && boss && boss.phase === 3 && P.pos.distanceTo(new THREE.Vector3(0, 0, -10)) < 4) removeChip();
    else if (mod.id === 'G03') { const t = targets[0]; if (t && !t.hit && P.pos.distanceTo(new THREE.Vector3(t.x, 0, t.z)) < 4) { t.hit = true; scene.remove(t.mesh); onHandshake(); } }
    else if (mod.id === 'G10') { if (P.pos.distanceTo(new THREE.Vector3(0, 0, -6)) < 4.5) repairSuitStep(); }
  }

  function getHint() {
    if (!mod) return { title: '提示', text: '' };
    if (mod.id === 'G01') return { title: 'G01 · 飞向绿地中心', text: '按住 E / 右键吸附头顶发光的锚点摆荡；WASD 前进、Space 跳。一路朝远处的蓝色高塔飞，靠近塔顶会触发蜘蛛感应并进入下一段。' };
    if (mod.id === 'G02') {
      if (boss.phase === 1) return { title: 'G02 · 反击章鱼博士', text: '等博士扔出工具箱。工具箱飞近时按 Shift 闪避，或按左键 / J 射蛛网把工具箱反弹回去。命中 3 次后博士会僵直。' };
      if (boss.phase === 2) return { title: 'G02 · 绑住 4 根机械爪', text: '30 秒内朝 4 个发光的爪点各射 1 发蛛网（左键 / J）。屏幕中心的十字准星用来瞄准；超时会重置，可以重试。绑满 4 根后靠近博士点击提示。' };
      if (boss.phase === 3) return { title: 'G02 · 拔除芯片', text: '走到章鱼博士身边（在他附近），点击提示拔掉后颈冒黑烟的故障芯片。' };
      return { title: 'G02 · 完成', text: '芯片已拔除，即将进入握手剧情。' };
    }
    if (mod.id === 'G03') return { title: 'G03 · 握手言和', text: '听完奥托博士的道谢，走到他身边点击提示击掌，再听完 D04 就会进入第二章。' };
    if (mod.id === 'G04') return { title: 'G04 · 追踪黑液', text: '3D 天台：WASD 前进，沿黑液痕迹经过 5 个发光节点，走到最深处即可进入龟山电视塔。' };
    if (mod.id === 'G05') return { title: 'G05 · 穿过传送门', text: '走近发光的金橙色传送门（会自动触发），过场结束后会安全传送到纽约，不会卡住或下坠。' };
    if (mod.id === 'G06') return { title: 'G06 · 纽约追踪', text: '沿雨夜街巷一直向前走，到工厂大门即进入下一段。' };
    if (mod.id === 'G07') return { title: 'G07 · 清掉毒液小兵', text: '左键 / J 发射蛛网弹，每只小兵需要 3 发；清完 3 只钢铁侠会破门救场。' };
    if (mod.id === 'G08') return { title: 'G08 · 困住毒液', text: '毒液会随机移动并主动扑击；躲开后趁硬直连续按左键 / J 射网，累计 12 层自动收容，无需按键。' };
    if (mod.id === 'G09') return { title: 'G09 · 背埃迪回家', text: '沿街道向前走，到公寓门口即进入第三章。' };
    if (mod.id === 'G10') return { title: 'G10 · 整理战衣', text: '走到天台工作台旁，点击提示依次完成：除尘 → 缝补 → 晾干。三次完成后进入终章。' };
    if (mod.id === 'G11') return { title: 'G11 · 抬头看天', text: '把鼠标向上移动（或按 W / ↑）抬头仰望天空，就会触发终章视频。' };
    return { title: '提示', text: '按提示继续推进剧情。' };
  }

  return { enter, update, onInteract, trySwing, releaseSwing, shootWeb, getHint };
}
