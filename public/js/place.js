const originForm = document.querySelector("#origin-form");
const originSelect = document.querySelector("#origin");
const originStatus = document.querySelector("#origin-status");

const voteSection = document.querySelector("#vote-section");
const voteForm = document.querySelector("#vote-form");
const candidateList = document.querySelector("#candidate-list");
const voteStatus = document.querySelector("#vote-status");

const state = {
  originId: null,
  candidateId: null
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

originForm.addEventListener("submit", (event) => {
  event.preventDefault();

  state.originId = originSelect.value;

  const originName =
    originSelect.options[originSelect.selectedIndex].text;

  originStatus.textContent =
    `${originName}을 선택했습니다. 아래 예시 후보를 확인해주세요.`;

  // 출발지를 다시 저장하면 이전 후보 선택 초기화
  state.candidateId = null;
  voteStatus.textContent = "";

  renderCandidates();
  voteSection.hidden = false;
});

voteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selected = candidateList.querySelector(
    'input[name="candidate"]:checked'
  );

  if (!selected) {
    voteStatus.textContent = "장소를 선택해주세요.";
    return;
  }

  state.candidateId = selected.value;

  const candidate = candidates.find(
    (item) => item.id === state.candidateId
  );

  voteStatus.textContent =
    `${candidate.name}을 선택했습니다. (화면 확인용 · 서버 저장 전)`;
});