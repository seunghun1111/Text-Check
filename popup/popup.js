import {
  addExceptionWord,
  addCustomRule,
  getSettings,
  removeExceptionWord,
  removeCustomRule,
  saveApiSettings,
  saveCheckerOptions
} from "../modules/storage.js";

const sourceText = document.querySelector("#sourceText");
const selectionStatus = document.querySelector("#selectionStatus");
const checkButton = document.querySelector("#checkButton");
const copyButton = document.querySelector("#copyButton");
const resultSection = document.querySelector("#resultSection");
const exceptionInput = document.querySelector("#exceptionInput");
const addExceptionButton = document.querySelector("#addExceptionButton");
const exceptionList = document.querySelector("#exceptionList");
const customWrongInput = document.querySelector("#customWrongInput");
const customSuggestionInput = document.querySelector("#customSuggestionInput");
const addCustomRuleButton = document.querySelector("#addCustomRuleButton");
const customRuleList = document.querySelector("#customRuleList");
const enableDictionaryApi = document.querySelector("#enableDictionaryApi");
const krdictApiKey = document.querySelector("#krdictApiKey");
const opendictApiKey = document.querySelector("#opendictApiKey");
const saveApiSettingsButton = document.querySelector("#saveApiSettingsButton");
const apiSettingsStatus = document.querySelector("#apiSettingsStatus");

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

function renderDictionaryLookups(lookups = []) {
  const foundLookups = lookups.filter((item) => item.status === "found");
  if (foundLookups.length === 0) {
    return;
  }

  const group = createElement("div", "result-group");
  group.append(createElement("h2", "result-title", "사전 확인"));

  foundLookups.forEach((lookup) => {
    const entry = lookup.entries[0] ?? {};
    const item = createElement("div", "dictionary-entry");
    item.append(createElement("strong", "", lookup.word));
    item.append(
      createElement(
        "div",
        "dictionary-meta",
        `${entry.source ?? lookup.source} ${entry.partOfSpeech ? `· ${entry.partOfSpeech}` : ""}`
      )
    );
    if (entry.definition) {
      item.append(createElement("div", "", entry.definition));
    }
    group.append(item);
  });

  resultSection.append(group);
}

function renderResults(result) {
  clearElement(resultSection);

  const hasDictionaryResults = result.dictionaryLookups?.some(
    (item) => item.status === "found"
  );

  if (
    !result.hasSuggestions &&
    result.unconfirmedWords.length === 0 &&
    !hasDictionaryResults
  ) {
    resultSection.append(createElement("p", "empty", "수정할 내용이 없습니다."));
    copyButton.disabled = true;
    return;
  }

  renderSuggestionGroup("오류/수정 제안", result.spelling);
  renderSuggestionGroup("띄어쓰기 제안", result.spacing);
  renderSuggestionGroup("표준어/외래어 표기 제안", result.standardNotation);
  renderDictionaryLookups(result.dictionaryLookups);
  renderWordGroup("미확인 단어", result.unconfirmedWords);

  if (!result.hasSuggestions) {
    resultSection.prepend(
      createElement("p", "empty", "확실한 수정 제안은 없습니다.")
    );
  }

  copyButton.disabled = !result.hasSuggestions;
}

function renderApiSettings() {
  enableDictionaryApi.checked = Boolean(settings.checkerOptions.enableDictionaryApi);
  krdictApiKey.value = settings.apiSettings.krdictApiKey ?? "";
  opendictApiKey.value = settings.apiSettings.opendictApiKey ?? "";
}

function renderExceptionWords() {
  clearElement(exceptionList);

  if (settings.exceptionWords.length === 0) {
    exceptionList.append(createElement("span", "status", "등록된 예외 단어가 없습니다."));
    return;
  }

  settings.exceptionWords.forEach((word) => {
    const chip = createElement("span", "chip removable-chip");
    chip.append(createElement("span", "", word));

    const removeButton = createElement("button", "chip-remove", "×");
    removeButton.type = "button";
    removeButton.title = `${word} 예외 단어 삭제`;
    removeButton.setAttribute("aria-label", `${word} 예외 단어 삭제`);
    removeButton.addEventListener("click", () => handleRemoveExceptionWord(word));

    chip.append(removeButton);
    exceptionList.append(chip);
  });
}

