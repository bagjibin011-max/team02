
// Get the room code and current member ID.
const params = new URLSearchParams(window.location.search);

const roomCode = (params.get("code") || "")
  .trim()
  .toUpperCase();

const memberId =
  params.get("memberId") ||
  (roomCode
    ? localStorage.getItem(`memberId:${roomCode}`)
    : null) ||
  "";

// HTML elements.
const calendarGrid = document.getElementById("calendar-grid");
const monthTitle = document.getElementById("month-title");
const selectedList = document.getElementById("selected-list");
const selectedCount = document.getElementById("selected-count");
const saveStatus = document.getElementById("save-status");
const saveButton = document.getElementById("save-button");
const voteDetails = document.getElementById("vote-details");

// Calendar information.
const today = new Date();

let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

let focusedDate = null;

// Room and member information.
let canVote = false;
let saving = false;
let memberCount = 0;

let participants = [];

// Current selections and last saved selections.
const selectedDates = new Set();
const savedDates = new Set();

// Voting results shown on the calendar.
let viewStats = new Map();
let topDates = new Set();


// --------------------------------------------------
// Date formatting
// --------------------------------------------------

// Create a YYYY-MM-DD string.
function formatDate(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return `${year}-${mm}-${dd}`;
}

// Create a Korean date label.
function formatKoreanDate(dateString) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}


// --------------------------------------------------
// Status message
// --------------------------------------------------

// Show a message and reset its color every time.
function setSaveStatus(message, type = "normal") {
  saveStatus.textContent = message;

  saveStatus.classList.remove(
    "status-warning",
    "status-error"
  );

  if (type === "warning") {
    saveStatus.classList.add("status-warning");
  } else if (type === "error") {
    saveStatus.classList.add("status-error");
  }
}

// Show whether there are unsaved changes.
function updateChangeStatus() {
  if (!canVote) {
    setSaveStatus(
      "서버 저장에는 방 참여자 정보가 필요합니다."
    );

    return;
  }

  if (hasUnsavedChanges()) {
    setSaveStatus(
      "변경 사항이 있습니다. 저장 버튼을 눌러주세요.",
      "warning"
    );
  } else {
    setSaveStatus(
      "저장된 날짜와 동일한 상태입니다."
    );
  }
}


// --------------------------------------------------
// Vote colors
// --------------------------------------------------

// More votes create a stronger yellow background.
// The calculation works for any number of members.
function getVoteColor(count, total) {
  if (count === 0 || total <= 0) {
    return "#f6f8fb";
  }

  const ratio = Math.min(count / total, 1);

  const lightness = 96 - ratio * 35;

  return `hsl(43, 100%, ${lightness.toFixed(2)}%)`;
}


// --------------------------------------------------
// Unsaved changes
// --------------------------------------------------

// Compare current selections with saved selections.
function hasUnsavedChanges() {
  if (selectedDates.size !== savedDates.size) {
    return true;
  }

  for (const dateString of selectedDates) {
    if (!savedDates.has(dateString)) {
      return true;
    }
  }

  return false;
}


// --------------------------------------------------
// Calculate voting information
// --------------------------------------------------

// Count how many members selected each date.
function calculateViewStats() {
  const result = new Map();

  for (const participant of participants) {
    // Preview the current member's unsaved selections.
    const dates =
      canVote && participant.memberId === memberId
        ? selectedDates
        : participant.availableDates || [];

    // Prevent duplicate votes.
    const uniqueDates = new Set(dates);

    for (const dateString of uniqueDates) {
      if (!result.has(dateString)) {
        result.set(dateString, {
          date: dateString,
          count: 0,
          names: []
        });
      }

      const info = result.get(dateString);

      info.count += 1;
      info.names.push(participant.name);
    }
  }

  viewStats = result;

  // Find the largest vote count.
  let maxCount = 0;

  for (const info of result.values()) {
    if (info.count > maxCount) {
      maxCount = info.count;
    }
  }

  // All dates tied for first place receive a star.
  topDates = new Set();

  if (maxCount > 0) {
    for (const info of result.values()) {
      if (info.count === maxCount) {
        topDates.add(info.date);
      }
    }
  }
}


// --------------------------------------------------
// Refresh the screen
// --------------------------------------------------

function renderAll() {
  calculateViewStats();

  renderCalendar();
  renderSelectedDates();
  renderVoteDetails();
}


// --------------------------------------------------
// Apply server data
// --------------------------------------------------

