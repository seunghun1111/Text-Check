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

  const source = rule.matchType === "regex"
    ? rule.pattern
    : escapeRegExp(rule.wrong);
  if (!source) {
    return [];
  }

  const pattern = new RegExp(source, "g");
  const matches = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const original = match[0];
    if (!original) {
      pattern.lastIndex += 1;
      continue;
    }

    matches.push({
      ...rule,
      original,
      start: match.index,
      end: match.index + original.length
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

function getNonOverlappingMatches(matches) {
  const nonOverlappingMatches = [];
  let lastEnd = -1;

  [...matches]
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .forEach((match) => {
      if (match.start >= lastEnd) {
        nonOverlappingMatches.push(match);
        lastEnd = match.end;
      }
    });

  return nonOverlappingMatches;
}

function applyRules(text, matches) {
  return matches
    .sort((a, b) => b.start - a.start)
    .reduce((currentText, match) => {
      return `${currentText.slice(0, match.start)}${match.suggestion}${currentText.slice(match.end)}`;
    }, text);
}

export function checkText(text, options = {}) {
  const exceptionWords = normalizeExceptionWords(options.exceptionWords);
  const rules = [
    ...(options.rules ?? DEFAULT_RULES),
    ...(options.customRules ?? [])
  ];
  const matches = rules.flatMap((rule) =>
    collectMatches(text, rule, exceptionWords)
  );
  const nonOverlappingMatches = getNonOverlappingMatches(matches);
  const spelling = nonOverlappingMatches.filter((item) => item.category === "spelling");
  const spacing = nonOverlappingMatches.filter((item) => item.category === "spacing");
  const standardNotation = nonOverlappingMatches.filter(
    (item) => item.category === "standardNotation"
  );
  const unconfirmedWords = options.includeUnconfirmedWords === false
    ? []
    : collectUnconfirmedWords(text, exceptionWords);

  return {
    originalText: text,
    correctedText: applyRules(text, nonOverlappingMatches),
    spelling,
    spacing,
    standardNotation,
    unconfirmedWords,
    exceptionWords: [...exceptionWords],
    hasSuggestions: nonOverlappingMatches.length > 0
  };
}
