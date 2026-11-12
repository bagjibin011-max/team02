
// Read the room code and current member information.
const params = new URLSearchParams(window.location.search);

const roomCode = (params.get("code") || "").trim().toUpperCase();

const memberId =
  params.get("memberId") ||
  (roomCode ? localStorage.getItem(`memberId:${roomCode}`) : null) ||
  "";

// Calendar HTML elements.
const calendarGrid = document.getElementById("calendar-grid");
const monthTitle = document.getElementById("month-title");
const selectedList = document.getElementById("selected-list");
const selectedCount = document.getElementById("selected-count");
const saveStatus = document.getElementById("save-status");
const saveButton = document.getElementById("save-button");
const voteDetails = document.getElementById("vote-details");

// Calendar state.
const today = new Date();

let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let focusedDate = null;

// Member and server state.
let canVote = false;
let saving = false;
let memberCount = 0;

let participants = [];

// Current selections and last saved selections.
const selectedDates = new Set();
const savedDates = new Set();

// Calculated voting information.
let viewStats = new Map();
let topDates = new Set();

// Create a YYYY-MM-DD date string.
function formatDate(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return `${year}-${mm}-${dd}`;
}

// Convert YYYY-MM-DD to a Korean date label.
function formatKoreanDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}

// Increase the yellow intensity as more members vote.
// There is no fixed 4-person color limit.
function getVoteColor(count, total) {
  if (count === 0 || total <= 0) {
    return "#f6f8fb";
  }

  const ratio = Math.min(count / total, 1);
  const lightness = 96 - ratio * 35;

  return `hsl(43, 100%, ${lightness.toFixed(2)}%)`;
}

// Detect changes compared to the last server save.
function hasUnsavedChanges() {
  if (selectedDates.size !== savedDates.size) {
    return true;
  }

  for (const date of selectedDates) {
    if (!savedDates.has(date)) {
      return true;
    }
  }

  return false;
}

// Calculate vote counts and participant names.
// Current selections are previewed before saving.
function calculateViewStats() {
  const results = new Map();

  for (const participant of participants) {
    const dates =
      canVote && participant.memberId === memberId
        ? selectedDates
        : participant.availableDates || [];

    // Prevent duplicate votes for the same date.
    const uniqueDates = new Set(dates);

    for (const dateString of uniqueDates) {
      if (!results.has(dateString)) {
        results.set(dateString, {
          date: dateString,
          count: 0,
          names: []
        });
      }

      const info = results.get(dateString);

      info.count += 1;
      info.names.push(participant.name);
    }
  }

  viewStats = results;

  // Find the maximum number of votes.
  let maxCount = 0;

  for (const info of results.values()) {
    if (info.count > maxCount) {
      maxCount = info.count;
    }
  }

  // Multiple dates may share the highest vote count.
  topDates = new Set();

  if (maxCount > 0) {
    for (const info of results.values()) {
      if (info.count === maxCount) {
        topDates.add(info.date);
      }
    }
  }
}

// Refresh all date-related UI components.
function renderAll() {
  calculateViewStats();
  renderCalendar();
  renderSelectedDates();
  renderVoteDetails();
}

// Apply the latest date summary from the server.
function applySummary(summary) {
  participants = Array.isArray(summary.participants)
    ? summary.participants
    : [];

  memberCount = Number.isInteger(summary.memberCount)
    ? summary.memberCount
    : participants.length;

  // Find the current member registered in this room.
  const me = participants.find(
    (person) => person.memberId === memberId
  );

  canVote = Boolean(me);

  selectedDates.clear();
  savedDates.clear();

  if (me) {
    const dates = Array.isArray(me.availableDates)
      ? me.availableDates
      : [];

    // Restore the current member's saved dates.
    for (const dateString of dates) {
      selectedDates.add(dateString);
      savedDates.add(dateString);
    }
  }

  saveButton.disabled = !canVote || saving;

  renderAll();
}

// Display the selected dates with remove buttons.
function renderSelectedDates() {
  const dates = [...selectedDates].sort();

  selectedCount.textContent = dates.length;
  selectedList.innerHTML = "";

  if (dates.length === 0) {
    const empty = document.createElement("li");

    empty.className = "empty-message";
    empty.textContent = "아직 선택한 날짜가 없습니다.";

    selectedList.appendChild(empty);
    return;
  }

  for (const dateString of dates) {
    const item = document.createElement("li");
    item.className = "selected-date-item";

    const dateLabel = document.createElement("span");
    dateLabel.textContent = formatKoreanDate(dateString);

    // Remove a previously selected date.
    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.className = "remove-date";
    removeButton.textContent = "×";
    removeButton.disabled = saving;

    removeButton.setAttribute(
      "aria-label",
      `${formatKoreanDate(dateString)} 선택 취소`
    );

    removeButton.addEventListener("click", () => {
      toggleDate(dateString);
    });

    item.appendChild(dateLabel);
    item.appendChild(removeButton);

    selectedList.appendChild(item);
  }
}

