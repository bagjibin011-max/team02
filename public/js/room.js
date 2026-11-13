(function () {
  if (!requireMember()) return;

  const code = getCode();
  const myId = getMemberId(code);

  // B, C 화면으로 연결
  document.getElementById('dateLink').href = `/date.html?code=${code}`;
  document.getElementById('placeLink').href = `/place.html?code=${code}`;

  // 코드 타일 (한 번만 그림)
  document.getElementById('codeTiles').innerHTML =
    [...code].map((ch) => `<span>${ch}</span>`).join('');

  document.getElementById('copyBtn').addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(code);
      e.target.textContent = '복사됨';
    } catch {
      e.target.textContent = '직접 복사해주세요';
    }
    setTimeout(() => (e.target.textContent = '코드 복사'), 1500);
  });

  function render(room) {
    document.title = `${room.roomName} · 약속 조율`;
    document.getElementById('roomName').textContent = room.roomName;
    document.getElementById('count').textContent =
      `👥 ${room.memberCount}/${room.totalMembers}명`;

    const list = document.getElementById('memberList');
    list.innerHTML = '';
    room.members.forEach((m) => {
      const li = document.createElement('li');
      const meLabel = m.memberId === myId ? ' (나)' : '';
      const hostLabel = m.memberId === room.hostMemberId ? ' 👑' : '';

      li.textContent = `${m.name}${meLabel}${hostLabel}`;
      if (m.memberId === myId) li.className = 'me';
      list.appendChild(li);
    });
  }

  async function load() {
    try {
      const room = await api(`/api/rooms/${code}`);
      // 서버가 재시작돼서 내 참여 정보가 사라진 경우
      if (!room.members.some((m) => m.memberId === myId)) {
        localStorage.removeItem(`memberId:${code}`);
        window.location.replace('/index.html');
        return;
      }
      render(room);
    } catch (e) {
      if (e.status === 404) window.location.replace('/index.html');
    }
  }

  load();
  setInterval(load, 4000); // 4초마다 인원 수·참여자 갱신
})();