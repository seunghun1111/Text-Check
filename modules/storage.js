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
    const localConfig = await import("./apiKeys.local.js");
    return {
      apiSettings: localConfig.LOCAL_API_SETTINGS ?? {},
      checkerOptions: localConfig.LOCAL_CHECKER_OPTIONS ?? {}
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
