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

`five-elements-v1`: `rawCount`는 천간 네 글자와 지지 대표 오행 네 글자만 센다(항상 총 8). 지장간은 개수에 넣지 않는다. `nativeStrength`는 각 원국 기여도의 점수와 백분율을 오행별로 반환한다. 후속 `adjustedStrength`는 아래 Milestone 7에서 **별도 파생값**으로 계산한다. nativeStrength에 통근 재가산, 합충형파해, 합화는 적용하지 않는다. 이 수치는 전통 명리의 공식 수치가 아닌 **POSTPOST 서비스의 custom coefficient**이며 학파별 차이가 있을 수 있다.

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

`relations-v1`은 완전한 네 기둥의 **존재 관계만** 찾는다. 천간 `stem-relations-v1`, 지지 `branch-relations-v1`, 형 `punishment-v1` 표를 사용한다. `targetElement`는 관행상 연관 오행에 대한 메타데이터이며 합화의 성립이나 오행 교체를 뜻하지 않는다. 모든 탐지 결과의 `transformed=null`, `strengthAdjustmentApplied=false`다. 원국의 `fiveElements.nativeStrength`, `strength.score`, 지장간과 원래 통근 점수는 변경하지 않는다. 합과 충 등의 경쟁·방해 가능성은 아래 Milestone 6에서 평가하고 그 결과의 별도 파생 세력은 Milestone 7에서 계산한다.

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

## CORE MILESTONE 6 — 합화 조건 및 상호작용 평가

`transformation-v1`은 기존 `relations-v1`의 결과만 후보로 사용하고 관계 자체를 재탐지하지 않는다. 이 점수는 **POSTPOST 서비스의 custom evaluation coefficient**이며 고전 명리의 공식 수치가 아니다. `TRANSFORMED`는 **v1 조건의 충족도가 높다는 평가 상태**일 뿐 원래 천간·지장간·원국 오행 기여도를 삭제했다는 뜻이 아니다. `nativeStrength`, `strength-v1.score`는 그대로 유지하며 별도의 adjustedStrength는 Milestone 7에서 계산한다.

`transformation-v1` 점수 요인:

| 요인 | 판정 | delta |
| --- | --- | ---: |
| 월령 상태 | `seasonal-element-state-v1`의 목표 오행: 旺 / 相 / 休 / 囚 / 死 | +3 / +3 / 0 / −1 / −2 |
| 목표 오행 통근 | 네 지지의 `hidden-stems-v1` 본기·중기·여기 중 하나 이상 | +2, 한 번만 |
| 목표 오행 투간 | 원국 네 천간 중 하나 이상. 합 당사자와 제3자 위치를 별도로 기록 | +1, 한 번만 |
| 인접 | 두 글자 합의 위치가 년–월, 월–일, 일–시 | +1 |
| 생조 | 목표 오행을 생하는 오행의 `fiveElements.nativeStrength.percentage` ≥ 10% | +1 |
| 원래 오행의 강한 뿌리 | 천간합 당사자의 원래 오행이 어느 지지든 본기(mainQi)에 존재 | −1, 후보당 한 번 |

`relation-interaction-v1`에서는 같은 영역(천간끼리 또는 지지끼리)의 **합 후보가 동일 기둥 위치를 공유할 때** 다른 후보마다 `COMPETING` −2를 남긴다. 천간합·육합·삼합·방합 중 완성/부분 구성 모두 합 후보에 포함한다. 후보 하나가 공유하는 충(`STEM_CLASH` 또는 `BRANCH_CLASH`)마다 `BLOCKING` −2를 남긴다. 서로 다른 영역의 동일 기둥 위치만으로는 경쟁이나 충 방해로 처리하지 않는다. 파·해·형·원진은 현재 방해 계수로 사용하지 않는다. 경쟁 후보나 충이 있어도 원래 관계나 후보를 삭제하지 않는다. 삼합·방합의 완전 연속 위치는 `adjacent` 메타데이터로 기록하지만 추가 점수는 주지 않는다.

`score = Σ factors.delta`. 평가의 `evidence`는 factor별 근거와 delta를 보존하며 델타 합이 score와 일치한다. 임계값은 `score ≥ 5` `TRANSFORMED`, `3–4` `PARTIAL`, `0–2` `COMBINATION_ONLY`, `score < 0` `WEAK`다. 삼합·방합의 `partial=true`는 점수가 5 이상이어도 `PARTIAL`로 제한하며 음수라면 `WEAK`를 유지한다. 합 후보가 아닌 충·형·파·해·원진은 `NOT_APPLICABLE`, score 0, factors []로 반환한다. 지원되지 않는 출생 입력의 transformation은 `not_implemented`와 빈 evaluations다.

`branch-combination-target-v1`은 육합에 한해 사용하는 **POSTPOST 선택 목표 오행 표**다. 학파별 차이가 있을 수 있으므로 `relations-v1`의 육합 존재 정보는 수정하지 않고 이 평가에만 사용한다.

| 육합 | 子丑 | 寅亥 | 卯戌 | 辰酉 | 巳申 | 午未 |
| --- | --- | --- | --- | --- | --- | --- |
| 목표 오행 | 土 | 木 | 火 | 金 | 水 | 土 |

각 합 후보에는 `relationId`, 목표 오행, 요인, 경쟁 후보 ID, 방해 관계 ID를 저장한다. `interactions`는 source ID, 상대 ID, `COMPETING`/`BLOCKING`, 적용 delta와 규칙 버전을 별도로 기록한다. 모든 계수·임계값과 위 표를 변경할 때에는 규칙 버전을 올려 재검증한다. 원국 오행 기여도 이동·통근 손상·신강신약 재판정 및 실제 합화 적용은 다음 단계다.

## CORE MILESTONE 7 — 별도 파생 오행 세력 및 충 뿌리 손상

`adjusted-strength-v1`은 원래의 `nativeStrength`와 `strength-v1.score`를 보존하고 별도의 파생 오행 점수만 만든다. `relation-effects-v1`, `transformation-transfer-v1`, `root-damage-v1` 계수는 **POSTPOST 서비스용 custom coefficient**이며 전통 명리의 절대 공식 수치가 아니다. 이후 다수의 합성 사례를 검증할 때 새 버전에서 변경할 수 있다. 원래 천간·지장간을 삭제하거나 원국 기여도를 덮어쓰지 않는다.

