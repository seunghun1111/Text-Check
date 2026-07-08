import { DEFAULT_RULES } from "./defaultRules.js";

const TECHNICAL_TOKEN_PATTERN =
  /\b(?:[A-Z]{2,}(?:-[0-9]+)?|[A-Za-z]+[A-Z][A-Za-z0-9]*|[A-Za-z]+[0-9]+[A-Za-z0-9]*|[A-Z]+-[0-9]+|[0-9]+)\b/g;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeExceptionWords(words = []) {
  return new Set(
    words
      .map((word) => String(word).trim())
      .filter(Boolean)
  );
}

function collectMatches(text, rule, exceptionWords) {
  if (exceptionWords.has(rule.wrong)) {
    return [];
  }

  const pattern = new RegExp(escapeRegExp(rule.wrong), "g");
  const matches = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      ...rule,
      original: rule.wrong,
      start: match.index,
      end: match.index + rule.wrong.length
    });
  }

  return matches;
}

function collectUnconfirmedWords(text, exceptionWords) {
  const words = new Set();
  let match;

  while ((match = TECHNICAL_TOKEN_PATTERN.exec(text)) !== null) {
    const token = match[0];
    if (!exceptionWords.has(token)) {
      words.add(token);
    }
  }

  return [...words];
}

function applyRules(text, matches) {
  return [...matches]
    .sort((a, b) => a.start - b.start)
    .reduce((currentText, match) => {
      return currentText.replaceAll(match.original, match.suggestion);
    }, text);
}

export function checkText(text, options = {}) {
  const exceptionWords = normalizeExceptionWords(options.exceptionWords);
  const rules = options.rules ?? DEFAULT_RULES;
  const matches = rules.flatMap((rule) =>
    collectMatches(text, rule, exceptionWords)
  );
  const spelling = matches.filter((item) => item.category === "spelling");
  const spacing = matches.filter((item) => item.category === "spacing");
  const unconfirmedWords = options.includeUnconfirmedWords === false
    ? []
    : collectUnconfirmedWords(text, exceptionWords);

  return {
    originalText: text,
    correctedText: applyRules(text, matches),
    spelling,
    spacing,
    standardNotation: [],
    unconfirmedWords,
    exceptionWords: [...exceptionWords],
    hasSuggestions: matches.length > 0
  };
}
