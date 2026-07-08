const DEFAULTS = {
  exceptionWords: [],
  customRules: [],
  apiSettings: {
    koreanDictionaryApiKey: ""
  },
  checkerOptions: {
    includeUnconfirmedWords: true,
    enableDictionaryApi: false
  }
};

function getStorageArea() {
  return chrome.storage.sync;
}

export async function getSettings() {
  return getStorageArea().get(DEFAULTS);
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
