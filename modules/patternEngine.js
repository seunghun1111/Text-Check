import { BUSINESS_PATTERNS } from "./businessPatterns.js";
import { DOMAIN_TERMS } from "./domainTerms.js";

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function uniqueValues(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function normalizeDomainTerm(term) {
  const normalizedTerm = normalizeText(term.term);
  const preferred = normalizeText(term.preferred) || normalizedTerm;
  const aliases = Array.isArray(term.aliases) ? term.aliases : [];
  const variants = uniqueValues([
    normalizedTerm,
    compactText(normalizedTerm),
    preferred,
    compactText(preferred),
    ...aliases,
    ...aliases.map(compactText)
  ]);

  return {
    id: term.id || `domain-${compactText(normalizedTerm)}`,
    term: normalizedTerm,
    preferred,
    category: term.category || "custom",
    aliases,
    variants
  };
}

export function getDomainTerms(userDomainTerms = []) {
  return [...DOMAIN_TERMS, ...userDomainTerms].map(normalizeDomainTerm);
}

function createRegexRule(pattern) {
  return {
    id: pattern.id,
    category: pattern.category,
    matchType: "regex",
    pattern: pattern.pattern,
    replacement: pattern.replacement,
    wrong: pattern.wrong || pattern.description,
    suggestion: pattern.suggestion || pattern.replacement,
    description: pattern.description,
    source: "businessPattern"
  };
}

function createDomainTermRules(pattern, domainTerms) {
  return domainTerms.flatMap((term) =>
    term.variants
      .filter((variant) => variant !== term.preferred)
      .map((variant) => ({
        id: `${pattern.id}-${term.id}-${compactText(variant)}`,
        category: pattern.category,
        matchType: "literal",
        wrong: variant,
        suggestion: term.preferred,
        description: pattern.description,
        source: "domainTerm",
        domainTermId: term.id
      }))
  );
}

function createDomainSuffixRules(pattern, domainTerms) {
  return domainTerms.flatMap((term) =>
    term.variants.flatMap((variant) =>
      pattern.endings.map((ending) => {
        const wrong = `${variant}${pattern.suffix}${ending}`;
        const suggestion = pattern.replacementTemplate
          .replaceAll("{preferred}", term.preferred)
          .replaceAll("{ending}", ending);

        return {
          id: `${pattern.id}-${term.id}-${compactText(wrong)}`,
          category: pattern.category,
          matchType: "literal",
          wrong,
          suggestion,
          description: pattern.description,
          source: "domainPattern",
          domainTermId: term.id
        };
      })
    )
  );
}

function createRequestPoliteRules(pattern, domainTerms) {
  return domainTerms
    .filter((term) => term.category === "request" || term.preferred.endsWith("요청"))
    .flatMap((term) =>
      term.variants.map((variant) => ({
        id: `${pattern.id}-${term.id}-${compactText(variant)}`,
        category: pattern.category,
        matchType: "literal",
        wrong: `${variant}${pattern.trigger}`,
        suggestion: pattern.replacementTemplate.replaceAll("{preferred}", term.preferred),
        description: pattern.description,
        source: "domainPattern",
        domainTermId: term.id
      }))
    );
}

export function buildBusinessRules(userDomainTerms = []) {
  const domainTerms = getDomainTerms(userDomainTerms);

  return BUSINESS_PATTERNS.flatMap((pattern) => {
    if (pattern.type === "regex") {
      return [createRegexRule(pattern)];
    }

    if (pattern.type === "domainTerm") {
      return createDomainTermRules(pattern, domainTerms);
    }

    if (pattern.type === "domainSuffix") {
      return createDomainSuffixRules(pattern, domainTerms);
    }

    if (pattern.type === "requestPolite") {
      return createRequestPoliteRules(pattern, domainTerms);
    }

    return [];
  });
}

export function getSuggestion(rule, match) {
  if (rule.matchType !== "regex" || !rule.replacement) {
    return rule.suggestion;
  }

  return rule.replacement.replace(/\$(\d+)/g, (_placeholder, index) => {
    return match[Number(index)] ?? "";
  });
}

export function collectRuleMatches(text, rule, exceptionWords) {
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
      suggestion: getSuggestion(rule, match),
      start: match.index,
      end: match.index + original.length
    });
  }

  return matches;
}

export function getNonOverlappingMatches(matches) {
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

export function applyMatches(text, matches) {
  return matches
    .sort((a, b) => b.start - a.start)
    .reduce((currentText, match) => {
      return `${currentText.slice(0, match.start)}${match.suggestion}${currentText.slice(match.end)}`;
    }, text);
}
