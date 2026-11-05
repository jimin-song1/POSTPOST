# 사주빛 V34 — 후보 생성 단계 목표·산출물 구조화

## 변경
- `PersonalityBehaviorHypothesis`에 `actionGoal`, `observableOutput`, `goalOutputEvidence` 추가.
- 생성 단계에서 `extractGoalOutputV34(observableBehavior, trigger)` 호출. 이미 장면에 명시된 결과(완성·역할 합의·비용 합의·진행 순서 설명)만 기록.
- 명시되지 않은 장면에는 목표/산출물 `null` 및 `INSUFFICIENT_SCENE`을 지정. 십성만으로 성공/성과를 추정하지 않음.
- 별도 테스트 `scripts/verify-personality-v34-goal-output.cjs`로 결과를 입증할 수 있는 장면과 모호한 장면의 분기를 검사.

## 실행 검증
- V34 신규 추출 및 소스 계약: 7개 통과.
- V31 장점·부담 연결: 5개 통과.
- V29 행동 중복 계약: 4개 예상과 일치.
- V32 12명식 실험 재생성 스크립트 정상 종료; 기존 선정 엔진은 수정하지 않음.
- V30 게이트 실행: RC11은 09번 legacy, 10번 empty; 전체 기준 119/120 선정, ready 96 (변화 없음).

## 한계 및 후속 작업
- V34는 행동 문구에 적힌 단서를 보수적으로 추출하는 **증거 수집 단계**로, 실제 목표 및 산출물의 인간 검증이나 새로운 성격 가설의 입증을 뜻하지 않음.
- RC11 09번 후보 9개를 자동 승인하지 않음. 10번도 여전히 미선정.
- 과거의 전체 14개 회귀 검사, TypeScript 전체 타입 검사, 실제 AI API 생성 원고는 이번 실행에서 검증하지 않음.
- V35에서는 후보별 근거가 있는 목표와 결과를 데이터 원천에서 직접 생성하고, 01~08 항목과의 목적·산출물 비교를 선정기 테스트에 도입해야 함.
- GitHub/운영 배포 미변경. releaseReady=false.
