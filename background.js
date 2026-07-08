import { checkText } from "./modules/ruleChecker.js";
import { addExceptionWord, getSettings } from "./modules/storage.js";

const CHECK_SELECTION_MENU_ID = "check-selected-korean-text";

async function getSelectedTextFromTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "GET_SELECTED_TEXT"
    });
    return response?.text ?? "";
  } catch (_error) {
    return "";
  }
}

async function runCheck(text) {
  const settings = await getSettings();
  return checkText(text, {
    exceptionWords: settings.exceptionWords,
    includeUnconfirmedWords: settings.checkerOptions.includeUnconfirmedWords
  });
}

async function showCheckLayer(tabId, text) {
  const sourceText = String(text ?? "").trim();
  const result = sourceText
    ? await runCheck(sourceText)
    : {
        originalText: "",
        correctedText: "",
        spelling: [],
        spacing: [],
        standardNotation: [],
        unconfirmedWords: [],
        exceptionWords: [],
        hasSuggestions: false
      };

  await chrome.tabs.sendMessage(tabId, {
    type: "SHOW_CHECK_LAYER",
    result
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["exceptionWords", "checkerOptions"], (items) => {
    const defaults = {};

    if (!Array.isArray(items.exceptionWords)) {
      defaults.exceptionWords = [];
    }

    if (!items.checkerOptions) {
      defaults.checkerOptions = {
        includeUnconfirmedWords: true,
        enableDictionaryApi: false
      };
    }

    if (Object.keys(defaults).length > 0) {
      chrome.storage.sync.set(defaults);
    }
  });

  chrome.contextMenus.create({
    id: CHECK_SELECTION_MENU_ID,
    title: "한국어 맞춤법 검사",
    contexts: ["selection", "editable"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CHECK_SELECTION_MENU_ID || !tab?.id) {
    return;
  }

  const selectedText =
    info.selectionText || (await getSelectedTextFromTab(tab.id));
  await showCheckLayer(tab.id, selectedText);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CHECK_TEXT") {
    runCheck(message.text)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "ADD_EXCEPTION_WORD") {
    addExceptionWord(message.word)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "CHECK_CURRENT_SELECTION" && sender.tab?.id) {
    getSelectedTextFromTab(sender.tab.id)
      .then((text) => showCheckLayer(sender.tab.id, text))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
