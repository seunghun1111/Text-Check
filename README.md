# Korean Text Check Chrome Extension

Manifest V3 기반 한국어 문장 검사 크롬 확장 프로그램 MVP입니다.

## 저장소 목적

이 저장소는 Chrome Extension 기반 한국어 맞춤법·띄어쓰기 검사 도구 개발용 저장소입니다.

사용자가 웹페이지에서 작성 중이거나 선택한 한국어 문장을 빠르게 검사하고, 확실한 오류에 대해서만 수정 제안을 제공하는 것을 목표로 합니다. 로컬 규칙 기반 검사를 기본으로 동작하며, 외부 API가 없어도 핵심 기능을 사용할 수 있도록 설계합니다.

## 우리말샘 API 활용 방향

우리말샘 API는 사용자가 선택한 단어의 사전 등재 여부, 뜻, 품사 확인 용도로 사용됩니다.

API 조회 결과가 없더라도 해당 단어를 오류로 판단하지 않습니다. 개발 용어, 고유명사, 영어, 숫자, 이슈 번호처럼 사전에 없을 수 있는 표현은 기본적으로 미확인 단어 또는 Skip 대상으로 다룹니다.

## 내부 사전 프록시 방식

내부 배포에서는 확장 프로그램에 API 키를 직접 넣지 않고, 별도 백엔드 프록시 서버에서 키를 환경변수로 관리합니다.

```text
Chrome Extension
  -> 내부 사전 프록시 서버
  -> 한국어기초사전 API / 우리말샘 API
```

확장 팝업 하단의 "사전 API 설정" 영역에는 내부 프록시 URL만 입력합니다.

- 내부 사전 프록시 URL: 예) `https://text-check-api.internal`
- 한국어기초사전 API 키: 서버 환경변수 `KRDICT_API_KEY`에 저장
- 우리말샘 API 키: 서버 환경변수 `OPENDICT_API_KEY`에 저장

"조회 사용"을 켠 뒤 "API 설정 저장"을 누르면 확장 프로그램은 프록시 서버를 통해 단어를 조회합니다. 조회 결과가 없거나 실패해도 로컬 규칙 기반 맞춤법·띄어쓰기 검사는 계속 동작합니다.

개발 또는 비상 테스트를 위해 팝업의 "개발용 직접 API 키 입력" 영역도 남겨두었습니다. 프록시 URL이 설정되어 있으면 프록시를 우선 사용합니다.

## 프록시 서버 실행

간단한 내부 프록시 예시는 [backend/proxy-server.js](/Users/han.woo/Desktop/study/Text-Check/backend/proxy-server.js)에 있습니다.

```bash
KRDICT_API_KEY="한국어기초사전_API_키" \
OPENDICT_API_KEY="우리말샘_API_키" \
PORT=8787 \
npm run proxy
```

프록시 서버는 아래 엔드포인트를 제공합니다.

- `GET /health`
- `POST /dictionary/search`

요청 예시:

```json
{
  "word": "사과"
}
```

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
backend/
  proxy-server.js
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
