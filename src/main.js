import { DEFAULT } from './data.js';

const CAT_ICON = {
  '가전': '🏠', '날씨': '🌤', '과일': '🍎', '과학': '🔬', '고사성어': '📜',
  '국가': '🌍', '도시': '🏙', '동물': '🐾', '마피아42': '🎭',
  '명소': '🗺', '명작': '🖼', '수학': '📐', '스포츠': '⚽', '색깔': '🎨',
  '속담': '💬', '신체': '🫀', '신화': '⚡', '식물': '🌿', '악기': '🎵',
  '양념': '🧂', '영화': '🎬', '음악': '🎧', '음식': '🍜', '음료': '🥤',
  '의류': '👕', '역사': '🏛', '장소': '📍', '전통문화': '🎎',
  '직업': '💼', '천문현상': '🌌', '채소': '🥬', '탈것': '🚗',
  '학용품': '✏️', '화폐단위': '💰',
};

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function getCho(str) {
  let r = '';
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    r += (c >= 0xAC00 && c <= 0xD7A3) ? CHO[Math.floor((c - 0xAC00) / 588)] : str[i];
  }
  return r;
}

function loadData() {
  const stored = JSON.parse(localStorage.getItem('csd_v2') || 'null');
  if (!stored) return JSON.parse(JSON.stringify(DEFAULT));
  const merged = { ...stored };
  for (const [cat, words] of Object.entries(DEFAULT)) {
    if (!merged[cat]) merged[cat] = [...words];
    else words.forEach(w => { if (!merged[cat].includes(w)) merged[cat].push(w); });
  }
  return merged;
}

let DATA = loadData();
let WORDS_FLAT = [];

function buildIndex() {
  WORDS_FLAT = [];
  for (const [cat, words] of Object.entries(DATA)) {
    for (const word of words) {
      WORDS_FLAT.push({ cat, word, cho: getCho(word.replace(/\s/g, '')) });
    }
  }
  document.getElementById('stat').textContent = `단어 ${WORDS_FLAT.length.toLocaleString()}개`;
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function save() {
  localStorage.setItem('csd_v2', JSON.stringify(DATA));
}

// ── 렌더 ──────────────────────────────────────────────────
let lastQ = '';

function render(q) {
  const mainEl = document.getElementById('main');
  const cats = Object.keys(DATA);
  const qCho = q ? getCho(q.replace(/\s/g, '')) : null;

  // 카테고리별 단어 계산
  const catData = cats.map(cat => {
    let words;
    if (!q) {
      words = [...DATA[cat]].sort((a, b) => a.localeCompare(b, 'ko'));
    } else {
      words = DATA[cat]
        .filter(w => getCho(w.replace(/\s/g, '')).startsWith(qCho))
        .sort((a, b) => a.length - b.length || a.localeCompare(b, 'ko'));
    }
    return { cat, words };
  });

  if (!catData.length) {
    mainEl.innerHTML = '';
    document.getElementById('empty').style.display = 'block';
    return;
  }
  document.getElementById('empty').style.display = 'none';

  // 카테고리 컬럼들을 grid로 배치
  const cols = catData.map(({ cat, words }) => {
    const icon = CAT_ICON[cat] || '📁';
    const rows = words.map(w => `<div class="word-cell">${esc(w)}</div>`).join('');
    return `<div class="cat-col">
      <div class="cat-head">
        <span class="th-label" data-cat="${esc(cat)}">${icon} ${esc(cat)}</span>
        <div class="th-addinput" id="addinput-${esc(cat)}" style="display:none">
          <input class="th-inp" placeholder="단어 입력" data-cat="${esc(cat)}"/>
          <button class="th-inp-btn" data-cat="${esc(cat)}">+</button>
        </div>
      </div>
      <div class="word-list">${rows}</div>
    </div>`;
  }).join('');

  mainEl.innerHTML = `<div class="cat-grid">${cols}</div>`;
}

// ── 헤더 클릭 → 단어 추가 인풋 ───────────────────────────
document.getElementById('main').addEventListener('click', (e) => {
  const label = e.target.closest('.th-label');
  if (label) {
    const cat = label.dataset.cat;
    const box = document.getElementById(`addinput-${cat}`);
    if (!box) return;
    const isOpen = box.style.display !== 'none';
    document.querySelectorAll('.th-addinput').forEach(el => el.style.display = 'none');
    if (!isOpen) {
      box.style.display = 'flex';
      box.querySelector('input').focus();
    }
    return;
  }
  const btn = e.target.closest('.th-inp-btn');
  if (btn) { submitInlineAdd(btn.dataset.cat); return; }
});

document.getElementById('main').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const inp = e.target.closest('.th-inp');
    if (inp) submitInlineAdd(inp.dataset.cat);
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.th-addinput').forEach(el => el.style.display = 'none');
  }
});

function submitInlineAdd(cat) {
  const box = document.getElementById(`addinput-${cat}`);
  if (!box) return;
  const inp = box.querySelector('input');
  const raw = inp.value.trim();
  if (raw) {
    raw.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean).forEach(w => {
      if (!DATA[cat].includes(w)) DATA[cat].push(w);
    });
    save(); buildIndex();
  }
  box.style.display = 'none';
  render(lastQ);
}

// ── 검색 ──────────────────────────────────────────────────
const qEl = document.getElementById('q');

