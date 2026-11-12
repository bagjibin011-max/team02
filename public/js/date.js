
// Get the room and member information.
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
const voteDetails = document.getElementById("vote-details");
const saveStatus = document.getElementById("save-status");

const saveButton = document.getElementById("save-button");
const resetButton = document.getElementById("reset-button");
const clearSavedButton = document.getElementById(
  "clear-saved-button"
);

// Calendar state.
const today = new Date();

let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let focusedDate = null;

// Server and member state.
let canVote = false;
let loading = true;
let saving = false;
let memberCount = 0;
let participants = [];

// Current selections include unsaved changes.
const selectedDates = new Set();

// Saved dates are the last confirmed server state.
const savedDates = new Set();

// Only saved server votes are included here.
let voteStats = new Map();
let topDates = new Set();


// --------------------------------------------------
// Date formatting
// --------------------------------------------------

function formatDate(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return `${year}-${mm}-${dd}`;
}

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
// Status messages
// --------------------------------------------------

function setSaveStatus(message, type = "normal") {
  saveStatus.textContent = message;

  saveStatus.classList.remove(
    "status-warning",
    "status-error"
  );

  if (type === "warning") {
    saveStatus.classList.add("status-warning");
  }

  if (type === "error") {
    saveStatus.classList.add("status-error");
  }
}

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

// The yellow background uses saved votes only.
function getVoteColor(count, total) {
  if (count === 0 || total <= 0) {
    return "#f6f8fb";
  }

  const ratio = Math.min(count / total, 1);
  const lightness = 96 - ratio * 35;

  return `hsl(43, 100%, ${lightness.toFixed(2)}%)`;
}


// --------------------------------------------------
// Calculate saved voting results
// --------------------------------------------------

function calculateVoteStats() {
  const result = new Map();

  // IMPORTANT:
  // Use each participant's saved dates only.
  // Do not use the current unsaved selectedDates.
  for (const participant of participants) {
    const dates = Array.isArray(participant.availableDates)
      ? participant.availableDates
      : [];

    for (const dateString of new Set(dates)) {
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

  voteStats = result;

  // Calculate the highest saved vote count.
  let maxCount = 0;

  for (const info of result.values()) {
    if (info.count > maxCount) {
      maxCount = info.count;
    }
  }

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
// Enable or disable controls
// --------------------------------------------------

function updateControls() {
  const busy = loading || saving;

  saveButton.disabled = busy || !canVote;
  resetButton.disabled = busy;

  // Saved-date reset requires a registered member
  // and at least one date already saved.
  clearSavedButton.disabled =
    busy ||
    !canVote ||
    savedDates.size === 0;
}


// --------------------------------------------------
// Refresh the complete screen
// --------------------------------------------------

function renderAll() {
  calculateVoteStats();

  renderCalendar();
  renderSelectedDates();
  renderVoteDetails();

  updateControls();
}


// --------------------------------------------------
// Apply server response
// --------------------------------------------------

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

  // Replace both sets with the latest saved state.
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

  renderAll();
}


// --------------------------------------------------
// Calendar selection and detail viewing
// --------------------------------------------------

// Calendar clicks only add a date or show its details.
// Existing selections cannot be removed here.
function selectOrViewDate(dateString) {
  if (loading || saving) {
    return;
  }

  focusedDate = dateString;

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

  renderAll();
  updateChangeStatus();
}


// --------------------------------------------------
// Remove a date using the X button
// --------------------------------------------------

function removeSelectedDate(dateString) {
  if (loading || saving) {
    return;
  }

  selectedDates.delete(dateString);

  // Keep showing the date's saved voting details.
  focusedDate = dateString;

  renderAll();
  updateChangeStatus();
}


// --------------------------------------------------
// Reset only unsaved changes
// --------------------------------------------------

// Restore exactly what was saved on the server.
// This also restores saved dates removed by X,
// if those removals were not saved yet.
function resetUnsavedChanges() {
  if (loading || saving) {
    return;
  }

  selectedDates.clear();

  for (const dateString of savedDates) {
    selectedDates.add(dateString);
  }

  focusedDate = null;

  renderAll();

  setSaveStatus(
    "저장 전 변경 사항을 초기화했습니다."
  );
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

    const label = document.createElement("span");
    label.textContent = formatKoreanDate(dateString);

    // X button removes only this selected date.
    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.className = "remove-date";
    removeButton.textContent = "×";
    removeButton.disabled = loading || saving;

    removeButton.setAttribute(
      "aria-label",
      `${formatKoreanDate(dateString)} 선택 취소`
    );

    removeButton.addEventListener("click", () => {
      removeSelectedDate(dateString);
    });

    item.appendChild(label);
    item.appendChild(removeButton);

    selectedList.appendChild(item);
  }
}


// --------------------------------------------------
// Saved vote details
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

  const info = voteStats.get(focusedDate);
  const count = info ? info.count : 0;

  const heading = document.createElement("h3");
  heading.textContent = formatKoreanDate(focusedDate);

  const countText = document.createElement("p");
  countText.className = "detail-count";
  countText.textContent =
    `총 ${memberCount}명 중 ${count}명 선택`;

  voteDetails.appendChild(heading);
  voteDetails.appendChild(countText);

  // Voting counts reflect server-saved data only.
  if (canVote && hasUnsavedChanges()) {
    const pending = document.createElement("p");

    pending.className = "detail-pending";
    pending.textContent =
      "현재 인원은 저장된 결과입니다. 변경 사항은 저장 후 반영됩니다.";

    voteDetails.appendChild(pending);
  }

  if (topDates.has(focusedDate)) {
    const topLabel = document.createElement("p");

    topLabel.className = "top-message";
    topLabel.textContent = "★ 현재 최다 선택 날짜";

    voteDetails.appendChild(topLabel);
  }

  if (count === 0) {
    const empty = document.createElement("p");

    empty.className = "detail-hint";
    empty.textContent =
      "아직 저장된 선택이 없는 날짜입니다.";

    voteDetails.appendChild(empty);
    return;
  }

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

    const info = voteStats.get(dateString);
    const count = info ? info.count : 0;

    const button = document.createElement("button");

    button.type = "button";
    button.className = "day";
    button.disabled = loading || saving;

    // Unsaved selections do not change this color.
    button.style.backgroundColor =
      getVoteColor(count, memberCount);

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = dayNumber;

    button.appendChild(number);

    // Show only saved vote counts.
    if (count > 0) {
      const countLabel = document.createElement("span");

      countLabel.className = "day-count";
      countLabel.textContent = `${count}명`;

      button.appendChild(countLabel);
    }

    const mySelected = selectedDates.has(dateString);
    const wasSaved = savedDates.has(dateString);

    // Current selections are shown with a navy border.
    if (mySelected) {
      button.classList.add("my-selected");
    }

    // A red dot indicates an unsaved change.
    if (canVote && mySelected !== wasSaved) {
      button.classList.add("pending-date");
    }

    // Highest saved vote count.
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
      `${dateString}, 저장된 선택 ${count}명`
    );

    button.addEventListener("click", () => {
      selectOrViewDate(dateString);
    });

    calendarGrid.appendChild(button);
  }
}


