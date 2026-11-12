const originForm = document.querySelector("#origin-form");
const originStatus = document.querySelector("#origin-status");

const voteSection = document.querySelector("#vote-section");
const voteForm = document.querySelector("#vote-form");
const candidateList = document.querySelector("#candidate-list");
const voteStatus = document.querySelector("#vote-status");

const state = {
  originId: null,
  candidateId: null,
  closed: false
};

// 화면 동작 확인용 예시 데이터
const candidates = [
  {
    id: "sample-a",
    name: "예시 장소 A",
    features: "식사 중심 모임을 위한 예시 후보"
  },
  {
    id: "sample-b",
    name: "예시 장소 B",
    features: "카페 중심 모임을 위한 예시 후보"
  },
  {
    id: "sample-c",
    name: "예시 장소 C",
    features: "산책 중심 모임을 위한 예시 후보"
  }
];

function renderCandidates() {
  candidateList.replaceChildren();

  candidates.forEach((candidate) => {
    const label = document.createElement("label");
    label.classList.add("candidate-card");

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "candidate";
    input.value = candidate.id;
    input.required = true;
    input.checked = candidate.id === state.candidateId;

    const info = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = candidate.name;

    const features = document.createElement("p");
    features.textContent = candidate.features;

    info.append(name, features);
    label.append(input, info);
    candidateList.append(label);
  });
}


voteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const code = getCode();
  const memberId = getMemberId(code);

  if (!code || !memberId) {
    voteStatus.textContent = "방에 먼저 참여해주세요.";
    return;
  }

  const selected = candidateList.querySelector(
    'input[name="candidate"]:checked'
  );

  if (!selected) {
    voteStatus.textContent = "장소를 선택해주세요.";
    return;
  }

  const candidate = candidates.find(
    (item) => item.id === selected.value
  );

  if (!candidate) {
    voteStatus.textContent = "올바른 후보를 선택해주세요.";
    return;
  }

  // 투표 저장 중 다른 입력으로 화면이 바뀌지 않게 잠금
  const controls = [
    ...originSearchForm.querySelectorAll("input, button"),
    ...originForm.querySelectorAll("input, button"),
    ...voteForm.querySelectorAll("input, button")
  ];

  const previousDisabled = controls.map(
    (control) => control.disabled
  );

  controls.forEach((control) => {
    control.disabled = true;
  });

  voteStatus.textContent = "투표를 저장하는 중입니다.";

  try {
    const result = await api(
      `/api/rooms/${encodeURIComponent(code)}/vote`,
      {
        method: "PUT",
        body: {
          memberId,
          candidateId: candidate.id
        }
      }
    );

    state.candidateId = result.candidateId;

    voteStatus.textContent =
      `${candidate.name}에 투표했습니다. ` +
      `투표 참여: ${result.voteCount}/${result.memberCount}명`;
  } catch (error) {
    voteStatus.textContent = error.message;

    // 저장 실패 시 마지막으로 저장에 성공한 선택 복원
    renderCandidates();
  } finally {
    controls.forEach((control, index) => {
      control.disabled = previousDisabled[index];
    });
  }
});

const originSearchForm =
  document.querySelector("#origin-search-form");
const originQuery = document.querySelector("#origin-query");
const originResults = document.querySelector("#origin-results");
const searchStatus = document.querySelector("#search-status");
const originSave = document.querySelector("#origin-save");

// 검색 화면 확인용 목록: 실제 좌표는 API 연결 시 추가
const sampleOrigins = [
  { id: "kw", name: "광운대학교" },
  { id: "gangnam", name: "강남역" },
  { id: "hongik", name: "홍대입구역" },
  { id: "wangsimni", name: "왕십리역" }
];

function resetOriginSelection() {
  state.originId = null;
  state.candidateId = null;

  originResults.replaceChildren();
  originSave.disabled = true;
  originStatus.textContent = "";
  searchStatus.textContent = "";

  voteSection.hidden = true;
  voteStatus.textContent = "";
}

originQuery.addEventListener("input", () => {
  resetOriginSelection();
});

originSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  resetOriginSelection();

  const keyword = originQuery.value.trim();

  if (!keyword) {
    searchStatus.textContent = "장소 이름을 입력해주세요.";
    return;
  }

  const results = sampleOrigins.filter((origin) =>
    origin.name.includes(keyword)
  );

  searchStatus.textContent =
    `예시 목록에서 ${results.length}곳을 찾았습니다.`;

  results.forEach((origin) => {
    const label = document.createElement("label");
    label.classList.add("candidate-card");

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "origin";
    input.value = origin.id;
    input.required = true;

    const name = document.createElement("span");
    name.textContent = origin.name;

    label.append(input, name);
    originResults.append(label);
  });
});

