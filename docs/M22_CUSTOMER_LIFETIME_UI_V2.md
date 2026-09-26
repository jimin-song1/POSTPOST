# M22 Customer Input + Lifetime Result UI v2

## Scope

- Customer flow: input → deterministic analysis → `LIFETIME_GENERAL` interpretation → 18-chapter result.
- The relationship selection is interpretation context only and is excluded from the deterministic input payload.
- Lunar dates, overseas births, and unknown birth time are blocked with explicit guidance because the current engine does not fully support them.
- No payment, persistence, coefficient, wellness, children, or deterministic engine behavior was added or changed.

## Input experience

- Exact relationship values: `SINGLE`, `DATING`, `MARRIED`.
- Searchable, anchored country and Korean city listboxes with keyboard navigation and no layout shift.
- Unknown Korean city reuses the Seoul-default engine rule with a visible notice.
- Strict date (`YYYYMMDD` or `YYYY-MM-DD`) and time (`HHmm` or `HH:mm`) normalization without local `Date` timezone conversion.
- Hour and every minute from 00 through 59 remain selectable.

## Result experience

- Cover plus chapters 01–18 in the approved order.
- Korean-first narrative with professional terms and evidence inside the collapsed chapter 18.
- Five-element, wellness, children, useful-energy, and ten-period Daeun views use deterministic values only.
- Support and activation remain separate. Child gender energy and count are explicitly described as traditional tendencies, not real-world predictions.
- AI pending and failure states do not hide the deterministic report.

## Browser QA

- Real Chromium rendering captured at 375×667, 390×844, 430×932, 1280×900, and 1440×1000.
- The capture script fails when `scrollWidth > clientWidth`.
- The searchable dropdown was also inspected interactively: opening it did not change document height, its list remained internally scrollable, and the selected value persisted.

Screenshots are stored in [`docs/qa-screenshots/m22`](./qa-screenshots/m22).

## M22.1 report polish

- Replaced repeated preview boilerplate with chapter-specific Korean editorial copy.
- Expanded personality, work, money, relationship, children, and wellness chapters to 4–8 meaningful paragraphs.
- Changed Daeun labels to Korean-first names with secondary Hanja and a selected-period indicator.
- Clarified that wellness percentages are element composition, not health ability scores.
- Placed child-bond and symbolic gender explanations directly beside their metrics.
- Replaced the cover placeholder circle with a text-free line ornament and reduced repeated chapter-card styling.
- Labeled professional pillar values as `천간 십성` to prevent misreading.
- Re-captured all screenshots from a production server; no Next.js development indicator is present.

Polished production screenshots are stored in [`docs/qa-screenshots/m22-1`](./qa-screenshots/m22-1).

## Verification

- Tests: 38 files, 788 tests passed.
- TypeScript: passed.
- Production build: passed.
- Diff check: passed.
- Privacy: synthetic preview only; no real personal fixture, secret, or live OpenAI dependency.
