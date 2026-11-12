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

  res.json({
    originId,
    savedCount: Object.keys(room.origins).length,
    memberCount: room.members.length
  });
});

module.exports = router;