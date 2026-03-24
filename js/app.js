// ─── State ───────────────────────────────────────────────────────────────────
const STATE = {
  services: JSON.parse(localStorage.getItem('edulab_services') || 'null') || DEFAULT_SERVICES,
  notices: DEFAULT_NOTICES,
  guides: DEFAULT_GUIDES,
  qna: JSON.parse(localStorage.getItem('edulab_qna') || 'null') || DEFAULT_QNA,
  currentFilter: 'all',
  activeNotice: null,
  replyTargetId: null,
};

function saveServices() { localStorage.setItem('edulab_services', JSON.stringify(STATE.services)); }
function saveQna() { localStorage.setItem('edulab_qna', JSON.stringify(STATE.qna)); }

// ─── Navbar ───────────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
  highlightNavLink();
});

document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

document.querySelectorAll('.nav-link').forEach(l => {
  l.addEventListener('click', () => document.getElementById('navLinks').classList.remove('open'));
});

function highlightNavLink() {
  const sections = ['services','notices','guide','qna'];
  const scrollY = window.scrollY + 100;
  let active = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= scrollY) active = id;
  });
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === `#${active}`);
  });
}

// ─── Hero counter animation ───────────────────────────────────────────────────
function animateCount(el, target, suffix = '') {
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current + suffix;
    if (current >= target) clearInterval(timer);
  }, 40);
}

const heroObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    animateCount(document.getElementById('statServices'), STATE.services.length);
    animateCount(document.getElementById('statStudents'), 127);
    animateCount(document.getElementById('statTools'), 6);
    heroObserver.disconnect();
  }
}, { threshold: 0.3 });
heroObserver.observe(document.querySelector('.hero'));

// ─── Services ─────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = { quiz: '퀴즈/게임', tool: '학습 도구', visual: '시각화', writing: '글쓰기' };

function renderServices() {
  const grid = document.getElementById('servicesGrid');
  const filtered = STATE.currentFilter === 'all'
    ? STATE.services
    : STATE.services.filter(s => s.category === STATE.currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="qna-empty" style="grid-column:1/-1">이 카테고리에 아직 서비스가 없어요. 곧 추가될 예정입니다!</div>`;
    return;
  }

  grid.innerHTML = filtered.map(s => `
    <div class="service-card" data-id="${s.id}">
      <div class="card-top">
        <span class="card-emoji">${s.emoji}</span>
        <span class="card-category">${CATEGORY_LABELS[s.category] || s.category}</span>
      </div>
      <div class="card-title">${escHtml(s.title)}</div>
      <div class="card-desc">${escHtml(s.desc)}</div>
      <div class="card-tags">${s.tags.map(t => `<span class="card-tag">${escHtml(t)}</span>`).join('')}</div>
      <div class="card-actions">
        <a href="${s.url}" target="_blank" rel="noopener" class="card-link"
           ${s.url === '#' ? 'onclick="showToast(\'아직 준비 중입니다! 곧 오픈 예정이에요 🔨\');return false;"' : ''}>
          바로 사용하기 →
        </a>
        <button class="card-delete-btn" data-id="${s.id}" title="삭제">🗑️ 삭제</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.card-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm('이 서비스를 삭제할까요?')) {
        STATE.services = STATE.services.filter(s => s.id !== btn.dataset.id);
        saveServices();
        renderServices();
        updateStatCount();
        showToast('삭제되었습니다.');
      }
    });
  });
}

document.getElementById('filterTabs').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  STATE.currentFilter = btn.dataset.filter;
  renderServices();
});

// Add service modal
document.getElementById('addServiceBtn').addEventListener('click', () => {
  openModal('addServiceModal');
});

document.getElementById('saveServiceBtn').addEventListener('click', () => {
  const title = document.getElementById('svcTitle').value.trim();
  const desc = document.getElementById('svcDesc').value.trim();
  const url = document.getElementById('svcUrl').value.trim() || '#';
  const category = document.getElementById('svcCategory').value;
  const emoji = document.getElementById('svcEmoji').value.trim() || '🤖';
  const tags = document.getElementById('svcTags').value.split(',').map(t => t.trim()).filter(Boolean);

  if (!title || !desc) { showToast('이름과 설명은 필수입니다.'); return; }

  const newService = {
    id: 's' + Date.now(),
    emoji, title, desc, url, category,
    tags: tags.length ? tags : [CATEGORY_LABELS[category]],
  };
  STATE.services = [newService, ...STATE.services];
  saveServices();
  renderServices();
  updateStatCount();
  closeModal('addServiceModal');
  clearServiceForm();
  showToast('새 서비스가 추가되었습니다! 🎉');
});

