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

## CORE MILESTONE 10E — Structure Useful-God Engine v1

`structure-useful-god-v1`, `structure-core-v1`, `structure-useful-preference-v1`은 **POSTPOST 격국용신 v1 operational rule**이다. 고전 명리의 절대 수치가 아니라 표준격의 중심 유지와 실제 손상 구제를 결정론적으로 표현하는 versioned 운영 계수다. 신강·신약, 조후, 통관, 병약 점수와 합산하지 않으며 최종 용신을 결정하지 않는다.

표준 8격 CORE category는 정관격·편관격→officer, 정재격·편재격→wealth, 식신격·상관격→output, 정인격·편인격→resource다. SUPPORT는 별도 표를 만들지 않고 `structure-interactions-v1`의 support 십성을 category로 변환한다. RESCUE도 `structure-rescue-v1`과 quality의 실제 damage/rescue 연결을 그대로 재사용하며 손상이 없으면 후보를 만들지 않는다. category→element는 일간 기준 생극 거리의 공유 변환을 사용한다.

구조 source score는 CORE +25, SUPPORT +15, 미해결 손상 RESCUE +30, 이미 연결 구제된 RESCUE +10이다. 같은 element의 복수 역할은 점수 내림차순 `1.0, 0.5, 0.25`로 집계한 뒤 availability를 한 번 적용한다. 후보 element가 10% 미만이면 +5, 10~20% 미만 +2, 20~35% 미만 0, 35~45% 미만 −5, 45% 이상 −10이다. 이 보정은 후보 선정 이후의 need modifier이며 오행 부족에서 후보를 역추론하지 않는다. 최종 30 이상 PRIMARY_STRUCTURE, 20~29 STRONG_STRUCTURE, 10~19 SUPPORTING_STRUCTURE, 1~9 CONDITIONAL_STRUCTURE, 0 이하는 NOT_NEEDED다.

ESTABLISHED는 HIGH, UNEXPOSED는 MEDIUM confidence다. MIXED는 primary를 유지하고 secondary/mixed pattern을 context only로 기록하며 LOW confidence다. `QUALIFIED_CANDIDATE` 특수격이 있으면 점수는 유지하고 `CAUTION_SPECIAL_STRUCTURE`/LOW로 표시한다. 건록격·양인격은 검증되지 않은 표를 만들지 않고 `LIMITED`, 빈 preferences를 반환한다.

순수 `乙亥 / 乙酉 / 甲子 / 戊辰`은 甲 일간 정관격/UNEXPOSED이므로 CORE 金 25, SUPPORT 土 15와 水 15이며 damage가 없어 RESCUE는 없다. adjusted 土가 10~20% 구간이라 +2가 적용되어 최종 preference는 金 25, 土 17, 水 15다. 이는 억부의 金 −12, 조후의 火 40/金 10, 통관의 水 25, 병약 NOT_APPLICABLE과 독립적으로 함께 보존된다. 지원되는 입력은 eokbu, johu, tonggwan, byeongyak, structure가 모두 implemented이고 synthesis만 not_implemented다.

## CORE MILESTONE 11 — POSTPOST Useful-God Synthesis v1

`useful-god-synthesis-v1`, `useful-god-normalization-v1`, `useful-god-weight-v1`은 독립 10A~10E raw 결과를 변경하지 않는 결정론적 소비자다. 모든 계수와 경계는 `src/rules/useful-god-synthesis.v1.ts`의 versioned config를 사용한다. base weight 총합은 1.00: 억부 0.30, 격국 0.25, 조후 0.20, 병약 0.15, 통관 0.10.

유효 가중치는 `baseWeight × confidenceFactor × engineSpecificFactor`다. confidence HIGH 1.00, MEDIUM 0.85, LOW 0.65; 조후 urgency CRITICAL 1.30, HIGH 1.15, MEDIUM 1.00, LOW 0.85; 억부 특수격 QUALIFIED_CANDIDATE 0.60, 그렇지 않고 CONDITIONAL 0.80, 그 외 1.00이다. 조후·특수격 계수는 raw 점수를 수정하지 않는다. confidence가 없는 조후·병약은 1.00을 쓴다. 조후 urgency null은 MEDIUM으로 처리한다. NOT_APPLICABLE 엔진은 유효 가중치 0으로 기록하고 모든 element denominator에서 제외한다. 미구현 엔진도 제외한다. NO_SIGNAL은 적용 가능한 엔진에 그 오행 후보/평가 행이 없다는 뜻이며 0점이나 중립 50점 신호로 채우지 않는다. NEUTRAL 신호는 실제 평가된 정규화 점수 50이다.

결과 필드 `effectiveEngineWeights`와 `engineSignals[].effectiveWeight`는 **재정규화 전 조정 가중치**이며 합계가 1일 필요가 없다. 적용 가능한 엔진의 confidence·urgency·특수격 계수를 반영한 절대 가중치이고, NOT_APPLICABLE 엔진은 0이다. 오행별 최종 기여 비율은 신호가 있는 엔진마다 `engineSignals[].effectiveWeight / weightSum`으로 산출한다. 신호가 하나 이상 있으면 이 기여 비율의 합은 1이다. 따라서 전역 `effectiveEngineWeights`를 최종 기여 비율로 해석해서는 안 된다.

공통 선호 점수 범위는 0~100, 중립점은 50이다. 억부 `((clamp(raw,-40,40)+40)/80)×100`. 조후 `raw<0 ? 50+clamp(raw,-15,0)/15×50 : 50+clamp(raw,0,50)`; 오행 집계 점수를 사용하고 천간 우선순위는 별도 보존한다. 통관 후보 `50+clamp(raw,0,35)/35×50`. 병약 medicine 후보 `50+clamp(raw,0,60)/60×50`. 격국 후보 `50+clamp(raw,0,50)`.

오행별 `weightSum=Σ(signal effectiveWeight)`, `baseSynthesisScore=Σ(normalizedScore×effectiveWeight)/weightSum`이다. 각 오행은 서로 다른 denominator를 가질 수 있다. 신호가 하나도 없을 때는 계산상 중립 50으로 두되 engineCount=0, coverage=0, confidence LOW이며 중립 신호를 만들어 넣지 않는다. coverage의 `effectiveWeight`는 해당 오행 신호의 유효 가중치 합을 **원래 전체 base weight 합 1.00**으로 나눈 값이다. coverage 0.60 이상 HIGH, 0.35 이상 MEDIUM, 미만 LOW.

