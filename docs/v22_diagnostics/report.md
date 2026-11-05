# 사주빛 V22 — RC11 09번 중복 근거 비교

V21 원본 기반 진단: 9개 후보, 앞선 구조화 항목 5개와 비교. 원본 생성·선정 로직은 변경하지 않음.

| 후보 | 가까운 기존 항목(문자열 비교) | 3글자 유사도 | 공유 원국 위치 |
|---|---|---:|---|
| 1 (P01-09:officer|wealth:편재|편관) | P01-02 | 0.029 | PILLAR:month:stem:丙, PILLAR:day:branch:戌 |
| 2 (P01-09:officer|resource:편관|정인) | P01-08 | 0.023 | 없음 |
| 3 (P01-09:officer|resource:편관|편인) | P01-08 | 0.034 | PILLAR:year:stem:庚 |
| 4 (P01-09:officer|resource:편관|정인) | P01-08 | 0.023 | PILLAR:day:branch:戌 |
| 5 (P01-09:officer|wealth:편재|정관) | P01-05 | 0.04 | PILLAR:month:stem:丙, PILLAR:hour:branch:丑 |
| 6 (P01-09:resource|wealth:편재|정인) | P01-05 | 0.03 | PILLAR:month:stem:丙 |
| 7 (P01-09:officer|wealth:편관|편재) | P01-05 | 0.05 | PILLAR:month:stem:丙 |
| 8 (P01-09:officer|resource:편인|편관) | P01-08 | 0.034 | PILLAR:year:stem:庚, PILLAR:day:branch:戌 |
| 9 (P01-09:resource|wealth:편인|편재) | P01-05 | 0.05 | PILLAR:month:stem:丙 |

## 주의
- 모든 후보가 SEMANTIC_OVERLAP으로 반려된 사실은 기존 에디터 결과를 재확인한 것. 위 유사도는 진단용 문자열 겹침 정도로, 실제 거절 원인 또는 성격 정확도 점수가 아님.
- 원국 근거의 독립적인 새로운 행동 장면을 확인하기 전까지 RC11 09·10을 강제로 선택하지 않음.
- V21 당시 회귀 실패 4건은 이번 진단만으로 해결되지 않음.
- 실제 AI API 고객용 본문은 검증하지 않음.

## 재실행 결과
- V21 12개 명식 재계산 및 V22 진단: 통과. 전체 선정 119/120, 원고 검토 가능 96/120으로 변동 없음.
- 기존 personality 검증 스크립트 14개: 10개 정상 종료, V6/V8/V13/V15 4개 실패. 자세한 로그는 regression_results.json 참고.
- V19 배포 게이트 스크립트의 exit code 0은 **게이트 진단 실행 성공**을 뜻할 뿐 배포 적합성을 뜻하지 않음.
- 실제 AI API, 원본 천문력 공급자, 전체 TypeScript 타입 검사는 실행하지 않음.
