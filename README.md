# Korean Text Check Chrome Extension

Manifest V3 기반 한국어 문장 검사 크롬 확장 프로그램 MVP입니다.

## MVP 기능

- 웹페이지에서 선택한 텍스트 가져오기
- 팝업 UI에서 검사 실행
- 선택 텍스트 우클릭 메뉴에서 검사 실행
- 페이지 위 레이어로 검사 결과 표시
- 로컬 규칙 기반 맞춤법/띄어쓰기 제안
- 수정 제안 및 미확인 단어 표시
- 전체 수정 결과 복사
- 사용자 예외 단어를 Chrome storage에 저장
- 추후 국립국어원 API 연동을 위한 빈 모듈 분리

## 설치

1. Chrome에서 `chrome://extensions`를 엽니다.
2. 우측 상단의 개발자 모드를 켭니다.
3. "압축해제된 확장 프로그램을 로드합니다"를 누릅니다.
4. 이 폴더를 선택합니다.
5. 이미 열려 있던 웹페이지는 새로고침한 뒤 텍스트를 선택하고 우클릭합니다.

## 파일 구조

```text
manifest.json
package.json
background.js
contentScript.js
modules/
  defaultRules.js
  dictionaryApi.js
  ruleChecker.js
  spacingChecker.js
  storage.js
  styleRewriter.js
popup/
  popup.html
  popup.css
  popup.js
```

## 개발 확인

```bash
npm run check
```

## 우클릭 검사

1. 웹페이지에서 텍스트를 블록 지정합니다.
2. 마우스 오른쪽 버튼을 누릅니다.
3. "한국어 맞춤법 검사"를 선택합니다.
4. 페이지 오른쪽 위에 뜨는 레이어에서 결과를 확인하고 수정 결과를 복사합니다.

## 다음 단계 후보

- 키보드 단축키 검사 실행
- input, textarea, contenteditable 원문 교체
- 국립국어원 API 설정 UI 및 조회 모듈 구현
- 변경 부분 하이라이트
- 문체 변환 규칙 추가