정규화 점수 70 이상인 독립 엔진 신호 2개는 +3, 3개 이상은 +5 consensus bonus다. 70 이상 신호와 35 이하 신호가 모두 있으면 `CONFLICTING_SIGNAL`, −3 penalty를 적용하고 양방향 원본 엔진·raw·정규화·가중치를 conflicts와 element engineSignals에 보존한다. `finalScore=clamp(baseSynthesisScore+consensusBonus+conflictPenalty,0,100)`; base와 두 delta로 재구성할 수 있다. 역할은 80 이상 PRIMARY, 70 이상 SECONDARY, 60 이상 FAVORABLE, 45 이상 CONDITIONAL, 35 이상 NEUTRAL, 그 미만 UNFAVORABLE. 용신은 PRIMARY+SECONDARY, 희신은 FAVORABLE, 조건부·중립·기신은 각각 CONDITIONAL·NEUTRAL·UNFAVORABLE이다. PRIMARY는 0개 또는 복수 가능하며 highestElement는 별도로 기록한다. 점수 내림차순, 동점 木火土金水 순서다.

순수 기둥 `乙亥 / 乙酉 / 甲子 / 戊辰`의 실제 독립 엔진 결과에서 병약은 NOT_APPLICABLE이다. 유효 가중치 억부 0.255, 격국 0.2125, 조후 0.20, 병약 0, 통관 0.085. 최종 점수는 水 69.91758241758242, 火 65.48076923076924, 木 65, 土 52.95454545454545, 金 52.22471910112359. PRIMARY·SECONDARY·NEUTRAL·UNFAVORABLE은 없고, FAVORABLE은 水火木, CONDITIONAL은 土金이다. highestElement 水는 PRIMARY가 아니다. 金은 억부 raw −12→35(비선호)와 격국 raw +25→75(강한 선호), 조후 raw +10→60을 모두 보존한다. 억부와 격국의 충돌로 −3을 적용한다. 외부 서비스의 단일 용신 결과에 맞춘 계수 조정은 하지 않는다.

## CORE MILESTONE 12A — Heavenly Stem Preferences v1

`stem-preferences-v1`과 `stem-preference-synthesis-v1`은 Milestone 11의 오행 종합을 甲乙丙丁戊己庚辛壬癸에 확장한다. 천간 순서와 오행·음양은 `HEAVENLY_STEMS`와 `TEN_GODS_V1.stemTraits`를 source-of-truth로 쓴다. 억부·통관·병약·격국의 오행 신호는 같은 오행의 두 천간에 동일하게 상속한다. 조후는 오행 aggregate를 복사하지 않고 `johu.stemPreferences`의 실제 천간 신호만 사용한다. 조후표에서 언급되지 않은 천간은 NO_SIGNAL이며 0점이나 중립 50점 신호를 넣지 않는다.

정규화는 Milestone 11의 `normalizeSignal`, 점수·consensus·conflict·coverage confidence 계산은 `synthesizeWeightedSignals`, 역할은 `synthesisRole`을 직접 재사용한다. 천간별 `weightedSum=Σ(normalizedSignal×effectiveWeight)`, `signalWeightSum=Σ(actual signal effectiveWeight)`, `baseStemScore=weightedSum/signalWeightSum`이다. `effectiveEngineWeights`는 Milestone 11에서 산출된 재정규화 전 조정 가중치를 그대로 사용한다. 이후 Milestone 11과 같이 strong positive 70 이상 신호가 2개면 +3, 3개 이상이면 +5, 70 이상과 35 이하가 함께 있으면 −3을 적용한다. 최종 점수는 0~100으로 clamp하고 역할 경계와 coverage HIGH/MEDIUM/LOW 경계도 Milestone 11 config를 공유한다.

각 천간에는 부모 오행의 최종 점수와 역할을 연결하지만 천간 점수로 복사하지 않는다. availability는 year/month/hour 천간의 VISIBLE, 네 지지 지장간의 HIDDEN, 둘 다 없을 때 ABSENT를 기록한다. 일간은 visiblePositions에서 제외하고 `dayStemSelf`로 따로 표시한다. 모든 지장간 출현은 pillar·branch·hiddenStem·qiRole로 보존한다. availability는 점수에 영향을 주지 않는다. 천간합의 transformation 평가에 참여하면 relationContext에 상태를 기록하되 점수를 다시 조정하지 않는다. 정렬은 점수 내림차순, 동점은 甲乙丙丁戊己庚辛壬癸 순이다.

순수 기둥 `乙亥 / 乙酉 / 甲子 / 戊辰`의 천간 결과는 壬 69.91758241758242 FAVORABLE, 癸 69.91758241758242 FAVORABLE, 甲 65 FAVORABLE, 乙 65 FAVORABLE, 丁 61.08516483516484 FAVORABLE, 丙 56.689560439560445 CONDITIONAL, 戊 52.95454545454545 CONDITIONAL, 己 52.95454545454545 CONDITIONAL, 庚 52.22471910112359 CONDITIONAL, 辛 50.18181818181818 CONDITIONAL이다. 丁은 조후 raw +30→80, 丙은 +20→70이어서 丁이 높다. 庚은 조후 raw +10→60 신호가 있고 辛은 조후 NO_SIGNAL이어서 점수가 다르다. PRIMARY·SECONDARY·NEUTRAL·UNFAVORABLE은 없고 FAVORABLE은 壬癸甲乙丁, CONDITIONAL은 丙戊己庚辛이다. 방향이나 순위를 별도 규칙으로 강제하지 않는다.

## CORE MILESTONE 12B — Earthly Branch Preferences v1

`branch-preferences-v1`과 `branch-preference-synthesis-v1`은 12A의 최종 천간 선호도를 기존 지장간 구성으로 합성한다. 지장간은 `hidden-stems-v1`, 비중은 `element-weight-v1`을 source-of-truth로 직접 사용한다. 지장간 1개는 mainQi 1.00, 2개는 mainQi 0.75/residualQi 0.25, 3개는 mainQi 0.70/middleQi 0.20/residualQi 0.10이다. 12B 안에 별도 지장간 표나 새 계수를 두지 않는다.

`branchBaseScore=Σ(hiddenStemPreferenceScore×hiddenStemWeight)`이며 v1의 `finalBranchScore=branchBaseScore`다. 각 component는 stem·qiRole·weight·stemScore·stemRole·stemConfidence·weightedScore를 기록하여 점수를 재구성할 수 있다. representativeElement는 mainQi 천간의 오행을 metadata로만 기록하고 계산에 더하지 않는다. 역할은 Milestone 11의 `synthesisRole` 경계를 직접 재사용하고, 동점은 공유 `EARTHLY_BRANCHES` 순서인 子丑寅卯辰巳午未申酉戌亥로 정렬한다. confidence는 새 경계를 만들지 않고 가장 큰 지장간 비중인 mainQi의 12A coverage confidence를 그대로 사용한다.