`fiveElements.evidence`의 모든 원국 기여도에는 결정적인 ID를 부여한다. 보이는 천간 `stem:year`·`stem:month`·`stem:day`·`stem:hour`, 지장간 `branch:year:hidden:mainQi` 같은 형식이다. 원래 오행·천간·기둥·원국 기여 점수 `nativeContribution`도 각 출처에 남긴다. 지지의 이동 대상은 대표 오행이 아니라 **해당 지지의 모든 지장간 기여도**다.

| `transformation-v1` 상태 | `transformation-transfer-v1` 요청 비율 |
| --- | ---: |
| `TRANSFORMED` | 원래 출처 기여도의 60% |
| `PARTIAL` | 30% |
| `COMBINATION_ONLY`, `WEAK`, `NOT_APPLICABLE` | 0% |

부분 삼합·방합은 평가 상태가 잘못 높게 전달되어도 요청 비율을 최대 30%로 제한한다. 대상이 원래 오행과 같더라도 요청과 실제 이동을 ledger에 남기며 오행 순변화는 0이다. 모든 천간합·육합·삼합·방합의 이동 요청에는 우선순위가 없다.

출처 기여도 `C`가 여러 관계에 들어가면 각 관계의 `requestedAmount = C × 상태별 비율`을 계산한다. `requestedTotal = Σ requestedAmount`, `scale = min(1, C / requestedTotal)`, `actualAmount = requestedAmount × scale`이다. 요청이 없는 출처는 이동하지 않는다. `transferLedger`는 관계 ID, 출처 ID, 상태·비율, 요청·실제량, scale, 남은 출처량, 원래/목표 오행과 근거를 보존한다. 따라서 출처별 전체 실제 이동량은 원래 기여도를 넘지 않는다. 합화가 관측되어도 천간·지장간 자체가 사라지지 않는다.

오행별 `adjustment[element] = Σ 해당 오행으로 이동한 실제량 − Σ 해당 오행에서 이동한 실제량`이며 `adjustedScore = nativeScore + adjustment`, `percentage = adjustedScore / Σ adjustedScore × 100`이다. 같은 오행 안으로의 이동은 ledger에 남지만 오행별 순점수 변화는 0이다. 원칙적으로 `Σ adjustedScore ≈ Σ nativeScore`이고 부동소수 오차만 허용한다. 중간 과정에서 반올림하지 않는다. `evidence`는 각 이동의 from/to delta를 기록하므로 모든 조정 점수를 출처별로 재구성할 수 있다. 표시 단계에서만 반올림한다.

`root-damage-v1`은 일간과 **동일 오행**의 `rooting-v1` 뿌리가 위치한 지지가 `relations-v1` 지지 충에 참여할 때만 사용한다. 본기 충당 25%, 중기 20%, 여기 15%를 뿌리의 원점수(8/5/3)에 적용한다. 동일 뿌리가 여러 충을 겪으면 비율을 더하되 최대 50%로 제한한다. 관계 ID 모두와 남은 원점수를 `rootDamage`에 기록한다. 형·파·해·원진만으로는 손상이 없다. `adjustedRootingScore = min(rooting-v1의 20점 상한, 원래 rawRootScore − 뿌리별 damagedAmount 합)`이다. 이 값과 손상 내역을 `strength.adjustments`에도 기록하고 `adjustedScore`는 `null`로 둔다. 원래 `strength.score`와 `strength.rooting`은 유지한다. 지장간 오행 기여도를 뿌리 손상 때문에 또 깎지 않아 같은 원인을 이중 계산하지 않는다.

## CORE MILESTONE 8 — 월령 기반 격국 분류

`structure-v1`, `standard-structure-v1`, `month-command-v1`, `deok-rok-structure-v1`, `yang-blade-structure-v1`은 **POSTPOST 선택 규칙**이다. 학파별 격국·양인 해석 차이가 있으므로 아래 규칙을 보편적 확정 해석으로 제시하지 않는다. 격국 출처는 원래 월지의 `hidden-stems-v1` 본기와 일간 기준 십성으로 결정한다. 투간·합화 평가·오행 파생 점수·일간 강약은 본기의 원래 십성을 지우거나 기본 격 후보를 바꾸지 않는다.

| 월지 본기 십성 | 기본 격 | 월지 본기 십성 | 기본 격 |
| --- | --- | --- | --- |
| 정관 | 정관격 | 편관 | 편관격 |
| 정재 | 정재격 | 편재 | 편재격 |
| 식신 | 식신격 | 상관 | 상관격 |
| 정인 | 정인격 | 편인 | 편인격 |

비견·겁재 본기를 위 8격으로 변환하지 않는다. 월지 지장간을 본기→중기→여기 순으로 읽으며 본기는 기본 `primary`의 출처다. 투간 검사는 **년간·월간·시간만** 대상으로 하고 일간을 제외한다. 각 지장간마다 동일 천간이 나온 모든 위치와 `exposed`를 기록한다. 기본 격 본기가 투간하면 `ESTABLISHED`, 미투간이면 `UNEXPOSED`로 둔다. 투간하지 않았다는 이유로 기본 격을 버리지 않는다. 투간된 중기·여기 중 8격에 해당하는 것만 `secondary` 후보로 기록하며 본기 우선을 유지한다. 본기와 서로 다른 후보의 중기·여기가 **둘 다 투간**되면 `mixedPatterns`에 표시하고 기본 격 상태는 `MIXED`로 기록한다. 본기가 미투간이면 중기·여기가 투간되어도 기본 격을 교체하거나 `MIXED`로 단정하지 않는다. 본기가 비겁이며 해당 특수 후보도 없으면 `UNRESOLVED`와 `primary=null`이다. 상태에 붙는 `confidence`는 이 분류 근거의 노출 정도이며 상세 성패·품질 점수가 아니다.

`deok-rok-structure-v1`은 기존 `twelve-stages-v1`의 건록지와 일치하는 다음 표를 사용한다.

