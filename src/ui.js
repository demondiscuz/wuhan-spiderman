/* HUD / 覆盖层 / 对白 / 提示 */
const $ = (id) => document.getElementById(id);

export function createUI() {
  const el = {
    topLocation: $('topLocation'), weatherText: $('weatherText'), locationLabel: $('locationLabel'),
    hearts: $('hearts'), webFluid: $('webFluid'), parts: $('parts'), intel: $('intel'),
    objectiveTitle: $('objectiveTitle'), objectiveSub: $('objectiveSub'),
    objectiveProgress: $('objectiveProgress'), objectiveCheck: $('objectiveCheck'),
    dialogueBubble: $('dialogueBubble'), dialogueSpeaker: $('dialogueSpeaker'), dialogueText: $('dialogueText'),
    toast: $('toast'), hintBar: $('hintBar'), fps: $('fps'),
    startOverlay: $('startOverlay'), goalOverlay: $('goalOverlay'), pauseOverlay: $('pauseOverlay'),
    startBtn: $('startBtn'), restartBtn: $('restartBtn'), resumeBtn: $('resumeBtn'),
    btnAudio: $('btnAudio'), btnPause: $('btnPause'), btnFullscreen: $('btnFullscreen'), btnJournal: $('btnJournal'), btnHint: $('btnHint'),
    stage: $('stage16x9'), cutscene: $('cutscene'),
    chapterCard: $('chapterCard'), chapterKicker: $('chapterKicker'), chapterTitle: $('chapterTitle'), chapterSub: $('chapterSub'),
    loadingOverlay: $('loadingOverlay'), loadingImg: $('loadingImg'), loadingFill: $('loadingFill'), loadingPct: $('loadingPct'), loadingTip: $('loadingTip'),
    hintCard: $('hintCard'), hintTitle: $('hintTitle'), hintText: $('hintText'), hintClose: $('hintClose'), hintOk: $('hintOk'), hintRetry: $('hintRetry'),
    dialogueAvatar: $('dialogueAvatar'),
    enemyBar: $('enemyBar'), enemyName: $('enemyName'), enemyHpText: $('enemyHpText'), enemyFill: $('enemyFill'),
    interactPrompt: $('interactPrompt'), interactText: $('interactText')
  };

  let toastTimer = null;

  function buildHearts(n) {
    el.hearts.innerHTML = '';
    for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.className = 'heart'; s.textContent = '♥'; el.hearts.appendChild(s); }
  }
  function setHearts(cur, max) {
    Array.from(el.hearts.children).forEach((s, i) => s.classList.toggle('empty', i >= cur));
  }
  function toast(text, ms = 1800, warn = false) {
    el.toast.textContent = text; el.toast.classList.remove('hidden'); el.toast.classList.toggle('warn', warn);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.classList.add('hidden'), ms);
  }
  function showChapterCard(kicker, title, sub, ms = 1400) {
    el.chapterKicker.textContent = kicker; el.chapterTitle.textContent = title; el.chapterSub.textContent = sub;
    el.chapterCard.classList.remove('hidden');
    clearTimeout(el._cardTimer); el._cardTimer = setTimeout(() => el.chapterCard.classList.add('hidden'), ms);
  }
  /* 章节资源加载层：可带背景图（img 为完整 URL 或空）+ 顶部场景提示语（tip 为空时不显示） */
  function showLoading({ img, tip } = {}) {
    if (img) { el.loadingImg.src = img; el.loadingImg.classList.remove('hidden'); }
    else el.loadingImg.classList.add('hidden');
    if (tip) { el.loadingTip.textContent = tip; el.loadingTip.classList.remove('hidden'); }
    else { el.loadingTip.textContent = ''; el.loadingTip.classList.add('hidden'); }
    el.loadingFill.style.width = '0%';
    el.loadingPct.textContent = '0%';
    el.loadingOverlay.classList.remove('hidden');
  }
  function updateLoading(pct) {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    el.loadingFill.style.width = p + '%';
    el.loadingPct.textContent = p + '%';
  }
  function hideLoading() { el.loadingOverlay.classList.add('hidden'); }
  function setObjective(title, sub, progress) {
    el.objectiveTitle.textContent = title;
    if (sub != null) el.objectiveSub.textContent = sub;
    if (progress != null) el.objectiveProgress.textContent = progress;
  }
  function setLocation(text) { el.locationLabel.textContent = text; el.topLocation.textContent = text; }

  function showHint(title, text) {
    el.hintTitle.textContent = title || '下一步';
    el.hintText.textContent = text || '';
    el.hintCard.classList.remove('hidden');
  }
  function hideHint() { el.hintCard.classList.add('hidden'); }

  function setEnemyBar(name, hp, max) {
    const pct = Math.max(0, Math.min(1, hp / Math.max(1, max)));
    el.enemyName.textContent = name || '敌人';
    el.enemyHpText.textContent = `${Math.max(0, hp)} / ${max}`;
    el.enemyFill.style.width = `${pct * 100}%`;
    el.enemyBar.classList.remove('hidden');
  }
  function hideEnemyBar() { el.enemyBar.classList.add('hidden'); }

  function hideEnemyBar() { el.enemyBar.classList.add('hidden'); }
  function showInteract(text) {
    if (!el.interactPrompt) return;
    el.interactText.textContent = text || '点击交互';
    el.interactPrompt.classList.remove('hidden');
  }
  function hideInteract() { if (el.interactPrompt) el.interactPrompt.classList.add('hidden'); }
  return { el, buildHearts, setHearts, toast, showChapterCard, showLoading, updateLoading, hideLoading, setObjective, setLocation, showHint, hideHint, setEnemyBar, hideEnemyBar, showInteract, hideInteract };
}