prospective relation context는 candidate branch와 원국 네 지지가 만들 수 있는 육합·삼합·방합·충·삼형·상형·자형·해·파·원진을 `branch-relations-v1`과 `punishment-v1`에서 탐지한다. pair는 PAIR, 삼합·방합·삼형은 candidate를 포함해 서로 다른 구성원 2개면 PARTIAL, 3개면 COMPLETE로 기록한다. 원국의 해당 지지 위치를 모두 보존한다. 이는 잠재 관계 metadata이며 점수 delta는 항상 0이다. prospective branch로 transformation을 재실행하거나 adjustedStrength를 변경하지 않는다. availability도 PRESENT/ABSENT, positions, count만 기록하고 점수에는 반영하지 않는다.

순수 기둥 `乙亥 / 乙酉 / 甲子 / 戊辰`의 12지지 결과는 子 69.91758241758242 FAVORABLE, 亥 68.68818681318682 FAVORABLE, 卯 65 FAVORABLE, 寅 62.133366633366634 FAVORABLE, 午 59.052509990009995 CONDITIONAL, 辰 57.551698301698295 CONDITIONAL, 未 56.176698301698295 CONDITIONAL, 申 55.83627439975754 CONDITIONAL, 巳 55.423090673371576 CONDITIONAL, 戌 54.3033966033966 CONDITIONAL, 丑 54.09630369630369 CONDITIONAL, 酉 50.18181818181818 CONDITIONAL이다. 단일 지장간인 子=癸, 卯=乙, 酉=辛은 정확히 일치한다. PRIMARY·SECONDARY·NEUTRAL·UNFAVORABLE은 없고 FAVORABLE은 子亥卯寅, CONDITIONAL은 午辰未申巳戌丑酉다. 원국 亥酉子辰을 기준으로 candidate 酉의 자형, 午의 子午충, 申의 申子辰 완전 삼합 등을 기록하지만 점수는 변경하지 않는다.

## CORE MILESTONE 13 — Noble & Special Stars Engine v1

`noble-special-stars-v1`은 원국의 간지와 기존 관계 결과에서 귀인·신살의 존재, 기준, 위치, 중복 횟수와 근거만 탐지하는 tag layer다. 하위 표는 `noble-stars-v1`, `mobility-stars-v1`, `special-stars-v1`, `void-v1`, `twelve-sinsal-v1`, `samjae-v1`으로 고정한다. 어떤 신살도 strength, structure, usefulGods, stemPreferences, branchPreferences를 변경하거나 길흉 총점을 만들지 않는다. 문곡귀인은 v1 채택표의 출전·정의가 충분히 고정되지 않아 포함하지 않는다.

### 귀인 채택표 (`noble-stars-v1`)

모두 일간 기준이며 표의 지지가 원국의 어느 위치에 있는지 각각 기록한다. 천을귀인: 甲戊庚→丑未, 乙己→子申, 丙丁→亥酉, 辛→寅午, 壬癸→卯巳. 태극귀인: 甲乙→子午, 丙丁→卯酉, 戊己→辰戌丑未, 庚辛→寅亥, 壬癸→巳申. 문창귀인: 甲→巳, 乙→午, 丙戊→申, 丁己→酉, 庚→亥, 辛→子, 壬→寅, 癸→卯. 학당귀인: 甲→亥, 乙→午, 丙戊→寅, 丁己→酉, 庚→巳, 辛→子, 壬→申, 癸→卯.

### 도화·역마·화개 (`mobility-stars-v1`)

생년지와 일지 basis를 분리해 모두 계산한다. 申子辰→도화 酉/역마 寅/화개 辰, 亥卯未→子/巳/未, 寅午戌→卯/申/戌, 巳酉丑→午/亥/丑이다. 동일 위치가 양쪽 basis에 해당하면 두 detection을 모두 보존한다.

### 특수 신살 (`special-stars-v1`)

귀문관은 unordered pair 子酉·丑午·寅未·卯申·辰亥·巳戌을 네 지지의 모든 위치 쌍에서 검사한다. 원진은 별도 재탐지하지 않고 `relations.earthlyBranches.wonjin` 결과를 그대로 변환한다. 현침은 학교별 차이를 명시한 POSTPOST CUSTOM_RULE로 천간 甲辛, 지지 卯午未申의 각 출현을 기록한다. 괴강 extended-6은 庚辰·庚戌·壬辰·壬戌·戊辰·戊戌, 백호는 甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑이며 모든 pillar를 검사하고 `isDayPillar`를 따로 기록한다. 양인은 기존 `yang-blade-structure-v1`을 공유하여 甲→卯, 丙戊→午, 庚→酉, 壬→子만 적용하고 음간은 NOT_APPLICABLE이다.

### 공망 (`void-v1`)

일주가 속한 旬을 간지 index로 결정한다. 甲子旬→戌亥, 甲戌旬→申酉, 甲申旬→午未, 甲午旬→辰巳, 甲辰旬→寅卯, 甲寅旬→子丑이다. 결과는 dayPillar, xunStart, voidBranches와 일지를 제외한 year/month/hour matches를 기록한다. 일지 자체는 旬 판정 기준이므로 `dayBranchPolicy=EXCLUDED_SELF`로 고정한다.

### 12신살 (`twelve-sinsal-v1`)

순서는 겁살·재살·천살·지살·년살·월살·망신살·장성살·반안살·역마살·육해살·화개살이다. 申子辰의 목표 지지는 巳午未申酉戌亥子丑寅卯辰, 亥卯未는 申酉戌亥子丑寅卯辰巳午未, 寅午戌은 亥子丑寅卯辰巳午未申酉戌, 巳酉丑은 寅卯辰巳午未申酉戌亥子丑이다. yearBasis와 dayBasis 각각 12개 전체 mapping을 내보내며 targetBranch, matchedPositions, detected를 기록한다. 도화·역마·화개와 의미가 겹쳐도 별도 시스템 결과로 보존한다.

### 삼재 (`samjae-v1`)

생년지 기준으로 申子辰→寅(들)·卯(눌)·辰(날), 亥卯未→巳·午·未, 寅午戌→申·酉·戌, 巳酉丑→亥·子·丑을 기록한다. 원국에서는 basisYearBranch, group, samjaeBranches와 세 단계만 산출하며 특정 연도 활성화는 세운 엔진 범위다.

순수 기둥 `乙亥 / 乙酉 / 甲子 / 戊辰`의 회귀 결과는 다음과 같다. 귀인은 태극귀인(day 子), 학당귀인(year 亥). 도화는 year basis 亥→day 子와 day basis 子→month 酉의 2건, 역마는 없음, 화개는 day basis 子→hour 辰. 귀문은 year 亥-hour 辰과 month 酉-day 子, 원진은 기존 relation의 year 亥-hour 辰, 현침은 day stem 甲이다. 甲子旬 공망은 戌亥이며 year 亥가 match된다. 양인은 적용 가능하지만 卯가 없어 detection 없음. 괴강과 백호는 hour 戊辰이 각각 1건이며 day pillar가 아니다. 12신살 year basis 亥에서는 재살 酉·지살 亥·년살 子·반안살 辰, day basis 子에서는 년살 酉·망신살 亥·장성살 子·화개살 辰이 검출된다. 생년지 亥의 삼재는 巳(들)·午(눌)·未(날)이다.