originResults.addEventListener("change", () => {
  originSave.disabled = false;

  // 다른 출발지를 고르면 기존 후보 선택을 초기화
  state.originId = null;
  state.candidateId = null;
  originStatus.textContent = "";
  voteSection.hidden = true;
  voteStatus.textContent = "";
});

originForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const code = getCode();
  const memberId = getMemberId(code);

  if (!code || !memberId) {
    originStatus.textContent =
      "첫 화면에서 방에 참여한 뒤 장소 화면으로 들어와주세요.";
    return;
  }

  const selected = originResults.querySelector(
    'input[name="origin"]:checked'
  );

  if (!selected) {
    originStatus.textContent =
      "검색 결과에서 출발지를 선택해주세요.";
    return;
  }

  const origin = sampleOrigins.find(
    (item) => item.id === selected.value
  );

  if (!origin) {
    originStatus.textContent = "올바른 출발지를 선택해주세요.";
    return;
  }

  // 요청 중에는 입력을 잠시 막음
  const controls = [
    ...originSearchForm.querySelectorAll("input, button"),
    ...originForm.querySelectorAll("input, button")
  ];

  controls.forEach((control) => {
    control.disabled = true;
  });

  originStatus.textContent = "출발지를 저장하는 중입니다.";
  voteSection.hidden = true;
  voteStatus.textContent = "";

  try {
    const result = await api(
      `/api/rooms/${encodeURIComponent(code)}/origin`,
      {
        method: "PUT",
        body: {
          memberId,
          originId: origin.id
        }
      }
    );

    state.originId = result.originId;
    state.candidateId = null;

    originStatus.textContent =
      `${origin.name} 저장 완료! ` +
      `출발지 입력: ${result.savedCount}/${result.memberCount}명`;

    renderCandidates();
    voteSection.hidden = state.closed;
  } catch (error) {
    originStatus.textContent = error.message;
  } finally {
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
});

const backToRoom = document.querySelector("#back-to-room");
const roomCode = getCode();

if (roomCode) {
  backToRoom.href =
    `/room.html?code=${encodeURIComponent(roomCode)}`;
  backToRoom.hidden = false;
}

async function loadSavedOrigin() {
  const code = getCode();
  const memberId = getMemberId(code);

  if (!code || !memberId) {
    window.location.replace("/index.html");
    return;
  }

  // 불러오는 동안 검색·저장 입력 잠금
  const controls = [
    ...originSearchForm.querySelectorAll("input, button"),
    ...originForm.querySelectorAll("input, button")
  ];

  const previousDisabled = controls.map(
    (control) => control.disabled
  );

  controls.forEach((control) => {
    control.disabled = true;
  });

  originStatus.textContent = "저장된 출발지를 불러오는 중입니다.";

  try {
    const result = await api(
      `/api/rooms/${encodeURIComponent(code)}/origin` +
      `?memberId=${encodeURIComponent(memberId)}`
    );

    if (!result.originId) {
      originStatus.textContent =
        "아직 저장한 출발지가 없습니다. 출발지를 검색해주세요.";
      return;
    }

    const origin = sampleOrigins.find(
      (item) => item.id === result.originId
    );

    if (!origin) {
      originStatus.textContent =
        "저장된 출발지가 현재 목록에 없습니다. 다시 선택해주세요.";
      return;
    }

    state.originId = origin.id;
    state.candidateId = result.candidateId;
    originQuery.value = origin.name;

    const votedCandidate = candidates.find(
      (item) => item.id === state.candidateId
    );

    voteStatus.textContent = votedCandidate
      ? `내가 투표한 장소: ${votedCandidate.name}`
      : "아직 투표하지 않았습니다.";

    originStatus.textContent =
      `저장된 출발지: ${origin.name} · ` +
      `출발지 입력: ${result.savedCount}/${result.memberCount}명`;

    renderCandidates();
    voteSection.hidden = state.closed;
  } catch (error) {
    originStatus.textContent = error.message;
  } finally {
    controls.forEach((control, index) => {
      control.disabled = previousDisabled[index];
    });
  }
}

