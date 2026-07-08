import http from "node:http";

const KRDICT_SEARCH_URL = "https://krdict.korean.go.kr/api/search";
const OPENDICT_SEARCH_URL = "https://opendict.korean.go.kr/api/search";
const PORT = Number(process.env.PORT ?? 8787);
const KRDICT_API_KEY = process.env.KRDICT_API_KEY ?? "";
const OPENDICT_API_KEY = process.env.OPENDICT_API_KEY ?? "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "*";

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

async function fetchDictionaryJson(url, params) {
  const requestUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      requestUrl.searchParams.set(key, value);
    }
  });

  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`Dictionary API request failed: ${response.status}`);
  }

  return response.json();
}

async function lookupKrdict(word) {
  if (!KRDICT_API_KEY) {
    return {
      status: "skipped",
      entries: []
    };
  }

  const payload = await fetchDictionaryJson(KRDICT_SEARCH_URL, {
    key: KRDICT_API_KEY,
    q: word,
    req_type: "json",
    translated: "n",
    advanced: "y",
    method: "exact",
    sort: "dict",
    start: 1,
    num: 5
  });
  const entries = normalizeDictionaryItems(payload, "한국어기초사전");

  return {
    status: entries.length ? "found" : "not_found",
    source: "krdict",
    entries
  };
}

async function lookupOpendict(word) {
  if (!OPENDICT_API_KEY) {
    return {
      status: "skipped",
      entries: []
    };
  }

  const payload = await fetchDictionaryJson(OPENDICT_SEARCH_URL, {
    key: OPENDICT_API_KEY,
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
  const entries = normalizeDictionaryItems(payload, "우리말샘");

  return {
    status: entries.length ? "found" : "not_found",
    source: "opendict",
    entries
  };
}

async function lookupDictionary(word) {
  const krdictResult = await lookupKrdict(word);
  if (krdictResult.status === "found") {
    return {
      word,
      ...krdictResult
    };
  }

  const opendictResult = await lookupOpendict(word);
  if (opendictResult.status === "found") {
    return {
      word,
      ...opendictResult
    };
  }

  if (krdictResult.status === "skipped" && opendictResult.status === "skipped") {
    return {
      word,
      status: "skipped",
      reason: "Dictionary API keys are not configured.",
      entries: []
    };
  }

  return {
    word,
    status: "not_found",
    entries: []
  };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 32) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "access-control-allow-origin": ALLOWED_ORIGIN,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method !== "POST" || request.url !== "/dictionary/search") {
    sendJson(response, 404, { ok: false, error: "Not found" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const word = String(body.word ?? "").trim();
    if (!word) {
      sendJson(response, 400, { ok: false, error: "word is required" });
      return;
    }

    sendJson(response, 200, await lookupDictionary(word));
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      status: "error",
      error: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`Dictionary proxy listening on http://localhost:${PORT}`);
});