// --------------------------------------------------
// Calendar navigation
// --------------------------------------------------

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

document
  .getElementById("today-button")
  .addEventListener("click", () => {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();

    renderCalendar();
  });


// --------------------------------------------------
// Reset button: unsaved changes only
// --------------------------------------------------

resetButton.addEventListener("click", () => {
  resetUnsavedChanges();
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
// Load saved votes
// --------------------------------------------------

async function loadRoomVotes() {
  if (!roomCode) {
    canVote = false;
    loading = false;

    renderAll();

    setSaveStatus(
      "방에서 입장하면 날짜를 저장할 수 있습니다."
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

    setSaveStatus(
      `서버 연결 실패: ${error.message}`,
      "error"
    );
  } finally {
    loading = false;
    renderAll();
  }
}


// --------------------------------------------------
// Shared server update function
// --------------------------------------------------

// Send a new date list to the existing Express API.
// An empty array removes this member's saved votes.
async function updateServerDates(dates, successMessage) {
  if (!canVote || loading || saving) {
    return;
  }

  saving = true;

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
          availableDates: [...dates].sort()
        })
      }
    );

    const result = await readResponse(response);

    // Restore local state from the confirmed server result.
    applySummary(result);

    setSaveStatus(successMessage);
  } catch (error) {
    setSaveStatus(
      `날짜 저장 실패: ${error.message}`,
      "error"
    );
  } finally {
    saving = false;
    renderAll();
  }
}


// --------------------------------------------------
// Save current selections
// --------------------------------------------------

saveButton.addEventListener("click", async () => {
  await updateServerDates(
    [...selectedDates],
    "날짜 선택이 서버에 저장되었습니다."
  );
});


// --------------------------------------------------
// Clear saved dates
// --------------------------------------------------

// This button is intentionally separate from
// resetting unsaved changes.
clearSavedButton.addEventListener("click", async () => {
  if (!canVote || loading || saving || savedDates.size === 0) {
    return;
  }

  const confirmed = window.confirm(
    `서버에 저장한 날짜 ${savedDates.size}개를 모두 초기화할까요?\n\n` +
    "내 날짜 선택 기록이 삭제되고, 저장 전 변경 사항도 사라집니다.\n" +
    "다른 참여자의 선택 기록은 유지됩니다."
  );

  if (!confirmed) {
    return;
  }

  // PUT [] immediately removes this member's stored dates.
  await updateServerDates(
    [],
    "서버에 저장한 내 날짜를 모두 초기화했습니다."
  );
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
    "참여 인원과 노란색 배경은 서버에 저장된 결과를 기준으로 표시됩니다. " +
    "저장 전에는 내 선택이 테두리로만 표시되며, 저장 후 다른 참여자에게 반영됩니다. " +
    "현재 서버는 재시작하면 방과 투표 기록이 초기화됩니다.";
}


// --------------------------------------------------
// Initialize
// --------------------------------------------------

renderAll();
loadRoomVotes();