## FORTUNE MILESTONE 14A — Daeun Generation & Activation v1

### 대운 원본 생성

`daeun-generation-v1`은 대운 작용 분석과 분리된 source 단계다. 방향은 `daeun-direction-v1`에서 연간의 음양과 성별을 사용한다. 양간 남성·음간 여성은 순행, 음간 남성·양간 여성은 역행이다. 순행은 다음 절입, 역행은 이전 절입을 기준으로 하며 `daeun-start-age-v1`에서 출생 절대시각과 기준 절입의 실제 시간 차이를 일수로 바꾼 뒤 `3일=대운 1년`으로 환산한다. source에는 `exactTermDifferenceMilliseconds`, `exactTermDifferenceDays`, `exactStartAge`와 실제 출생 instant부터 시작 instant까지의 `exactConvertedDuration { years, milliseconds }`를 모두 보존한다. `exactStartAge=abs(referenceJeol-birthInstant)/3일`, 표기용 연·월은 정수 연과 반올림한 월로 분리한다. 시작 instant는 출생 instant에 정수 calendar years를 먼저 더하고, 소수 연령은 해당 생일부터 다음 생일까지의 실제 calendar interval에 비례시켜 계산한다. 따라서 윤년에도 정확히 1세는 같은 월·일·시각의 다음 calendar year이며 평균 태양년 고정 밀리초를 사용하지 않는다.

`daeun-sequence-v1`은 월주를 source-of-truth로 삼아 순행이면 다음 간지, 역행이면 이전 간지부터 10개를 생성한다. 최초 대운의 정확한 시작 instant를 구한 뒤 각 경계는 그 instant에 10 calendar years씩 가산한다. 고정 일수나 `365.2425×10` 밀리초를 기간 경계로 사용하지 않는다. 월·일·시각을 보존하고 윤년으로 동일 날짜가 없을 때만 해당 월의 마지막 날로 clamp한다. 원본 `daeun.periods`에는 간지와 표시용 연령 범위 외에 실제 `startInstant`/`endInstant`를 저장하며, 다음 기간의 `startInstant`는 직전 기간의 `endInstant`와 정확히 같다. 기존 호환 필드 `startDatetime`/`endDatetime`도 같은 값을 가리킨다. 14A activation consumer는 방향·시작 나이·기간·간지를 재계산하거나 수정하지 않는다.

### 작용 분석과 버전

작용 결과 버전은 `daeun-activation-v1`, 관계 계약은 `fortune-interaction-v1`, 활성 점수는 `fortune-activation-score-v1`, 간지 선호 합성 계수는 `daeun-pillar-preference-v1`이다. 각 대운의 천간 선호도는 12A, 지지 선호도와 지장간 구성은 12B 및 기존 hidden-stems/element-weight 규칙에서 lookup한다. 일간 대비 대운 천간 십성과 대운 지지의 지장간별 십성·기존 비중을 기록한다.

`baseFavorabilityScore=stemPreferenceScore×0.45+branchPreferenceScore×0.55`다. 역할은 80 이상 PRIMARY_FAVORABLE, 70 이상 STRONG_FAVORABLE, 60 이상 FAVORABLE, 45 이상 CONDITIONAL, 35 이상 NEUTRAL, 미만 UNFAVORABLE이다. 이는 간지 자체의 선호도이며 관계 활성도와 합산하지 않는다.

활성 점수는 길흉이 아닌 변화량이다. 천간합 6, 천간충 7, 육합 6, 삼합 partial 4/complete 10, 방합 partial 4/complete 10, 지지충 10, 삼형 partial 7/complete 9, 상형 7, 자형 6, 해 5, 파 4, 원진 5다. `rawActivationScore=Σ(interaction.activationPoints)`, `activationScore=clamp(raw,0,100)`이다. 0~14 LOW, 15~29 MODERATE, 30~49 HIGH, 50 이상 VERY_HIGH다. 합과 충을 favorability delta로 바꾸지 않는다.

각 interaction ID는 `DAEUN-{2자리 index}:{domain}:{natal position 또는 group}:{relation type}` 형식의 stable ID다. 같은 ID는 한 번만 점수화한다. 대운 지지가 추가되어 구성원 2개가 되면 ACTIVATED_PARTIAL, 3개가 되면 ACTIVATED_COMPLETE다. 대운 지지가 이미 원국에 있고 해당 group context도 이미 존재하면 REPEATED_EXISTING_CONTEXT로 구분한다. pair 관계는 ACTIVATED_PAIR다. 천간합은 `transformationCandidate=true` context만 기록하고 natal transformation이나 adjustedStrength를 재실행하지 않는다.

도화·역마·화개·귀인·공망 target과 대운 간지가 일치하면 score 없는 activation tag를 기록한다. 백호·괴강 등의 사건을 예측하지 않고 신살로 점수를 가감하지 않는다. 삼재는 세운 연지에서만 활성화하므로 14A에서는 activation을 만들지 않는다. 결과는 `fortune.status=partial`, `fortune.daeun.status=implemented`이며 seun·wolun·synthesis는 not_implemented다.

통합 synthetic fixture의 대운 원본은 역행, 이전 절입 기준, 시작 9세 0개월이며 丙寅·乙丑·甲子·癸亥·壬戌·辛酉·庚申·己未·戊午·丁巳 순이다. 각 `(favorability/role, activation/level)`은 丙寅 `(59.02680785123968/CONDITIONAL, 21/MODERATE)`, 乙丑 `(51.86370879120879/CONDITIONAL, 44/HIGH)`, 甲子 `(18.324587912087914/UNFAVORABLE, 44/HIGH)`, 癸亥 `(16.99426510989011/UNFAVORABLE, 22/MODERATE)`, 壬戌 `(56.938101851851854/CONDITIONAL, 50/VERY_HIGH)`, 辛酉 `(100/PRIMARY_FAVORABLE, 23/MODERATE)`, 庚申 `(89.61875/PRIMARY_FAVORABLE, 22/MODERATE)`, 己未 `(88.03467592592594/PRIMARY_FAVORABLE, 20/MODERATE)`, 戊午 `(97.79131944444445/PRIMARY_FAVORABLE, 20/MODERATE)`, 丁巳 `(96.00814393939396/PRIMARY_FAVORABLE, 29/MODERATE)`로 고정한다.

## FORTUNE MILESTONE 14B — Seun Activation Engine v1

버전은 `seun-generation-v1`, `seun-activation-v1`, `fortune-layer-interaction-v1`, `seun-pillar-preference-v1`이다. 관계 activation point, cap과 level은 14A의 `fortune-interaction-v1` 및 `fortune-activation-score-v1` config를 직접 재사용한다.

### 입춘 시간축과 생성 범위

