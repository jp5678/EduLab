// ─── State ───────────────────────────────────────────────────────────────────
const STATE = {
  services: JSON.parse(localStorage.getItem('edulab_services') || 'null') || DEFAULT_SERVICES,
  editingServiceId: null,
  isAdmin: false,
};

// ─── Firebase 동기화 ──────────────────────────────────────────────────────────
async function syncFromFirebase() {
  if (!FIREBASE_DB_URL) return;
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/edulab.json`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) { saveToFirebase(); return; }
    if (Array.isArray(data.services)) {
      STATE.services = data.services;
      localStorage.setItem('edulab_services', JSON.stringify(data.services));
    }
  } catch(e) {
    console.warn('Firebase 동기화 실패, localStorage 사용:', e);
  }
}

function saveToFirebase() {
  if (!FIREBASE_DB_URL) return;
  fetch(`${FIREBASE_DB_URL}/edulab.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ services: STATE.services }),
  }).catch(() => {});
}

const save = {
  services: () => { localStorage.setItem('edulab_services', JSON.stringify(STATE.services)); saveToFirebase(); },
};

// ─── Admin Auth ──────────────────────────────────────────────────────────────
function updateAdminUI() {
  const isAdmin = STATE.isAdmin;
  document.getElementById('adminLockBtn').textContent = isAdmin ? '🔓' : '🔒';
  document.getElementById('adminLockBtn').title = isAdmin ? '관리자 모드 종료' : '관리자 로그인';
  document.getElementById('addServiceBtn').style.display = isAdmin ? '' : 'none';
  renderServices();
}

document.getElementById('adminLockBtn').addEventListener('click', () => {
  if (STATE.isAdmin) {
    STATE.isAdmin = false;
    updateAdminUI();
    showToast('관리자 모드가 종료되었습니다. 🔒');
  } else {
    document.getElementById('adminPwInput').value = '';
    openModal('adminModal');
    setTimeout(() => document.getElementById('adminPwInput').focus(), 100);
  }
});

document.getElementById('adminLoginBtn').addEventListener('click', () => {
  const pw = document.getElementById('adminPwInput').value;
  if (pw === ADMIN_PASSWORD) {
    STATE.isAdmin = true;
    closeModal('adminModal');
    updateAdminUI();
    showToast('관리자 모드 활성화 🔓');
  } else {
    showToast('비밀번호가 올바르지 않습니다. ❌');
    document.getElementById('adminPwInput').value = '';
    document.getElementById('adminPwInput').focus();
  }
});

document.getElementById('adminPwInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('adminLoginBtn').click();
});

// ─── Navbar ──────────────────────────────────────────────────────────────────
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});
document.querySelectorAll('.nav-link').forEach(l =>
  l.addEventListener('click', () => document.getElementById('navLinks').classList.remove('open'))
);

// ─── Services ────────────────────────────────────────────────────────────────
function renderServices() {
  const grid = document.getElementById('servicesGrid');
  if (!STATE.services.length) {
    grid.innerHTML = `<div class="qna-empty" style="grid-column:1/-1">아직 서비스가 없어요. 추가해보세요!</div>`;
    return;
  }
  grid.innerHTML = STATE.services.map(s => `
    <div class="service-card" data-id="${s.id}">
      <div class="card-color-bar"></div>
      <div class="card-body">
        <div class="card-row">
          ${STATE.isAdmin ? `<div class="card-actions-row">
            <button class="card-icon-btn svc-edit" data-id="${s.id}" title="수정">✏️</button>
            <button class="card-icon-btn danger svc-del" data-id="${s.id}" title="삭제">🗑️</button>
          </div>` : ''}
        </div>
        <div class="card-title">${esc(s.title)}</div>
        <div class="card-desc">${esc(s.desc)}</div>
      </div>
      <div class="card-footer">
        <a class="card-link" href="${s.url}" target="_blank" rel="noopener"
           ${s.url === '#' ? `onclick="showToast('준비 중입니다 🔨');return false;"` : ''}>
          바로 사용하기 <span class="card-link-arrow">→</span>
        </a>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.svc-edit').forEach(btn =>
    btn.addEventListener('click', () => openEditService(btn.dataset.id))
  );
  grid.querySelectorAll('.svc-del').forEach(btn =>
    btn.addEventListener('click', () => {
      if (confirm('삭제할까요?')) {
        STATE.services = STATE.services.filter(s => s.id !== btn.dataset.id);
        save.services(); renderServices(); showToast('삭제되었습니다.');
      }
    })
  );
}

document.getElementById('addServiceBtn').addEventListener('click', () => {
  STATE.editingServiceId = null;
  document.getElementById('serviceModalTitle').textContent = '교육활동 지원 추가';
  clearServiceForm();
  openModal('serviceModal');
});

function openEditService(id) {
  const s = STATE.services.find(x => x.id === id);
  if (!s) return;
  STATE.editingServiceId = id;
  document.getElementById('serviceModalTitle').textContent = '교육활동 지원 수정';
  document.getElementById('svcTitle').value = s.title;
  document.getElementById('svcDesc').value  = s.desc;
  document.getElementById('svcUrl').value   = s.url === '#' ? '' : s.url;
  document.getElementById('svcEmoji').value = s.emoji;
  openModal('serviceModal');
}

document.getElementById('saveServiceBtn').addEventListener('click', () => {
  const title = document.getElementById('svcTitle').value.trim();
  const desc  = document.getElementById('svcDesc').value.trim();
  const url   = document.getElementById('svcUrl').value.trim() || '#';
  const emoji = document.getElementById('svcEmoji').value.trim() || '🤖';
  if (!title) { showToast('서비스 이름을 입력해주세요.'); return; }

  if (STATE.editingServiceId) {
    STATE.services = STATE.services.map(s =>
      s.id === STATE.editingServiceId ? { ...s, title, desc, url, emoji } : s
    );
    showToast('수정되었습니다. ✅');
  } else {
    STATE.services = [{ id: 's' + Date.now(), emoji, title, desc, url }, ...STATE.services];
    showToast('추가되었습니다! 🎉');
  }
  save.services(); renderServices(); closeModal('serviceModal'); clearServiceForm();
});

function clearServiceForm() {
  ['svcTitle','svcDesc','svcUrl','svcEmoji'].forEach(id => { document.getElementById(id).value = ''; });
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.querySelectorAll('.modal-close, [data-modal]').forEach(el => {
  el.addEventListener('click', e => {
    e.stopPropagation();
    const id = el.dataset.modal || el.closest('.modal-overlay')?.id;
    if (id) closeModal(id);
  });
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { e.stopPropagation(); });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => { e.stopPropagation(); });
});

// ─── Utilities ───────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await syncFromFirebase();
  renderServices();
})();
