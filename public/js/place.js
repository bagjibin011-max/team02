const originSection = document.querySelector("#origin-section");
const originSearchForm = document.querySelector("#origin-search-form");
const originQuery = document.querySelector("#origin-query");
const originResults = document.querySelector("#origin-results");
const searchStatus = document.querySelector("#search-status");
const originForm = document.querySelector("#origin-form");
const originSave = document.querySelector("#origin-save");
const originStatus = document.querySelector("#origin-status");

const voteSection = document.querySelector("#vote-section");
const voteForm = document.querySelector("#vote-form");
const candidateList = document.querySelector("#candidate-list");
const voteStatus = document.querySelector("#vote-status");
const voteSummary = document.querySelector("#vote-summary");
const voteCounts = document.querySelector("#vote-counts");
const refreshVotes = document.querySelector("#refresh-votes");

const resultSection = document.querySelector("#result-section");
const finalPlace = document.querySelector("#final-place");
const finalVotes = document.querySelector("#final-votes");
const placeStatus = document.querySelector("#place-status");
const backToRoom = document.querySelector("#back-to-room");

const code = getCode();
const memberId = getMemberId(code);

let current = null;
let busy = false;

if (code) {
  backToRoom.href = `/room.html?code=${encodeURIComponent(code)}`;
  backToRoom.hidden = false;
}

// 요청 중이거나 현재 단계에서 사용할 수 없는 입력 잠금
function updateControls() {
  const canEditOrigin =
    !busy && current?.stage === "origin";

  originSearchForm.querySelectorAll("input, button").forEach(
    (control) => {
      control.disabled = !canEditOrigin;
    }
  );

  originResults.querySelectorAll("input").forEach((control) => {
    control.disabled = !canEditOrigin;
  });

  const selectedOrigin = originResults.querySelector(
    'input[name="origin"]:checked'
  );

  originSave.disabled = !canEditOrigin || !selectedOrigin;

  const canVote = !busy && current?.stage === "vote";

  voteForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = !canVote;
  });

  refreshVotes.disabled = busy;
}

// 후보 카드를 처음 표시하거나 투표 저장 후 선택 복원
function renderCandidates() {
  candidateList.replaceChildren();

  current.candidates.forEach((candidate) => {
    const label = document.createElement("label");
    label.className = "candidate-card";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "candidate";
    input.value = candidate.id;
    input.required = true;
    input.checked = candidate.id === current.candidateId;

    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = candidate.name;

    const description = document.createElement("p");
    description.textContent =
      `${candidate.features} ` +
      `중앙값 기준점과 약 ${candidate.distanceKm.toFixed(1)}km`;

    info.append(name, description);
    label.append(input, info);
    candidateList.append(label);
  });
}

function renderState(data, restoreVote = false) {
  const firstLoad = current === null;

  const candidatesChanged =
    JSON.stringify(current?.candidates.map((item) => item.id)) !==
    JSON.stringify(data.candidates.map((item) => item.id));

  current = data;

  originSection.hidden = data.stage !== "origin";
  voteSection.hidden = data.stage !== "vote";
  resultSection.hidden = data.stage !== "result";

  const origin = data.originOptions.find(
    (item) => item.id === data.originId
  );

  // 자동 조회가 입력 중인 검색어를 덮어쓰지 않도록 함
  if (firstLoad && origin) {
    originQuery.value = origin.name;
  }

  originStatus.textContent = origin
    ? `저장된 출발지: ${origin.name}`
    : "아직 저장한 출발지가 없습니다.";

  if (firstLoad || candidatesChanged || restoreVote) {
    renderCandidates();
  }

  const votedCandidate = data.candidates.find(
    (item) => item.id === data.candidateId
  );

  voteStatus.textContent = votedCandidate
    ? `저장된 내 투표: ${votedCandidate.name}`
    : "아직 투표하지 않았습니다.";

  voteCounts.replaceChildren();

  data.candidates.forEach((candidate) => {
    const li = document.createElement("li");
    li.textContent =
      `${candidate.name}: ${data.counts[candidate.id] ?? 0}표`;
    voteCounts.append(li);
  });

  voteSummary.textContent =
    `투표 참여: ${data.voteCount}/${data.totalMembers}명` +
    " · 4초마다 자동 갱신";

  if (data.stage === "origin") {
    placeStatus.textContent =
      `방 참여: ${data.memberCount}/${data.totalMembers}명 · ` +
      `출발지 입력: ${data.savedCount}/${data.totalMembers}명. ` +
      "모두 입력하면 자동으로 추천합니다.";
  } else if (data.stage === "vote") {
    placeStatus.textContent =
      "추천이 완료되었습니다. 전원이 투표하면 자동 마감됩니다.";
  } else {
    placeStatus.textContent =
      "전원이 투표하여 자동 마감되었습니다.";

    const winners = data.candidates.filter(
      (candidate) => data.winnerIds.includes(candidate.id)
    );

    if (winners.length === 0) {
      finalPlace.textContent = "선정된 장소가 없습니다.";
      finalVotes.textContent = `총 ${data.voteCount}표`;
    } else {
      const names = winners.map((item) => item.name).join(", ");
      const topVotes = data.counts[winners[0].id];

      finalPlace.textContent = winners.length > 1
        ? `공동 1위: ${names}`
        : `최종 장소: ${names}`;

      finalVotes.textContent = winners.length > 1
        ? `각 ${topVotes}표 · 총 ${data.voteCount}표`
        : `${topVotes}표 · 총 ${data.voteCount}표`;
    }
  }
}

// 조회와 저장 요청이 겹치지 않도록 하나씩 처리
async function requestState(path = "votes", body = null) {
  if (busy || !code || !memberId) return;

  busy = true;
  updateControls();

  try {
    const base = `/api/rooms/${encodeURIComponent(code)}/${path}`;

    const data = body === null
      ? await api(
          `${base}?memberId=${encodeURIComponent(memberId)}`
        )
      : await api(base, {
          method: "PUT",
          body: { ...body, memberId }
        });

    renderState(data, body !== null);
  } catch (error) {
    placeStatus.textContent = error.message;
  } finally {
    busy = false;
    updateControls();
  }
}

originQuery.addEventListener("input", () => {
  originResults.replaceChildren();
  searchStatus.textContent = "";
  updateControls();
});

originSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (busy || current?.stage !== "origin") return;

  originResults.replaceChildren();

  const keyword = originQuery.value.trim();

  if (!keyword) {
    searchStatus.textContent = "장소 이름을 입력해주세요.";
    updateControls();
    return;
  }

  const results = current.originOptions.filter(
    (origin) => origin.name.includes(keyword)
  );

  searchStatus.textContent =
    `등록된 목록에서 ${results.length}곳을 찾았습니다.`;

  results.forEach((origin) => {
    const label = document.createElement("label");
    label.className = "candidate-card";

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

  updateControls();
});

originResults.addEventListener("change", updateControls);

originForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (busy || current?.stage !== "origin") return;

  const selected = originResults.querySelector(
    'input[name="origin"]:checked'
  );

  if (!selected) return;

  await requestState("origin", {
    originId: selected.value
  });
});

voteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (busy || current?.stage !== "vote") return;

  const selected = candidateList.querySelector(
    'input[name="candidate"]:checked'
  );

  if (!selected) return;

  await requestState("vote", {
    candidateId: selected.value
  });
});

refreshVotes.addEventListener("click", () => {
  requestState();
});

if (!code || !memberId) {
  window.location.replace("/index.html");
} else {
  updateControls();
  requestState();

  setInterval(() => {
    if (!document.hidden) {
      requestState();
    }
  }, 4000);
}