세운 year Y는 Solar Term Provider가 제공하는 `Y년 입춘 absolute instant` 이상, `Y+1년 입춘 absolute instant` 미만 구간이다. Gregorian 1월 1일이나 사주 보정 local datetime을 경계로 쓰지 않는다. 세운 간지는 각 시작 instant에 기존 `calculateYearPillar`를 호출해 얻으며 연도별 간지를 하드코딩하지 않는다.

생성 범위는 정확한 `daeun.periods[].startInstant/endInstant` 전체 구간과 Solar Term Provider 지원 범위의 교집합이다. 각 입춘 구간과 실제로 겹치는 대운만 interval intersection으로 연결하므로 모든 세운×모든 대운 cross product를 만들지 않는다. Solar Term Provider의 마지막 지원 연도에는 다음 입춘이 없으므로 완전한 경계를 만들 수 있는 `supportedEnd-1` 세운까지만 생성한다.

한 세운 도중 대운 경계가 있으면 `daeunSegments[]`에 각 `daeunIndex`, `daeunPillar`, 교차 `startInstant/endInstant`를 모두 저장한다. segment가 정확히 하나일 때만 편의 필드 `activeDaeunIndex/activeDaeunPillar`를 채운다. 둘 이상이면 두 편의 필드는 null이며 `daeunSegments`가 authoritative source다. 인접 segment 경계는 같은 absolute instant를 공유한다.

### 선호도와 십성

세운 천간·지지 선호도는 12A/12B 결과를 lookup하며 다시 계산하지 않는다. `baseFavorabilityScore=stemPreference×0.45+branchPreference×0.55`이고 역할은 14A와 동일하다. 대운 favorability는 섞지 않는다. 세운 천간의 일간 대비 십성과 지지 지장간별 십성·기존 hidden-stem weight를 기록한다.

### 세 레이어 interaction

모든 세운 참여 interaction에는 `layerPair`를 기록한다. 원국↔세운은 `NATAL_SEUN`, 활성 대운↔세운 pair는 `DAEUN_SEUN`, 원국+대운+세운 group은 `CROSS_LAYER`다. stable ID는 각각 `SEUN-{year}:NATAL:{domain}:{position}:{relation}`, `SEUN-{year}:DAEUN-{index}:{domain}:{relation}`, `SEUN-{year}:CROSS_LAYER:{group type}:{members}:DAEUN-{index}` 형태다. 동일 ID는 한 번만 점수화한다.

원국↔세운 및 대운↔세운에서 천간합·천간충, 육합·충·상형·자형·해·파·원진을 찾는다. 삼합·방합·삼형은 원국+세운 또는 원국+활성 대운+세운의 서로 다른 지지 구성을 평가한다. 세운이 새로 세 지지를 완성하면 `ACTIVATED_COMPLETE`, 특히 대운이 필요한 다층 완성이면 `CROSS_LAYER_COMPLETE`, 두 지지만 만들면 `ACTIVATED_PARTIAL`, 세운 지지가 기존 context를 반복하면 `REPEATED_EXISTING_CONTEXT`다. participants에는 NATAL position, DAEUN index, SEUN year와 각 지지를 기록한다. 14A에서 계산한 원국↔대운 관계는 context로만 사용하고 14B 점수에 다시 넣지 않는다.

`natalRawScore=Σ(NATAL_SEUN unique points)`, `crossLayerRawScore=Σ(DAEUN_SEUN 및 CROSS_LAYER unique points)`, `rawActivationScore=natalRawScore+crossLayerRawScore`, `activationScore=clamp(raw,0,100)`이다. favorability와 activation은 합치지 않는다. 천간합은 `transformationCandidate=true`만 기록하고 natal adjustedStrength나 fortune-layer strength를 만들지 않는다.

### 신살·삼재

일간 귀인표, 생년지·일지의 도화/역마/화개, 양인과 일주 공망 target에 세운 간지가 일치하면 score 없는 activation tag를 만든다. Milestone 13의 `samjae.stages`를 source-of-truth로 사용해 세운 지지가 들삼재·눌삼재·날삼재와 일치하면 `SAMJAE_ACTIVATED`와 stage를 기록한다. 신살·삼재·공망은 favorability 및 activation score를 변경하지 않는다.

synthetic 회귀는 다음을 고정한다. 입춘 1ms 전과 Gregorian 1월 1일은 직전 간지를 유지하고 입춘 1ms 후 간지가 변경된다. 2027 입춘~2028 입춘 세운 안의 2027-07-01T12:00Z 대운 경계는 두 segment로 분리된다. 원국 申 + 대운 辰 + 세운 子는 申子辰 `CROSS_LAYER_COMPLETE`, 원국 子 + 세운 午는 `NATAL_SEUN` 충, 대운 子 + 세운 午는 `DAEUN_SEUN` 충이다. 생년지 亥 기준 세운 巳·午·未는 각각 들삼재·눌삼재·날삼재 tag를 만들고, 甲辰 일주 기준 세운 寅은 `VOID_ACTIVATED`지만 어느 tag도 점수를 변경하지 않는다.

## FORTUNE MILESTONE 14C — Wolun Activation Engine v1

버전은 `wolun-generation-v1`, `wolun-activation-v1`, `wolun-pillar-preference-v1`, `fortune-four-layer-interaction-v1`이다. 14A/14B의 `fortune-interaction-v1`, `fortune-activation-score-v1`, `fortune-layer-interaction-v1` 규칙과 점수표를 재사용한다.

### 12절 월운 생성

월운 경계는 기존 month-pillar 모듈의 `MONTH_INDEX_BY_JEOL`과 그 canonical 순서인 입춘·경칩·청명·입하·망종·소서·입추·백로·한로·입동·대설·소한을 source-of-truth로 사용한다. 각 기간은 `[currentJeolInstant,nextJeolInstant)`이며 Solar Term Provider의 absolute instant를 사용한다. Gregorian 월초와 음력 월번호는 사용하지 않는다.

각 세운의 입춘부터 다음 입춘까지 기존 `calculateMonthPillar(startInstant,seunYearStem,provider)`를 호출한다. 따라서 월지는 입춘 寅부터 소한 丑까지 기존 mapping을, 월간은 해당 세운 천간 기준 기존 五虎遁 계산을 그대로 쓴다. 별도 월간표·월지표를 14C에 복제하지 않는다. 입춘 instant는 세운과 寅월의 공통 경계다. 입춘 1ms 전은 이전 세운+丑월, 입춘부터 새 세운+寅월이며 경칩 instant부터 卯월이다.

생성 범위는 14B의 완전한 seun periods다. 각 세운에 정확히 12개 월운을 생성하고 다음 경계가 Provider 범위에 없는 불완전 월은 만들지 않는다. 통합 synthetic fixture는 2033~2099년 67세운×12개월로 804 월운이다.

