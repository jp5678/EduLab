// ─── State ───────────────────────────────────────────────────────────────────
const STATE = {
  services: JSON.parse(localStorage.getItem('edulab_services') || 'null') || DEFAULT_SERVICES,
  notices:  JSON.parse(localStorage.getItem('edulab_notices')  || 'null') || DEFAULT_NOTICES,
  qna:      JSON.parse(localStorage.getItem('edulab_qna')      || 'null') || DEFAULT_QNA,
  editingServiceId: null,
  editingNoticeId:  null,
  replyTargetId:    null,
  expandedNoticeId: null,
  isAdmin: false,
};

// ─── Firebase 동기화 ──────────────────────────────────────────────────────────
async function syncFromFirebase() {
  if (!FIREBASE_DB_URL) return;
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/edulab.json`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) {
      // Firebase가 비어 있으면 현재 데이터를 업로드 (최초 1회)
      saveToFirebase();
      return;
    }
    if (Array.isArray(data.services)) {
      STATE.services = data.services;
      localStorage.setItem('edulab_services', JSON.stringify(data.services));
    }
    if (Array.isArray(data.notices)) {
      STATE.notices = data.notices;
      localStorage.setItem('edulab_notices', JSON.stringify(data.notices));
    }
    if (Array.isArray(data.qna)) {
      STATE.qna = data.qna;
      localStorage.setItem('edulab_qna', JSON.stringify(data.qna));
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
    body: JSON.stringify({ services: STATE.services, notices: STATE.notices, qna: STATE.qna }),
  }).catch(() => {});
}

const save = {
  services: () => { localStorage.setItem('edulab_services', JSON.stringify(STATE.services)); saveToFirebase(); },
  notices:  () => { localStorage.setItem('edulab_notices',  JSON.stringify(STATE.notices));  saveToFirebase(); },
  qna:      () => { localStorage.setItem('edulab_qna',      JSON.stringify(STATE.qna));      saveToFirebase(); },
};

// ─── Admin Auth ──────────────────────────────────────────────────────────────
function updateAdminUI() {
  const isAdmin = STATE.isAdmin;
  document.getElementById('adminLockBtn').textContent = isAdmin ? '🔓' : '🔒';
  document.getElementById('adminLockBtn').title = isAdmin ? '관리자 모드 종료' : '관리자 로그인';
  document.getElementById('addServiceBtn').style.display = isAdmin ? '' : 'none';
  document.getElementById('addNoticeBtn').style.display = isAdmin ? '' : 'none';
  renderServices();
  renderNotices();
  renderQna();
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

window.addEventListener('scroll', () => {
  const sections = ['services', 'notices', 'qna'];
  const y = window.scrollY + 80;
  let active = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= y) active = id;
  });
  document.querySelectorAll('.nav-link').forEach(l =>
    l.classList.toggle('active', l.getAttribute('href') === `#${active}`)
  );
});

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

// Add service
document.getElementById('addServiceBtn').addEventListener('click', () => {
  STATE.editingServiceId = null;
  document.getElementById('serviceModalTitle').textContent = 'AI 서비스 추가';
  clearServiceForm();
  openModal('serviceModal');
});

function openEditService(id) {
  const s = STATE.services.find(x => x.id === id);
  if (!s) return;
  STATE.editingServiceId = id;
  document.getElementById('serviceModalTitle').textContent = 'AI 서비스 수정';
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

// ─── Notices ─────────────────────────────────────────────────────────────────
const BADGE_LABELS = { new: 'NEW', important: '중요', general: '일반' };

function renderNotices() {
  const list = document.getElementById('noticesList');
  if (!STATE.notices.length) {
    list.innerHTML = `<div class="notice-empty">공지사항이 없습니다.</div>`;
    return;
  }

  list.innerHTML = STATE.notices.map(n => {
    const expanded = STATE.expandedNoticeId === n.id;
    return `
      <div class="notice-item${expanded ? ' expanded' : ''}" data-id="${n.id}">
        <span class="notice-badge badge-${n.badge}">${n.badgeLabel || BADGE_LABELS[n.badge]}</span>
        <div class="notice-main">
          <div class="notice-title-row">
            <span class="notice-title">${esc(n.title)}</span>
            <span class="notice-date">${n.date}</span>
          </div>
          ${!expanded ? `<div class="notice-body-preview">${esc(n.body.split('\n')[0])}</div>` : ''}
        </div>
        ${STATE.isAdmin ? `<div class="notice-ctrl">
          <button class="card-icon-btn notice-edit" data-id="${n.id}" title="수정">✏️</button>
          <button class="card-icon-btn danger notice-del" data-id="${n.id}" title="삭제">🗑️</button>
        </div>` : ''}
      </div>
      ${expanded ? `<div class="notice-full-body">${esc(n.body)}</div>` : ''}
    `;
  }).join('');

  // Toggle expand
  list.querySelectorAll('.notice-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('.notice-ctrl')) return;
      const id = item.dataset.id;
      STATE.expandedNoticeId = STATE.expandedNoticeId === id ? null : id;
      renderNotices();
    });
  });

  list.querySelectorAll('.notice-edit').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openEditNotice(btn.dataset.id); })
  );
  list.querySelectorAll('.notice-del').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm('이 공지를 삭제할까요?')) {
        if (STATE.expandedNoticeId === btn.dataset.id) STATE.expandedNoticeId = null;
        STATE.notices = STATE.notices.filter(n => n.id !== btn.dataset.id);
        save.notices(); renderNotices(); showToast('삭제되었습니다.');
      }
    })
  );
}

// Add notice
document.getElementById('addNoticeBtn').addEventListener('click', () => {
  STATE.editingNoticeId = null;
  document.getElementById('noticeModalTitle').textContent = '공지사항 작성';
  document.getElementById('noticeTitle').value = '';
  document.getElementById('noticeBody').value  = '';
  document.getElementById('noticeBadge').value = 'general';
  openModal('noticeModal');
});

