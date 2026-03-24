// ─── Chatbot ──────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 "Jeffrey's EduLab"의 AI 도우미입니다. 제프리 교수가 만든 AI 교육 플랫폼에서 학생들을 돕습니다.

이 플랫폼에 대한 정보:
- 간호학과 학생들을 위한 AI 교육 도구 모음
- 제공 서비스: AI 퀴즈 생성기, 데이터 시각화, 케이스 스터디 도우미, 약물 계산기, ECG 시뮬레이터, AI 뉴스레터
- Q&A 게시판에서 질문 등록 가능
- 매주 목요일 16~17시 오피스아워 운영

답변 스타일:
- 친근하고 따뜻하게, 학생 눈높이에 맞게 설명
- 간결하고 명확하게 (3-5문장 이내)
- 이모지를 적절히 사용하여 친근감 표현
- 의료/간호 관련 질문에는 반드시 "교재나 공식 자료로 재확인 필요"를 언급

플랫폼 사용법을 모르면 Q&A에 질문하거나 오피스아워를 안내하세요.`;

const OFFLINE_RESPONSES = [
  '안녕하세요! API 키가 설정되지 않아 오프라인 모드로 동작합니다. ⚙️ 버튼을 눌러 API 키를 설정하면 실제 AI와 대화할 수 있어요.',
  '지금은 오프라인 모드예요. 실제 AI 응답을 받으려면 우측 상단 ⚙️에서 Anthropic API 키를 설정해주세요.',
  'AI 키가 없어서 직접 답변이 어려워요. Q&A 게시판에 질문을 남기거나, 오피스아워(목요일 16시)에 방문해보세요! 😊',
];

let offlineIdx = 0;

const fab = document.getElementById('chatbotFab');
const win = document.getElementById('chatbotWindow');
const closeBtn = document.getElementById('chatbotCloseBtn');
const settingsBtn = document.getElementById('chatbotSettingsBtn');
const settingsPanel = document.getElementById('chatbotSettingsPanel');
const input = document.getElementById('chatbotInput');
const sendBtn = document.getElementById('chatbotSendBtn');
const messagesEl = document.getElementById('chatbotMessages');
const badge = document.getElementById('fabBadge');
const saveKeyBtn = document.getElementById('saveApiKey');
const clearKeyBtn = document.getElementById('clearApiKey');
const apiKeyInput = document.getElementById('apiKeyInput');

let isOpen = false;
let chatHistory = [];

// Toggle window
fab.addEventListener('click', () => {
  isOpen = !isOpen;
  win.classList.toggle('open', isOpen);
  if (isOpen) {
    badge.classList.add('hidden');
    input.focus();
  }
});

closeBtn.addEventListener('click', () => {
  isOpen = false;
  win.classList.remove('open');
});

// Settings
settingsBtn.addEventListener('click', () => {
  const visible = settingsPanel.style.display !== 'none';
  settingsPanel.style.display = visible ? 'none' : 'block';
  if (!visible) {
    const stored = localStorage.getItem('edulab_api_key');
    apiKeyInput.value = stored ? '••••••••••••' + stored.slice(-6) : '';
  }
});

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key || key.startsWith('•')) { showToast('유효한 API 키를 입력해주세요.'); return; }
  localStorage.setItem('edulab_api_key', key);
  settingsPanel.style.display = 'none';
  showToast('API 키가 저장되었습니다! 이제 실제 AI와 대화할 수 있어요. 🎉');
});

clearKeyBtn.addEventListener('click', () => {
  localStorage.removeItem('edulab_api_key');
  apiKeyInput.value = '';
  showToast('API 키가 초기화되었습니다.');
});

// Send message
async function sendMessage(text) {
  if (!text.trim()) return;

  appendMessage('user', text);
  input.value = '';
  chatHistory.push({ role: 'user', content: text });

  const apiKey = localStorage.getItem('edulab_api_key');

  if (!apiKey) {
    await delay(600);
    const reply = OFFLINE_RESPONSES[offlineIdx % OFFLINE_RESPONSES.length];
    offlineIdx++;
    appendMessage('bot', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    return;
  }

  const loadingId = appendMessage('bot', '...', true);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: chatHistory.slice(-10),
      }),
    });

    removeMessage(loadingId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `오류 (${response.status})`;
      appendMessage('bot', `죄송해요, 오류가 발생했어요: ${msg} 잠시 후 다시 시도해주세요.`);
      return;
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || '응답을 받지 못했어요.';
    appendMessage('bot', reply);
    chatHistory.push({ role: 'assistant', content: reply });

  } catch (e) {
    removeMessage(loadingId);
    appendMessage('bot', '네트워크 오류가 발생했어요. 인터넷 연결을 확인하거나 API 키를 다시 확인해주세요.');
  }
}

// DOM helpers
function appendMessage(role, text, isLoading = false) {
  const id = 'msg-' + Date.now() + Math.random().toString(36).slice(2);
  const div = document.createElement('div');
  div.className = `chatbot-message ${role}${isLoading ? ' loading' : ''}`;
  div.id = id;
  div.innerHTML = `
    ${role === 'bot' ? `<span class="msg-avatar">🤖</span>` : ''}
    <div class="msg-bubble">${isLoading ? '<span class="loading-dots">답변 생성 중...</span>' : escHtmlChat(text)}</div>
    ${role === 'user' ? `<span class="msg-avatar">👤</span>` : ''}
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return id;
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escHtmlChat(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Input events
sendBtn.addEventListener('click', () => sendMessage(input.value));
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
});

// Suggestion buttons
document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const msg = btn.dataset.msg;
    input.value = msg;
    btn.closest('.chatbot-suggestions')?.remove();
    sendMessage(msg);
  });
});