// Show information about the currently focused date.
function renderVoteDetails() {
  voteDetails.innerHTML = "";

  if (!focusedDate) {
    const hint = document.createElement("p");

    hint.className = "detail-hint";
    hint.textContent =
      "날짜를 클릭하면 참여 인원과 이름을 확인할 수 있습니다.";

    voteDetails.appendChild(hint);
    return;
  }

  const info = viewStats.get(focusedDate);
  const count = info ? info.count : 0;

  const heading = document.createElement("h3");
  heading.textContent = formatKoreanDate(focusedDate);

  const countText = document.createElement("p");

  countText.className = "detail-count";
  countText.textContent =
    `총 ${memberCount}명 중 ${count}명 선택`;

  voteDetails.appendChild(heading);
  voteDetails.appendChild(countText);

  // Explain that unsaved changes are previewed locally.
  if (canVote && hasUnsavedChanges()) {
    const pending = document.createElement("p");

    pending.className = "detail-pending";
    pending.textContent =
      "현재 결과는 미리보기입니다. 저장하면 다른 참여자에게 반영됩니다.";

    voteDetails.appendChild(pending);
  }

  // Mark the dates with the most votes.
  if (topDates.has(focusedDate)) {
    const topLabel = document.createElement("p");

    topLabel.className = "top-message";
    topLabel.textContent = "★ 현재 최다 선택 날짜";

    voteDetails.appendChild(topLabel);
  }

  if (count === 0) {
    const empty = document.createElement("p");

    empty.className = "detail-hint";
    empty.textContent = "아직 선택한 사람이 없습니다.";

    voteDetails.appendChild(empty);
    return;
  }

  // Display non-anonymous date voters.
  const nameList = document.createElement("div");
  nameList.className = "voter-names";

  for (const name of info.names) {
    const badge = document.createElement("span");

    badge.className = "voter-badge";
    badge.textContent = name;

    nameList.appendChild(badge);
  }

  voteDetails.appendChild(nameList);
}

// Select or cancel a date.
// Clicking the same date again removes the selection.
function toggleDate(dateString) {
  if (saving) {
    return;
  }

  focusedDate = dateString;

  if (selectedDates.has(dateString)) {
    selectedDates.delete(dateString);
  } else {
    if (selectedDates.size >= 90) {
      saveStatus.textContent =
        "날짜는 최대 90일까지 선택할 수 있습니다.";
      return;
    }

    selectedDates.add(dateString);
  }

  renderAll();

  if (!canVote) {
    saveStatus.textContent =
      "날짜 선택은 가능합니다. 서버 저장에는 방 참여자 정보가 필요합니다.";
  } else if (hasUnsavedChanges()) {
    saveStatus.textContent =
      "변경 사항이 있습니다. 저장 버튼을 눌러주세요.";
  } else {
    saveStatus.textContent =
      "저장된 날짜와 동일한 상태입니다.";
  }
}

// Draw the current month's calendar.
function renderCalendar() {
  calendarGrid.innerHTML = "";

  monthTitle.textContent =
    `${currentYear}년 ${currentMonth + 1}월`;

  const firstDay = new Date(
    currentYear,
    currentMonth,
    1
  ).getDay();

  const daysInMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate();

  const totalCells =
    Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - firstDay + 1;

    // Empty positions before or after the month.
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      const empty = document.createElement("div");
      empty.className = "empty-day";

      calendarGrid.appendChild(empty);
      continue;
    }

    const dateString = formatDate(
      currentYear,
      currentMonth,
      dayNumber
    );

    const info = viewStats.get(dateString);
    const count = info ? info.count : 0;

    const button = document.createElement("button");

    button.type = "button";
    button.className = "day";
    button.disabled = saving;

    // Apply yellow color using the participant ratio.
    button.style.backgroundColor =
      getVoteColor(count, memberCount);

    // Date number.
    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = dayNumber;

    button.appendChild(number);

    // Number of participants who selected this date.
    if (count > 0) {
      const countLabel = document.createElement("span");

      countLabel.className = "day-count";
      countLabel.textContent = `${count}명`;

      button.appendChild(countLabel);
    }

    const mySelected = selectedDates.has(dateString);

    // Navy border for the member's selected dates.
    if (mySelected) {
      button.classList.add("my-selected");
    }

    // Small dot for unsaved changes.
    if (
      canVote &&
      mySelected !== savedDates.has(dateString)
    ) {
      button.classList.add("pending-date");
    }

    // Star for the most popular dates.
    if (topDates.has(dateString)) {
      button.classList.add("top-date");
    }

    // Today indicator.
    if (
      currentYear === today.getFullYear() &&
      currentMonth === today.getMonth() &&
      dayNumber === today.getDate()
    ) {
      button.classList.add("today");
    }

    // Focused date indicator.
    if (focusedDate === dateString) {
      button.classList.add("focused-date");
    }

    button.setAttribute(
      "aria-pressed",
      String(mySelected)
    );

    button.setAttribute(
      "aria-label",
      `${dateString}, ${count}명 선택`
    );

    button.addEventListener("click", () => {
      toggleDate(dateString);
    });

    calendarGrid.appendChild(button);
  }
}