const refreshVotes = document.querySelector("#refresh-votes");
const voteSummary = document.querySelector("#vote-summary");
const voteCounts = document.querySelector("#vote-counts");

const hostControls = document.querySelector("#host-controls");
const closeVote = document.querySelector("#close-vote");
const placeStatus = document.querySelector("#place-status");

const originSection = document.querySelector("#origin-section");
const resultSection = document.querySelector("#result-section");
const finalPlace = document.querySelector("#final-place");
const finalVotes = document.querySelector("#final-votes");

let isLoadingVotes = false;
let isClosing = false;

function showFinalResult(result) {
  state.closed = true;

  originSection.hidden = true;
  voteSection.hidden = true;
  hostControls.hidden = true;
  resultSection.hidden = false;

  placeStatus.textContent = "방장이 장소 투표를 마감했습니다.";

  const winners = candidates.filter((candidate) =>
    result.winnerIds.includes(candidate.id)
  );

  if (result.voteCount === 0) {
    finalPlace.textContent = "투표 없이 마감되어 선정된 장소가 없습니다.";
    finalVotes.textContent = "총 0표";
    return;
  }

  const names = winners.map((candidate) => candidate.name).join(", ");
  const topVotes = result.counts[winners[0].id];

  finalPlace.textContent = winners.length > 1
    ? `공동 1위: ${names}`
    : `최종 장소: ${names}`;

  finalVotes.textContent = winners.length > 1
    ? `각 ${topVotes}표 · 총 ${result.voteCount}표`
    : `${topVotes}표 · 총 ${result.voteCount}표`;
}

async function loadVoteCounts() {
  // 출발지 입력 전에도 마감 여부를 확인
  if (isLoadingVotes || isClosing) return;

  const code = getCode();
  const memberId = getMemberId(code);

  if (!code || !memberId) return;

  isLoadingVotes = true;
  refreshVotes.disabled = true;

  try {
    const result = await api(
      `/api/rooms/${encodeURIComponent(code)}/votes` +
      `?memberId=${encodeURIComponent(memberId)}`
    );

    if (result.stage === "result") {
      showFinalResult(result);
      return;
    }

    // 마감 후 늦게 도착한 이전 응답은 무시
    if (state.closed) return;

    hostControls.hidden = !result.isHost;
    placeStatus.textContent =
      "방장이 마감하기 전까지 투표를 변경할 수 있습니다.";

    voteCounts.replaceChildren();

    candidates.forEach((candidate) => {
      const li = document.createElement("li");
      li.textContent =
        `${candidate.name}: ${result.counts[candidate.id] ?? 0}표`;

      voteCounts.append(li);
    });

    voteSummary.textContent =
      `투표 참여: ${result.voteCount}/${result.memberCount}명` +
      " · 4초마다 자동 갱신";
  } catch (error) {
    placeStatus.textContent =
      `현황 조회 실패: ${error.message}`;
  } finally {
    isLoadingVotes = false;
    refreshVotes.disabled = false;
  }
}

closeVote.addEventListener("click", async () => {
  if (isClosing || state.closed) return;

  if (!window.confirm(
    "장소 투표를 마감할까요? 마감 후에는 변경할 수 없습니다."
  )) {
    return;
  }

  const code = getCode();
  const memberId = getMemberId(code);

  if (!code || !memberId) return;

  isClosing = true;
  closeVote.disabled = true;
  placeStatus.textContent = "투표를 마감하는 중입니다.";

  try {
    await api(
      `/api/rooms/${encodeURIComponent(code)}/vote/close`,
      {
        method: "POST",
        body: { memberId }
      }
    );

    state.closed = true;
    originSection.hidden = true;
    voteSection.hidden = true;
    hostControls.hidden = true;

    placeStatus.textContent =
      "마감되었습니다. 결과를 불러오는 중입니다.";
  } catch (error) {
    placeStatus.textContent = error.message;
  } finally {
    isClosing = false;
    closeVote.disabled = false;
  }

  if (state.closed) {
    await loadVoteCounts();
  }
});

refreshVotes.addEventListener("click", loadVoteCounts);

// 저장된 입력을 복원한 뒤 마감 상태 확인
async function initializePlace() {
  await loadSavedOrigin();
  await loadVoteCounts();

  setInterval(() => {
    if (!document.hidden) {
      loadVoteCounts();
    }
  }, 4000);
}

initializePlace();