각 월운은 `activeSeunYear/activeSeunPillar` 단일값을 갖는다. 대운은 월운 도중 바뀔 수 있으므로 세운의 정확한 `daeunSegments`와 월운 interval을 다시 교차해 `daeunIndex`, `daeunPillar`, `startInstant/endInstant`를 보존한다. segment가 하나일 때만 `activeDaeunIndex/activeDaeunPillar` 편의 필드를 채우고 복수 또는 없음이면 null이다.

### 선호도·십성·네 레이어 관계

월운 선호도는 12A/12B lookup 결과로 `baseFavorabilityScore=stemPreference×0.45+branchPreference×0.55`를 계산한다. 월운 천간의 일간 대비 십성과 월지 지장간별 십성·기존 weight를 기록한다. 대운·세운 favorability와 합치지 않는다.

월운 참여 pair는 `NATAL_WOLUN`, `DAEUN_WOLUN`, `SEUN_WOLUN`으로 분리한다. 천간합·천간충 및 육합·충·상형·자형·해·파·원진은 기존 표에서 탐지한다. 삼합·방합·삼형은 NATAL·실제 겹치는 DAEUN·현재 SEUN에 WOLUN을 추가해 평가한다. 새 14C cross-layer interaction에는 WOLUN participant가 반드시 존재하며, DAEUN/SEUN 중 실제로 기존 NATAL+WOLUN만으로는 제공되지 않는 지지가 있어야 한다. 월운 없이 이미 존재한 14A·14B 관계는 기록하거나 재점수화하지 않는다.

월운이 세 번째 지지를 공급해 완성하면 `WOLUN_TRIGGERED_COMPLETE`, 두 지지만 형성하면 `ACTIVATED_PARTIAL`, 월운 이전에 이미 완성된 context면 `REPEATED_EXISTING_CONTEXT`다. participants에는 natal position, daeun index, seun year, wolun year와 각 stem/branch를 보존한다. stable ID는 `WOLUN-{seunYear}-{monthBranch}` prefix 아래 layer·domain·position/group·relation을 포함하며 모든 점수 행이 이 prefix로 시작한다.

`natalRawScore=Σ(NATAL_WOLUN)`, `fortuneLayerRawScore=Σ(DAEUN_WOLUN+SEUN_WOLUN)`, `crossLayerRawScore=Σ(WOLUN 참여 multi-layer groups)`다. `rawScore`는 세 영역 합, `score=clamp(raw,0,100)`이며 level은 14A의 LOW/MODERATE/HIGH/VERY_HIGH 경계를 재사용한다. favorability와 activation은 합치지 않는다. 천간합은 transformation candidate만 남기고 실제 합화나 natal adjustedStrength 변경은 하지 않는다.

### 신살·공망·삼재

월운 지지가 natal 귀인·도화·역마·화개·양인·공망 target과 일치하면 score 없는 activation tag를 만든다. 세운과 월운의 공망 tag는 각 layer 결과에 따로 존재한다. 삼재는 세운 branch 기준 연 단위 결과이므로 월운 지지로 재판정하지 않고 해당 세운의 `samjaeActivation`을 `samjaeContext`로 연결만 한다. 모든 tag/context는 favorability와 activation을 바꾸지 않는다.

synthetic 회귀는 입춘·경칩 1ms 경계, 寅卯辰巳午未申酉戌亥子丑 순서와 기존 五虎遁 월간을 고정한다. 원국 子↔월운 午, 대운 子↔월운 午, 세운 子↔월운 午 충을 각 layer로 분리한다. 원국 申+대운 辰+월운 子는 삼합, 원국 子+세운 亥+월운 丑은 방합, 원국 寅+대운 巳+월운 申은 삼형 `WOLUN_TRIGGERED_COMPLETE`다. 월운 寅이 甲辰 일주의 공망이어도 점수는 변하지 않으며 세운의 삼재 context는 월지와 무관하게 그대로 연결된다.

## FORTUNE MILESTONE 14D — Fortune Transformation Engine v1

버전은 `fortune-transformation-v1`, `fortune-transformation-evaluation-v1`, `fortune-contribution-v1`, `fortune-transformation-transfer-v1`이다. 엔진은 14A/B/C가 만든 transformable interaction을 소비하며 관계표를 새로 정의하지 않는다. 원국의 `nativeStrength`, `adjustedStrength`, natal transformation과 모든 대운·세운·월운 activation/favorability 결과는 read-only다. 결과는 `fortune.transformation`에만 저장하고 `fortune.synthesis`는 `not_implemented`로 유지한다.

### Fortune contribution과 독립 snapshot

각 운 간지는 천간 10 units와 지지 12 units, 합계 22 units의 raw contribution을 가진다. 지지 12 units는 기존 `hidden-stems-v1` 및 `element-weight-v1` 배분을 재사용한다. 지장간 1개는 본기 12, 2개는 본기 9·여기 3, 3개는 본기 8.4·중기 2.4·여기 1.2다. 월운을 포함해 운의 지지에는 natal 월지 24 weight를 적용하지 않는다. contribution ID는 `{layer-key}:STEM:{stem}` 또는 `{layer-key}:BRANCH:{branch}:{MAIN|MIDDLE|RESIDUAL}:{stem}` 형식으로 고정한다.

대운 snapshot은 NATAL+DAEUN, 세운 snapshot은 NATAL+해당 DAEUN segment+SEUN, 월운 snapshot은 NATAL+해당 DAEUN segment+SEUN+WOLUN context다. 모든 snapshot은 언제나 raw 22-unit contribution에서 새로 계산한다. 직전 세운·월운의 adjusted profile을 다음 기간의 source로 사용하지 않는다. 세운이나 월운 도중 대운이 바뀌면 14B/14C의 exact `daeunSegments`마다 별도 snapshot을 만든다. stable snapshot ID는 `DAEUN-{index}`, `SEUN-{year}:DAEUN-{index}`, `WOLUN-{year}-{monthBranch}:DAEUN-{index}`다.

원국은 합화의 성립 조건, 뿌리, 노출, blocker를 판정하는 context일 뿐 transfer source가 아니다. 원국+세운 합이면 세운 contribution만 이동한다. 대운+세운처럼 양쪽이 fortune layer이면 두 layer의 해당 contribution이 모두 이동한다. branch group에서는 참여한 fortune branch의 기존 지장간 contribution만 source가 되며 natal branch contribution은 이동하지 않는다.

### 평가 factor와 계절 context

변환 후보 종류는 기존 `relation-interaction-v1`의 stem combination, six combination, three harmony, directional combination을 재사용한다. `transformation-v1`과 동일하게 score 5 이상은 `TRANSFORMED`, 3~4는 `PARTIAL`, 0~2는 `COMBINATION_ONLY`, 0 미만은 `WEAK`이다. partial 삼합·방합은 score와 무관하게 최대 `PARTIAL`이다.