// Restore the current member's saved selections.
function applySummary(summary) {
  participants = Array.isArray(summary.participants)
    ? summary.participants
    : [];

  memberCount = Number.isInteger(summary.memberCount)
    ? summary.memberCount
    : participants.length;

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

    for (const dateString of dates) {
      selectedDates.add(dateString);
      savedDates.add(dateString);
    }
  }

  saveButton.disabled = !canVote || saving;

  renderAll();
}


// --------------------------------------------------
// Calendar click: select or view only
// --------------------------------------------------

// A calendar click never cancels an existing selection.
function selectOrViewDate(dateString) {
  if (saving) {
    return;
  }

  focusedDate = dateString;

  // Add the date only when it is not already selected.
  if (!selectedDates.has(dateString)) {
    if (selectedDates.size >= 90) {
      setSaveStatus(
        "날짜는 최대 90일까지 선택할 수 있습니다.",
        "warning"
      );

      renderVoteDetails();
      return;
    }

    selectedDates.add(dateString);
  }

  // Clicking an already selected date only shows details.
  renderAll();
  updateChangeStatus();
}


// --------------------------------------------------
// X button: remove selected date
// --------------------------------------------------

// Only the X button removes an individual date.
function removeSelectedDate(dateString) {
  if (saving) {
    return;
  }

  // Remove the date from the current selection.
  selectedDates.delete(dateString);

  // Keep displaying the date's voting information.
  focusedDate = dateString;

  renderAll();
  updateChangeStatus();
}


// --------------------------------------------------
// Selected date list
// --------------------------------------------------

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

    // Date text.
    const dateLabel = document.createElement("span");

    dateLabel.textContent =
      formatKoreanDate(dateString);

    // X button.
    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.className = "remove-date";
    removeButton.textContent = "×";

    removeButton.disabled = saving;

    removeButton.setAttribute(
      "aria-label",
      `${formatKoreanDate(dateString)} 선택 취소`
    );

    // Important: call the remove function, not the select function.
    removeButton.addEventListener("click", () => {
      removeSelectedDate(dateString);
    });

    item.appendChild(dateLabel);
    item.appendChild(removeButton);

    selectedList.appendChild(item);
  }
}


// --------------------------------------------------
// Date voting details
// --------------------------------------------------

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

  // Selected date title.
  const heading = document.createElement("h3");

  heading.textContent =
    formatKoreanDate(focusedDate);

  // Number of participants.
  const countText = document.createElement("p");

  countText.className = "detail-count";

  countText.textContent =
    `총 ${memberCount}명 중 ${count}명 선택`;

  voteDetails.appendChild(heading);
  voteDetails.appendChild(countText);

  // Explain unsaved results.
  if (canVote && hasUnsavedChanges()) {
    const pending = document.createElement("p");

    pending.className = "detail-pending";

    pending.textContent =
      "변경 사항이 있습니다. 저장 후 다른 참여자에게 반영됩니다.";

    voteDetails.appendChild(pending);
  }

  // Popular date label.
  if (topDates.has(focusedDate)) {
    const popular = document.createElement("p");

    popular.className = "top-message";
    popular.textContent = "★ 현재 최다 선택 날짜";

    voteDetails.appendChild(popular);
  }

  // No participants selected this date.
  if (count === 0) {
    const empty = document.createElement("p");

    empty.className = "detail-hint";
    empty.textContent = "아직 선택한 사람이 없습니다.";

    voteDetails.appendChild(empty);
    return;
  }

  // Participant name badges.
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


// --------------------------------------------------
// Calendar rendering
// --------------------------------------------------

function renderCalendar() {
  calendarGrid.innerHTML = "";

  monthTitle.textContent =
    `${currentYear}년 ${currentMonth + 1}월`;

  // First weekday of the month.
  const firstDay = new Date(
    currentYear,
    currentMonth,
    1
  ).getDay();

  // Number of days in the month.
  const daysInMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate();

  // Fill the last calendar row.
  const totalCells =
    Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - firstDay + 1;

    // Empty positions.
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

    // Create a date button.
    const button = document.createElement("button");

    button.type = "button";
    button.className = "day";
    button.disabled = saving;

    // Yellow intensity depends on the number of votes.
    button.style.backgroundColor =
      getVoteColor(count, memberCount);

    // Date number.
    const number = document.createElement("span");

    number.className = "day-number";
    number.textContent = dayNumber;

    button.appendChild(number);

    // Vote count.
    if (count > 0) {
      const countLabel = document.createElement("span");

      countLabel.className = "day-count";
      countLabel.textContent = `${count}명`;

      button.appendChild(countLabel);
    }

    const mySelected = selectedDates.has(dateString);

    // Navy border for the current member's selections.
    if (mySelected) {
      button.classList.add("my-selected");
    }

    // Red dot when the saved and current states differ.
    if (
      canVote &&
      mySelected !== savedDates.has(dateString)
    ) {
      button.classList.add("pending-date");
    }

    // Star for the dates with the most votes.
    if (topDates.has(dateString)) {
      button.classList.add("top-date");
    }

    // Today's date.
    if (
      currentYear === today.getFullYear() &&
      currentMonth === today.getMonth() &&
      dayNumber === today.getDate()
    ) {
      button.classList.add("today");
    }

    // Currently viewed date.
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

    // Important: a calendar click cannot remove a date.
    button.addEventListener("click", () => {
      selectOrViewDate(dateString);
    });

    calendarGrid.appendChild(button);
  }
}


