const DEFAULTS = {
  exceptionWords: [],
  customRules: [],
  apiSettings: {
    krdictApiKey: "",
    opendictApiKey: ""
  },
  checkerOptions: {
    includeUnconfirmedWords: true,
    enableDictionaryApi: false,
    dictionaryLookupLimit: 10
  }
};

function getStorageArea() {
  return chrome.storage.sync;
}

async function getLocalSettings() {
  try {
    if (!globalThis.chrome?.runtime?.getURL) {
      return {
        apiSettings: {},
        checkerOptions: {}
      };
    }

    const response = await fetch(
      chrome.runtime.getURL("modules/apiKeys.local.json"),
      { cache: "no-store" }
    );

    if (!response.ok) {
      return {
        apiSettings: {},
        checkerOptions: {}
      };
    }

    const localConfig = await response.json();
    return {
      apiSettings: localConfig.apiSettings ?? {},
      checkerOptions: localConfig.checkerOptions ?? {}
    };
  } catch (_error) {
    return {
      apiSettings: {},
      checkerOptions: {}
    };
  }
}

export async function getSettings() {
  const settings = await getStorageArea().get(DEFAULTS);
  const localSettings = await getLocalSettings();

  return {
    ...settings,
    apiSettings: {
      ...DEFAULTS.apiSettings,
      ...(settings.apiSettings ?? {}),
      ...localSettings.apiSettings
    },
    checkerOptions: {
      ...DEFAULTS.checkerOptions,
      ...(settings.checkerOptions ?? {}),
      ...localSettings.checkerOptions
    }
  };
}

export async function saveApiSettings(apiSettings) {
  const settings = await getSettings();
  const nextApiSettings = {
    ...settings.apiSettings,
    ...apiSettings
  };
  await getStorageArea().set({ apiSettings: nextApiSettings });

  return {
    ...settings,
    apiSettings: nextApiSettings
  };
}

export async function saveCheckerOptions(checkerOptions) {
  const settings = await getSettings();
  const nextCheckerOptions = {
    ...settings.checkerOptions,
    ...checkerOptions
  };
  await getStorageArea().set({ checkerOptions: nextCheckerOptions });

  return {
    ...settings,
    checkerOptions: nextCheckerOptions
  };
}

export async function addExceptionWord(word) {
  const normalizedWord = String(word).trim();
  if (!normalizedWord) {
    return getSettings();
  }

  const settings = await getSettings();
  const nextWords = [...new Set([...settings.exceptionWords, normalizedWord])];
  await getStorageArea().set({ exceptionWords: nextWords });

  return {
    ...settings,
    exceptionWords: nextWords
  };
}

export async function removeExceptionWord(word) {
  const settings = await getSettings();
  const nextWords = settings.exceptionWords.filter((item) => item !== word);
  await getStorageArea().set({ exceptionWords: nextWords });

  return {
    ...settings,
    exceptionWords: nextWords
  };
}

function normalizeCustomRule(rule) {
  const wrong = String(rule?.wrong ?? "").trim();
  const suggestion = String(rule?.suggestion ?? "").trim();

  if (!wrong || !suggestion) {
    throw new Error("사용자 교정 규칙의 원문과 수정안을 입력해야 합니다.");
  }

  return {
    id: rule.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: rule.category || "spelling",
    matchType: "literal",
    wrong,
    suggestion,
    description: rule.description || "사용자 등록 교정 규칙",
    custom: true
  };
}

export async function addCustomRule(rule) {
  const settings = await getSettings();
  const normalizedRule = normalizeCustomRule(rule);
  const nextRules = [
    ...settings.customRules.filter((item) => item.wrong !== normalizedRule.wrong),
    normalizedRule
  ];
  await getStorageArea().set({ customRules: nextRules });

  return {
    ...settings,
    customRules: nextRules
  };
}

export async function removeCustomRule(ruleId) {
  const settings = await getSettings();
  const nextRules = settings.customRules.filter((item) => item.id !== ruleId);
  await getStorageArea().set({ customRules: nextRules });

  return {
    ...settings,
    customRules: nextRules
  };
}