평가 factor는 기존 설정의 계절 목표오행 상태, 목표오행 뿌리, 목표오행 천간 노출, 생성오행 support, 경쟁 후보, 동일 participant의 blocking clash, 천간 원래 오행의 강한 본기 뿌리를 사용한다. 단순 상극 오행 존재만으로 blocker를 만들지 않는다. natal positional adjacency는 fortune layer에 임의 적용하지 않고 `NOT_APPLICABLE`, delta 0으로 evidence에 남긴다. factor별 delta·적용 상태·관련 relation ID와 근거를 보존한다.

대운과 세운은 원국 월지를 쓰는 `NATAL_MONTH_BASELINE`, 월운은 실제 절기 월지인 `ACTIVE_WOLUN_BRANCH`를 season context로 사용한다. target root는 원국 지지와 현재 snapshot의 active fortune branches, target exposed는 원국 천간과 active fortune stems에서 찾지만 natal rooting/strength 자체는 수정하지 않는다.

### Transfer ledger, 경쟁 배분과 보존

`transformation-transfer-v1` 비율을 재사용한다. `TRANSFORMED`는 60%, `PARTIAL`은 30%, `COMBINATION_ONLY`·`WEAK`·`NOT_APPLICABLE`은 0%이며 partial group도 최대 30%다. 한 contribution에 복수 요청이 걸리면 `scale=min(1, availableContribution/totalRequested)`로 모든 요청을 비례 축소한다. 실제 이동량은 `requestedAmount×scale`이며 source는 음수가 되지 않는다. 동일 오행으로의 transfer는 ledger에는 기록하되 net element delta는 0이다.

transfer ID는 `{snapshotId}:{relationId}:{sourceContributionId}`다. ledger에는 layer, source contribution, from/to element, 상태, ratio, requested/actual amount, scale, remaining amount를 저장하여 adjusted profile을 재구성할 수 있게 한다. 각 layer별로 `sum(base)=sum(adjusted)=22`를 허용 오차 안에서 보존한다. 세운 snapshot combined total은 44, 월운 snapshot combined total은 66이며 combined base/adjusted 총량도 같다. combined profile은 diagnostic일 뿐 activation, favorability 또는 최종 운세 점수와 합산하지 않는다. 신살·공망·삼재도 평가와 transfer에 사용하지 않는다.

synthetic 회귀는 원국 甲+세운 己에서 세운 측만 이동, 대운 甲+세운 己에서 두 fortune layer 이동, 월운이 완성하는 다층 branch combination, partial group 30% cap, 동일 contribution 복수 후보의 비례 축소와 layer/combined conservation을 고정한다. 통합 fixture는 대운 snapshot 10개, exact segment 기준 세운 snapshot 73개, 월운 snapshot 808개를 만들며 결과가 동일 입력에 deterministic함을 검증한다.

## FORTUNE MILESTONE 15 — Fortune Synthesis Engine v1

버전은 `fortune-synthesis-v1`, `fortune-layer-weight-v1`, `fortune-transformation-alignment-v1`, `fortune-period-summary-v1`이다. 14A/B/C의 favorability·activation과 14D의 layer profile을 read-only로 소비한다. FAVORABILITY, ACTIVATION, TRANSFORMATION ALIGNMENT는 끝까지 별도 축이며 overall fortune score를 만들지 않는다. 기존 관계, 천간·지지 선호도 또는 transformation을 다시 계산하지 않는다.

### Layer weight와 segment

POSTPOST 시간계층 base weight는 DAEUN 0.45, SEUN 0.35, WOLUN 0.20이다. 현재 snapshot에 존재하는 layer만 분모에 포함한다. 따라서 대운 단독은 1.0, 세운 snapshot은 DAEUN `0.45/0.80=0.5625`, SEUN `0.35/0.80=0.4375`, 월운 snapshot은 0.45/0.35/0.20이다. 존재하지 않는 layer를 0점으로 넣지 않는다.

세운·월운은 14D snapshot ID와 1:1로 연결한다. 하나의 period 중 대운이 바뀌면 `SEUN-{year}:DAEUN-{index}` 및 `WOLUN-{year}-{branch}:DAEUN-{index}`별 synthesis를 별도로 만든다. 서로 다른 대운의 간지·interaction·transformation profile을 한 snapshot에 섞지 않는다. Daeun은 index, Seun/Wolun은 원본 absolute start instant와 stable ID 순으로 deterministic하게 유지한다.

### Favorability와 activation

`favorabilityScore=Σ(existing layer baseFavorabilityScore×normalizedLayerWeight)`이며 기존 fortune favorability 역할 경계를 재사용한다. `activationScore=clamp(Σ(existing layer activationScore×normalizedLayerWeight),0,100)`이며 0~14 LOW, 15~29 MODERATE, 30~49 HIGH, 50 이상 VERY_HIGH를 재사용한다. relation point를 다시 합산하지 않으며 activation은 길흉 점수가 아니다. 두 축은 서로 또는 transformation delta와 합산하지 않는다.

### Transformation alignment

오행 선호도 source는 `usefulGods.synthesis.elements[].score`다. 각 14D layer profile에서 `alignment=Σ(elementAmount/profileTotal×natalElementPreferenceScore)`로 base와 adjusted alignment를 각각 계산한다. `layerDelta=adjustedAlignment-baseAlignment`다. Snapshot base/adjusted alignment는 combinedProfile이 아니라 각 layer alignment에 0.45/0.35/0.20 normalized layer weight를 적용해 구한다. `transformationAlignmentDelta=adjustedScore-baseScore`이며 favorability에 더하지 않는다.

Delta 방향은 5 이상 `MORE_ALIGNED`, 1 이상 5 미만 `SLIGHTLY_MORE_ALIGNED`, -1 초과 1 미만 `UNCHANGED`, -5 초과 -1 이하 `SLIGHTLY_LESS_ALIGNED`, -5 이하 `LESS_ALIGNED`다. Adjusted alignment level은 80 이상 `VERY_HIGH_ALIGNMENT`, 70 이상 `HIGH_ALIGNMENT`, 60 이상 `FAVORABLE_ALIGNMENT`, 45 이상 `MIXED_ALIGNMENT`, 35 이상 `LOW_ALIGNMENT`, 미만 `VERY_LOW_ALIGNMENT`다. Candidate 또는 실제 transfer가 없어 delta가 0이어도 현재 base profile의 alignment는 계산한다.

### Ten-god flow와 context

각 layer의 adjusted element share에 normalized layer weight를 적용한 뒤, 기존 `categoryElement(dayMaster, category)`를 역 lookup하여 `companion/resource/output/wealth/officer` 5-category distribution으로 제공한다. 합계는 100%다. 이는 현재 오행 흐름의 diagnostic 분포이며 정재/편재 같은 음양 세분이나 category 길흉 점수를 만들지 않는다.

