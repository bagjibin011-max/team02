
const express = require("express");

const router = express.Router();

// Temporary shared storage while the server is running.
// Room code -> member ID -> selected date information
const roomVotes = new Map();

// Check the YYYY-MM-DD date format and actual date.
function isValidDate(value) {
  if (typeof value !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// Collect votes and calculate the most popular dates.
function getDateSummary(code) {
  const members = roomVotes.get(code) || new Map();
  const dateMap = new Map();

  for (const [memberId, member] of members) {
    for (const date of member.availableDates) {
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          count: 0,
          names: []
        });
      }

      const item = dateMap.get(date);
      item.count += 1;
      item.names.push(member.name);
    }
  }

  const dates = [...dateMap.values()].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  const maxCount = Math.max(
    0,
    ...dates.map(item => item.count)
  );

  const topDates = dates
    .filter(item => item.count === maxCount && maxCount > 0)
    .map(item => item.date);

  const participants = [...members.entries()].map(
    ([memberId, member]) => ({
      memberId,
      name: member.name,
      availableDates: [...member.availableDates]
    })
  );

  return {
    code,
    participants,
    dates,
    topDates
  };
}

// GET: Read the date votes for one room.
router.get("/:code/dates", (req, res) => {
  const { code } = req.params;

  res.json(getDateSummary(code));
});

// PUT: Save or replace one member's date selection.
router.put("/:code/dates/:memberId", (req, res) => {
  const { code, memberId } = req.params;
  const { name, availableDates } = req.body || {};

  if (
    !code ||
    code.length > 32 ||
    !memberId ||
    memberId.length > 80
  ) {
    return res.status(400).json({
      error: "잘못된 방 코드 또는 참여자 ID입니다."
    });
  }

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 30
  ) {
    return res.status(400).json({
      error: "올바른 참여자 이름을 입력해주세요."
    });
  }

  if (
    !Array.isArray(availableDates) ||
    availableDates.length > 90 ||
    !availableDates.every(isValidDate)
  ) {
    return res.status(400).json({
      error: "날짜 목록이 올바르지 않습니다."
    });
  }

  // Remove duplicate dates before saving.
  const uniqueDates = [...new Set(availableDates)].sort();

  if (!roomVotes.has(code)) {
    roomVotes.set(code, new Map());
  }

  const members = roomVotes.get(code);

  // set() replaces the previous selection for the same ID.
  members.set(memberId, {
    name: name.trim(),
    availableDates: uniqueDates
  });

  res.json({
    success: true,
    message: "날짜 선택이 저장되었습니다.",
    ...getDateSummary(code)
  });
});

module.exports = router;