function openEditNotice(id) {
  const n = STATE.notices.find(x => x.id === id);
  if (!n) return;
  STATE.editingNoticeId = id;
  document.getElementById('noticeModalTitle').textContent = '공지사항 수정';
  document.getElementById('noticeTitle').value = n.title;
  document.getElementById('noticeBody').value  = n.body;
  document.getElementById('noticeBadge').value = n.badge;
  openModal('noticeModal');
}

document.getElementById('saveNoticeBtn').addEventListener('click', () => {
  const title = document.getElementById('noticeTitle').value.trim();
  const body  = document.getElementById('noticeBody').value.trim();
  const badge = document.getElementById('noticeBadge').value;
  if (!title) { showToast('제목을 입력해주세요.'); return; }

  const today = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' })
    .replace(/\. /g, '.').replace(/\.$/, '');

  if (STATE.editingNoticeId) {
    STATE.notices = STATE.notices.map(n =>
      n.id === STATE.editingNoticeId
        ? { ...n, title, body, badge, badgeLabel: BADGE_LABELS[badge] }
        : n
    );
    showToast('수정되었습니다. ✅');
  } else {
    STATE.notices = [
      { id: 'n' + Date.now(), badge, badgeLabel: BADGE_LABELS[badge], title, date: today, body },
      ...STATE.notices,
    ];
    showToast('공지가 등록되었습니다! ✅');
  }
  save.notices(); renderNotices(); closeModal('noticeModal');
});

// ─── Q&A ─────────────────────────────────────────────────────────────────────
function renderQna() {
  const list = document.getElementById('qnaList');
  if (!STATE.qna.length) {
    list.innerHTML = `<div class="qna-empty">아직 질문이 없어요. 첫 번째 질문을 남겨보세요! ✋</div>`;
    return;
  }
  list.innerHTML = [...STATE.qna].reverse().map(q => `
    <div class="qna-item">
      <div class="qna-question">
        <div class="qna-q-icon">Q</div>
        <div class="qna-q-body">
          <div class="qna-q-meta">
            <span class="qna-q-name">${esc(q.name)}</span>
            <span class="qna-q-date">${q.date}</span>
          </div>
          <div class="qna-q-title">${esc(q.subject)}</div>
          <div class="qna-q-text">${esc(q.body)}</div>
        </div>
        <div class="qna-ctrl">
          ${q.answered
            ? `<span class="replied-badge">✅ 답변완료</span>`
            : STATE.isAdmin ? `<button class="reply-btn" data-id="${q.id}">답변하기</button>` : ''}
          ${STATE.isAdmin ? `<button class="card-icon-btn danger qna-del" data-id="${q.id}" title="삭제">🗑️</button>` : ''}
        </div>
      </div>
      ${q.answer ? `
        <div class="qna-answer">
          <div class="qna-a-icon">A</div>
          <div class="qna-a-content">
            <div class="qna-a-label">👨‍🏫 제프리 교수</div>
            <div class="qna-a-text">${esc(q.answer)}</div>
          </div>
        </div>` : ''}
    </div>
  `).join('');

  list.querySelectorAll('.reply-btn').forEach(btn =>
    btn.addEventListener('click', () => openReplyModal(btn.dataset.id))
  );
  list.querySelectorAll('.qna-del').forEach(btn =>
    btn.addEventListener('click', () => {
      if (confirm('삭제할까요?')) {
        STATE.qna = STATE.qna.filter(q => q.id !== btn.dataset.id);
        save.qna(); renderQna(); showToast('삭제되었습니다.');
      }
    })
  );
}

document.getElementById('qnaSubmit').addEventListener('click', () => {
  const name    = document.getElementById('qnaName').value.trim();
  const subject = document.getElementById('qnaSubject').value.trim();
  const body    = document.getElementById('qnaBody').value.trim();
  if (!name || !subject || !body) { showToast('이름, 제목, 내용을 모두 입력해주세요.'); return; }

  const today = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' })
    .replace(/\. /g, '.').replace(/\.$/, '');

  STATE.qna = [...STATE.qna, { id: 'q' + Date.now(), name, subject, body, date: today, answer: '', answered: false }];
  save.qna(); renderQna();
  ['qnaName','qnaSubject','qnaBody'].forEach(id => { document.getElementById(id).value = ''; });
  showToast('질문이 등록되었습니다! ✅');
});

function openReplyModal(qId) {
  STATE.replyTargetId = qId;
  const q = STATE.qna.find(x => x.id === qId);
  if (!q) return;
  document.getElementById('replyQuestionPreview').innerHTML =
    `<strong>${esc(q.name)}</strong>: ${esc(q.subject)}<br><small>${esc(q.body)}</small>`;
  document.getElementById('replyBody').value = '';
  openModal('replyModal');
}

document.getElementById('saveReplyBtn').addEventListener('click', () => {
  const answer = document.getElementById('replyBody').value.trim();
  if (!answer) { showToast('답변 내용을 입력해주세요.'); return; }
  STATE.qna = STATE.qna.map(q =>
    q.id === STATE.replyTargetId ? { ...q, answer, answered: true } : q
  );
  save.qna(); renderQna(); closeModal('replyModal'); showToast('답변이 등록되었습니다! ✅');
});

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

// 모달 외부(오버레이) 클릭 시 닫히지 않도록 명시적 차단
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { e.stopPropagation(); });
});

// 모달 내부 클릭이 오버레이로 전파되지 않도록 차단
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
  await syncFromFirebase(); // Firebase 설정 시 최신 데이터 로드
  renderServices();
  renderNotices();
  renderQna();
})();