| 일간 | 甲 | 乙 | 丙 | 丁 | 戊 | 己 | 庚 | 辛 | 壬 | 癸 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 건록 월지 | 寅 | 卯 | 巳 | 午 | 巳 | 午 | 申 | 酉 | 亥 | 子 |

`yang-blade-structure-v1`은 **양간에 한정한 보수적 표**를 사용한다.

| 일간 | 甲 | 丙 | 戊 | 庚 | 壬 |
| --- | --- | --- | --- | --- | --- |
| 양인 월지 | 卯 | 午 | 午 | 酉 | 子 |

음간에는 이 버전의 양인 후보가 없다. 건록·양인은 `specialCandidates`에 기록하고 일반 8격 본기가 없으면 첫 특수 후보를 `primary`로 둔다. 기본 8격 본기와 특수 조건이 동시에 성립하면 기본 격을 `primary`로 유지하고 특수 후보를 함께 기록한다. 예를 들어 戊午의 丁 본기는 정인이므로 정인격을 유지하면서 戊의 午 양인 후보를 별도로 기록한다. 출처/투간/중기 후보/특수 규칙 및 월지에 관련된 합화 평가 상태는 각각 구조화된 `evidence`와 `transformationContext`로 남긴다. `strength` 점수·수준과 `adjustedStrength` 상태는 참고 메타데이터로 연결하지만 격국 결정에는 사용하지 않는다.

순수 합성 기둥 `乙亥 / 乙酉 / 甲子 / 戊辰`의 월지 酉 본기는 **辛 한 개**이며 甲 기준 정관이므로 기본 격은 **정관격**, 辛은 년간·월간·시간에 없으므로 `UNEXPOSED`다. 실제 출생정보는 이 회귀 입력에 포함하지 않는다. 이 단계의 `specialStructure.status`(종격·전왕격·화기격 등)와 `qualityEvaluation.status`(성패·damage·rescue)는 `not_implemented`였으며, 후자는 아래 Milestone 9A에서 별도로 구현한다. 격국용신을 포함한 모든 용신 역시 이번 단계에서 계산하지 않는다.

## CORE MILESTONE 9A — 구조적 상태·손상·구제

`structure-quality-v1`, `structure-interactions-v1`, `structure-rescue-v1`은 **POSTPOST v1 선택 규칙이며 학파별 차이가 존재한다**. 이 품질 점수는 고전 명리의 공식 수치나 좋은/나쁜 사주 판정이 아니라 내부 구조 설명용 계수다. 원래 `structure.primary`·본기·투간 상태는 수정하지 않는다. 건록·양인 및 기본 격 미확정은 `evaluationScope=LIMITED`, `integrity=UNRESOLVED`, `qualityScore=null`로 두며 표준 8격의 공식과 섞지 않는다. 특수격과 용신은 별도 미구현이다.

| 기본 격 | 지원 신호 | 손상 신호 | 혼잡 신호 | 손상이 있을 때만 가능한 구제 신호 |
| --- | --- | --- | --- | --- |
| 정관격 | 정재·편재(재생관), 정인·편인(관인 연결) | 상관(상관견관 후보) | 편관(관살혼잡 후보) | 정인·편인 |
| 편관격 | 식신(식신제살 후보), 정인·편인(살인상생 후보) | 없음 | 정관(관살혼잡 후보) | 없음 |
| 정재격 | 식신·상관(식상생재) | 겁재(full), 비견(weaker) | 없음 | 정관·편관 |
| 편재격 | 식신·상관(식상생재) | 겁재(full), 비견(weaker) | 없음 | 정관·편관 |
| 식신격 | 정재·편재(식신생재) | 편인(효신탈식 후보) | 없음 | 정재·편재 |
| 상관격 | 정재·편재(상관생재) | 정관(상관견관 conflict 후보) | 없음 | 정인·편인 |
| 정인격 | 정관·편관(관살생인) | 정재·편재(재극인 후보) | 없음 | 비견·겁재 |
| 편인격 | 정관·편관(관살생인) | 정재·편재(재극인 후보) | 없음 | 비견·겁재 |

년간·월간·시간의 **보이는 십성만** 신호로 활성화한다. 일간은 제외한다. 월지 중기·여기는 투간됐을 때만 해당 보이는 글자의 출처 역할로 기록하며 **같은 글자를 두 번 합산하지 않는다**. 본기 투간은 별도 +10이나 미투간은 감점이나 손상이 아니다. `structure-v1.mixedPatterns` 중 투간된 다른 구조 및 위 표의 정관·편관 혼잡을 `mixedSignals`로 기록하고 primary는 보존한다. 같은 보이는 글자의 혼잡이 두 경로로 발견되어도 한 번만 센다.

| 항목 | `structure-quality-v1` delta / cap |
| --- | ---: |
| 기준점 | +50 |
| 월지 본기 투간 | +10 |
| 지원 신호 | 각 +8, 합계 최대 +16 |
| 손상 신호 | 각 −12, 합계 최대 −24; 재격 비견은 절반(−6) |
| 구제 신호 | 각 +8, 합계 최대 +16 |
| 혼잡 신호 | 각 −5, 합계 최대 −10 |

`qualityScore = clamp(50 + 본기투간 + capped 지원 + capped 손상 + capped 구제 + capped 혼잡, 0, 100)`. 기준점과 각 적용 delta·상한으로 줄어든 delta·최종 clamp 차이를 `evidence`로 남겨 그 합이 항상 점수와 일치한다. 구제는 해당 격의 손상 십성이 보이는 위치에 실제 존재할 때만 만들고 `rescuesDamageId`로 구체적인 손상 ID에 연결한다. 손상은 구제가 있어도 기록에서 제거하지 않는다. 같은 구제 출처는 최대 한 손상과 연결한다.

무손상+무혼잡+무지원이면 `CLEAN`, 지원만 있으면 `SUPPORTED`, 무손상+혼잡이면 `MIXED`, 손상+유효 구제면 `RESCUED`, 손상만 있으면 `DAMAGED` 순으로 결정한다. 점수가 높다는 이유로 integrity를 뒤집지 않는다. 월지에 연관된 합·충·형·파·해는 `relationContext`에 남기되 점수 가감은 하지 않는다. 합화 후보 상태, `strength-v1.score`, 파생 오행 점수도 qualityScore에 가산하거나 primary를 교체하는 근거로 사용하지 않는다. 제한 평가 `UNRESOLVED`는 이 표준 8격 상태 순서 밖이다. 특수격은 Milestone 9B, 독립 용신 엔진은 Milestone 10에서만 다룬다.

