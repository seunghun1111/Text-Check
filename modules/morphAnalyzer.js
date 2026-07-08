const KOREAN_EOJEOL_PATTERN = /[가-힣]+/g;

const DEFAULT_MORPHEMES = [
  "가족",
  "돌봄",
  "휴가",
  "특별",
  "신청",
  "수동",
  "생성",
  "요청",
  "확인",
  "단축",
  "재택",
  "근무"
];

const ENDINGS = [
  "중으로",
  "중입니다",
  "중이며",
  "중에는",
  "중에서",
  "중이고",
  "중이라",
  "드립니다",
  "드려요",
  "합니다",
  "해요",
  "으로",
  "에는",
  "에서",
  "에게",
  "입니다",
  "이며",
  "이고",
  "이라",
  "중",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "도",
  "만"
];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function uniqueValues(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function getTermMorphemes(domainTerms = []) {
  return domainTerms.flatMap((term) => {
    return normalizeText(term.preferred).split(/\s+/);
  });
}

function getMorphemeDictionary(domainTerms = []) {
  return uniqueValues([
    ...DEFAULT_MORPHEMES,
    ...getTermMorphemes(domainTerms)
  ]).sort((a, b) => b.length - a.length);
}

function getProtectedCompacts(domainTerms = []) {
  return new Set(
    domainTerms
      .filter((term) => {
        const preferred = normalizeText(term.preferred);
        return preferred && !preferred.includes(" ");
      })
      .flatMap((term) => [
        compactText(term.term),
        compactText(term.preferred),
        ...(term.aliases ?? []).map(compactText)
      ])
      .filter(Boolean)
  );
}

function splitEnding(token) {
  const ending = ENDINGS.find((item) => {
    return token.length > item.length && token.endsWith(item);
  });

  if (!ending) {
    return {
      stem: token,
      ending: ""
    };
  }

  return {
    stem: token.slice(0, -ending.length),
    ending
  };
}

function splitByDictionary(value, dictionary) {
  const parts = [];
  let index = 0;

  while (index < value.length) {
    const match = dictionary.find((word) => value.startsWith(word, index));
    if (!match) {
      return [];
    }

    parts.push(match);
    index += match.length;
  }

  return parts;
}

export function analyzeText(text, options = {}) {
  const dictionary = getMorphemeDictionary(options.domainTerms);
  const protectedCompacts = getProtectedCompacts(options.domainTerms);
  const analyses = [];
  let match;

  while ((match = KOREAN_EOJEOL_PATTERN.exec(text)) !== null) {
    const original = match[0];
    const { stem, ending } = splitEnding(original);
    const isProtectedTerm = protectedCompacts.has(compactText(original)) ||
      protectedCompacts.has(compactText(stem));
    const morphemes = splitByDictionary(stem, dictionary);

    analyses.push({
      original,
      stem,
      ending,
      morphemes,
      start: match.index,
      end: match.index + original.length,
      canSuggestSpacing: !isProtectedTerm &&
        morphemes.length > 1 &&
        compactText(morphemes.join("")) === stem
    });
  }

  return analyses;
}

export function buildMorphologySpacingRules(text, options = {}) {
  return analyzeText(text, options)
    .filter((analysis) => analysis.canSuggestSpacing)
    .map((analysis) => {
    const spacedStem = analysis.morphemes.join(" ");
    const suggestion = analysis.ending
      ? analysis.ending.startsWith("중")
        ? `${spacedStem} ${analysis.ending}`
        : `${spacedStem}${analysis.ending}`
      : spacedStem;

      return {
        id: `morph-spacing-${analysis.start}-${analysis.end}`,
        category: "spacing",
        matchType: "literal",
        wrong: analysis.original,
        suggestion,
        description: "형태소 분석 기반 복합어 띄어쓰기",
        source: "morphAnalyzer"
      };
    })
    .filter((rule) => rule.wrong !== rule.suggestion);
}
