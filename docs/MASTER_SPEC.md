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
- 지장간 및 십이운성 전체 표
- 십성, 오행 가중 세력, 관계·합화, 신강신약, 격국
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

각 지장간은 천간·한글 천간·오행·음양·일간 기준 십성·역할을 가진다. 가중 세력은 계산하지 않는다.

### 십이운성 `twelve-stages-v1`

순서: 장생 長生 → 목욕 沐浴 → 관대 冠帶 → 건록 建祿 → 제왕 帝旺 → 쇠 衰 → 병 病 → 사 死 → 묘 墓 → 절 絶 → 태 胎 → 양 養. 양간은 지지 순행, 음간은 역행한다.

| 일간 | 甲 | 乙 | 丙 | 丁 | 戊 | 己 | 庚 | 辛 | 壬 | 癸 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 장생 시작 | 亥 | 午 | 寅 | 酉 | 寅 | 酉 | 巳 | 子 | 申 | 卯 |
| 방향 | 순 | 역 | 순 | 역 | 순 | 역 | 순 | 역 | 순 | 역 |

일간 기준으로 년지·월지·일지·시지 각각의 단계를 반환한다. 다른 명리 모듈의 `not_implemented` 상태는 유지한다.