순수 합성 기둥 `乙亥 / 乙酉 / 甲子 / 戊辰`은 정관격 본기가 미투간(`UNEXPOSED`)이고, 시간 戊의 편재가 지원 신호로 한 번 기록된다. 손상·구제 신호는 없으므로 `integrity=SUPPORTED`, `qualityScore=58`(기준 50 + 지원 8)이다. 이 결과는 개인 출생 입력이나 외부 서비스 판정을 사용하지 않는다.

## CORE MILESTONE 9B — Conservative Special Structure Engine v1

**POSTPOST의 보수적 후보 탐지 규칙**이다. 학파 간 차이가 큰 특수격의 확정 판정이나 보편적 기준이 아니다. `src/rules/special-structure.v1.ts`의 `special-structure-v1`, `follow-structure-v1`, `dominant-structure-v1`, `transformed-qi-structure-v1`가 모든 임계값과 점수 계수를 관리한다.

`structure.specialStructure`는 지원되는 입력에서 `status=implemented`, `selected=null`, `standardStructurePreserved=true`다. 종재·종관살·종아/종식상·전왕/전강을 각각 평가한다. 화기는 일간이 참여한 천간합 관계마다 별도 후보를 남기고, 참여 관계가 없으면 `NOT_APPLICABLE` 후보 한 개를 남긴다. `primary`, `secondary`, 기존 건록·양인 `specialCandidates`, `qualityEvaluation`을 교체하지 않는다. 입력이 불완전하여 선행 계산이 없으면 특수격도 `not_implemented`, 빈 후보 목록을 유지한다.

각 후보는 `type`, 후보형 한글 `label`, 하위 `ruleVersion`, `state`, `confidence`, `score`, `requirements`, `requirementsPassed`, `requirementsFailed`, `blockers`, `evidence`, `metadata`를 제공한다. requirements에는 실제 값, 기준값, 비교 연산, 통과 여부, 중대한 실패 여부(`critical`)를 기록한다. blocker는 모두 보존하며 `HARD` 또는 `BOUNDARY`와 출처를 기록한다. `confidence`는 후보 조건 충족 정도(HIGH/MEDIUM/LOW)이며 특수격의 확정 확률이 아니다.

### 독립 factor와 지원의 정의

- `strength-v1.score`, 원래 통근, `root-damage-v1`의 남은 개별 뿌리, `strength.adjustments.adjustedRootingScore`, 조정 오행 백분율을 독립 factor로 읽는다. 합산하여 새로운 adjusted 신강신약 점수를 만들지 않는다.
- 직접 evaluator 호출에서 합산 adjustedRootingScore가 아직 연결되지 않았다면 기존 root-damage 결과의 남은 점수를 원래 rooting cap으로 제한해 사용한다. 합화나 root damage 조건을 새로 평가하지 않는다. 손상 행이 없는 뿌리는 원래 점수를 유지한다.
- 남은 개별 뿌리 점수 **5 이상**을 strong root로 본다. 종격·화기는 합산 adjustedRootingScore **3 이하**, strong root 없음이 필수다. 원래 root가 손상되면 원래 점수만으로 탈락시키지 않는다.
- 투간 지원은 일간을 제외한 **년간·월간·시간**이다. 같은 지원 범주의 오행이 조정 세력 **10% 이상**이면서 한 글자 이상 보이거나, **동일 지원 범주가 2개 이상** 보이면 강한 비겁/인성 지원이다. 단일 약한 지원 글자는 자동 탈락시키지 않는다.
- 월령은 기존 seasonal-element-state-v1의 target 旺/相을 점수 근거로 사용한다. 월령 지지가 있다는 것만으로 후보 자격을 부여하지 않는다.
- `UPSTREAM_CONTEXT` evidence에 원래 strength/rooting, 조정 rooting, 원래·조정 오행, visible 십성, 월령, transformation-v1 결과를 보존한다. nativeStrength는 adjustedStrength에 보존된 nativeScore와 그 합으로 복원한 동일 백분율이다. 입력 객체를 수정하지 않는다.

### 종격 공통 및 유형별 hard requirements

모든 종격 후보는 **strength ≤27**, **adjusted rooting ≤3**, **strong root 없음**, **강한 투간 비겁/인성 없음**, **same+resource ≤20%**, **단일 반대 방향 편중**이 필요하다. 재·관살·식상 중 **25% 이상인 범주가 2개 이상**이면 경쟁 세력이므로 탈락한다. 인성 **20% 이상**도 별도 blocker다.

| 후보 | 추가 필수 dominance | 특이사항 |
| --- | --- | --- |
| FOLLOW_WEALTH / 종재 후보 | 재성 adjusted percentage ≥50% | 강한 비겁 지원은 재성 방해로도 작용하므로 공통 blocker 적용 |
| FOLLOW_OFFICER / 종관살 후보 | 관살 adjusted percentage ≥50% | 년·월·시간의 정관/편관 혼재와 각 신호를 metadata에 기록; 혼재 자체는 탈락 사유 아님 |
| FOLLOW_OUTPUT / 종아·종식상 후보 | 식상 adjusted percentage ≥50% | 강한 편인/정인 투간 및 인성 우세는 blocker |

다른 조건을 모두 만족하고 target이 **45% 이상 50% 미만**인 단일 경계 실패이면 `CONDITIONAL`. 45% 미만 또는 다른 중요한 조건 실패·hard blocker이면 `REJECTED`다. 점수로 실패를 상쇄할 수 없다.

### 전왕·전강 후보

`DOMINANT_SELF`는 **strength ≥73**, **same+resource ≥70%**가 필수다. 적격은 **strength ≥86**이거나, **adjusted rooting ≥12 및 강한 visible 지원 1개 이상**을 함께 만족해야 한다. 후자의 보강조건만 부족하면 `CONDITIONAL`이다.

