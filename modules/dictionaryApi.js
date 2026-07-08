export async function lookupDictionary(_word, _settings = {}) {
  return {
    status: "skipped",
    reason: "Dictionary API integration is not configured yet."
  };
}

export async function checkWordsWithDictionary(words, settings = {}) {
  if (!settings?.checkerOptions?.enableDictionaryApi) {
    return words.map((word) => ({
      word,
      status: "skipped"
    }));
  }

  return Promise.all(
    words.map(async (word) => ({
      word,
      ...(await lookupDictionary(word, settings))
    }))
  );
}
