import { DEFAULT_RULES } from "./defaultRules.js";
import {
  applyMatches,
  buildBusinessRules,
  collectRuleMatches,
  getNonOverlappingMatches
} from "./patternEngine.js";

const TECHNICAL_TOKEN_PATTERN =
  /\b(?:[A-Z]{2,}(?:-[0-9]+)?|[A-Za-z]+[A-Z][A-Za-z0-9]*|[A-Za-z]+[0-9]+[A-Za-z0-9]*|[A-Z]+-[0-9]+)\b/g;

function normalizeExceptionWords(words = []) {
  return new Set(
    words
      .map((word) => String(word).trim())
      .filter(Boolean)
  );
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

export function checkText(text, options = {}) {
  const exceptionWords = normalizeExceptionWords(options.exceptionWords);
  const businessRules = buildBusinessRules(options.userDomainTerms);
  const rules = [
    ...(options.rules ?? DEFAULT_RULES),
    ...businessRules,
    ...(options.customRules ?? [])
  ];
  const matches = rules.flatMap((rule) =>
    collectRuleMatches(text, rule, exceptionWords)
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
    correctedText: applyMatches(text, nonOverlappingMatches),
    spelling,
    spacing,
    standardNotation,
    unconfirmedWords,
    exceptionWords: [...exceptionWords],
    hasSuggestions: nonOverlappingMatches.length > 0
  };
}
