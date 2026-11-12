const originForm = document.querySelector("#origin-form");
const originSelect = document.querySelector("#origin");
const originStatus = document.querySelector("#origin-status");

const state = {
  originId: null
};

originForm.addEventListener("submit", (event) => {
  event.preventDefault();

  state.originId = originSelect.value;

  const originName =
    originSelect.options[originSelect.selectedIndex].text;

  originStatus.textContent = `${originName}을 선택했습니다.`;
});