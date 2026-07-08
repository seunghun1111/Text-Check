export const BUSINESS_PATTERNS = [
  {
    id: "business-month-day-spacing",
    category: "spacing",
    type: "regex",
    pattern: "([0-9]{1,2})월\\s*([0-9]{1,2})일",
    replacement: "$1월 $2일",
    description: "날짜 월/일 띄어쓰기"
  },
  {
    id: "business-domain-term-spacing",
    category: "spacing",
    type: "domainTerm",
    description: "업무 복합어 선호 표기"
  },
  {
    id: "business-domain-jung-spacing",
    category: "spacing",
    type: "domainSuffix",
    suffix: "중",
    endings: ["으로", "입니다", "이며", "인", "에", "에는", "이라", "이고", ""],
    replacementTemplate: "{preferred} 중{ending}",
    description: "의존 명사 '중' 띄어쓰기"
  },
  {
    id: "business-request-deurimnida",
    category: "spacing",
    type: "requestPolite",
    trigger: " 드립니다",
    replacementTemplate: "{preferred}드립니다",
    description: "업무 요청 표현 붙여 쓰기"
  }
];
