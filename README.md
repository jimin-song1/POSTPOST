# POSTPOST
POST

## SAJU CORE MILESTONE 1

양력·한국 출생·출생시간 확인 입력은 fixture 없이 년주·월주·일주·시주를 계산합니다. 현대 한국 시간규칙은 법정시각 −30분, 균시차·야자시 미적용, 보정시각 00:00 일주 변경입니다. 년주는 입춘, 월주는 12절의 정확한 절입 순간을 기준으로 하며 절기 데이터는 JPL DE440 기반 provider를 사용합니다. 절기 데이터 범위는 1900~2100년이며, 출생 입력 범위는 이전·다음 절기 조회가 가능한 1900-01-07~2099-12-31입니다. 년주·월주는 실제 출생 순간과 절입을 비교하고, 일주·시주는 보정 시각을 사용합니다.

음력 변환, 출생시간 미상 원국, 해외 시간대·경도 보정과 격국 고급 성패·특수격·용신·신살·운 계산은 아직 구현하지 않았으며 응답에 `not_implemented` 또는 `unsupported_input`으로 표시합니다.

## 출생지 처리 규칙 v1

- 한국 출생이며 지역을 모르는 경우 서울특별시로 대체하고, 화면과 JSON에 추정 여부 및 이유를 명시합니다.
- 해외 출생은 출생도시를 필수로 검증한 뒤 HTTP 422 `UNSUPPORTED_BIRTH_COUNTRY`로 거부합니다.
- 새 요청은 `birthCountry`, `birthCityKnown`, `birthCity`를 사용합니다. 기존 `birthCity`만 보내는 요청도 한국·도시 확인 상태로 호환됩니다.
- 결과는 `birthNormalized.birthPlace`에서 확인할 수 있습니다. 자세한 계약은 [MASTER_SPEC](docs/MASTER_SPEC.md#birth-place-rules-v1)을 참조하세요.

검증: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`. 세부 규칙과 근거는 [MASTER SPEC](docs/MASTER_SPEC.md)을 참조하세요.

## SAJU CORE MILESTONE 2

십성, 12지지 지장간(본기·중기·여기), 10천간 십이운성, 오행 기본 가중 세력과 일간 세력, 원국 천간·지지 관계를 규칙표 기반으로 계산합니다. `fiveElements.rawCount`는 보이는 여덟 글자, `nativeStrength`는 원국 그대로의 가중 점수, `adjustedStrength`는 합 후보의 기여도 일부를 이동한 별도 파생 점수입니다. `strength`는 득령·통근·득지·득세·득시를 사용하고 원래 점수를 보존합니다. `relations`는 합·충·형·파·해·원진을 찾고, `transformation`은 합의 조건과 경쟁·방해를 평가합니다. 충으로 인한 일간 뿌리 손상은 `strength.adjustments`에 별도 기록합니다. `structure`는 월지 본기와 투간을 중심으로 기본 격과 건록·양인 후보를 분리하고 `qualityEvaluation`은 기본 8격의 지원·손상·구제를 별도로 평가합니다. 최종 신강신약 재판정, 고급 격국 성패·특수격·용신, 신살, 세운·월운, AI 해석은 아직 `not_implemented`입니다. [격국 규칙표](docs/MASTER_SPEC.md#core-milestone-9a--구조적-상태손상구제)를 참고하세요.