function clearServiceForm() {
  ['svcTitle','svcDesc','svcUrl','svcEmoji','svcTags'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function updateStatCount() {
  document.getElementById('statServices').textContent = STATE.services.length;
}

// ─── Notices ──────────────────────────────────────────────────────────────────
function renderNotices() {
  const list = document.getElementById('noticesList');
  list.innerHTML = STATE.notices.map(n => `
    <div class="notice-item${STATE.activeNotice === n.id ? ' active' : ''}" data-id="${n.id}">
      <span class="notice-badge badge-${n.badge}">${n.badgeLabel}</span>
      <div class="notice-info">
        <div class="notice-title">${escHtml(n.title)}</div>
        <div class="notice-date">${n.date}</div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.notice-item').forEach(item => {
    item.addEventListener('click', () => {
      STATE.activeNotice = item.dataset.id;
      renderNotices();
      renderNoticeDetail();
    });
  });
}

function renderNoticeDetail() {
  const panel = document.getElementById('noticeDetail');
  const notice = STATE.notices.find(n => n.id === STATE.activeNotice);
  if (!notice) return;

  panel.innerHTML = `
    <div class="notice-detail-title">${escHtml(notice.title)}</div>
    <div class="notice-detail-meta">📅 ${notice.date} &nbsp;·&nbsp;
      <span class="notice-badge badge-${notice.badge}">${notice.badgeLabel}</span>
    </div>
    <div class="notice-detail-body">${escHtml(notice.body)}</div>
  `;
}

// ─── Guide ────────────────────────────────────────────────────────────────────
function renderGuide() {
  const grid = document.getElementById('guideGrid');
  grid.innerHTML = STATE.guides.map(g => `
    <div class="guide-card">
      <div class="guide-step">${g.step}</div>
      <span class="guide-icon">${g.icon}</span>
      <div class="guide-title">${escHtml(g.title)}</div>
      <div class="guide-desc">${escHtml(g.desc)}</div>
      <div class="guide-tips">
        ${g.tips.map(t => `<div class="guide-tip"><span class="tip-dot">›</span>${escHtml(t)}</div>`).join('')}
      </div>
    </div>
  `).join('');
}

// ─── Q&A ──────────────────────────────────────────────────────────────────────
function renderQna() {
  const list = document.getElementById('qnaList');
  if (STATE.qna.length === 0) {
    list.innerHTML = `<div class="qna-empty">아직 질문이 없어요. 첫 번째 질문을 남겨보세요! ✋</div>`;
    return;
  }

  list.innerHTML = [...STATE.qna].reverse().map(q => `
    <div class="qna-item" id="qitem-${q.id}">
      <div class="qna-question">
        <div class="qna-q-icon">Q</div>
        <div class="qna-q-body">
          <div class="qna-q-header">
            <span class="qna-q-name">${escHtml(q.name)}</span>
            <span class="qna-q-date">${q.date}</span>
          </div>
          <div class="qna-q-title">${escHtml(q.subject)}</div>
          <div class="qna-q-text">${escHtml(q.body)}</div>
        </div>
        <div class="qna-actions">
          ${q.answered
            ? `<span class="answered-badge">✅ 답변완료</span>`
            : `<button class="reply-btn" data-id="${q.id}">답변하기</button>`}
          <button class="delete-qna-btn" data-id="${q.id}" title="삭제">🗑️</button>
        </div>
      </div>
      ${q.answer ? `
        <div class="qna-answer">
          <div class="qna-a-icon">A</div>
          <div>
            <div class="qna-a-label">제프리 교수</div>
            <div class="qna-a-text">${escHtml(q.answer)}</div>
          </div>
        </div>` : ''}
    </div>
  `).join('');

  list.querySelectorAll('.reply-btn').forEach(btn => {
    btn.addEventListener('click', () => openReplyModal(btn.dataset.id));
  });

  list.querySelectorAll('.delete-qna-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('이 질문을 삭제할까요?')) {
        STATE.qna = STATE.qna.filter(q => q.id !== btn.dataset.id);
        saveQna();
        renderQna();
        showToast('삭제되었습니다.');
      }
    });
  });
}

document.getElementById('qnaSubmit').addEventListener('click', () => {
  const name = document.getElementById('qnaName').value.trim();
  const subject = document.getElementById('qnaSubject').value.trim();
  const body = document.getElementById('qnaBody').value.trim();
  if (!name || !subject || !body) { showToast('이름, 제목, 내용을 모두 입력해주세요.'); return; }

  const newQ = {
    id: 'q' + Date.now(),
    name, subject, body,
    date: new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' }).replace(/\. /g,'.').replace(/\.$/,''),
    answer: '',
    answered: false,
  };
  STATE.qna = [...STATE.qna, newQ];
  saveQna();
  renderQna();
  document.getElementById('qnaName').value = '';
  document.getElementById('qnaSubject').value = '';
  document.getElementById('qnaBody').value = '';
  showToast('질문이 등록되었습니다! ✅');
  document.getElementById('qnaList').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Reply modal
function openReplyModal(qId) {
  STATE.replyTargetId = qId;
  const q = STATE.qna.find(item => item.id === qId);
  if (!q) return;
  document.getElementById('replyQuestionPreview').innerHTML =
    `<strong>${escHtml(q.name)}</strong>: ${escHtml(q.subject)}<br><small>${escHtml(q.body)}</small>`;
  document.getElementById('replyBody').value = '';
  openModal('replyModal');
}

document.getElementById('saveReplyBtn').addEventListener('click', () => {
  const answer = document.getElementById('replyBody').value.trim();
  if (!answer) { showToast('답변 내용을 입력해주세요.'); return; }

  STATE.qna = STATE.qna.map(q =>
    q.id === STATE.replyTargetId
      ? { ...q, answer, answered: true }
      : q
  );
  saveQna();
  renderQna();
  closeModal('replyModal');
  showToast('답변이 등록되었습니다! ✅');
});

// ─── Modals ───────────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  el.style.display = 'flex';
}
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
  if (!btn.id?.includes('Save') && !btn.id?.includes('save')) {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal || btn.closest('.modal-overlay').id));
  }
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ─── Utilities ────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
renderServices();
renderNotices();
renderGuide();
renderQna();
