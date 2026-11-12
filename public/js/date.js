
const params = new URLSearchParams(window.location.search);

const roomCode = params.get("code") || "DEMO";
const memberId = params.get("memberId") || "preview";

const storageKey = `team02-date-demo:${roomCode}:${memberId}`;

const calendarGrid = document.getElementById("calendar-grid");
const monthTitle = document.getElementById("month-title");
const selectedList = document.getElementById("selected-list");
const selectedCount = document.getElementById("selected-count");
const saveStatus = document.getElementById("save-status");

const today = new Date();

let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

const selectedDates = new Set();

// Create a date string in YYYY-MM-DD format.
function formatDate(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return `${year}-${mm}-${dd}`;
}

// Check whether a date string is valid.
function isValidDate(value) {
  if (typeof value !== "string") return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

// Load the previously saved dates from this browser.
function loadSavedDates() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(storageKey) || "[]"
    );

    if (!Array.isArray(saved)) return;

    for (const date of saved) {
      if (isValidDate(date)) {
        selectedDates.add(date);
      }
    }
  } catch (error) {
    saveStatus.textContent =
      "저장된 날짜를 불러오지 못했습니다.";
  }
}

// Display the selected dates in the side panel.
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
    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    const date = new Date(year, month - 1, day);

    const item = document.createElement("li");

    item.textContent = date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    });

    selectedList.appendChild(item);
  }
}

// Select or deselect a date.
function toggleDate(dateString) {
  if (selectedDates.has(dateString)) {
    selectedDates.delete(dateString);
  } else {
    selectedDates.add(dateString);
  }

  saveStatus.textContent =
    "변경 사항이 있습니다. 저장 버튼을 눌러주세요.";

  renderCalendar();
  renderSelectedDates();
}

// Draw the monthly calendar.
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

    // Add an empty cell outside the current month.
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

    const button = document.createElement("button");

    button.type = "button";
    button.className = "day";
    button.textContent = dayNumber;

    const isSelected = selectedDates.has(dateString);

    button.setAttribute(
      "aria-pressed",
      String(isSelected)
    );

    button.setAttribute(
      "aria-label",
      `${dateString} 선택`
    );

    if (isSelected) {
      button.classList.add("selected");
    }

    // Highlight today's date.
    if (
      currentYear === today.getFullYear() &&
      currentMonth === today.getMonth() &&
      dayNumber === today.getDate()
    ) {
      button.classList.add("today");
    }

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

// Clear all selected dates immediately without confirmation.
document.getElementById("reset-button").addEventListener(
  "click",
  () => {
    if (selectedDates.size === 0) {
      saveStatus.textContent =
        "초기화할 날짜가 없습니다.";
      return;
    }

    // Clear all currently selected dates.
    selectedDates.clear();

    // Refresh both the calendar and the selection list.
    renderCalendar();
    renderSelectedDates();

    saveStatus.textContent =
      "모든 날짜가 해제되었습니다. 저장 버튼을 눌러주세요.";
  }
);

// Save the selected dates in this browser.
document.getElementById("save-button").addEventListener(
  "click",
  () => {
    try {
      const dates = [...selectedDates].sort();

      localStorage.setItem(
        storageKey,
        JSON.stringify(dates)
      );

      saveStatus.textContent =
        "이 브라우저에 임시 저장했습니다. 팀원과는 아직 공유되지 않습니다.";
    } catch (error) {
      saveStatus.textContent =
        "저장에 실패했습니다.";
    }
  }
);

// Display the current room code.
document.getElementById("room-code").textContent = roomCode;

// Set the link to return to the room page.
const backLink = document.getElementById("back-link");

backLink.href =
  `./room.html?code=${encodeURIComponent(roomCode)}`;

// Initialize the calendar and saved selection.
loadSavedDates();
renderCalendar();
renderSelectedDates();
