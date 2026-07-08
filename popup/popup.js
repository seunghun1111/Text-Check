import { checkText } from "../modules/ruleChecker.js";
import { addExceptionWord, getSettings } from "../modules/storage.js";

const sourceText = document.querySelector("#sourceText");
const selectionStatus = document.querySelector("#selectionStatus");
const checkButton = document.querySelector("#checkButton");
const copyButton = document.querySelector("#copyButton");
const resultSection = document.querySelector("#resultSection");
const exceptionInput = document.querySelector("#exceptionInput");
const addExceptionButton = document.querySelector("#addExceptionButton");
const exceptionList = document.querySelector("#exceptionList");

let settings = await getSettings();
let lastResult = null;

function createElement(tagName, className, textContent = "") {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent) {
    element.textContent = textContent;
  }
  return element;
}

function clearElement(element) {
  while (element.firstChild) {
    element.firstChild.remove();
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab;
}

async function loadSelectedText() {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      selectionStatus.textContent = "현재 탭을 확인할 수 없습니다.";
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_SELECTED_TEXT"
    });

    const selectedText = response?.text?.trim() ?? "";
    if (selectedText) {
      sourceText.value = selectedText;
      selectionStatus.textContent = "선택한 텍스트를 불러왔습니다.";
      return;
    }

    selectionStatus.textContent = "선택한 텍스트가 없습니다.";
  } catch (_error) {
    selectionStatus.textContent = "이 페이지에서는 선택 텍스트를 자동으로 읽을 수 없습니다.";
  }
}

function renderSuggestionGroup(title, items) {
  if (items.length === 0) {
    return;
  }

  const group = createElement("div", "result-group");
  group.append(createElement("h2", "result-title", title));

  const list = createElement("ul", "suggestion-list");
  items.forEach((item) => {
    const listItem = createElement("li", "suggestion-item");
    const original = createElement("strong", "", item.original);
    const arrow = createElement("span", "arrow", "→");
    const suggestion = createElement("strong", "", item.suggestion);
    listItem.append(original, arrow, suggestion);
    list.append(listItem);
  });

  group.append(list);
  resultSection.append(group);
}

function renderWordGroup(title, words) {
  if (words.length === 0) {
    return;
  }

  const group = createElement("div", "result-group");
  group.append(createElement("h2", "result-title", title));

  const chips = createElement("div", "chips");
  words.forEach((word) => {
    chips.append(createElement("span", "chip", word));
  });

  group.append(chips);
  resultSection.append(group);
}

function renderResults(result) {
  clearElement(resultSection);

  if (!result.hasSuggestions && result.unconfirmedWords.length === 0) {
    resultSection.append(createElement("p", "empty", "수정할 내용이 없습니다."));
    copyButton.disabled = true;
    return;
  }

  renderSuggestionGroup("오류/수정 제안", result.spelling);
  renderSuggestionGroup("띄어쓰기 제안", result.spacing);
  renderWordGroup("미확인 단어", result.unconfirmedWords);

  if (!result.hasSuggestions) {
    resultSection.prepend(
      createElement("p", "empty", "확실한 수정 제안은 없습니다.")
    );
  }

  copyButton.disabled = !result.hasSuggestions;
}

function renderExceptionWords() {
  clearElement(exceptionList);

  if (settings.exceptionWords.length === 0) {
    exceptionList.append(createElement("span", "status", "등록된 예외 단어가 없습니다."));
    return;
  }

  settings.exceptionWords.forEach((word) => {
    exceptionList.append(createElement("span", "chip", word));
  });
}

function runCheck() {
  const text = sourceText.value.trim();
  if (!text) {
    lastResult = null;
    copyButton.disabled = true;
    clearElement(resultSection);
    resultSection.append(createElement("p", "empty", "검사할 문장을 입력하거나 선택하세요."));
    return;
  }

  lastResult = checkText(text, {
    exceptionWords: settings.exceptionWords,
    includeUnconfirmedWords: settings.checkerOptions.includeUnconfirmedWords
  });
  renderResults(lastResult);
}

async function copyCorrectedText() {
  if (!lastResult?.hasSuggestions) {
    return;
  }

  await navigator.clipboard.writeText(lastResult.correctedText);
  copyButton.textContent = "복사 완료";
  window.setTimeout(() => {
    copyButton.textContent = "수정 결과 복사";
  }, 1200);
}

async function handleAddExceptionWord() {
  const word = exceptionInput.value.trim();
  if (!word) {
    return;
  }

  settings = await addExceptionWord(word);
  exceptionInput.value = "";
  renderExceptionWords();
  runCheck();
}

checkButton.addEventListener("click", runCheck);
copyButton.addEventListener("click", copyCorrectedText);
addExceptionButton.addEventListener("click", handleAddExceptionWord);
exceptionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleAddExceptionWord();
  }
});

renderExceptionWords();
await loadSelectedText();
