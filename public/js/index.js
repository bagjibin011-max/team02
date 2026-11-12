const nameInput = document.getElementById('nameInput');
const codeInput = document.getElementById('codeInput');
const errorEl = document.getElementById('error');
const dialog = document.getElementById('createDialog');
const dialogError = document.getElementById('dialogError');

// 이전에 쓴 이름 자동 채우기
nameInput.value = localStorage.getItem('lastName') || '';

function getName() {
  const name = nameInput.value.trim();
  if (!name) {
    errorEl.textContent = '이름을 먼저 입력해주세요.';
    nameInput.focus();
    return null;
  }
  localStorage.setItem('lastName', name);
  return name;
}

// 방 참여 등록 후 room.html로 이동. 이미 이 방의 참여자면 기존 memberId 재사용.
async function joinAndGo(code, name) {
  const data = await api(`/api/rooms/${code}/members`, {
    method: 'POST',
    body: { name, memberId: getMemberId(code) || undefined },
  });
  saveMember(code, data.memberId, data.name);
  window.location.href = `/room.html?code=${code}`;
}

// 코드로 참여
document.getElementById('joinBtn').addEventListener('click', async () => {
  errorEl.textContent = '';
  const name = getName();
  if (!name) return;
  const code = codeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    errorEl.textContent = '초대 코드 6자리를 입력해주세요.';
    return;
  }
  try {
    await joinAndGo(code, name);
  } catch (e) {
    errorEl.textContent = e.message;
  }
});
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('joinBtn').click();
});

// 방 만들기 창 열기
document.getElementById('createBtn').addEventListener('click', () => {
  errorEl.textContent = '';
  if (!getName()) return;
  dialogError.textContent = '';
  dialog.showModal();
});
document.getElementById('cancelBtn').addEventListener('click', () => dialog.close());

// 방 만들기 확정
document.getElementById('confirmBtn').addEventListener('click', async () => {
  dialogError.textContent = '';
  const name = getName();
  if (!name) return dialog.close();

  const roomName = document.getElementById('roomNameInput').value.trim();
  if (!roomName) {
    dialogError.textContent = '방 이름을 입력해주세요.';
    return;
  }
  try {
    const { code } = await api('/api/rooms', {
      method: 'POST',
      body: { roomName },
    });
    await joinAndGo(code, name);
  } catch (e) {
    dialogError.textContent = e.message;
  }
});