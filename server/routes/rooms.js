// A 담당: 방 생성·참여
const express = require('express');
const router = express.Router();
const store = require('../store');


// 방 만들기
router.post('/', (req, res) => {
  const body = req.body || {};

  const roomName = String(body.roomName || '').trim();
  const name = String(body.name || '').trim();

  if (!roomName || roomName.length > 30) {
    return res.status(400).json({
      error: '방 이름은 1~30자로 입력해주세요.'
    });
  }

  if (!name || name.length > 10) {
    return res.status(400).json({
      error: '이름은 1~10자로 입력해주세요.'
    });
  }

  const room = store.createRoom({
    roomName,
    hostName: name
  });

  const host = store.getMember(room, room.hostMemberId);

  res.status(201).json({
    code: room.code,
    memberId: host.memberId,
    name: host.name
  });
});

// 방 정보 조회 (코드 확인 겸용)
router.get('/:code', (req, res) => {
  const room = store.getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: '존재하지 않는 방 코드입니다.' });
  res.json(store.toPublicRoom(room));
});

// 참여자 등록
// body: { name, memberId? }
// memberId가 이미 이 방의 참여자면 새로 만들지 않고 그대로 반환 (재접속 대비)
router.post('/:code/members', (req, res) => {
  const room = store.getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: '존재하지 않는 방 코드입니다.' });

  const existing = req.body.memberId ? store.getMember(room, req.body.memberId) : null;
  if (existing) {
    return res.json({ memberId: existing.memberId, name: existing.name, code: room.code });
  }

  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: '이름을 입력해주세요.' });
  if (name.length > 10) return res.status(400).json({ error: '이름은 10자 이내로 입력해주세요.' });

  const member = store.addMember(room, name);
  res.status(201).json({ memberId: member.memberId, name: member.name, code: room.code });
});

module.exports = router;