// --------------------------------------------------
// Calendar navigation
// --------------------------------------------------

// Previous month.
document
  .getElementById("prev-month")
  .addEventListener("click", () => {
    const date = new Date(
      currentYear,
      currentMonth - 1,
      1
    );

    currentYear = date.getFullYear();
    currentMonth = date.getMonth();

    renderCalendar();
  });

// Next month.
document
  .getElementById("next-month")
  .addEventListener("click", () => {
    const date = new Date(
      currentYear,
      currentMonth + 1,
      1
    );

    currentYear = date.getFullYear();
    currentMonth = date.getMonth();

    renderCalendar();
  });

// Return to current month.
document
  .getElementById("today-button")
  .addEventListener("click", () => {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();

    renderCalendar();
  });


// --------------------------------------------------
// Reset all selected dates
// --------------------------------------------------

document
  .getElementById("reset-button")
  .addEventListener("click", () => {
    if (saving) {
      return;
    }

    selectedDates.clear();
    focusedDate = null;

    renderAll();
    updateChangeStatus();
  });


// --------------------------------------------------
// Server response helper
// --------------------------------------------------

async function readResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "서버 응답을 읽을 수 없습니다."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `서버 요청 실패 (${response.status})`
    );
  }

  return data;
}


// --------------------------------------------------
// Load existing votes from the server
// --------------------------------------------------

async function loadRoomVotes() {
  if (!roomCode) {
    canVote = false;
    saveButton.disabled = true;

    setSaveStatus(
      "방 화면에서 입장하면 날짜를 저장할 수 있습니다."
    );

    return;
  }

  try {
    const response = await fetch(
      `/api/rooms/${encodeURIComponent(roomCode)}/dates`
    );

    const summary = await readResponse(response);

    applySummary(summary);

    if (canVote) {
      setSaveStatus(
        "서버에서 저장된 날짜를 불러왔습니다."
      );
    } else {
      setSaveStatus(
        "참여자 정보를 찾을 수 없습니다. 방에서 다시 입장해주세요."
      );
    }
  } catch (error) {
    canVote = false;
    saveButton.disabled = true;

    setSaveStatus(
      `서버 연결 실패: ${error.message}`,
      "error"
    );
  }
}


// --------------------------------------------------
// Save selected dates to the server
// --------------------------------------------------

saveButton.addEventListener("click", async () => {
  if (!canVote || saving) {
    return;
  }

  saving = true;
  saveButton.disabled = true;

  setSaveStatus("날짜를 저장하고 있습니다...");

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

    // Update saved selections and vote results.
    applySummary(result);

    setSaveStatus(
      "날짜 선택이 서버에 저장되었습니다."
    );
  } catch (error) {
    setSaveStatus(
      `날짜 저장 실패: ${error.message}`,
      "error"
    );
  } finally {
    saving = false;
    saveButton.disabled = !canVote;

    renderAll();
  }
});


// --------------------------------------------------
// Back link
// --------------------------------------------------

const backLink = document.getElementById("back-link");

backLink.href = roomCode
  ? `./room.html?code=${encodeURIComponent(roomCode)}`
  : "./index.html";


// --------------------------------------------------
// Information notice
// --------------------------------------------------

const previewNotice = document.querySelector(
  ".preview-notice"
);

if (previewNotice) {
  previewNotice.textContent =
    "날짜 선택은 같은 방의 참여자들과 공유됩니다. " +
    "변경한 날짜는 저장 버튼을 눌러야 확정됩니다. " +
    "현재 서버는 재시작하면 방과 투표 기록이 초기화됩니다.";
}


// --------------------------------------------------
// Initialize
// --------------------------------------------------

saveButton.disabled = true;

renderAll();
loadRoomVotes();
