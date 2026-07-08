export const DEFAULT_RULES = [
  {
    id: "spelling-andeum",
    category: "spelling",
    wrong: "안됌",
    suggestion: "안 됨",
    description: "잘못 줄인 표현"
  },
  {
    id: "spelling-dwaet",
    category: "spelling",
    wrong: "됬",
    suggestion: "됐",
    description: "과거형 표기"
  },
  {
    id: "spacing-joheulgeot",
    category: "spacing",
    wrong: "좋을것",
    suggestion: "좋을 것",
    description: "의존 명사 띄어쓰기"
  },
  {
    id: "spacing-hwaginjom",
    category: "spacing",
    wrong: "확인좀",
    suggestion: "확인 좀",
    description: "보조사/부사성 표현 띄어쓰기"
  },
  {
    id: "spelling-annyeonghaseyo",
    category: "spelling",
    wrong: "안넝하세요",
    suggestion: "안녕하세요",
    description: "인사말 오타"
  },
  {
    id: "spelling-budakgeyo",
    category: "spelling",
    wrong: "부탁드릴께요",
    suggestion: "부탁드릴게요",
    description: "어미 '-게요' 표기"
  },
  {
    id: "spelling-myeochil",
    category: "spelling",
    wrong: "몇일",
    suggestion: "며칠",
    description: "표준어 표기"
  },
  {
    id: "spelling-oraenman",
    category: "spelling",
    wrong: "오랫만",
    suggestion: "오랜만",
    description: "표준어 표기"
  },
  {
    id: "spelling-wenji",
    category: "spelling",
    wrong: "웬지",
    suggestion: "왠지",
    description: "왠지 표기"
  },
  {
    id: "spelling-wenil",
    category: "spelling",
    wrong: "왠일",
    suggestion: "웬일",
    description: "웬/왠 표기"
  },
  {
    id: "spelling-dwaeyo",
    category: "spelling",
    wrong: "되요",
    suggestion: "돼요",
    description: "되/돼 표기"
  },
  {
    id: "spelling-dwaesseoyo",
    category: "spelling",
    wrong: "됬어요",
    suggestion: "됐어요",
    description: "되/돼 과거형 표기"
  },
  {
    id: "spelling-dwaetda",
    category: "spelling",
    wrong: "됬다",
    suggestion: "됐다",
    description: "되/돼 과거형 표기"
  },
  {
    id: "spelling-alkessseumnida",
    category: "spelling",
    wrong: "알겟습니다",
    suggestion: "알겠습니다",
    description: "자주 틀리는 표현"
  },
  {
    id: "spelling-gamsahamnida",
    category: "spelling",
    wrong: "감사함니다",
    suggestion: "감사합니다",
    description: "자주 틀리는 표현"
  },
  {
    id: "spacing-hal-su",
    category: "spacing",
    wrong: "할수",
    suggestion: "할 수",
    description: "의존 명사 띄어쓰기"
  },
  {
    id: "spacing-month-day",
    category: "spacing",
    matchType: "regex",
    pattern: "([0-9]{1,2})월\\s*([0-9]{1,2})일",
    replacement: "$1월 $2일",
    wrong: "월일 날짜",
    suggestion: "월 일 날짜",
    description: "날짜 월/일 띄어쓰기"
  },
  {
    id: "spacing-work-jung",
    category: "spacing",
    matchType: "regex",
    pattern: "([가-힣]+근무)중(으로|입니다|이며|인|에|에는|이라|이고)?",
    replacement: "$1 중$2",
    wrong: "근무중",
    suggestion: "근무 중",
    description: "의존 명사 '중' 띄어쓰기"
  },
  {
    id: "spacing-family-care-leave",
    category: "spacing",
    wrong: "가족돌봄휴가",
    suggestion: "가족 돌봄 휴가",
    description: "복합 명사 띄어쓰기"
  },
  {
    id: "spacing-manual-create-request-polite",
    category: "spacing",
    wrong: "수동생성요청 드립니다",
    suggestion: "수동 생성 요청드립니다",
    description: "업무 표현 띄어쓰기"
  },
  {
    id: "spacing-manual-create-request",
    category: "spacing",
    wrong: "수동생성요청",
    suggestion: "수동 생성 요청",
    description: "복합 명사 띄어쓰기"
  },
  {
    id: "spacing-request-deurimnida",
    category: "spacing",
    wrong: "요청 드립니다",
    suggestion: "요청드립니다",
    description: "업무 표현 붙여 쓰기"
  },
  {
    id: "spacing-doel-su",
    category: "spacing",
    wrong: "될수",
    suggestion: "될 수",
    description: "의존 명사 띄어쓰기"
  },
  {
    id: "spacing-haeya-doeda",
    category: "spacing",
    wrong: "해야된다",
    suggestion: "해야 된다",
    description: "보조 용언 띄어쓰기"
  },
  {
    id: "spacing-haeya-doeyo",
    category: "spacing",
    wrong: "해야되요",
    suggestion: "해야 돼요",
    description: "보조 용언 띄어쓰기와 되/돼 표기"
  },
  {
    id: "spacing-geot-gatseumnida",
    category: "spacing",
    wrong: "것같습니다",
    suggestion: "것 같습니다",
    description: "보조 형용사 띄어쓰기"
  },
  {
    id: "spacing-geot-gatayo",
    category: "spacing",
    wrong: "것같아요",
    suggestion: "것 같아요",
    description: "보조 형용사 띄어쓰기"
  },
  {
    id: "spacing-hwagin-budak",
    category: "spacing",
    wrong: "확인부탁",
    suggestion: "확인 부탁",
    description: "명사구 띄어쓰기"
  },
  {
    id: "standard-fighting",
    category: "standardNotation",
    wrong: "화이팅",
    suggestion: "파이팅",
    description: "외래어 표기"
  }
];
