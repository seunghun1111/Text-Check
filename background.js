import { checkText } from "./modules/ruleChecker.js";
import {
  addExceptionWord,
  addCustomRule,
  addUserDomainTerm,
  getSettings,
  removeExceptionWord,
  removeCustomRule,
  removeUserDomainTerm,
  saveApiSettings,
  saveCheckerOptions
} from "./modules/storage.js";
import {
  checkWordsWithDictionary,
  extractKoreanWords
} from "./modules/dictionaryApi.js";
import { getDomainTerms } from "./modules/patternEngine.js";

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

async function runLocalCheck(text) {
  const settings = await getSettings();
  const result = checkText(text, {
    exceptionWords: settings.exceptionWords,
    customRules: settings.customRules,
    userDomainTerms: settings.userDomainTerms,
    includeUnconfirmedWords: settings.checkerOptions.includeUnconfirmedWords
  });

  return {
    ...result,
    dictionaryLookups: [],
    dictionaryEnabled: settings.checkerOptions.enableDictionaryApi,
    dictionaryPending: settings.checkerOptions.enableDictionaryApi,
    dictionaryLimit: settings.checkerOptions.dictionaryLookupLimit
  };
}

async function runDictionaryCheck(text, localResult = null) {
  const settings = await getSettings();
  const result = localResult ?? await runLocalCheck(text);
  const domainWords = new Set(
    getDomainTerms(settings.userDomainTerms).flatMap((term) => term.variants)
  );
  const words = extractKoreanWords(
    text,
    settings.checkerOptions.dictionaryLookupLimit
  ).filter((word) => {
    return !settings.exceptionWords.includes(word) && !domainWords.has(word);
  });
  const dictionaryLookups = await checkWordsWithDictionary(words, settings);
  const dictionaryUnconfirmedWords = settings.checkerOptions.enableDictionaryApi
    ? dictionaryLookups
        .filter((item) => item.status === "not_found")
        .map((item) => item.word)
    : [];

  return {
    ...result,
    unconfirmedWords: [
      ...new Set([...result.unconfirmedWords, ...dictionaryUnconfirmedWords])
    ],
    dictionaryLookups,
    dictionaryEnabled: settings.checkerOptions.enableDictionaryApi,
    dictionaryPending: false,
    dictionaryLimit: settings.checkerOptions.dictionaryLookupLimit
  };
}

async function showCheckLayer(tabId, text) {
  const sourceText = String(text ?? "").trim();
  await chrome.tabs.sendMessage(tabId, {
    type: "SHOW_CHECK_LAYER_LOADING",
    originalText: sourceText
  });

  if (!sourceText) {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_CHECK_LAYER",
      result: {
        originalText: "",
        correctedText: "",
        spelling: [],
        spacing: [],
        standardNotation: [],
        unconfirmedWords: [],
        exceptionWords: [],
        dictionaryLookups: [],
        dictionaryEnabled: false,
        dictionaryPending: false,
        hasSuggestions: false
      }
    });
    return;
  }

  const localResult = await runLocalCheck(sourceText);
  await chrome.tabs.sendMessage(tabId, {
    type: "SHOW_CHECK_LAYER",
    result: localResult
  });

  if (!localResult.dictionaryEnabled) {
    return;
  }

  const dictionaryResult = await runDictionaryCheck(sourceText, localResult);
  await chrome.tabs.sendMessage(tabId, {
    type: "SHOW_CHECK_LAYER",
    result: dictionaryResult
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["exceptionWords", "customRules", "userDomainTerms", "checkerOptions", "apiSettings"], (items) => {
    const defaults = {};

    if (!Array.isArray(items.exceptionWords)) {
      defaults.exceptionWords = [];
    }

    if (!Array.isArray(items.customRules)) {
      defaults.customRules = [];
    }

    if (!Array.isArray(items.userDomainTerms)) {
      defaults.userDomainTerms = [];
    }

    if (!items.apiSettings) {
      defaults.apiSettings = {
        krdictApiKey: "",
        opendictApiKey: ""
      };
    }

    if (!items.checkerOptions) {
      defaults.checkerOptions = {
        includeUnconfirmedWords: true,
        enableDictionaryApi: false,
        dictionaryLookupLimit: 10
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
    runDictionaryCheck(message.text)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "CHECK_TEXT_LOCAL") {
    runLocalCheck(message.text)
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

  if (message?.type === "REMOVE_EXCEPTION_WORD") {
    removeExceptionWord(message.word)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "ADD_CUSTOM_RULE") {
    addCustomRule(message.rule)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "REMOVE_CUSTOM_RULE") {
    removeCustomRule(message.ruleId)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "ADD_USER_DOMAIN_TERM") {
    addUserDomainTerm(message.term)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "REMOVE_USER_DOMAIN_TERM") {
    removeUserDomainTerm(message.termId)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "SAVE_API_SETTINGS") {
    saveApiSettings(message.apiSettings)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "SAVE_CHECKER_OPTIONS") {
    saveCheckerOptions(message.checkerOptions)
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
