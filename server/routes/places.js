const express = require('express');
const router = express.Router();
const store = require('../store');

// 현재 화면에서 사용하는 예시 출발지
const originIds = ['kw', 'gangnam', 'hongik', 'wangsimni'];

// 출발지 저장
router.put('/:code/origin', (req, res) => {
  const room = store.getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({
      error: '존재하지 않는 방입니다.'
    });
  }

  const { memberId, originId } = req.body || {};
  const member = store.getMember(room, memberId);

  if (!member) {
    return res.status(403).json({
      error: '이 방에 먼저 참여해주세요.'
    });
  }

  if (room.stage !== 'origin') {
    return res.status(409).json({
      error: '출발지 입력이 마감되었습니다.'
    });
  }

  if (!originIds.includes(originId)) {
    return res.status(400).json({
      error: '올바른 출발지를 선택해주세요.'
    });
  }

  // 같은 사람이 다시 저장하면 기존 출발지를 교체
  room.origins[memberId] = originId;
  delete room.votes[memberId];

  res.json({
    originId,
    savedCount: Object.keys(room.origins).length,
    memberCount: room.members.length
  });
});

// 내 출발지 조회
router.get('/:code/origin', (req, res) => {
  const room = store.getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({
      error: '존재하지 않는 방입니다.'
    });
  }

  const memberId = req.query.memberId;
  const member = store.getMember(room, memberId);

  if (!member) {
    return res.status(403).json({
      error: '이 방에 먼저 참여해주세요.'
    });
  }

  res.json({
  originId: room.origins[memberId] || null,
  candidateId: room.votes[memberId] || null,
  savedCount: Object.keys(room.origins).length,
  memberCount: room.members.length
});
});

// 장소 투표 저장
router.put('/:code/vote', (req, res) => {
  const room = store.getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({
      error: '존재하지 않는 방입니다.'
    });
  }

  const { memberId, candidateId } = req.body || {};
  const member = store.getMember(room, memberId);

  if (!member) {
    return res.status(403).json({
      error: '이 방에 먼저 참여해주세요.'
    });
  }

  if (!room.origins[memberId]) {
    return res.status(400).json({
      error: '출발지를 먼저 저장해주세요.'
    });
  }

  if (room.stage === 'result') {
    return res.status(409).json({
      error: '투표가 마감되었습니다.'
    });
  }

  const candidateIds = ['sample-a', 'sample-b', 'sample-c'];

  if (!candidateIds.includes(candidateId)) {
    return res.status(400).json({
      error: '올바른 후보를 선택해주세요.'
    });
  }

  // 같은 사람이 다시 투표하면 기존 표를 교체
  room.votes[memberId] = candidateId;

  res.json({
    candidateId,
    voteCount: Object.keys(room.votes).length,
    memberCount: room.members.length
  });
});

// 후보별 투표 현황 조회
router.get('/:code/votes', (req, res) => {
  const room = store.getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({
      error: '존재하지 않는 방입니다.'
    });
  }

  const member = store.getMember(room, req.query.memberId);

  if (!member) {
    return res.status(403).json({
      error: '이 방에 먼저 참여해주세요.'
    });
  }

  const counts = {
    'sample-a': 0,
    'sample-b': 0,
    'sample-c': 0
  };

  // 현재 방 참여자의 유효한 표만 집계
  room.members.forEach((member) => {
    const candidateId = room.votes[member.memberId];

    if (Object.hasOwn(counts, candidateId)) {
      counts[candidateId] += 1;
    }
  });

  const voteCount = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0
  );

  const maxVotes = Math.max(...Object.values(counts));

  const winnerIds = maxVotes > 0
    ? Object.keys(counts).filter((id) => counts[id] === maxVotes)
    : [];

  res.json({
    counts,
    voteCount,
    memberCount: room.members.length,
    stage: room.stage,
    isHost: member.memberId === room.hostMemberId,
    winnerIds: room.stage === 'result' ? winnerIds : []
  });
});

  // 방장이 장소 투표 마감
router.post('/:code/vote/close', (req, res) => {
  const room = store.getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({
      error: '존재하지 않는 방입니다.'
    });
  }

  const { memberId } = req.body || {};
  const member = store.getMember(room, memberId);

  if (!member || memberId !== room.hostMemberId) {
    return res.status(403).json({
      error: '방장만 투표를 마감할 수 있습니다.'
    });
  }

  // 이미 마감된 경우에도 같은 상태 반환
  room.stage = 'result';

  res.json({
    stage: room.stage
  });
});

module.exports = router;