관살·재성·식상의 실제 조정 비율이 각 **20% 이상**이면 해당 범주의 hard blocker, **10% 이상 20% 미만**이면 boundary blocker다. 10% 이상인 반대 범주가 **2개 이상**이면 hard blocker다. 단순히 반대 글자가 있다는 이유로 탈락시키지 않는다.

### 화기 후보

일간이 실제 탐지된 천간 오합의 당사자이고, **동일 relationId의 transformation-v1 평가가 TRANSFORMED**여야 한다. 기존 평가의 targetElement를 그대로 읽는다. 甲己→土, 乙庚→金, 丙辛→水, 丁壬→木, 戊癸→火 관계를 재탐지하거나 합화 성립 조건을 재계산하지 않는다. 참여 합이 있으나 COMBINATION_ONLY/PARTIAL/WEAK 또는 평가가 없으면 `REJECTED`다.

target 조정 비율 **≥45%**, 오행 중 **단독 1위**, 나머지 오행 최대치보다 **≥10 percentage points**, adjusted rooting **≤3**, 원래 오행의 남은 strong root 없음이 필수다. target **40~45% 미만** 또는 margin **5~10pp 미만**은 각각 경계 실패이며, 둘 다 실패하면 `REJECTED`다. competition/blocking의 고유 관련 relationId가 **1개**면 boundary blocker, **2개 이상**이면 hard blocker다. 한 일간의 여러 합을 합쳐 유리한 상태 하나로 덮어쓰지 않는다.

### 전체 blocker 및 상태·점수 재구성

- 종격 공통: `STRONG_DAYMASTER_ROOT`, `VISIBLE_COMPANION_SUPPORT`, `VISIBLE_RESOURCE_SUPPORT`, `RESOURCE_DOMINANCE`, `ADJUSTED_ROOTING_TOO_HIGH`, `MULTIPLE_COMPETING_DOMINANCES`.
- 전왕: `STRONG_OFFICER_OPPOSITION`, `STRONG_WEALTH_OPPOSITION`, `STRONG_OUTPUT_OPPOSITION`, `MULTIPLE_OPPOSITION_CATEGORIES`.
- 화기: `STRONG_DAYMASTER_ROOT`, `ADJUSTED_ROOTING_TOO_HIGH`, `TRANSFORMATION_COMPETITION_OR_BLOCKING`.

판정 순서는 비적용→중대한 실패/hard blocker→경계→적격이다. `NOT_APPLICABLE`을 제외하고, critical requirement 실패나 hard blocker 또는 2개 이상의 requirement 실패는 `REJECTED`; 그 외 실패 1개 또는 boundary blocker가 있으면 `CONDITIONAL`; 모든 requirement 통과와 blocker 없음이면 `QUALIFIED_CANDIDATE`다.

점수는 baseline **0**, 통과 requirement **+2**, 실패 requirement **−4**, hard blocker **−4**, boundary blocker **−2**, 월령 target 旺/相 **+2**의 합이다. 모든 delta를 evidence에 남기며 별도 clamp는 없다. 진단 점수이므로 음수가 가능하고 `NOT_APPLICABLE`에도 근거를 남긴다. 중복된 requirement/blocker 감점도 설명용 계수이며, **자격 판정은 점수와 독립**이다.

### 검증과 후속 범위

synthetic 기둥 기반 통합검사와 선행 계산값을 명시적으로 조절한 경계 unit fixture를 구분한다. 후자는 실제 원국에서 그 조합이 반드시 발생한다는 주장이 아니다. 극약+strong root, 세 종격 target 60%, strength 35, 지원 30%, 극왕+지원 80%, 반대세력, 단순 합/성립 합/원래 뿌리/경쟁, threshold 경계, 복수 일간합, 원본 불변성, 결정론, evidence 재구성, 엔진 상태를 검사한다. 실제 개인정보는 사용하지 않는다.

순수 `乙亥 / 乙酉 / 甲子 / 戊辰`은 **49 / 중화신약**, **정관격 / UNEXPOSED**, **SUPPORTED / 58**을 유지한다. 종재·종관살·종아 후보는 모두 `REJECTED`, 전왕/전강도 `REJECTED`, 일간의 천간합이 없으므로 화기는 `NOT_APPLICABLE`, selected는 null이다.

`usefulGods.status=not_implemented`를 유지한다. 이 단계에서는 최종 adjusted 신강신약을 계산하지 않았으며, 이는 아래 Milestone 9C에서 별도 축으로 구현한다. 용신·희신·기신, 신살, 운 작용, AI 해석은 계산하지 않는다. 후속은 10A 억부, 10B 조후, 10C 통관, 10D 병약, 10E 격국용신의 독립 모듈이며, 11 Useful-God Synthesis에서만 primary/secondary/favorable/conditional/unfavorable을 합성한다.

## CORE MILESTONE 9C — Adjusted Day-Master Strength v1

`adjusted-daymaster-strength-v1`과 `adjusted-strength-evaluation-v1`은 **POSTPOST custom adjustment model**이다. 관계 적용 후 일간 강약은 `strength.adjusted`에 별도로 저장하고, 원래 `strength-v1`의 `score`, `level`, evidence를 덮어쓰지 않는다. `fiveElements.nativeStrength`, `fiveElements.adjustedStrength`, `rootDamage`, `adjustedRootingScore`, 구조 및 특수격 후보도 입력 그대로 보존한다.

계산식은 다음과 같다.

`adjustedScore = clamp(originalScore + rootingDelta + elementBalanceDelta, 0, 100)`

- `rootingDelta = adjustedRootingScore - originalRootingScore`. 원래 strength 점수에 통근이 이미 포함되어 있으므로 손실량에 별도 계수를 곱하지 않고 정확히 한 번만 반영한다.
- 일간의 same·resource 오행 백분율 합을 support, output·wealth·officer 합을 opposition으로 분류한다. nativeStrength와 adjustedStrength 각각에서 `balance = support - opposition`을 구한다.
- `balanceDelta = adjustedBalance - nativeBalance`, `uncappedElementBalanceDelta = balanceDelta / 5`다. 5 percentage points당 strength 1점이며, element delta만 **−10~+10점**으로 제한한다.
- root delta와 element delta를 합한 뒤 전체 점수를 0~100으로 제한한다. 내부 소수는 반올림하지 않는다.