14A/B/C의 star activation, 삼재와 공망은 중복 제거한 tag context로만 모은다. 어떤 tag도 favorability, activation, alignment 또는 ten-god flow를 변경하지 않는다. `topInteractions`는 기존 source interaction ID와 기존 activation point를 정렬해 참조할 뿐 새 관계를 생성하거나 재점수하지 않는다.

### Period summary

Segment가 하나면 그 synthesis 값을 그대로 summary로 사용한다. 둘 이상이면 `segmentWeight=segmentDurationMilliseconds/periodDurationMilliseconds`로 favorability, activation, base/adjusted alignment와 delta를 duration-weighted 한다. 단순 평균이나 첫·마지막 대운 선택은 금지한다. 편의 summary에는 `peakActivationScore/peakSegmentId`, `maxPositiveDelta`, `maxNegativeDelta`를 추가하고 authoritative detail은 segment synthesis로 유지한다. 분석 가능한 Daeun segment가 없는 provider 범위 가장자리 period는 summary를 생성하지 않는다.

Synthetic 회귀는 Daeun 80/20, Seun 60/60일 때 favorability 71.25와 activation 37.5가 독립적으로 계산되는지 고정한다. 월운 70/60/90 favorability는 70.5다. 70%/30% multi-Daeun period는 duration weight를 그대로 적용하고 짧은 segment의 peak activation과 양·음 transformation delta 극값을 별도로 보존한다.

## FORTUNE MILESTONE 16 — Category Fortune Scores v1

버전은 `category-fortune-v1`, `category-score-v1`, `category-flow-matrix-v1`, `wealth-category-v1`, `relationship-category-v1`이다. 모든 coefficient, matrix, threshold는 `category-fortune.v1.ts` config에 둔다. Milestone 15의 favorability, activation, adjusted transformation alignment, tenGodFlow만 점수 입력으로 사용한다. Structure, usefulGod, transformation delta, 신살·삼재·공망은 context/evidence이며 재가산하지 않는다. 출력 점수는 사건 확률이 아니라 해당 분야의 구조적 support, activity 또는 pressure다.

### 공통 score와 flow matrix

Overall support는 `favorability×0.55+adjustedAlignment×0.45`, overall activity는 기존 activation 그대로다. 일반 분야 support는 `favorability×0.45+adjustedAlignment×0.35+flowQuality×0.20`, activity는 `activation×0.70+flowActivity×0.30`이다. Activation을 support에 넣지 않고 transformation delta도 adjusted alignment에 다시 더하지 않는다.

각 matrix는 companion/resource/output/wealth/officer에 -1~+1 coefficient를 갖는다. `signedFlow=Σ(tenGodFlowPercentage×coefficient)`, `flowQuality=clamp(50+signedFlow/2,0,100)`, `flowActivity=Σ(tenGodFlowPercentage×abs(coefficient))`다. Business는 `(-.15,.30,.85,.85,.35)`, career는 `(0,.65,.15,.10,1)`, study는 `(.10,1,.55,-.10,.35)` 순서다. MASTER_SPEC의 각 수치는 runtime fallback이 아니라 versioned config의 완전한 source다.

Support level은 80 이상 VERY_SUPPORTIVE, 70 이상 SUPPORTIVE, 60 이상 MODERATELY_SUPPORTIVE, 45 이상 MIXED, 35 이상 LOW_SUPPORT, 미만 PRESSURED다. Activity level은 0~14 LOW, 15~29 MODERATE, 30~49 HIGH, 50 이상 VERY_HIGH다. Expense pressure는 0~24 LOW, 25~49 MODERATE, 50~74 HIGH, 75 이상 VERY_HIGH다.

### Wealth

Income opportunity matrix는 `(-.35,0,.55,1,.15)`, business revenue는 `(-.20,.15,.80,1,.25)`, stable cashflow는 `(-.50,.35,0,.75,.55)`, asset accumulation은 `(-.70,.40,-.25,.80,.60)`이다. 각 세부 support는 공통 support 공식으로 계산한다. Wealth support는 income 0.30, business revenue 0.25, stable cashflow 0.25, asset accumulation 0.20 가중 평균이다. Wealth flow activity는 같은 네 지표의 flow activity를 동일 가중 평균한 뒤 공통 activity 공식에 넣는다.

Expense pressure matrix는 `(.80,-.20,.60,.30,.10)`이며 `activation×0.35+flowPressure×0.30+(100-favorability)×0.20+(100-adjustedAlignment)×0.15`다. 의미는 PRESSURE이며 support에 합치지 않는다. Expansion/investment matrix magnitude는 `(.30,.20,1,1,.20)`이고 `activation×0.60+expansionFlowActivity×0.40`인 ACTIVITY 지표다.

### Relationship와 Change

남성 opportunity/stability/formalization matrix는 각각 `(-.20,.20,.35,1,.40)`, `(-.25,.45,0,.75,.65)`, `(-.20,.50,0,.65,.80)`이다. 여성은 `(-.20,.20,.35,.15,1)`, `(-.25,.45,0,.25,.90)`, `(-.20,.50,0,.20,1)`이다. Generic fallback은 `(-.10,.20,.35,.50,.50)`, `(-.15,.45,0,.55,.55)`, `(-.10,.50,0,.50,.70)`이다. Relationship support는 opportunity 0.40, stability 0.35, formalization 0.25 가중 평균이다. Relationship flow activity도 같은 가중치로 합성해 공통 activity 공식에 넣는다. `traditionalPartnerCategory`는 male=wealth, female=officer, 정보 없음=GENERIC metadata이며 현대적 관계 성향이나 성적 지향을 추론하지 않는다.

Change support는 `favorability×0.50+adjustedAlignment×0.50`, activity는 activation 그대로다. 역마를 비롯한 tag는 context only다. 모든 support/activity/pressure 결과에는 factor value, weight, contribution evidence를 저장하여 합계를 재구성할 수 있다.

### Segment와 period summary

Daeun/Seun/Wolun 각 Milestone 15 synthesis snapshot과 `CATEGORY:{synthesisId}`로 1:1 연결한다. Seun/Wolun의 multi-Daeun period는 authoritative segment category 결과를 유지하며 Milestone 15의 exact duration weight를 그대로 사용한다. Summary는 각 분야 support/activity 및 wealth pressure/expansion을 duration-weighted하고, 전체 분야 중 peak activity score/category/segment와 peak expense pressure segment를 별도로 보존한다. 첫·마지막 대운 선택이나 단순 평균은 사용하지 않는다.

신살·삼재·공망·도화·역마·귀인·양인·괴강·백호는 tags/context로만 전달한다. Structure type과 usefulGod highest element도 설명용 context다. 어느 항목도 category score를 변경하지 않으며 돈, 매출, 승진, 합격, 연애, 결혼, 이직, 사고 같은 deterministic event field를 생성하지 않는다.
