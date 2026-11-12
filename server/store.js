// 공통 저장소. B, C는 이 파일의 함수를 가져다 쓴다.
// 지금은 서버 메모리에만 저장 → 서버를 재시작하면 데이터가 사라짐. (JSON 파일 저장은 나중에 추가)
//
// 방 구조:
// {
//   code, roomName, startDate, endDate, purpose, stage, createdAt,
//   members:      [{ memberId, name }],
//   availability: { [memberId]: ["2026-11-20", ...] },
//   origins:      { [memberId]: "originId" },
//   votes:        { [memberId]: "candidateId" }
// }

const crypto = require('crypto');

const rooms = {};

// 헷갈리는 문자 0/O, 1/I 제외
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    }
  } while (rooms[code]); // 중복이면 다시 생성
  return code;
}

function createRoom({ roomName, startDate, endDate, purpose }) {
  const code = generateCode();
  const room = {
    code,
    roomName,
    startDate: startDate || null,
    endDate: endDate || null,
    purpose: purpose || null,
    stage: 'origin', // 장소 단계: origin → vote → result (C가 사용)
    createdAt: new Date().toISOString(),
    members: [],
    availability: {},
    origins: {},
    votes: {},
  };
  rooms[code] = room;
  return room;
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function getRoom(code) {
  return rooms[normalizeCode(code)] || null;
}

function getMember(room, memberId) {
  return room.members.find((m) => m.memberId === memberId) || null;
}

function addMember(room, name) {
  const member = { memberId: crypto.randomUUID(), name };
  room.members.push(member);
  return member;
}

// 화면에 내려줄 방 정보 (투표 내용 등은 제외)
function toPublicRoom(room) {
  return {
    code: room.code,
    roomName: room.roomName,
    startDate: room.startDate,
    endDate: room.endDate,
    purpose: room.purpose,
    stage: room.stage,
    memberCount: room.members.length,
    members: room.members.map((m) => ({ memberId: m.memberId, name: m.name })),
  };
}

module.exports = { createRoom, getRoom, getMember, addMember, toPublicRoom };