실제 contribution 이동은 `adjustedStrength-v1` 결과만 읽는다. `TRANSFORMED`, `PARTIAL`, `COMBINATION_ONLY` 같은 상태에 직접 점수를 주지 않는다. 충·형·파·해·원진에도 직접 가감하지 않는다. 충이 만든 뿌리 손상은 upstream `adjustedRootingScore` 차이로만 반영하므로 이중감점하지 않는다. `specialStructure` 상태 역시 공식 입력이 아니다.

`strength.adjusted`는 `status`, 두 rule version, `originalScore`, `originalLevel`, 조정 `score`, `level`, `deltas`, `evidence`를 제공한다. evidence는 원래 점수, 통근 조정, native/adjusted support·opposition·balance와 cap 전후 element delta, 필요한 최종 clamp를 기록한다. `originalScore + evidence의 모든 delta`로 최종 점수를 완전히 재구성할 수 있다. level은 별도 threshold를 만들지 않고 `strength-v1`의 기존 0/15/28/40/50/60/73/86 경계를 raw 소수 점수에 그대로 적용한다.

선행 강약·통근·native/adjusted 오행 계산이 없는 입력은 `strength.adjusted.status=not_implemented`이며 null 점수와 빈 evidence를 반환한다. 이 단계에서는 `usefulGods.status`가 `not_implemented`였으며 아래 Milestone 10A부터 독립 용신 모듈을 추가한다.

synthetic 검증은 관계 변화 없음, 8→6 뿌리 손실, balance ±10%p, 동시 조정, element cap, 전체 0/100 clamp, 49→50 및 60→59 경계, 모든 level 경계, COMBINATION_ONLY와 순변화 없는 TRANSFORMED, 충 이중감점 방지, 특수격 독립성, evidence 재구성, 결정론 및 엔진 통합을 포함한다.

순수 `乙亥 / 乙酉 / 甲子 / 戊辰`은 원래 **49 / 중화신약**을 보존한다. 뿌리 손실은 0이고, 실제 PARTIAL 관계 이동으로 element balance delta가 **−0.43135297054418376**이므로 조정 결과는 **48.56864702945582 / 중화신약**이다. 외부 서비스 판정에 맞추기 위해 계수를 바꾸지 않는다.

억부·조후·통관·병약·격국용신, 희신·기신, 신살, 운세, AI 해석은 이 milestone에서 계산하지 않는다.

## CORE MILESTONE 10A — Eokbu Useful-God Engine v1

`eokbu-useful-god-v1`과 `eokbu-element-preference-v1`은 **POSTPOST 억부 v1 선택 규칙**이다. 고전 전체나 특정 학파의 절대 점수표가 아니며 외부 서비스 결과에 맞추어 조정하지 않는다. 억부는 다섯 오행 각각을 평가하고 조후·통관·병약·격국용신을 섞지 않는다.

강약 입력은 `strength.adjusted`가 implemented이면 그 raw 소수 `score/level`을 우선하고, 없을 때만 원래 `strength.score/level`로 fallback한다. 결과의 `strengthSource`에 `adjusted` 또는 `original`을 기록한다. 오행 현재 비율은 합화 이동을 반영한 `fiveElements.adjustedStrength`만 사용한다.

### Zone별 관계 base table

| 강약 | same | resource | output | wealth | officer |
| --- | ---: | ---: | ---: | ---: | ---: |
| 극약 | +30 | +35 | −25 | −30 | −35 |
| 태약 | +25 | +30 | −18 | −22 | −28 |
| 신약 | +20 | +24 | −10 | −14 | −18 |
| 중화신약 | +12 | +15 | −3 | −5 | −8 |
| 중화신강 | −5 | −8 | +8 | +10 | +12 |
| 신강 | −15 | −18 | +18 | +22 | +24 |
| 태강 | −25 | −28 | +25 | +30 | +32 |
| 극왕 | −30 | −35 | +30 | +35 | +38 |

same은 비겁, resource는 인성, output은 식상, wealth는 재성, officer는 관성이다. 약한 zone에서 resource를 same보다 약간 높게 둔 것은 POSTPOST v1의 선택이며 보편적 절대법칙이 아니다. 강한 zone에서는 설기·소모·제어를 구분한다. 극왕도 다섯 오행 점수를 설명용으로 계산하지만, 적격 특수격 후보가 있으면 일반 억부를 최종 결론으로 확정하지 않는다.

### 부족·과다 보조 계수

base가 양수인 필요한 오행은 adjusted percentage가 **10% 미만 +8**, **10% 이상 20% 미만 +4**, **20~35% 0**, **35% 초과 −4**다. 따라서 없는 오행도 관계 base가 불리하면 부족 가점을 받지 않는다. 필요한 오행이 풍부해도 −4의 완화만 적용하여 자동 금지하지 않는다.

base가 음수인 부담 오행은 **10% 미만 0**, **10% 이상 20% 미만 −2**, **20~35% −4**, **35% 초과 −8**이다. 이는 이미 많은 부담 오행을 추가로 낮추는 excess factor다. 각 행의 `baseScore + scarcityAdjustment + excessAdjustment + specialStructureAdjustment(항상 0) = finalScore`이며 evidence delta 합으로 재구성할 수 있다.

역할 경계는 **25 이상 PRIMARY**, **15~25 미만 SUPPORTIVE**, **5~15 미만 CONDITIONAL**, **−4~5 미만 NEUTRAL**, **−4 미만 UNFAVORABLE**이다. PRIMARY는 0개 또는 여러 개일 수 있다. 결과는 finalScore 내림차순이며 동점은 木→火→土→金→水 순으로 고정한다.

`QUALIFIED_CANDIDATE` 특수격이 하나라도 있으면 `applicability=CAUTION_SPECIAL_STRUCTURE`, `conditional=true`, `confidence=LOW`로 기록하고 해당 후보를 evidence에 남긴다. 오행별 `specialStructureAdjustment`는 계속 0이므로 후보가 억부 점수를 뒤집거나 계산을 삭제하지 않는다. 적격 후보가 없으면 `STANDARD`, `conditional=false`, `confidence=MEDIUM`이다.

