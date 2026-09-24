# SAJU ENGINE MASTER SPEC v1.0

이 문서는 프로젝트의 기준 명세다. 사용자가 제공한 MASTER SPEC v1.0의 개발 원칙과 구현 경계를 코드에서 추적하기 위한 요약본이며, 수치·규칙을 임의로 확장하지 않는다.

## 불변 아키텍처

1. 만세력 계산 엔진: 시간·절기·원국·십성·지장간·십이운성·운 계산
2. 명리 판정 엔진: 오행 세력·신강신약·관계·격국·용신·신살·운 점수
3. OpenAI 해석 엔진: 확정된 JSON과 evidence를 설명만 하며 계산·수정 금지

모든 계산은 TypeScript pure function 중심으로 작성한다. 학파별 표와 자체 계수는 `src/rules`에서 버전 관리하며 magic number를 계산 코드에 두지 않는다.

## 현재 구현 범위

- `saju-time-v1`: 현대 한국 법정시각 −30분, 균시차·야자시 미적용
- 양력·한국 출생·출생시간 확인 입력의 년주·월주·일주·시주 알고리즘 계산
- 입춘의 정확한 절입 순간 기준 년주, 12절의 정확한 절입 순간 기준 월주
- 00:00 일주 변경과 오호둔·오서둔 계산
- JPL DE440 절기 provider와 1900-01-07~2099-12-31 출생 지원 범위
- Zod 기반 API runtime validation과 기존 `birthCity` 요청 하위호환
- 전체 `SajuAnalysis` top-level 스키마
- 미구현 모듈의 `not_implemented` 상태와 TODO

SYNTHETIC_CORE_001은 더 이상 production fixture를 반환하지 않는다. `calculatePillars()`가 시간 정규화와 네 개의 pillar pure function을 조합해 같은 결과를 계산한다.

## SAJU CORE MILESTONE 1

### 시간 규칙

법정 출생시각에서 30분을 차감한 보정 날짜·시각을 모든 원국 계산에 사용한다. 균시차와 야자시는 적용하지 않으며 일주는 보정시각 00:00에 바뀐다. `normalizeBirthTime()`과 `getHourBranch()`는 분리되어 있다.

시지는 `[23:00, 01:00)`부터 子로 시작하는 2시간 구간이다. 따라서 입력 09:29는 보정 08:59 辰, 09:30~09:32는 보정 09:00~09:02 巳다. 00:10은 전날 23:40으로 rollover한다.

### 절기 provider