// Previous month button.
document.getElementById("prev-month").addEventListener(
  "click",
  () => {
    const date = new Date(
      currentYear,
      currentMonth - 1,
      1
    );

    currentYear = date.getFullYear();
    currentMonth = date.getMonth();

    renderCalendar();
  }
);

// Next month button.
document.getElementById("next-month").addEventListener(
  "click",
  () => {
    const date = new Date(
      currentYear,
      currentMonth + 1,
      1
    );

    currentYear = date.getFullYear();
    currentMonth = date.getMonth();

    renderCalendar();
  }
);

// Current month button.
document.getElementById("today-button").addEventListener(
  "click",
  () => {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();

    renderCalendar();
  }
);

// Clear all date selections immediately.
// Saving is required to update the server.
document.getElementById("reset-button").addEventListener(
  "click",
  () => {
    if (saving) {
      return;
    }

    selectedDates.clear();
    focusedDate = null;

    renderAll();

    if (!canVote) {
      saveStatus.textContent = "모든 선택을 초기화했습니다.";
    } else if (hasUnsavedChanges()) {
      saveStatus.textContent =
        "선택을 초기화했습니다. 저장 버튼을 눌러 확정해주세요.";
    } else {
      saveStatus.textContent =
        "저장된 날짜와 동일한 상태입니다.";
    }
  }
);

// Read the Express server response.
async function readResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "서버 응답을 읽을 수 없습니다. API 연결을 확인해주세요."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error || `서버 요청 실패 (${response.status})`
    );
  }

  return data;
}

// Load saved votes from the shared room store.
async function loadRoomVotes() {
  if (!roomCode) {
    canVote = false;
    saveButton.disabled = true;

    saveStatus.textContent =
      "미리보기 모드입니다. 방에서 입장하면 서버 저장이 가능합니다.";

    return;
  }

  try {
    const response = await fetch(
      `/api/rooms/${encodeURIComponent(roomCode)}/dates`
    );

    const summary = await readResponse(response);

    applySummary(summary);

    saveStatus.textContent = canVote
      ? "서버에서 저장된 날짜를 불러왔습니다."
      : "참여자 정보를 찾을 수 없습니다. 방에서 다시 입장해주세요.";
  } catch (error) {
    canVote = false;
    saveButton.disabled = true;

    saveStatus.textContent =
      `서버 연결 실패: ${error.message}`;
  }
}

// Save the selected dates to the server.
saveButton.addEventListener("click", async () => {
  if (!canVote || saving) {
    return;
  }

  saving = true;
  saveButton.disabled = true;
  saveStatus.textContent = "날짜를 저장하고 있습니다...";

  renderAll();

  try {
    const response = await fetch(
      `/api/rooms/${encodeURIComponent(roomCode)}` +
      `/dates/${encodeURIComponent(memberId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          availableDates: [...selectedDates].sort()
        })
      }
    );

    const result = await readResponse(response);

    // Update the displayed vote counts after saving.
    applySummary(result);

    saveStatus.textContent =
      "날짜 선택이 서버에 저장되었습니다.";
  } catch (error) {
    saveStatus.textContent =
      `날짜 저장 실패: ${error.message}`;
  } finally {
    saving = false;
    saveButton.disabled = !canVote;

    renderAll();
  }
});

// Return to A's room page.
const backLink = document.getElementById("back-link");

backLink.href = roomCode
  ? `./room.html?code=${encodeURIComponent(roomCode)}`
  : "./index.html";

// Information about temporary server storage.
const previewNotice = document.querySelector(".preview-notice");

if (previewNotice) {
  previewNotice.textContent =
    "날짜 선택은 같은 방의 참여자들과 공유됩니다. " +
    "저장 전 변경 사항은 미리보기이며, 저장 버튼을 눌러야 확정됩니다. " +
    "현재 서버는 재시작하면 방과 투표 기록이 초기화됩니다.";
}

// Initialize the calendar and load saved voting data.
saveButton.disabled = true;

renderAll();
loadRoomVotes();