지원되는 입력의 `usefulGods.status`는 `partial`, `eokbu.status`는 `implemented`다. `johu`, `tonggwan`, `byeongyak`, `structure`, `synthesis`는 각각 `not_implemented`다. 한자 천간 선호, 최종 단일 용신, 희신·기신, 신살, 운세, AI 해석은 계산하지 않는다.

순수 `乙亥 / 乙酉 / 甲子 / 戊辰`은 adjusted **48.56864702945582 / 중화신약**을 사용한다. 조정 오행 비율은 木 29.60159760359461%, 火 0%, 土 15.856215676485268%, 金 29.955067398901647%, 水 24.587119321018474%다. 결과는 水 +15 SUPPORTIVE, 木 +12 CONDITIONAL, 火 −3 NEUTRAL, 土 −7 UNFAVORABLE, 金 −12 UNFAVORABLE이다. PRIMARY는 없으며 외부의 금 용신 판정에 맞추지 않는다.

synthetic 검증은 8개 강약 zone, 모든 일간 오행의 5관계 mapping, 부족·과다, 불리한 결핍 오행, 필요한 풍부 오행, 특수격 caution, 역할 경계, 동점 정렬, adjusted 우선과 original fallback, evidence 합계, 결정론, 엔진 partial 상태를 포함한다. 실제 개인정보는 사용하지 않는다.

## CORE MILESTONE 10B — Johu Useful-God Engine v1

`johu-useful-god-v1`, `johu-qiongtong-v1`, `johu-condition-v1`은 《窮通寶鑑》/《欄江網》 계열의 일간×절기 월령 조후 문맥을 천간 수준으로 구조화한 POSTPOST 규칙이다. 출처·120칸 우선순위·편집 원칙은 [JOHU_RULE_SOURCE.md](JOHU_RULE_SOURCE.md)에 기록한다. 예언·질병·수명·빈부·신분·성별 판단은 저장하거나 사용자 해석에 전달하지 않는다.

lookup key는 계산된 `dayStem`과 절기 `monthBranch`다. Gregorian month와 음력 달 번호는 사용하지 않는다. 10천간×12월지의 **120 cells**가 정확히 존재하며 runtime fallback은 없다. 모듈 로드와 테스트에서 cell 수, 중복 key, 일간별 12개월, 유효 천간, rank 중복, source section 및 condition/blocker 참조를 검증한다.

각 cell은 천간별 rank/role, 조건부 override, blocker context, climateTags, explicit urgency, source section/note/curationVersion과 선택적 curationNote를 가진다. role 점수는 PRIMARY 30, SECONDARY 20, SUPPORTING 10, OPTIONAL 5, AVOID −15다. availability는 VISIBLE/HIDDEN/ABSENT 및 위치·지장간 역할·일간 자체 여부·합화 관계 context를 기록하되 preference를 가감하지 않는다.

조건은 기본 순위를 별도 보존한 뒤 실제 명식이 일치할 때만 override 또는 delta를 적용한다. v1의 `甲+酉`는 기본 丁→丙→庚이며, 완전한 木局과 visible companion이 함께 있으면 원문 문맥대로 庚→丁으로 교체한다. adjusted water 35% 이상의 명시 blocker는 丁·丙의 방해 context를 evidence에 남기되 필요도와 점수를 삭제하지 않는다. adjustedStrength와 relations는 조건 context에만 사용한다.

오행 집계는 천간 결과 이후에 수행한다. 같은 오행 점수를 내림차순으로 정렬하고 `1.0, 0.5, 0.25, 0.125`를 곱해 합한다. 甲+酉 기본 결과는 丁 +30 PRIMARY, 丙 +20 SECONDARY, 庚 +10 SUPPORTING이며 火 40, 金 10이다.

`usefulGods.status=partial`, `eokbu.status=implemented`, `johu.status=implemented`다. `tonggwan`, `byeongyak`, `structure`, `synthesis`는 `not_implemented`다. eokbu와 johu는 서로 입력으로 쓰거나 덮어쓰지 않으며 최종 천간 선호·단일 용신·희신/기신을 결정하지 않는다.

순수 `乙亥 / 乙酉 / 甲子 / 戊辰`은 甲+酉 cell을 사용한다. 10A는 水 +15 SUPPORTIVE, 木 +12 CONDITIONAL, 火 −3 NEUTRAL, 土 −7·金 −12 UNFAVORABLE이며 PRIMARY가 없다. 10B는 丁 30, 丙 20, 庚 10과 火 40·金 10이다. 두 독립 결과의 방향이 달라도 정상이며 어느 쪽도 다른 쪽을 수정하지 않는다.

## CORE MILESTONE 10C — Tonggwan Useful-God Engine v1

`tonggwan-useful-god-v1`, `tonggwan-conflict-v1`, `tonggwan-bridge-v1`은 **POSTPOST 통관 v1 operational rule**이다. 아래 threshold와 coefficient는 고전 명리의 고정 공식 수치가 아니라, 오행 세력의 실제 대립과 중간 생 흐름의 부족을 결정론적으로 표현하기 위한 versioned 운영 계수다. 억부·조후 점수와 합산하지 않으며 최종 용신을 결정하지 않는다.

극 관계와 bridge는 evaluator의 분산된 조건문이 아니라 `TONGGWAN_BRIDGE_TABLE` 한 곳에 저장한다: 木→土는 火, 土→水는 金, 水→火는 木, 火→金은 土, 金→木은 水다. 우선 `fiveElements.adjustedStrength`를 사용하고, 사용할 수 없을 때만 `nativeStrength`로 fallback한다. rawCount는 사용하지 않는다.

각 controller/controlled가 모두 20% 이상이고 합이 50% 이상일 때 balance ratio `min/max`를 평가한다. ratio 0.50 이상은 `STRONG_CONFLICT`, 0.35 이상 0.50 미만은 `CONDITIONAL_CONFLICT`다. 한쪽이 20% 미만이거나 ratio 0.35 미만이면 `ONE_SIDED`, 양쪽 모두 20% 미만이면 `WEAK`, 양쪽이 20% 이상이어도 합이 50% 미만이면 `NOT_APPLICABLE`이다. v1은 “약간 미달”에 별도 추정 보너스를 만들지 않는다.

