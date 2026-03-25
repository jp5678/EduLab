// ─── Admin Password ───────────────────────────────────────────────────────────
const ADMIN_PASSWORD = 'jeffrey7254';

// ─── Firebase 설정 ────────────────────────────────────────────────────────────
// ★ Firebase 연동 방법 (무료, 5분 설정):
//   1. https://console.firebase.google.com → "프로젝트 추가"
//   2. Realtime Database → "데이터베이스 만들기" → "테스트 모드로 시작"
//   3. 생성된 URL (예: https://my-project-default-rtdb.firebaseio.com) 아래에 붙여넣기
//   4. 저장 후 새로고침 → 이제 모든 기기에서 같은 데이터가 보입니다!
// ★ 설정하지 않으면 기존 localStorage 방식으로 작동합니다.
const FIREBASE_DB_URL = 'https://plenary-network-241120-default-rtdb.asia-southeast1.firebasedatabase.app/';
// 예시: const FIREBASE_DB_URL = 'https://jeffreys-edulab-default-rtdb.firebaseio.com';

// ─── Default Data ────────────────────────────────────────────────────────────
const DEFAULT_SERVICES = [
  { id: 's1', emoji: '🧠', title: 'AI 퀴즈 생성기', desc: '강의 내용을 입력하면 자동으로 O/X, 객관식 퀴즈를 생성합니다.', url: '#' },
  { id: 's2', emoji: '📊', title: '간호 데이터 시각화', desc: '환자 데이터와 임상 지표를 실시간으로 시각화하는 대시보드.', url: '#' },
  { id: 's3', emoji: '✍️', title: 'AI 케이스 스터디 도우미', desc: '케이스 시나리오를 입력하면 SBAR 보고서 초안을 제안합니다.', url: '#' },
  { id: 's4', emoji: '💊', title: '약물 용량 계산기', desc: '체중·농도·속도를 입력해 정확한 투여 용량을 계산합니다.', url: '#' },
  { id: 's5', emoji: '🔬', title: '심전도 학습 시뮬레이터', desc: '다양한 부정맥 파형으로 진단 연습을 할 수 있는 ECG 도구.', url: '#' },
  { id: 's6', emoji: '📋', title: '주간 AI 뉴스레터', desc: '간호·의료 분야 AI 동향을 매주 자동 생성해 제공합니다.', url: '#' },
];

const DEFAULT_NOTICES = [
  {
    id: 'n1', badge: 'new', badgeLabel: 'NEW',
    title: '2025년 1학기 AI 도구 활용 특강 안내',
    date: '2025.03.20',
    body: `안녕하세요! 이번 학기에는 생성형 AI 도구를 수업에 적극 활용할 예정입니다.

📅 일정: 매주 화요일 14:00~15:30
📍 장소: 간호학관 302호 + Zoom 동시 진행
📌 대상: 2~4학년 전체

미리 가입해두세요: Claude.ai / ChatGPT / NotebookLM`,
  },
  {
    id: 'n2', badge: 'important', badgeLabel: '중요',
    title: 'AI 퀴즈 생성기 사용 방법 업데이트',
    date: '2025.03.15',
    body: `AI 퀴즈 생성기가 업데이트되었습니다!

🆕 새 기능: PDF 업로드 → 자동 퀴즈 생성, 난이도 설정, 결과 PDF 다운로드`,
  },
  {
    id: 'n3', badge: 'general', badgeLabel: '일반',
    title: '3월 정기 오피스아워 공지',
    date: '2025.03.10',
    body: `매주 목요일 16:00~17:00, 교수연구실 508호 또는 Zoom. 예약 없이 방문 가능합니다.`,
  },
];

const DEFAULT_QNA = [
  {
    id: 'q1', name: '간호21-김민지', subject: 'AI 퀴즈 생성기 접속이 안 돼요',
    body: '서비스 카드에서 버튼을 눌렀는데 새 창이 열리지 않아요.',
    date: '2025.03.21',
    answer: '현재 개발 중이라 URL이 아직 연결되지 않았어요. 3월 말 완성 예정입니다! 😊',
    answered: true,
  },
];
