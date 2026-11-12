
const express = require("express");
const { getRoom, getMember } = require("../store");

const router = express.Router();

// Check whether the date uses a valid YYYY-MM-DD format.
function isValidDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// Calculate date voting results using the shared room store.
function getDateSummary(room) {
  const dateMap = new Map();

  // Use registered members as the source of truth.
  const participants = room.members.map((member) => {
    const dates = room.availability[member.memberId] || [];

    const availableDates = Array.isArray(dates)
      ? [...dates]
      : [];

    return {
      memberId: member.memberId,
      name: member.name,
      availableDates
    };
  });

  // Count each participant's selected dates.
  for (const participant of participants) {
    const uniqueDates = new Set(participant.availableDates);

    for (const date of uniqueDates) {
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          count: 0,
          names: []
        });
      }

      const result = dateMap.get(date);

      result.count += 1;
      result.names.push(participant.name);
    }
  }

  // Sort results by date.
  const dates = [...dateMap.values()].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Find the highest number of votes.
  const maxCount = Math.max(
    0,
    ...dates.map((item) => item.count)
  );

  // Include tied dates.
  const topDates = dates
    .filter((item) => item.count === maxCount && maxCount > 0)
    .map((item) => item.date);

  return {
    code: room.code,
    memberCount: room.members.length,
    participants,
    dates,
    topDates
  };
}

// GET /api/rooms/:code/dates
// Retrieve voting results for one existing room.
router.get("/:code/dates", (req, res) => {
  const room = getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({
      error: "존재하지 않는 방입니다."
    });
  }

  res.json(getDateSummary(room));
});

// PUT /api/rooms/:code/dates/:memberId
// Save or replace a member's date selection.
router.put("/:code/dates/:memberId", (req, res) => {
  const { code, memberId } = req.params;

  // Find the room in the common store.
  const room = getRoom(code);

  if (!room) {
    return res.status(404).json({
      error: "존재하지 않는 방입니다."
    });
  }

  // Only registered members can submit votes.
  const member = getMember(room, memberId);

  if (!member) {
    return res.status(404).json({
      error: "등록되지 않은 참여자입니다."
    });
  }

  const { availableDates } = req.body || {};

  // Validate the submitted date list.
  if (
    !Array.isArray(availableDates) ||
    availableDates.length > 90 ||
    !availableDates.every(isValidDate)
  ) {
    return res.status(400).json({
      error: "올바른 날짜 목록을 입력해주세요."
    });
  }

  // Remove duplicate dates and sort the selection.
  const uniqueDates = [...new Set(availableDates)].sort();

  // Save directly into the shared room data.
  // Replacing the array prevents duplicate votes.
  room.availability[memberId] = uniqueDates;

  return res.json({
    success: true,
    message: "날짜 선택이 저장되었습니다.",
    ...getDateSummary(room)
  });
});

module.exports = router;
