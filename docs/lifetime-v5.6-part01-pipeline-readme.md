# 사주빛 V5.6 PART 01 해석 초안 파이프라인 — 구현 노트

기준: PR #41 HEAD `311b0efa4d8944febd377f70ff714657a8bb2415` (기존 18장 lifetime-report-v2와 분리).

## 개발 범위

1. `personality-candidates.v1.ts` (기존): 원국 위치와 십성 조합을 기반으로 20개 규칙 중 해당 후보 생성 (V5.6 소제목별 복수 후보 확보 시도).
2. `personality-editorial.v1.ts` (신규): 원자료의 위치·파생 지표·명리 증거 ID 확인, 소제목별 후보 비교, 동일 narrativeKey 및 거의 같은 핵심 주장 재사용 차단, 낮은 신뢰도 표시, AI 작성용 요약 생성.
3. `personality-generation.v1.ts` (신규): 기존 deterministic `buildInterpretationInput`으로 사실 목록 확보, 후보 관련 근거만 AI 입력에 전달, 10개 소제목의 JSON 본문 생성 요청. 해당 소제목이 실제 인용한 근거로만 숫자·연도·간지 검증, 내부 플래그·반복 문단을 검수하고 한 번만 재생성. 모든 결과는 `draft_needs_review`로 표시.
4. `personality-openai.v1.ts` (신규): OpenAI Responses API `json_schema` 전송 어댑터. `store: false`, 요청 타임아웃, fetch 테스트 주입 지원.
5. 테스트: 원본 후보 생성 테스트 + 새 편집/생성 테스트.

## 현재 의도적으로 연결하지 않은 범위

- V5.6 고객 UI, 실제 구매·결제 결과, 서비스 `interpretSajuAnalysis()` V2 런타임 자동 교체.
- 성격 '정확도'의 검증. 전통 명리 기반 가설은 과거·행동을 실제로 관찰한 사실이 아님.
- 150페이지를 자동으로 채우는 기능. PART01 빈 항목은 근거 부족 상태로 유지함.
- 과거 양식의 공개된 검증되지 않은 직감력 수치 등을 인용하는 기능.

## 테스트

의존성이 있는 완전한 프로젝트 환경에서 아래 명령을 실행해야 한다.

```bash
npm ci
npm run typecheck
npm test -- tests/personality-candidates.spec.ts tests/personality-editorial.spec.ts tests/personality-generation.spec.ts
npm test
npm run build
```

2026-10-21 재검증: GitHub Actions에서 확보한 npm lockfile 기반 Linux x64 / Node 22.16.0 의존성 공급 파일을 SHA256 확인 후 sandbox에 복원. `npm run typecheck` 성공, V5.6 전용 Vitest **20/20 성공**, 기존 AI/V2/합성코어 회귀 **48/48 성공**, `npm run build` 성공. 전체 테스트 일괄 실행은 sandbox 제한시간에 걸려 최종 합격 여부 미확인. 실제 유료 AI API 요청과 블라인드 독서 평가는 미실시.

## 편집 규칙의 한계

- 후보 순위는 명리 계산 결과나 실제 심리 정확도 점수가 아닌 *내부 편집 휴리스틱*이다. 후보가 하나뿐인 소제목은 SINGLE_CANDIDATE로 표시한다.
- 익명 검사 명식에서는 10개 소제목 중 9개가 복수 후보를 갖지만, 모든 고객에게 같은 수의 후보가 생기는 것은 아니다.
- 반복 검출은 동일 narrativeKey 및 유사 문단 문자열에 한정된다. 자연어 의미의 모든 중복을 찾지는 못한다.
- 숫자·연도·간지와 금지된 플래그를 확인해도, 자연어 속에 숨어 있는 심리적 과장이나 사실 없는 과거 경험을 100% 탐지할 수 없다.
- OpenAI 어댑터는 인터페이스와 요청 모양만 검증했으며 실제 유료 API 호출은 아직 수행하지 않았다.

## 병합 조건

V5.6 성격 10개 해설 블라인드 점검, 복수 명식 교차검증, 동어반복/과잉 해석 검토를 완료하고 기존 V2 기능과 분리된 테스트 및 리뷰가 통과한 뒤 별도 승인하에 병합한다.


## 2026-10-27 조건부 행동 해석 V2 확장

- `personality-behavior.v2.ts`를 추가해 **발생 조건(trigger) → 관찰 가능한 행동 가설(observableBehavior) → 선택 기준(decisionBasis) → 달라질 수 있는 조건(counterCondition)**을 소제목별로 분리한다.
- 실제 월·일·연·시의 천간·지지와 십성 본기 2곳이 있는 경우에만 후보를 만들며, 파생 격국/지장간/합충은 **독립 증거를 증가시키지 않는 내부 맥락**으로 남긴다.
- 행동 후보의 `possibleMotive`는 현재 `null`로 고정한다. 전통적 상징만으로 무의식적 공포·욕망을 진단하지 않는다.
- 편집 단계에서 행동 후보를 기존 십성 조합/범용 위치 비교 후보와 경쟁시키고, 동일 두 근거 조합의 장간 중복 대표 선정을 피한다.
- 글 작성용 Brief로 구조화된 해석을 보내고 고객 본문에서는 명리 설명과 내부 코드를 최소화한다.
- 고객용 JSON 검수에 `dayJiHap`, `behaviorHypothesis`, `PILLAR:`, `NATAL:` 등 내부 변수와 단정적인 민감 분야 예측 패턴을 추가한다.
- 이번 V2는 PART01 독립 `draft_needs_review` 경로에만 연결된다. 운영 결제/기존 V2 보고서 경로, 종합 150페이지 규칙은 변경하지 않는다.
- 별도 실제 API 호출이나 고객 성격 정확도 검증이 없으므로 **사주 심리 예측의 적중률 개선으로 해석해서는 안 된다.**

**검증 참고:** `tests/personality-behavior.v2.spec.ts`와 `tests/personality-generation.spec.ts`에 새 검사 추가.
