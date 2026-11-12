
// Read room information passed from the home or room page.
const params = new URLSearchParams(window.location.search);


const roomCode = (params.get("code") || "").trim().toUpperCase();

// Read the member ID saved by the room management page.
const memberId =
  params.get("memberId") ||
  localStorage.getItem(`memberId:${roomCode}`) ||
  "";

// Calendar elements.
const calendarGrid = document.getElementById("calendar-grid");
const monthTitle = document.getElementById("month-title");
const selectedList = document.getElementById("selected-list");
const selectedCount = document.getElementById("selected-count");
const saveStatus = document.getElementById("save-status");
const saveButton = document.getElementById("save-button");
const voteDetails = document.getElementById("vote-details");

const today = new Date();

let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

let focusedDate = null;
let canVote = false;
let memberCount = 0;

// Current member's selected dates.
const selectedDates = new Set();

// Voting results received from the server.
let voteStats = new Map();
let topDates = new Set();

// Convert a date to YYYY-MM-DD.
function formatDate(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return `${year}-${mm}-${dd}`;
}

// Format a date in Korean.
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

// Calculate a continuous color based on voting ratio.
// More votes result in a darker blue.
function getVoteColor(count, total) {
  if (count === 0 || total === 0) {
    return {
      background: "#f7f9fc",
      text: "#34415a"
    };
  }

  const ratio = Math.min(count / total, 1);
  const lightness = Math.round(94 - ratio * 58);

  return {
    background: `hsl(221, 78%, ${lightness}%)`,
    text: lightness <= 59 ? "#ffffff" : "#243b69"
  };
}

// Apply voting results returned by the server.
function applySummary(summary) {
  memberCount = summary.memberCount || 0;

  voteStats = new Map(
    (summary.dates || []).map((item) => [
      item.date,
      item
    ])
  );

  topDates = new Set(summary.topDates || []);

  // Find the current registered participant.
  const me = (summary.participants || []).find(
    (person) => person.memberId === memberId
  );

  canVote = Boolean(me);

  // Restore saved selections only for a valid participant.
  if (me) {
    selectedDates.clear();

    for (const date of me.availableDates) {
      selectedDates.add(date);
    }
  }

  saveButton.disabled = !canVote;

  renderCalendar();
  renderSelectedDates();
  renderVoteDetails();
}

// Display selected dates in the right panel.
function renderSelectedDates() {
  const dates = [...selectedDates].sort();

  selectedCount.textContent = dates.length;
  selectedList.innerHTML = "";

  if (dates.length === 0) {
    const item = document.createElement("li");

    item.className = "empty-message";
    item.textContent = "아직 선택한 날짜가 없습니다.";

    selectedList.appendChild(item);
    return;
  }

  for (const dateString of dates) {
    const item = document.createElement("li");

    item.textContent = formatKoreanDate(dateString);

    selectedList.appendChild(item);
  }
}

