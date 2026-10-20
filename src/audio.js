/* 自动音视频卡位引擎（音频侧）
 * 按文件名槽位懒加载 audio/*.m4a（AAC，全浏览器兼容），缺失自动容错。
 */
export function createAudio(debug = false) {
  const a = {
    ctx: null, master: null, buses: {}, buffers: new Map(), pending: new Map(),
    loops: new Map(), muted: false, currentBgm: null, currentAmb: []
  };

  async function init() {
    if (a.ctx) { if (a.ctx.state === 'suspended') await a.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    a.ctx = new AC();
    const comp = a.ctx.createDynamicsCompressor();
    comp.threshold.value = -6; comp.knee.value = 0; comp.ratio.value = 12;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    a.master = a.ctx.createGain(); a.master.gain.value = 0.9;
    a.master.connect(comp).connect(a.ctx.destination);
    for (const [name, gain] of [['bgm', 0.55], ['vo', 1.0], ['sfx', 0.7]]) {
      const g = a.ctx.createGain(); g.gain.value = gain; g.connect(a.master); a.buses[name] = g;
    }
  }

  function ensure(name) {
    if (a.buffers.has(name)) return Promise.resolve(a.buffers.get(name));
    if (a.pending.has(name)) return a.pending.get(name);
    const exts = ['m4a']; // AAC/M4A：全浏览器兼容（Chrome/Safari/Firefox/Edge/iPadOS）
    const p = (async () => {
      if (!a.ctx) await init();
      for (const ext of exts) {
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}audio/${name}.${ext}`);
          if (!res.ok) continue;
          const buf = await a.ctx.decodeAudioData(await res.arrayBuffer());
          a.buffers.set(name, buf);
          return buf;
        } catch (e) { /* try next */ }
      }
      if (debug) console.warn('[audio] missing:', name);
      return null;
    })();
    a.pending.set(name, p);
    p.finally(() => a.pending.delete(name));
    return p;
  }

  function playBuf(buf, bus, { loop = false, gain = 1 } = {}) {
    if (!a.ctx || !buf || !a.buses[bus]) return null;
    const src = a.ctx.createBufferSource();
    src.buffer = buf; src.loop = loop;
    const g = a.ctx.createGain(); g.gain.value = gain;
    src.connect(g).connect(a.buses[bus]);
    src.start();
    return src;
  }
  function stop(key) { const s = a.loops.get(key); if (s) { try { s.stop(); } catch (e) {} a.loops.delete(key); } }

  return {
    async init() { await init(); },
    // 批量预加载：按槽位名逐个 ensure，缺失自动容错；onProgress 收到 (完成数/总数)
    async preload(names, onProgress) {
      const list = Array.isArray(names) ? names : [];
      const total = Math.max(1, list.length);
      let done = 0;
      for (const n of list) {
        try { await ensure(n); } catch (e) { /* 容错 */ }
        done++;
        if (onProgress) onProgress(done / total);
      }
      return done;
    },
    async bgm(name) {
      if (a.currentBgm === name) return;
      stop('bgm:' + a.currentBgm);
      a.currentBgm = name;
      const b = await ensure(name);
      const s = playBuf(b, 'bgm', { loop: !['bgm_fly', 'bgm_wukong'].includes(name), gain: 0.9 });
      if (s) a.loops.set('bgm:' + name, s);
    },
    stopBgm() { if (a.currentBgm) { stop('bgm:' + a.currentBgm); a.currentBgm = null; } },
    async ambience(list) {
      for (const n of a.currentAmb) stop('amb:' + n);
      a.currentAmb = list || [];
      for (const n of a.currentAmb) { const b = await ensure(n); const s = playBuf(b, 'sfx', { loop: true, gain: 0.12 }); if (s) a.loops.set('amb:' + n, s); }
    },
    async vo(name, onEnded) {
      stop('vo');
      const b = await ensure(name);
      if (b && a.buses.bgm) a.buses.bgm.gain.setTargetAtTime(0.22, a.ctx.currentTime, 0.15);
      const s = playBuf(b, 'vo', { gain: 1 });
      if (s) { a.loops.set('vo', s); s.onended = () => { if (a.buses.bgm) a.buses.bgm.gain.setTargetAtTime(0.55, a.ctx.currentTime, 0.3); onEnded && onEnded(); }; }
      return s;
    },
    async sfx(name, gain = 0.8) { const b = await ensure(name); return playBuf(b, 'sfx', { gain }); },
    stopVo() { stop('vo'); if (a.buses.bgm) a.buses.bgm.gain.setTargetAtTime(0.55, a.ctx.currentTime, 0.2); },
    stopAll() { for (const k of [...a.loops.keys()]) stop(k); a.currentBgm = null; a.currentAmb = []; },
    setMuted(m) { a.muted = m; if (a.master && a.ctx) a.master.gain.setTargetAtTime(m ? 0 : 0.9, a.ctx.currentTime, 0.05); },
    suspend() { if (a.ctx && a.ctx.state === 'running') a.ctx.suspend(); },
    resume() { if (a.ctx && a.ctx.state === 'suspended') a.ctx.resume(); }
  };
}