function renderCustomRules() {
  clearElement(customRuleList);

  if (!settings.customRules.length) {
    customRuleList.append(createElement("p", "status", "등록된 사용자 교정 규칙이 없습니다."));
    return;
  }

  settings.customRules.forEach((rule) => {
    const item = createElement("div", "rule-item");
    const text = createElement("div", "rule-text");
    text.append(createElement("strong", "", rule.wrong));
    text.append(createElement("span", "arrow", "→"));
    text.append(createElement("strong", "", rule.suggestion));

    const removeButton = createElement("button", "rule-remove", "×");
    removeButton.type = "button";
    removeButton.title = `${rule.wrong} 교정 규칙 삭제`;
    removeButton.setAttribute("aria-label", `${rule.wrong} 교정 규칙 삭제`);
    removeButton.addEventListener("click", () => handleRemoveCustomRule(rule.id));

    item.append(text, removeButton);
    customRuleList.append(item);
  });
}

async function runCheck() {
  const text = sourceText.value.trim();
  if (!text) {
    lastResult = null;
    copyButton.disabled = true;
    clearElement(resultSection);
    resultSection.append(createElement("p", "empty", "검사할 문장을 입력하거나 선택하세요."));
    return;
  }

  checkButton.disabled = true;
  checkButton.textContent = "검사 중";

  const response = await chrome.runtime.sendMessage({
    type: "CHECK_TEXT",
    text
  });

  checkButton.disabled = false;
  checkButton.textContent = "검사하기";

  if (!response?.ok) {
    clearElement(resultSection);
    resultSection.append(createElement("p", "empty", "검사 중 오류가 발생했습니다."));
    return;
  }

  lastResult = response.result;
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

async function handleRemoveExceptionWord(word) {
  settings = await removeExceptionWord(word);
  renderExceptionWords();
  runCheck();
}

async function handleAddCustomRule() {
  const wrong = customWrongInput.value.trim();
  const suggestion = customSuggestionInput.value.trim();
  if (!wrong || !suggestion) {
    return;
  }

  settings = await addCustomRule({
    wrong,
    suggestion
  });
  customWrongInput.value = "";
  customSuggestionInput.value = "";
  renderCustomRules();
  runCheck();
}

async function handleRemoveCustomRule(ruleId) {
  settings = await removeCustomRule(ruleId);
  renderCustomRules();
  runCheck();
}

async function handleSaveApiSettings() {
  const apiSettings = {
    krdictApiKey: krdictApiKey.value.trim(),
    opendictApiKey: opendictApiKey.value.trim()
  };
  const checkerOptions = {
    enableDictionaryApi: enableDictionaryApi.checked
  };

  settings = await saveApiSettings(apiSettings);
  settings = await saveCheckerOptions(checkerOptions);
  apiSettingsStatus.textContent = "API 설정을 저장했습니다.";
  window.setTimeout(() => {
    apiSettingsStatus.textContent = "내부용 키는 Chrome storage에 저장됩니다.";
  }, 1400);
}

checkButton.addEventListener("click", runCheck);
copyButton.addEventListener("click", copyCorrectedText);
addExceptionButton.addEventListener("click", handleAddExceptionWord);
addCustomRuleButton.addEventListener("click", handleAddCustomRule);
saveApiSettingsButton.addEventListener("click", handleSaveApiSettings);
exceptionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleAddExceptionWord();
  }
});
customSuggestionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleAddCustomRule();
  }
});

renderExceptionWords();
renderCustomRules();
renderApiSettings();
await loadSelectedText();