// Display participant counts and names for a date.
function renderVoteDetails() {
  voteDetails.innerHTML = "";

  if (!focusedDate) {
    const hint = document.createElement("p");

    hint.className = "detail-hint";
    hint.textContent =
      "날짜를 클릭하면 해당 날짜의 투표 결과를 확인할 수 있습니다.";

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
    `총 ${memberCount}명 중 ${count}명 선택 (저장된 투표 기준)`;

  voteDetails.appendChild(heading);
  voteDetails.appendChild(countText);

  // Highlight the most popular dates.
  if (topDates.has(focusedDate)) {
    const topLabel = document.createElement("p");

    topLabel.className = "top-message";
    topLabel.textContent = "★ 현재 최다 선택 날짜";

    voteDetails.appendChild(topLabel);
  }

  if (count === 0) {
    const empty = document.createElement("p");

    empty.className = "detail-hint";
    empty.textContent = "아직 저장된 투표가 없습니다.";

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

// Select or deselect dates.
// Multiple date selections are allowed even in preview mode.
function toggleDate(dateString) {
  focusedDate = dateString;

  // Remove the date if it is already selected.
  if (selectedDates.has(dateString)) {
    selectedDates.delete(dateString);
  } else {
    // Limit the number of selected dates.
    if (selectedDates.size >= 90) {
      saveStatus.textContent =
        "날짜는 최대 90일까지 선택할 수 있습니다.";
      return;
    }

    selectedDates.add(dateString);
  }

  // Selection is possible without member verification.
  // Saving to the server still requires registration.
  if (canVote) {
    saveStatus.textContent =
      "변경 사항이 있습니다. 저장 버튼을 눌러주세요.";
  } else {
    saveStatus.textContent =
      "날짜를 선택했습니다. 서버 저장을 위해 방 참여자 연결이 필요합니다.";
  }

  renderCalendar();
  renderSelectedDates();
  renderVoteDetails();
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

    // Skip cells outside the current month.
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

    // Apply blue intensity based on the voting ratio.
    const colors = getVoteColor(count, memberCount);

    button.style.backgroundColor = colors.background;
    button.style.color = colors.text;

    // Show the day number.
    const number = document.createElement("span");

    number.className = "day-number";
    number.textContent = dayNumber;

    button.appendChild(number);

    // Display the number of saved votes.
    if (count > 0) {
      const countLabel = document.createElement("span");

      countLabel.className = "day-count";
      countLabel.textContent = `${count}명`;

      button.appendChild(countLabel);
    }

    const mySelected = selectedDates.has(dateString);

    // Dark border indicates the current member's selection.
    if (mySelected) {
      button.classList.add("my-selected");
    }

    // Gold star indicates a popular date.
    if (topDates.has(dateString)) {
      button.classList.add("top-date");
    }

    // Mark today's date.
    if (
      currentYear === today.getFullYear() &&
      currentMonth === today.getMonth() &&
      dayNumber === today.getDate()
    ) {
      button.classList.add("today");
    }

    // Mark the date whose details are being displayed.
    if (focusedDate === dateString) {
      button.classList.add("focused-date");
    }

    button.setAttribute(
      "aria-pressed",
      String(mySelected)
    );

    button.setAttribute(
      "aria-label",
      `${dateString}, 저장된 투표 ${count}명`
    );

    // Clicking a date toggles only that date.
    button.addEventListener("click", () => {
      toggleDate(dateString);
    });

    calendarGrid.appendChild(button);
  }
}

// Move to the previous month.
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

// Move to the next month.
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

// Return to the current month.
document.getElementById("today-button").addEventListener(
  "click",
  () => {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();

    renderCalendar();
  }
);

// Clear all selected dates immediately.
document.getElementById("reset-button").addEventListener(
  "click",
  () => {
    selectedDates.clear();
    focusedDate = null;

    renderCalendar();
    renderSelectedDates();
    renderVoteDetails();

    if (canVote) {
      saveStatus.textContent =
        "모든 선택을 해제했습니다. 저장 버튼을 눌러주세요.";
    } else {
      saveStatus.textContent =
        "모든 선택을 초기화했습니다.";
    }
  }
);

// Read JSON results and handle server errors.
async function readResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "서버 요청에 실패했습니다."
    );
  }

  return data;
}

// Load the current room's saved date votes.
async function loadRoomVotes() {
  // No room or member: remain in local preview mode.
  if (!roomCode || !memberId) {
    canVote = false;
    saveButton.disabled = true;

    saveStatus.textContent =
      "미리보기 모드입니다. 날짜 선택은 가능하지만 서버 저장은 불가능합니다.";

    return;
  }

  try {
    const response = await fetch(
      `/api/rooms/${encodeURIComponent(roomCode)}/dates`
    );

    const summary = await readResponse(response);

    applySummary(summary);

    if (canVote) {
      saveStatus.textContent =
        "서버에서 날짜 투표 정보를 불러왔습니다.";
    } else {
      saveStatus.textContent =
        "참여자 정보를 확인하지 못했습니다. 날짜 선택만 가능합니다.";
    }
  } catch (error) {
    canVote = false;
    saveButton.disabled = true;

    saveStatus.textContent =
      `서버 연결 실패: ${error.message}. 날짜 선택만 가능합니다.`;
  }
}

// Save or replace the registered member's selected dates.
saveButton.addEventListener("click", async () => {
  if (!canVote) {
    saveStatus.textContent =
      "등록된 참여자만 서버에 날짜를 저장할 수 있습니다.";
    return;
  }

  saveButton.disabled = true;
  saveStatus.textContent = "저장 중입니다...";

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

    applySummary(result);

    saveStatus.textContent =
      "날짜 선택이 서버에 저장되었습니다.";
  } catch (error) {
    saveStatus.textContent =
      `날짜 저장 실패: ${error.message}`;
  } finally {
    saveButton.disabled = !canVote;
  }
});

// Return to the room page.
// Room creation is handled by the home screen.
const backLink = document.getElementById("back-link");

backLink.href = roomCode
  ? `./room.html?code=${encodeURIComponent(roomCode)}` +
    `&memberId=${encodeURIComponent(memberId)}`
  : "./room.html";

// Display the development storage notice.
const previewNotice = document.querySelector(".preview-notice");

if (previewNotice) {
  previewNotice.textContent =
    "날짜 선택은 여러 개 가능합니다. " +
    "등록된 방 참여자의 저장된 날짜만 서버에서 공유됩니다. " +
    "서버를 재시작하면 메모리 데이터가 초기화됩니다.";
}

// Initialize the calendar.
saveButton.disabled = true;

renderCalendar();
renderSelectedDates();
renderVoteDetails();
loadRoomVotes();
