/* 自动音视频卡位引擎（视频侧）
 * v0 真实播放；v1–v4 缺失时走引擎内兜底（回调继续），不阻塞流程。
 * 移动端修复：playsinline + 内联属性 + 播放被拒（iOS 有声自动播放限制）时静音重试，
 * 避免被当成“缺失”跳过开场视频。
 */
export function playVideo(el, id, onDone, { cue, cueAt } = {}) {
  let done = false;
  const finish = (reason) => {
    if (done) return; done = true;
    clearTimeout(el._slotTimer);
    el.classList.remove('playing');
    el.pause(); el.removeAttribute('src'); el.load();
    el.onended = el.onerror = el.ontimeupdate = null;
    onDone && onDone(reason);
  };
  el.onended = () => finish('end');
  el.onerror = () => finish('missing');
  el.classList.add('playing');
  // 内联播放：避免 iOS Safari 全屏抢占与自动播放限制
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  el.src = `${import.meta.env.BASE_URL}video/${id}.mp4`;
  el.currentTime = 0;
  const p = el.play();
  if (p && p.catch) p.catch(() => {
    // 首次有声播放被拒（移动端常见）→ 静音重试，保证开场不中断
    if (done) return;
    el.muted = true;
    const p2 = el.play();
    if (p2 && p2.catch) p2.catch(() => finish('missing'));
  });
  if (cue && cueAt != null) {
    el.ontimeupdate = () => { if (el.currentTime >= cueAt) { const fn = cue; cue = null; fn && fn(); } };
  }
  el._slotTimer = setTimeout(() => finish('timeout'), 30000);
}
