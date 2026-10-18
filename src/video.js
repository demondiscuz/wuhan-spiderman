/* 自动音视频卡位引擎（视频侧）
 * v0 真实播放；v1–v4 缺失时走引擎内兜底（回调继续），不阻塞流程。
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
  el.src = `${import.meta.env.BASE_URL}video/${id}.mp4`;
  el.currentTime = 0;
  const p = el.play();
  if (p && p.catch) p.catch(() => finish('missing'));
  if (cue && cueAt != null) {
    el.ontimeupdate = () => { if (el.currentTime >= cueAt) { const fn = cue; cue = null; fn && fn(); } };
  }
  el._slotTimer = setTimeout(() => finish('timeout'), 30000);
}
