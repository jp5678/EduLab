// ─── State ───────────────────────────────────────────────────────────────────
const STATE = {
  services: JSON.parse(localStorage.getItem('edulab_services') || 'null') || DEFAULT_SERVICES,
  editingServiceId: null,
  isAdmin: false,
};

// ─── Firebase 동기화 ──────────────────────────────────────────────────────────
async function syncFromFirebase() {
  if (!FIREBASE_DB_URL) return;
  const isUnsynced = localStorage.getItem('edulab_unsynced') === 'true';
  const hasLocalData = localStorage.getItem('edulab_services') !== null;
  if (isUnsynced && hasLocalData) {
    console.warn('동기화되지 않은 로컬 데이터가 존재하여 Firebase DB 동기화를 건너뜁니다.');
    return;
  }
  try {
    const baseUrl = FIREBASE_DB_URL.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/edulab.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data) { await saveToFirebase(); return; }
    if (Array.isArray(data.services)) {
      STATE.services = data.services;
      localStorage.setItem('edulab_services', JSON.stringify(data.services));
    }
  } catch(e) {
    console.warn('Firebase 동기화 실패, localStorage 사용:', e);
  }
}

async function saveToFirebase() {
  if (!FIREBASE_DB_URL) return;
  const baseUrl = FIREBASE_DB_URL.replace(/\/$/, '');
  const url = STATE.idToken ? `${baseUrl}/edulab.json?auth=${STATE.idToken}` : `${baseUrl}/edulab.json`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ services: STATE.services }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP status ${res.status}`);
  }
}

const save = {
  services: async () => {
    localStorage.setItem('edulab_services', JSON.stringify(STATE.services));
    try {
      await saveToFirebase();
      localStorage.removeItem('edulab_unsynced');
    } catch (e) {
      localStorage.setItem('edulab_unsynced', 'true');
      throw e;
    }
  },
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

document.getElementById('adminLoginBtn').addEventListener('click', async () => {
  const pw = document.getElementById('adminPwInput').value;
  const isFirebaseEnabled = typeof FIREBASE_API_KEY !== 'undefined' && FIREBASE_API_KEY && FIREBASE_API_KEY !== 'YOUR_FIREBASE_WEB_API_KEY';

  if (isFirebaseEnabled) {
    const loginBtn = document.getElementById('adminLoginBtn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = '인증 중...';
    loginBtn.disabled = true;

    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jp5678@gmail.com',
          password: pw,
          returnSecureToken: true
        })
      });

      const data = await res.json();
      if (res.ok && data.idToken) {
        STATE.isAdmin = true;
        STATE.idToken = data.idToken;
        closeModal('adminModal');
        updateAdminUI();
        showToast('관리자 모드 활성화 (Firebase Auth) 🔓');
      } else {
        const errorMsg = data.error?.message;
        if (errorMsg === 'INVALID_PASSWORD' || errorMsg === 'EMAIL_NOT_FOUND') {
          showToast('비밀번호가 올바르지 않습니다. ❌');
        } else {
          showToast(`인증 실패: ${errorMsg || '알 수 없는 오류'} ❌`);
        }
        document.getElementById('adminPwInput').value = '';
        document.getElementById('adminPwInput').focus();
      }
    } catch (e) {
      console.error(e);
      showToast('네트워크 오류가 발생했습니다. ❌');
    } finally {
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  } else {
    if (pw === ADMIN_PASSWORD) {
      STATE.isAdmin = true;
      closeModal('adminModal');
      updateAdminUI();
      showToast('관리자 모드 활성화 (로컬 Fallback) 🔓');
    } else {
      showToast('비밀번호가 올바르지 않습니다. ❌');
      document.getElementById('adminPwInput').value = '';
      document.getElementById('adminPwInput').focus();
    }
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
        <div class="card-header-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div class="card-emoji" style="font-size: 1.6rem; line-height: 1;">${esc(s.emoji || '🤖')}</div>
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
    btn.addEventListener('click', async () => {
      if (confirm('삭제할까요?')) {
        const originalServices = [...STATE.services];
        STATE.services = STATE.services.filter(s => s.id !== btn.dataset.id);
        try {
          await save.services();
          renderServices();
          showToast('삭제되었습니다.');
        } catch (e) {
          console.error('삭제 실패:', e);
          if (STATE.idToken) {
            STATE.services = originalServices;
            localStorage.setItem('edulab_services', JSON.stringify(STATE.services));
            showToast('삭제에 실패했습니다. DB 저장 오류 ❌');
          } else {
            showToast('로컬에서 임시 삭제되었습니다. ⚠️ (API Key 미등록)');
            renderServices();
          }
        }
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

document.getElementById('saveServiceBtn').addEventListener('click', async () => {
  const title = document.getElementById('svcTitle').value.trim();
  const desc  = document.getElementById('svcDesc').value.trim();
  const url   = document.getElementById('svcUrl').value.trim() || '#';
  const emoji = document.getElementById('svcEmoji').value.trim() || '🤖';
  if (!title) { showToast('서비스 이름을 입력해주세요.'); return; }

  const originalServices = [...STATE.services];
  const saveBtn = document.getElementById('saveServiceBtn');
  const originalText = saveBtn.textContent;

  saveBtn.textContent = '저장 중...';
  saveBtn.disabled = true;

  if (STATE.editingServiceId) {
    STATE.services = STATE.services.map(s =>
      s.id === STATE.editingServiceId ? { ...s, title, desc, url, emoji } : s
    );
  } else {
    STATE.services = [{ id: 's' + Date.now(), emoji, title, desc, url }, ...STATE.services];
  }

  try {
    await save.services();
    showToast(STATE.editingServiceId ? '수정되었습니다. ✅' : '추가되었습니다! 🎉');
    renderServices();
    closeModal('serviceModal');
    clearServiceForm();
  } catch (e) {
    console.error('저장 실패:', e);
    if (STATE.idToken) {
      STATE.services = originalServices;
      localStorage.setItem('edulab_services', JSON.stringify(STATE.services));
      showToast('데이터베이스 저장에 실패했습니다. ❌ (원복됨)');
    } else {
      showToast('로컬에 임시 저장되었습니다. ⚠️ (API Key 미등록)');
      renderServices();
      closeModal('serviceModal');
      clearServiceForm();
    }
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
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