STRONG은 +25, CONDITIONAL은 +15다. bridge가 10% 미만이면 +10/HIGH, 10% 이상 20% 미만이면 +5/MEDIUM, 20% 이상 30% 미만이면 0/PRESENT, 30% 이상이면 −15/ALREADY_SUFFICIENT다. 35% 이상은 excessive metadata로도 표시한다. 최종 score 30 이상은 PRIMARY_BRIDGE, 20~29는 STRONG_BRIDGE, 10~19는 CONDITIONAL_BRIDGE, 1~9는 LOW_NEED, 0 이하는 NOT_NEEDED다.

다섯 conflict를 모두 평가하고 qualifying conflict를 모두 유지한다. 후보 정렬은 score 내림차순, combined percentage 내림차순, balance ratio 내림차순, canonical element order 순이다. 같은 bridge가 확장 규칙에서 중복되면 `elementPreferences`는 합산하지 않고 최대 score를 사용한다. 천간충·지지충·형·파·해는 context evidence에만 저장하며 점수를 바꾸거나 적용성을 만들지 않는다. `QUALIFIED_CANDIDATE` 특수격이 있으면 계산은 유지하고 `applicabilityCaution=true`, `confidence=LOW`만 기록한다.

충돌 조건이 없으면 `status=implemented`, `applicability=NOT_APPLICABLE`, `conflicts=[]`, `rankedCandidates=[]`, `elementPreferences=[]`가 정상 결과다. 지원되는 입력은 `eokbu`, `johu`, `tonggwan`이 각각 `implemented`이고 `byeongyak`, `structure`, `synthesis`는 계속 `not_implemented`다.

순수 `乙亥 / 乙酉 / 甲子 / 戊辰`의 adjusted 분포에서는 金 29.955067398901647%와 木 29.60159760359461%가 합 59.55666500249626%, balance ratio 약 0.9882의 `STRONG_CONFLICT`를 이룬다. bridge는 水 24.587119321018474%로 PRESENT이며 score는 25, state/applicability는 `APPLICABLE`, role은 `STRONG_BRIDGE`다. 다른 네 극 관계는 hard requirements를 충족하지 않으므로 후보로 만들지 않는다.

## CORE MILESTONE 10D — Byeongyak Useful-God Engine v1

`byeongyak-useful-god-v1`, `byeongyak-disease-v1`, `byeongyak-medicine-v1`은 **POSTPOST 병약 v1 operational rule**이다. 수치와 threshold는 고전 명리의 절대 공식이 아니라 실제 구조 손상과 조정 오행 과다를 보수적으로 탐지하기 위한 versioned 운영 규칙이다. 병 탐지→severity→medicine mapping→medicine need→candidate ranking 순서를 강제하며 오행 부족에서 약을 역추론하지 않는다.

v1의 disease는 `STRUCTURE_DAMAGE`와 `DOMINANT_ELEMENT_EXCESS` 둘뿐이다. 구조병은 `structure.qualityEvaluation.damageSignals`를 그대로 사용하며 손상을 재판정하지 않는다. 연결된 `rescueSignals.rescuesDamageId`가 있으면 병 기록을 유지한 채 `ALREADY_RESCUED`, severity 10으로 두고, 없으면 `ACTIVE`, severity 30이다. 구조별 medicine은 `STRUCTURE_INTERACTIONS_V1.standard[type].rescue`를 source-of-truth로 재사용한다: 정관격·상관격 damage는 resource, 재격 damage는 officer, 식신격 damage는 wealth, 인격 damage는 companion category다. category는 일간 오행의 생극 거리로 결정론적으로 실제 medicine 오행으로 변환한다. 구조 medicine strategy base는 +10이다.

과다병은 adjusted top element가 40% 이상이고 second highest와의 차이가 15%p 이상일 때만 성립한다. 40~50% 미만은 MODERATE/15, 50~60% 미만은 HIGH/25, 60% 이상은 SEVERE/35다. CONTROL/DRAIN 표는 木→金/火, 火→水/土, 土→木/金, 金→火/水, 水→土/木이며 CONTROL +20, DRAIN +15다. 관계나 transformation 자체는 병이 아니며 합화 결과가 반영된 adjustedStrength가 실제 threshold를 충족할 때만 과다병이 된다.

medicine availability는 disease와 strategy가 먼저 정해진 뒤에만 적용한다. 10% 미만 +8, 10~20% 미만 +4, 20~35% 미만 0, 35~45% 미만 −8, 45% 이상 −15다. 최종 점수는 `diseaseScore + strategyScore + availabilityAdjustment`이고 evidence delta 합으로 재구성된다. 점수 40 이상 PRIMARY_MEDICINE, 30~39 STRONG_MEDICINE, 20~29 SUPPORTING_MEDICINE, 10~19 CONDITIONAL_MEDICINE, 1~9 LOW_NEED, 0 이하 NOT_NEEDED다.

같은 element가 여러 disease의 약이면 후보 점수를 내림차순으로 정렬하여 `1.0, 0.5, 0.25` diminishing weight로 집계한다. 단순 합산하지 않는다. disease가 없으면 `NOT_APPLICABLE`, 모두 연결 구제되었으면 `ALREADY_TREATED`, active disease에 필요한 medicine이 있으면 `APPLICABLE`, disease는 있으나 필요한 candidate가 없으면 `PARTIALLY_APPLICABLE`이다. strength, relations, transformation, rootDamage, tonggwan은 context로 기록하되 그 자체로 disease를 생성하지 않는다.

순수 `乙亥 / 乙酉 / 甲子 / 戊辰`은 정관격/UNEXPOSED, quality SUPPORTED/58이며 damage가 없다. adjusted top인 金도 약 29.96%로 40% 미만이다. 따라서 `byeongyak.status=implemented`, `applicability=NOT_APPLICABLE`, `diseases=[]`, `medicineCandidates=[]`, `elementPreferences=[]`다. 10A·10B·10C 결과는 복사하거나 변경하지 않는다. 지원되는 입력은 eokbu, johu, tonggwan, byeongyak이 implemented이고 structure-useful-god와 synthesis는 계속 not_implemented다.
