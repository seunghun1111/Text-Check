const KRDICT_SEARCH_URL = "https://krdict.korean.go.kr/api/search";
const OPENDICT_SEARCH_URL = "https://opendict.korean.go.kr/api/search";
const KOREAN_WORD_PATTERN = /[가-힣]{2,}/g;

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getNestedValue(source, path) {
  return path.reduce((current, key) => current?.[key], source);
}

function pickFirstValue(source, paths) {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

async function fetchDictionaryJson(url, params) {
  const requestUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      requestUrl.searchParams.set(key, value);
    }
  });

  const response = await fetch(requestUrl.toString());
  if (!response.ok) {
    throw new Error(`Dictionary API request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  if (contentType.includes("application/json") || body.trim().startsWith("{")) {
    return JSON.parse(body);
  }

  return xmlToSearchResult(body);
}

function normalizeProxyEndpoint(endpoint) {
  return String(endpoint ?? "").trim().replace(/\/$/, "");
}

async function lookupProxyDictionary(word, endpoint) {
  const proxyEndpoint = normalizeProxyEndpoint(endpoint);
  if (!proxyEndpoint) {
    return {
      word,
      status: "skipped",
      reason: "사전 프록시 URL이 설정되지 않았습니다."
    };
  }

  const response = await fetch(`${proxyEndpoint}/dictionary/search`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ word })
  });

  if (!response.ok) {
    throw new Error(`Dictionary proxy request failed: ${response.status}`);
  }

  return response.json();
}

function getXmlTagValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`));
  return match ? decodeXmlValue(match[1]).trim() : "";
}

function decodeXmlValue(value) {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'");
}

function xmlToSearchResult(xml) {
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
  const items = itemMatches.map((item) => {
    const sense = item.match(/<sense[\s\S]*?<\/sense>/)?.[0] ?? "";
    return {
      word: getXmlTagValue(item, "word"),
      pos: getXmlTagValue(item, "pos"),
      definition: getXmlTagValue(item, "definition"),
      sense: sense
        ? {
            pos: getXmlTagValue(sense, "pos"),
            definition: getXmlTagValue(sense, "definition")
          }
        : null
    };
  });

  return {
    channel: {
      item: items
    }
  };
}

function normalizeDictionaryItems(payload, source) {
  const items = toArray(payload?.channel?.item ?? payload?.item);
  return items.map((item) => {
    const senses = toArray(item.sense);
    const firstSense = senses[0] ?? {};
    return {
      source,
      word: pickFirstValue(item, [["word"], ["target_code"]]),
      partOfSpeech: pickFirstValue(item, [["pos"], ["word_info", "pos"]]) ||
        pickFirstValue(firstSense, [["pos"]]),
      definition: pickFirstValue(firstSense, [["definition"]]) ||
        pickFirstValue(item, [["definition"], ["sense", "definition"]])
    };
  }).filter((item) => item.word || item.definition || item.partOfSpeech);
}

async function lookupKoreanBasicDictionary(word, apiKey) {
  if (!apiKey) {
    return {
      source: "krdict",
      status: "skipped",
      reason: "한국어기초사전 API 키가 설정되지 않았습니다."
    };
  }

  const payload = await fetchDictionaryJson(KRDICT_SEARCH_URL, {
    key: apiKey,
    q: word,
    req_type: "json",
    translated: "n",
    advanced: "y",
    method: "exact",
    sort: "dict",
    start: 1,
    num: 5
  });
  const items = normalizeDictionaryItems(payload, "한국어기초사전");

  return {
    source: "krdict",
    status: items.length > 0 ? "found" : "not_found",
    entries: items
  };
}

async function lookupOpenDictionary(word, apiKey) {
  if (!apiKey) {
    return {
      source: "opendict",
      status: "skipped",
      reason: "우리말샘 API 키가 설정되지 않았습니다."
    };
  }

  const payload = await fetchDictionaryJson(OPENDICT_SEARCH_URL, {
    key: apiKey,
    q: word,
    req_type: "json",
    target_type: "search",
    part: "word",
    advanced: "y",
    method: "exact",
    sort: "dict",
    start: 1,
    num: 5
  });
  const items = normalizeDictionaryItems(payload, "우리말샘");

  return {
    source: "opendict",
    status: items.length > 0 ? "found" : "not_found",
    entries: items
  };
}

export function extractKoreanWords(text, limit = 10) {
  const words = new Set();
  let match;

  while ((match = KOREAN_WORD_PATTERN.exec(text)) !== null) {
    words.add(match[0]);
    if (words.size >= limit) {
      break;
    }
  }

  return [...words];
}

export async function lookupDictionary(word, settings = {}) {
  const apiSettings = settings.apiSettings ?? {};

  try {
    if (apiSettings.proxyEndpoint) {
      return lookupProxyDictionary(word, apiSettings.proxyEndpoint);
    }

    const krdictResult = await lookupKoreanBasicDictionary(
      word,
      apiSettings.krdictApiKey
    );
    if (krdictResult.status === "found") {
      return {
        word,
        status: "found",
        source: krdictResult.source,
        entries: krdictResult.entries
      };
    }

    const opendictResult = await lookupOpenDictionary(
      word,
      apiSettings.opendictApiKey
    );
    if (opendictResult.status === "found") {
      return {
        word,
        status: "found",
        source: opendictResult.source,
        entries: opendictResult.entries
      };
    }

    if (
      krdictResult.status === "skipped" &&
      opendictResult.status === "skipped"
    ) {
      return {
        word,
        status: "skipped",
        reason: "사전 API 키가 설정되지 않았습니다."
      };
    }

    return {
      word,
      status: "not_found",
      entries: []
    };
  } catch (error) {
    return {
      word,
      status: "error",
      reason: error.message,
      entries: []
    };
  }
}

export async function checkWordsWithDictionary(words, settings = {}) {
  if (!settings?.checkerOptions?.enableDictionaryApi) {
    return words.map((word) => ({
      word,
      status: "skipped",
      reason: "사전 API 조회가 꺼져 있습니다."
    }));
  }

  return Promise.all(words.map((word) => lookupDictionary(word, settings)));
}