function doSearch() {
  const v = qEl.value.trim();
  if (v === lastQ) return;
  lastQ = v;
  render(v);
}

qEl.addEventListener('input', doSearch);
qEl.addEventListener('compositionend', doSearch);

// ── 편집 패널 ─────────────────────────────────────────────
let isEditing = false;

window.toggleEdit = function () {
  isEditing = !isEditing;
  const btn = document.getElementById('btn-edit');
  btn.textContent = isEditing ? '✓ 완료' : '✏️ 편집';
  btn.classList.toggle('on', isEditing);
  document.getElementById('ep').classList.toggle('on', isEditing);
  if (isEditing) refreshCatSelect();
};

function refreshCatSelect() {
  const cats = Object.keys(DATA).map(c => `<option>${esc(c)}</option>`).join('');
  document.getElementById('ep-cat').innerHTML = cats;
  document.getElementById('ep-edit-cat').innerHTML = cats;
  refreshEditWords();
}

window.refreshEditWords = function () {
  const cat = document.getElementById('ep-edit-cat').value;
  if (!cat || !DATA[cat]) return;
  document.getElementById('ep-edit-word').innerHTML =
    [...DATA[cat]].sort((a, b) => a.localeCompare(b, 'ko'))
      .map(w => `<option>${esc(w)}</option>`).join('');
};

window.editWord = function () {
  const cat = document.getElementById('ep-edit-cat').value;
  const oldWord = document.getElementById('ep-edit-word').value;
  const newWord = document.getElementById('ep-edit-new').value.trim();
  if (!cat || !oldWord || !newWord) return;
  const idx = DATA[cat].indexOf(oldWord);
  if (idx === -1) return;
  DATA[cat][idx] = newWord;
  document.getElementById('ep-edit-new').value = '';
  save(); buildIndex(); refreshCatSelect(); render(lastQ);
};

window.addWords = function () {
  const cat = document.getElementById('ep-cat').value;
  const raw = document.getElementById('ep-word').value.trim();
  if (!raw || !cat) return;
  raw.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean).forEach(w => {
    if (!DATA[cat].includes(w)) DATA[cat].push(w);
  });
  document.getElementById('ep-word').value = '';
  save(); buildIndex(); render(lastQ);
};

window.addCat = function () {
  const name = document.getElementById('ep-new-cat').value.trim();
  if (!name || DATA[name]) return;
  DATA[name] = [];
  document.getElementById('ep-new-cat').value = '';
  save(); buildIndex(); refreshCatSelect();
  document.getElementById('ep-cat').value = name;
  render(lastQ);
};

window.focusNewCat = function () {
  if (!isEditing) window.toggleEdit();
  document.getElementById('ep-new-cat').focus();
};

window.exportData = function () {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '초성검색_데이터.json';
  a.click();
};

window.importData = function (e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (typeof parsed !== 'object') throw new Error();
      for (const [cat, words] of Object.entries(parsed)) {
        if (!Array.isArray(words)) continue;
        if (!DATA[cat]) DATA[cat] = [];
        words.forEach(w => { if (!DATA[cat].includes(w)) DATA[cat].push(w); });
      }
      save(); buildIndex(); refreshCatSelect(); render(lastQ);
      alert(`가져오기 완료 — 현재 단어 ${WORDS_FLAT.length}개`);
    } catch { alert('올바른 JSON 파일이 아닙니다'); }
  };
  r.readAsText(file);
  e.target.value = '';
};

window.copyFromStorage = function () {
  const data = localStorage.getItem('csd_v2');
  if (!data) { alert('저장된 데이터가 없습니다'); return; }
  navigator.clipboard.writeText(data).then(() => {
    alert('클립보드에 복사됐습니다. textarea에 붙여넣기 하세요.');
  });
};

window.togglePaste = function () {
  const panel = document.getElementById('paste-panel');
  const isOn = panel.classList.toggle('on');
  document.getElementById('btn-paste').classList.toggle('on', isOn);
  if (isOn) document.getElementById('paste-input').focus();
};

window.applyPaste = function () {
  const raw = document.getElementById('paste-input').value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object') throw new Error();
    for (const [cat, words] of Object.entries(parsed)) {
      if (!Array.isArray(words)) continue;
      if (!DATA[cat]) DATA[cat] = [];
      words.forEach(w => { if (!DATA[cat].includes(w)) DATA[cat].push(w); });
    }
    // DEFAULT 단어도 병합
    for (const [cat, words] of Object.entries(DEFAULT)) {
      if (!DATA[cat]) DATA[cat] = [...words];
      else words.forEach(w => { if (!DATA[cat].includes(w)) DATA[cat].push(w); });
    }
    save(); buildIndex(); refreshCatSelect(); render(lastQ);
    document.getElementById('paste-input').value = '';
    document.getElementById('paste-panel').classList.remove('on');
    document.getElementById('btn-paste').classList.remove('on');
    alert(`적용 완료 — 현재 단어 ${WORDS_FLAT.length}개`);
  } catch { alert('올바른 JSON 형식이 아닙니다'); }
};

window.resetData = function () {
  if (!confirm('모든 데이터를 기본값으로 초기화할까요?')) return;
  localStorage.removeItem('csd_v2');
  DATA = JSON.parse(JSON.stringify(DEFAULT));
  save(); buildIndex(); refreshCatSelect(); render('');
};

buildIndex();
render('');
