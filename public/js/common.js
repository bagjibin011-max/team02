// 공통 함수 (A 담당). B, C 화면에서도 <script src="/js/common.js"> 로 불러서 사용.

// URL의 ?code=XXXXXX 읽기
function getCode() {
  const code = new URLSearchParams(window.location.search).get('code');
  return code ? code.trim().toUpperCase() : null;
}

// 방마다 따로 저장: 같은 브라우저에서 여러 방에 들어가도 안 섞임
function getMemberId(code = getCode()) {
  return localStorage.getItem(`memberId:${code}`);
}
function getMemberName(code = getCode()) {
  return localStorage.getItem(`memberName:${code}`);
}
function saveMember(code, memberId, name) {
  localStorage.setItem(`memberId:${code}`, memberId);
  localStorage.setItem(`memberName:${code}`, name);
}

// 서버 호출. 실패하면 서버가 준 error 메시지로 Error를 던진다.
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || '요청에 실패했습니다.');
    err.status = res.status;
    throw err;
  }
  return data;
}

// 방에 참여하지 않은 사람이 들어오면 첫 화면으로 보낸다.
// 각 화면(room/date/place) 맨 위에서: if (!requireMember()) return;
function requireMember() {
  const code = getCode();
  if (!code || !getMemberId(code)) {
    window.location.replace('/index.html');
    return false;
  }
  return true;
}