let lastSelectedText = "";
let overlayHost = null;
let lastContextMenuPosition = null;

function getSelectionFromEditableElement(element) {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    return element.value.slice(start, end);
  }

  return "";
}

function getSelectedText() {
  const activeElement = document.activeElement;
  const editableSelection = activeElement
    ? getSelectionFromEditableElement(activeElement)
    : "";

  if (editableSelection.trim()) {
    return editableSelection;
  }

  const selection = window.getSelection();
  return selection ? selection.toString() : "";
}

function rememberSelectedText() {
  const selectedText = getSelectedText().trim();
  if (selectedText) {
    lastSelectedText = selectedText;
  }
}

function rememberContextMenuPosition(event) {
  lastContextMenuPosition = {
    x: event.clientX,
    y: event.clientY
  };
  rememberSelectedText();
}

function createStyle() {
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      color-scheme: light;
      --ktc-bg: #ffffff;
      --ktc-text: #1f2933;
      --ktc-muted: #667085;
      --ktc-line: #d9dee7;
      --ktc-primary: #2563eb;
      --ktc-primary-strong: #1d4ed8;
      --ktc-warning-bg: #fff7ed;
      --ktc-warning: #c2410c;
      --ktc-info-bg: #eef6ff;
      --ktc-info: #1d4ed8;
      --ktc-shadow: 0 18px 50px rgba(15, 23, 42, 0.24);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .ktc-layer {
      position: fixed;
      z-index: 2147483647;
      top: 24px;
      right: 24px;
      width: min(420px, calc(100vw - 32px));
      max-height: min(680px, calc(100vh - 48px));
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--ktc-line);
      border-radius: 8px;
      background: var(--ktc-bg);
      color: var(--ktc-text);
      box-shadow: var(--ktc-shadow);
      font-size: 14px;
      line-height: 1.5;
    }

    .ktc-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 14px 10px;
      border-bottom: 1px solid var(--ktc-line);
    }

    .ktc-title {
      margin: 0;
      font-size: 16px;
      line-height: 1.35;
      font-weight: 800;
    }

    .ktc-subtitle {
      margin: 3px 0 0;
      color: var(--ktc-muted);
      font-size: 12px;
    }

    .ktc-close {
      width: 30px;
      min-width: 30px;
      height: 30px;
      border: 1px solid var(--ktc-line);
      border-radius: 6px;
      background: #ffffff;
      color: var(--ktc-text);
      cursor: pointer;
      font: inherit;
      line-height: 1;
    }

    .ktc-body {
      overflow: auto;
      padding: 12px 14px 14px;
    }

    .ktc-source,
    .ktc-corrected {
      margin: 0;
      padding: 10px;
      border: 1px solid var(--ktc-line);
      border-radius: 6px;
      background: #f8fafc;
      white-space: pre-wrap;
      word-break: break-word;
      font: inherit;
    }

    .ktc-corrected {
      background: #f0fdf4;
    }

    .ktc-section + .ktc-section {
      margin-top: 14px;
    }

    .ktc-section-title {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 800;
    }

    .ktc-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .ktc-item {
      padding: 8px;
      border-radius: 6px;
      background: var(--ktc-warning-bg);
      color: var(--ktc-warning);
      word-break: break-word;
    }

    .ktc-item + .ktc-item {
      margin-top: 6px;
    }

    .ktc-arrow {
      color: var(--ktc-muted);
      padding: 0 4px;
    }

    .ktc-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .ktc-chip {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      border: 0;
      border-radius: 999px;
      padding: 0 9px;
      background: var(--ktc-info-bg);
      color: var(--ktc-info);
      font: inherit;
      font-size: 12px;
    }

    .ktc-dictionary-entry {
      padding: 8px;
      border-radius: 6px;
      background: var(--ktc-info-bg);
      color: var(--ktc-text);
      word-break: break-word;
    }

    .ktc-dictionary-entry + .ktc-dictionary-entry {
      margin-top: 6px;
    }

    .ktc-dictionary-meta {
      color: var(--ktc-info);
      font-size: 12px;
    }

    button.ktc-chip {
      cursor: pointer;
    }

    .ktc-actions,
    .ktc-inline {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .ktc-button,
    .ktc-primary {
      min-height: 36px;
      border: 1px solid var(--ktc-line);
      border-radius: 6px;
      padding: 0 12px;
      background: #ffffff;
      color: var(--ktc-text);
      cursor: pointer;
      font: inherit;
      white-space: nowrap;
    }

    .ktc-primary {
      border-color: var(--ktc-primary);
      background: var(--ktc-primary);
      color: #ffffff;
    }

    .ktc-primary:hover {
      border-color: var(--ktc-primary-strong);
      background: var(--ktc-primary-strong);
    }

    .ktc-input {
      width: 100%;
      min-height: 36px;
      min-width: 0;
      border: 1px solid var(--ktc-line);
      border-radius: 6px;
      padding: 0 10px;
      color: var(--ktc-text);
      background: #ffffff;
      font: inherit;
    }

    .ktc-empty {
      margin: 0;
      color: var(--ktc-muted);
    }

    @media (max-width: 520px) {
      .ktc-layer {
        top: 12px;
        right: 12px;
        left: 12px;
        width: auto;
        max-height: calc(100vh - 24px);
      }
    }
  `;
  return style;
}

function appendTextElement(parent, tagName, className, textContent) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = textContent;
  parent.append(element);
  return element;
}

function appendSuggestionGroup(parent, title, items) {
  if (!items.length) {
    return;
  }

  const section = document.createElement("section");
  section.className = "ktc-section";
  appendTextElement(section, "h3", "ktc-section-title", title);

  const list = document.createElement("ul");
  list.className = "ktc-list";
  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.className = "ktc-item";

    appendTextElement(listItem, "strong", "", item.original);
    appendTextElement(listItem, "span", "ktc-arrow", "→");
    appendTextElement(listItem, "strong", "", item.suggestion);
    list.append(listItem);
  });

  section.append(list);
  parent.append(section);
}

function appendWordGroup(parent, title, words, onAddException) {
  if (!words.length) {
    return;
  }

  const section = document.createElement("section");
  section.className = "ktc-section";
  appendTextElement(section, "h3", "ktc-section-title", title);

  const chips = document.createElement("div");
  chips.className = "ktc-chips";
  words.forEach((word) => {
    const button = appendTextElement(chips, "button", "ktc-chip", `${word} 예외 등록`);
    button.type = "button";
    button.title = `${word}를 사용자 예외 단어로 등록`;
    button.addEventListener("click", () => onAddException(word));
  });

  section.append(chips);
  parent.append(section);
}

function appendDictionaryGroup(parent, lookups = []) {
  const foundLookups = lookups.filter((item) => item.status === "found");
  if (!foundLookups.length) {
    return;
  }

  const section = document.createElement("section");
  section.className = "ktc-section";
  appendTextElement(section, "h3", "ktc-section-title", "사전 확인");

  foundLookups.forEach((lookup) => {
    const entry = lookup.entries[0] ?? {};
    const item = document.createElement("div");
    item.className = "ktc-dictionary-entry";
    appendTextElement(item, "strong", "", lookup.word);
    appendTextElement(
      item,
      "div",
      "ktc-dictionary-meta",
      `${entry.source ?? lookup.source}${entry.partOfSpeech ? ` · ${entry.partOfSpeech}` : ""}`
    );
    if (entry.definition) {
      appendTextElement(item, "div", "", entry.definition);
    }
    section.append(item);
  });

  parent.append(section);
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  button.textContent = "복사 완료";
  window.setTimeout(() => {
    button.textContent = "수정 결과 복사";
  }, 1200);
}

function closeOverlay() {
  overlayHost?.remove();
  overlayHost = null;
}

function positionLayerNearContextMenu(layer) {
  if (!lastContextMenuPosition) {
    return;
  }

  const margin = 12;
  const gap = 8;
  layer.style.right = "auto";
  layer.style.left = `${lastContextMenuPosition.x + gap}px`;
  layer.style.top = `${lastContextMenuPosition.y + gap}px`;

  const rect = layer.getBoundingClientRect();
  const left = Math.min(
    Math.max(lastContextMenuPosition.x + gap, margin),
    Math.max(window.innerWidth - rect.width - margin, margin)
  );
  const top = Math.min(
    Math.max(lastContextMenuPosition.y + gap, margin),
    Math.max(window.innerHeight - rect.height - margin, margin)
  );

  layer.style.left = `${left}px`;
  layer.style.top = `${top}px`;
}

function showCheckOverlay(result) {
  closeOverlay();

  overlayHost = document.createElement("korean-text-check-layer");
  const shadow = overlayHost.attachShadow({ mode: "open" });
  shadow.append(createStyle());

  const layer = document.createElement("aside");
  layer.className = "ktc-layer";
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-label", "한국어 맞춤법 검사 결과");

  const header = document.createElement("header");
  header.className = "ktc-header";
  const titleBox = document.createElement("div");
  appendTextElement(titleBox, "h2", "ktc-title", "한국어 맞춤법 검사");
  appendTextElement(
    titleBox,
    "p",
    "ktc-subtitle",
    result.originalText ? "선택한 텍스트 검사 결과입니다." : "선택한 텍스트가 없습니다."
  );

  const closeButton = appendTextElement(header, "button", "ktc-close", "×");
  closeButton.type = "button";
  closeButton.title = "닫기";
  closeButton.addEventListener("click", closeOverlay);
  header.prepend(titleBox);

  const body = document.createElement("div");
  body.className = "ktc-body";

  if (!result.originalText) {
    appendTextElement(body, "p", "ktc-empty", "검사할 텍스트를 선택한 뒤 다시 실행하세요.");
  } else {
    const sourceSection = document.createElement("section");
    sourceSection.className = "ktc-section";
    appendTextElement(sourceSection, "h3", "ktc-section-title", "원문");
    appendTextElement(sourceSection, "p", "ktc-source", result.originalText);
    body.append(sourceSection);

    if (result.hasSuggestions) {
      const correctedSection = document.createElement("section");
      correctedSection.className = "ktc-section";
      appendTextElement(correctedSection, "h3", "ktc-section-title", "전체 수정 결과");
      appendTextElement(correctedSection, "p", "ktc-corrected", result.correctedText);
      const actions = document.createElement("div");
      actions.className = "ktc-actions";
      const copyButton = appendTextElement(actions, "button", "ktc-primary", "수정 결과 복사");
      copyButton.type = "button";
      copyButton.addEventListener("click", () => copyText(result.correctedText, copyButton));
      correctedSection.append(actions);
      body.append(correctedSection);
    } else {
      const message = result.unconfirmedWords.length
        ? "확실한 수정 제안은 없습니다."
        : "수정할 내용이 없습니다.";
      const emptySection = document.createElement("section");
      emptySection.className = "ktc-section";
      appendTextElement(emptySection, "p", "ktc-empty", message);
      body.append(emptySection);
    }

    appendSuggestionGroup(body, "오류/수정 제안", result.spelling);
    appendSuggestionGroup(body, "띄어쓰기 제안", result.spacing);
    appendDictionaryGroup(body, result.dictionaryLookups);
    appendWordGroup(body, "미확인 단어", result.unconfirmedWords, async (word) => {
      const response = await chrome.runtime.sendMessage({
        type: "ADD_EXCEPTION_WORD",
        word
      });

      if (response?.ok) {
        const rerun = await chrome.runtime.sendMessage({
          type: "CHECK_TEXT",
          text: result.originalText
        });
        if (rerun?.ok) {
          showCheckOverlay(rerun.result);
        }
      }
    });
  }

  layer.append(header, body);
  shadow.append(layer);
  document.documentElement.append(overlayHost);
  positionLayerNearContextMenu(layer);
}

document.addEventListener("selectionchange", rememberSelectedText);
document.addEventListener("mouseup", rememberSelectedText);
document.addEventListener("keyup", rememberSelectedText);
document.addEventListener("contextmenu", rememberContextMenuPosition);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_SELECTED_TEXT") {
    sendResponse({
      text: getSelectedText() || lastSelectedText
    });

    return false;
  }

  if (message?.type === "SHOW_CHECK_LAYER") {
    showCheckOverlay(message.result);
    sendResponse({ ok: true });

    return false;
  }

  return false;
});