`SolarTermProvider` 계약은 `getSolarTerm(year, term)`, `getPreviousJeol(datetime)`, `getNextJeol(datetime)`를 제공한다. 현재 구현은 [`lunisolar-ephemeris` 0.4.1](https://github.com/william-drakemond/lunisolar-ephemeris)의 JPL DE440 절기 테이블을 사용한다. 해당 데이터는 GB/T 33661-2017의 태양 시황경 정의에 따라 초 단위 절입 순간을 제공하며, 절기 데이터 범위는 1900~2100년이다. 출생 입력 범위는 1900-01-07~2099-12-31로 분리하여 앞뒤 절기를 모두 조회할 수 있게 한다. 1900년 소한은 1900-01-05T18:03:13Z이므로 최초 허용일인 1월 7일은 소한 이후다. 범위 밖이나 찾을 수 없는 경계는 추정하지 않고 오류를 반환한다.

### 년주·월주

년주는 양력 1월 1일이 아니라 해당 연도 입춘의 물리적 순간에 변경된다. 입춘 전은 이전 간지년, 입춘 순간부터는 해당 간지년이다.

월주는 양력 월이나 음력 월을 사용하지 않는다. 입춘 寅, 경칩 卯, 청명 辰, 입하 巳, 망종 午, 소서 未, 입추 申, 백로 酉, 한로 戌, 입동 亥, 대설 子, 소한 丑의 정확한 절입 순간에 변경된다. 월간은 오호둔법으로 계산한다.

### 일주 anchor와 시주

일주 순환 anchor는 MASTER SPEC과 독립 비교에서 확정한 `2024-04-01 = 乙未`다. 홍콩 천문대 2024년 연력의 2024-04-01 乙未 및 2024-04-06 庚子를 독립 기준으로 교차검증한다: https://www.hko.gov.hk/en/gts/astron2024/files/HKO_almanac_2024.pdf . 이 날짜를 선택한 이유는 SYNTHETIC_CORE_001의 확정 입력과 직접 연결되어 회귀 검증이 가능하고, 전후 날짜 및 60일 순환을 간단히 검증할 수 있기 때문이다. 코드는 proleptic Gregorian 날짜의 일수 차이를 계산해 60갑자를 순환한다. 보정된 날짜가 바뀌면 일주도 함께 바뀐다.

시지는 보정시간으로 정하고 시간은 오서둔법으로 계산한다.

### 지원 입력과 미지원 범위

Milestone 1의 원국 계산 대상은 `calendarType=solar`, `birthCountry=KR`, `birthTimeKnown=true`인 1900-01-07~2099-12-31 입력이다. 음력/윤달 조합과 출생시간 미상은 계약과 validation을 유지하지만 원국을 추정하지 않고 `unsupported_input`과 경고를 반환한다. 해외 출생은 도시를 검증한 뒤 422 UNSUPPORTED_BIRTH_COUNTRY로 응답하며 한국 시간 메타데이터를 생성하지 않는다.

## 구현 전 검증이 필요한 TODO

- 음력/윤달 → 양력 변환
- 과거 `Asia/Seoul` 표준시/DST 및 해외 시간대/경도 보정
- 관계·합화 및 충·형·파·해, 격국
- 억부·조후·통관·병약·격국용신 및 종격
- 귀인·신살·삼재
- 대운 시작 datetime, 세운·월운 및 분야별 점수
- OpenAI Responses API 해석 계층, 저장소, 결제

## SYNTHETIC_CORE_001

공개 샘플은 가상인물·가상도시와 2024-04-01 12:34을 사용한다. 이 날짜의 일진은 홍콩 천문대의 독립 연력에 수록된 乙未이며, 시간 경계는 별도 pure unit test로 검증한다. 실제 개인 출생정보는 저장소에 포함하지 않는다.

## Birth Place Rules v1

Canonical 요청은 `birthCountry`(대문자 2자리 국가코드), `birthCityKnown`(boolean), `birthCity`(string | null)를 사용한다.

| 입력 | 처리 |
| --- | --- |
| KR + birthCityKnown=true | 도시 필수, 입력 도시 그대로 사용 |
| KR + birthCityKnown=false | 서울특별시로 대체, 입력 도시는 null 처리 |
| non-KR | 도시 필수, 없으면 HTTP 400, 서울 fallback 금지 |

빈 문자열과 공백만 있는 도시는 null로 정규화한다. 해외 요청에 도시가 있으면 `birthCityKnown`을 true로 정규화한다. 국내 미상 체크와 함께 남은 도시 값은 사용하지 않는다.

기존 `birthCity` 문자열만 있는 요청은 두 새 필드가 **모두 생략**되었을 때만 `birthCountry=KR`, `birthCityKnown=true`로 호환한다. 새 필드를 일부만 보내거나 잘못된 타입으로 보내면 HTTP 400이다. 레거시 요청도 도시가 없으면 오류이며 암묵적으로 서울을 적용하지 않는다. 응답 `birthInput`은 canonical 형태이다.

`birthNormalized.birthPlace`에는 다음 독립적인 해석 결과를 항상 저장한다.

```json
{
  "inputCity": null,
  "resolvedCity": "서울특별시",
  "country": "KR",
  "isEstimated": true,
  "fallbackReason": "birth_place_unknown",
  "fallbackRule": "SEOUL_DEFAULT"
}
```

사용자 도시를 사용하면 `isEstimated=false`, `fallbackReason=null`, `fallbackRule=null`이며 `inputCity`와 `resolvedCity`는 입력 문자열을 보존한다.

UI는 기본 KR 국가 선택, 국내의 '태어난 지역을 모릅니다' 체크박스, 도시 입력을 제공한다. KR 미상일 때 도시 입력을 비활성화하고 '출생지를 모르는 경우 서울 기준으로 계산합니다.'를 표시한다. 해외는 미상 체크박스를 숨기고 도시를 필수로 받는다. 기타 국가는 2자리 국가코드로 입력한다.

서울 fallback 결과는 화면과 JSON warnings에 반드시 **'출생지를 입력하지 않아 서울 기준으로 계산되었습니다.'**를 표시한다. Debug JSON에서도 `birthNormalized.birthPlace`를 확인할 수 있다.

현대 한국 v1 시간규칙은 기존 −30분 보정을 유지하며 도시에 따라 보정값이 달라지지 않는다. 도시별 경도, 해외 시간대 처리는 향후 구현한다. 해외 입력은 출생지를 별도로 보존하고 도시를 필수로 검증하지만, 원국을 계산하지 않고 미구현 경고를 기록한다.

검증: `tests/*.spec.ts`; `npm test`, `npm run typecheck`, `npm run build`.

## CORE MILESTONE 2 — 십성·지장간·십이운성

원국이 계산된 경우에만 세 모듈을 `implemented`로 반환한다. 기존 `SajuAnalysis` 최상위 키를 유지하고 각 `value.ruleVersion`과 `evidence`에 규칙 버전을 기록한다. OpenAI는 계산에 사용하지 않는다.

### 십성 `ten-gods-v1`

일간 대비 대상 천간의 오행 생극 거리(같음 → 내가 생함 → 내가 극함 → 나를 극함 → 나를 생함)와 음양 동일 여부로 10종을 정한다. 각 원국 천간과 각 지장간의 십성을 계산한다. 비견 比肩, 겁재 劫財, 식신 食神, 상관 傷官, 편재 偏財, 정재 正財, 편관 偏官, 정관 正官, 편인 偏印, 정인 正印.

### 지장간 `hidden-stems-v1`

본기(mainQi) / 중기(middleQi) / 여기(residualQi) 순서이며 빈 자리는 `null`이다. 표의 역할 배정은 v1 규칙으로 고정하며 학파별 다른 배정은 별도 버전으로 관리한다.

| 지지 | 본기 | 중기 | 여기 |
| --- | --- | --- | --- |
| 子 | 癸 | — | — |
| 丑 | 己 | 辛 | 癸 |
| 寅 | 甲 | 丙 | 戊 |
| 卯 | 乙 | — | — |
| 辰 | 戊 | 癸 | 乙 |
| 巳 | 丙 | 庚 | 戊 |
| 午 | 丁 | — | 己 |
| 未 | 己 | 乙 | 丁 |
| 申 | 庚 | 壬 | 戊 |
| 酉 | 辛 | — | — |
| 戌 | 戊 | 丁 | 辛 |
| 亥 | 壬 | — | 甲 |

각 지장간은 천간·한글 천간·오행·음양·일간 기준 십성·역할을 가진다. 가중 세력은 아래 Milestone 3 규칙에 따른다.

### 십이운성 `twelve-stages-v1`

순서: 장생 長生 → 목욕 沐浴 → 관대 冠帶 → 건록 建祿 → 제왕 帝旺 → 쇠 衰 → 병 病 → 사 死 → 묘 墓 → 절 絶 → 태 胎 → 양 養. 양간은 지지 순행, 음간은 역행한다.

| 일간 | 甲 | 乙 | 丙 | 丁 | 戊 | 己 | 庚 | 辛 | 壬 | 癸 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 장생 시작 | 亥 | 午 | 寅 | 酉 | 寅 | 酉 | 巳 | 子 | 申 | 卯 |
| 방향 | 순 | 역 | 순 | 역 | 순 | 역 | 순 | 역 | 순 | 역 |

일간 기준으로 년지·월지·일지·시지 각각의 단계를 반환한다. 후속 명리 모듈은 아래 독립된 버전 규칙으로 구현한다.

## CORE MILESTONE 3 — 오행 원국 가중 세력

`five-elements-v1`: `rawCount`는 천간 네 글자와 지지 대표 오행 네 글자만 센다(항상 총 8). 지장간은 개수에 넣지 않는다. `nativeStrength`는 각 원국 기여도의 점수와 백분율을 오행별로 반환한다. `adjustedStrength`는 `not_implemented`이며 통근 재가산, 합충형파해, 합화는 적용하지 않는다. 이 수치는 전통 명리의 공식 수치가 아닌 **POSTPOST 서비스의 custom coefficient**이며 학파별 차이가 있을 수 있다.

`element-weight-v1` 기본 비중: 년간/월간/일간/시간 각 10, 년지/월지/일지/시지 각각 12/24/12/12. 총 100이다. 지지의 비중을 `hidden-stems-v1`의 본기·중기·여기에 분배한다.

| 지장간 수 | 여기 residualQi | 중기 middleQi | 본기 mainQi |
| --- | ---: | ---: | ---: |
| 1 | 0% | 0% | 100% |
| 2 | 25% | 0% | 75% |
| 3 | 10% | 20% | 70% |

`seasonal-element-state-v1` 월지별 旺/相/休/囚/死 표 (목·화·토·금·수 순서). 辰/未/戌/丑은 이 버전에서 토 계절을 사용한다.

| 월지 | 목 | 화 | 토 | 금 | 수 |
| --- | --- | --- | --- | --- | --- |
| 子 | 相 | 死 | 囚 | 休 | 旺 |
| 丑 | 囚 | 休 | 旺 | 相 | 死 |
| 寅 | 旺 | 相 | 死 | 囚 | 休 |
| 卯 | 旺 | 相 | 死 | 囚 | 休 |
| 辰 | 囚 | 休 | 旺 | 相 | 死 |
| 巳 | 休 | 旺 | 相 | 死 | 囚 |
| 午 | 休 | 旺 | 相 | 死 | 囚 |
| 未 | 囚 | 休 | 旺 | 相 | 死 |
| 申 | 死 | 囚 | 休 | 旺 | 相 |
| 酉 | 死 | 囚 | 休 | 旺 | 相 |
| 戌 | 囚 | 休 | 旺 | 相 | 死 |
| 亥 | 相 | 死 | 囚 | 休 | 旺 |

`seasonal-strength-v1` 배율: 旺 1.10, 相 1.05, 休 1.00, 囚 0.95, 死 0.90.

계산식: 각 천간의 기본 기여도 = 해당 천간 비중, 각 지장간의 기본 기여도 = 해당 지지 비중 × 역할별 분배율. **각 기여도에 그 오행의 월지 계절 배율을 곱한 뒤** 오행별로 합산하여 `nativeStrength[element].score`로 저장한다. `percentage = score / 모든 오행 score의 합 × 100`. 원래 기여도, 월령 상태·배율, 최종 기여도를 `fiveElements.evidence`에 모두 보존한다. JS 부동소수 오차 범위에서 백분율 합계는 100%다. 오행 세력은 아직 신강신약의 판정이 아니다.

## CORE MILESTONE 4 — 일간 세력 `strength-v1`

원국 네 기둥과 지장간, `fiveElements.evidence`의 계절 보정 기여도를 사용한다. 아래 점수와 경계값은 전통 명리의 절대 공식이 아니라 **POSTPOST 서비스의 custom interpretation coefficients**다. 다른 서비스의 결과에 맞추어 임의로 바꾸지 않는다. 별도 검증을 거쳐 변경할 때에는 새 규칙 버전을 발행한다. 합충형파해, 합화, 통근 손상은 적용하지 않고 `relationAdjustmentApplied=false`다. 오행 `nativeStrength` 점수를 신강신약 점수에 그대로 더하지 않으며, 통근 점수도 `nativeStrength`에 역으로 더하지 않는다.

`day-master-support-v1`: 오행의 상생 순환 목→화→토→금→수에서 일간과 대상 오행의 거리를 구한다. 관계는 같은 오행 `same`(비겁), 나를 생함 `resource`(인성), 내가 생함 `output`(식상), 내가 극함 `wealth`(재성), 나를 극함 `officer`(관성)이다. `same`과 `resource`는 support, `output`과 `wealth`는 drain, `officer`는 control이다.

| 요소 | `strength-v1`의 운영 정의 | 점수 |
| --- | --- | --- |
| 기준점 | 모든 지원 원국 | +50 |
| 득령 | 월지 본기 오행과 일간의 관계: same / resource / output / wealth / officer | +18 / +14 / −10 / −8 / −18 |
| 득령 여부 | 월령 점수 > 0이면 true | 별도 가점 없음 |
| 보이는 천간 | 일간 본인을 제외한 년간·월간·시간의 십성: 비견·겁재·편인·정인 / 식신·상관·편재·정재 / 편관·정관 | 천간당 +5 / −4 / −6 |
| 득지 | 일지 지장간에 일간과 같은 오행이 하나라도 있으면 true | +5, 없으면 0 |
| 득시 | 시지 본기의 관계가 same 또는 resource이면 true | +3, 아니면 0 |
| 득세 | 년간·월간·시간 및 년지·일지·시지의 `fiveElements.evidence.finalContribution`을 support와 opposition(output·wealth·officer)으로 구분하여 비교. 월지와 일간 본인은 제외 | 차이 > 1이면 +5, 차이 < −1이면 −5, 차이 절댓값 ≤ 1이면 0 |

`rooting-v1`: 네 지지의 모든 지장간에서 일간과 **같은 오행**을 찾는다. 본기 +8, 중기 +5, 여기 +3이며 합계 상한 +20이다. 뿌리마다 원점수와 실제 반영 점수를 함께 저장하고 정해진 년→월→일→시, 본기→중기→여기 순서로 상한을 적용한다. 득지는 일지 뿌리에 대한 작은 +5 보정으로 따로 기록한다. 득시는 시지 본기만 검사한다. 득세는 월령과 별도로 외부 세력을 비교하며 월지 가중치를 재합산하지 않는다.

`score = clamp(50 + 득령 + 세 천간 점수 + capped 통근 + 득지 + 득세 + 득시, 0, 100)`. `evidence`의 `scoreDelta`에는 기준점부터 각 점수, 통근 상한에 따른 실제 점수, 마지막 clamp 차이까지 넣으므로 델타 합이 최종 점수와 일치한다. `support`·`drain`·`control`은 **설명 전용**: 일간 본인을 제외한 세 천간과 네 지지 지장간의 `finalContribution`을 관계별로 집계하며 점수식에 더하지 않는다. `count`는 기여도 항목 수이며 `sources`에서 각각 확인할 수 있다.

| 점수 범위 | level |
| --- | --- |
| 0–14 | 극약 |
| 15–27 | 태약 |
| 28–39 | 신약 |
| 40–49 | 중화신약 |
| 50–59 | 중화신강 |
| 60–72 | 신강 |
| 73–85 | 태강 |
| 86–100 | 극왕 |

지원되지 않는 출생 입력에는 `strength.status=not_implemented`, `score=null`을 반환한다. 계산 가능한 경우만 `implemented`다. 십이운성은 결과로 유지하되 이번 점수식에 별도 계수를 적용하지 않는다.

개인 출생정보 없는 순수 기둥 회귀값 `乙亥 / 乙酉 / 甲子 / 戊辰`은 甲 일간, 酉 월지의 officer(금극목), 득령 −18, 최종 score 49·중화신약으로 나온다. 이 값은 다른 서비스의 판정에 맞추지 않은 `strength-v1` 산출값이다.

## CORE MILESTONE 5 — 원국 관계 존재 탐지

`relations-v1`은 완전한 네 기둥의 **존재 관계만** 찾는다. 천간 `stem-relations-v1`, 지지 `branch-relations-v1`, 형 `punishment-v1` 표를 사용한다. `targetElement`는 관행상 연관 오행에 대한 메타데이터이며 합화의 성립이나 오행 교체를 뜻하지 않는다. 모든 결과의 `transformed=null`, `transformation.status=not_implemented`, `strengthAdjustmentApplied=false`다. 원국의 `fiveElements.nativeStrength`, `fiveElements.adjustedStrength`, `strength`, 지장간과 통근 점수는 변경하지 않는다. 합과 충 등의 경쟁 여부·상쇄·우선순위도 평가하지 않는다.

### 천간 표 `stem-relations-v1`

| 종류 | 조합 | 목표 오행(존재 메타데이터) |
| --- | --- | --- |
| 오합 | 甲己 / 乙庚 / 丙辛 / 丁壬 / 戊癸 | 土 / 金 / 水 / 木 / 火 |
| 충 | 甲庚 / 乙辛 / 丙壬 / 丁癸 | 없음 |

### 지지 표 `branch-relations-v1`

| 종류 | 조합·집합 | 목표 오행(존재 메타데이터) |
| --- | --- | --- |
| 육합 | 子丑 / 寅亥 / 卯戌 / 辰酉 / 巳申 / 午未 | 없음 |
| 삼합 | 申子辰 / 亥卯未 / 寅午戌 / 巳酉丑 | 水 / 木 / 火 / 金 |
| 방합 | 亥子丑 / 寅卯辰 / 巳午未 / 申酉戌 | 水 / 木 / 火 / 金 |
| 충 | 子午 / 丑未 / 寅申 / 卯酉 / 辰戌 / 巳亥 | 없음 |
| 파 | 子酉 / 丑辰 / 寅亥 / 卯午 / 巳申 / 未戌 | 없음 |
| 해 | 子未 / 丑午 / 寅巳 / 卯辰 / 申亥 / 酉戌 | 없음 |
| 원진 | 子未 / 丑午 / 寅酉 / 卯申 / 辰亥 / 巳戌 | 없음 |

### POSTPOST punishment-v1 선택표

형은 학파마다 정의와 의미가 다를 수 있다. 다음은 **POSTPOST punishment-v1 선택표**이며 절대적 전통 정의로 취급하지 않는다.

| 종류 | 규칙 | 출력 |
| --- | --- | --- |
| 삼형 | 寅巳申 / 丑戌未 | 서로 다른 글자 두 개면 partial, 세 개면 complete |
| 상형 | 子卯 | 두 기둥에 하나씩 있으면 complete |
| 자형 | 辰辰 / 午午 / 酉酉 / 亥亥 | 같은 지지가 서로 다른 기둥에 최소 두 번 있어야 complete |

두 지지만 관찰된 삼합·방합·삼형은 `partial=true`, `complete=false`인 **부분 구성 탐지**로 기록한다. 반합 성립 또는 합화 판정은 하지 않는다. 세 글자 모두 있으면 `complete=true`, `partial=false`이며 해당 완성 구성의 부분 결과를 별도로 중복 반환하지 않는다. 같은 글자가 여러 기둥에 있으면 그룹 내 각 글자의 실제 위치 선택마다 별도 결과를 낸다.

각 pair는 순서 없는 두 글자를 **서로 다른 위치 두 곳**에서 한 번만 탐지한다. 같은 조합이 다른 위치 쌍에 있으면 별도 `id`와 `positions`로 유지한다. 자형도 서로 다른 두 위치가 필수다. 삼합·방합·삼형은 `memberPositions`에 각 글자와 기둥의 대응을 저장한다. `present`는 표의 구성 순서이고 `evidence.characters`는 `evidence.positions`의 실제 기둥 순서다. 관계마다 `ruleVersion`·종류·위치·글자·표 규칙을 `evidence`에 남긴다. 동일한 기둥이 육합과 파 등 서로 다른 규칙에 걸리면 두 관계를 모두 반환한다. 형/파/해/원진으로 흉점수나 특정 사건을 추정하지 않는다.
