# 사주빛 평생사주 V5.6

Canonical catalog: `src/rules/lifetime-report.v5.6.ts`.

- 148p is the editorial example with eight calculated Daeun intervals; covers and product information are excluded. Topic count is independent of page count.
- PROLOGUE / PART 01–10 / SPECIAL / PART 11 / PART 12 / EPILOGUE share one catalog across input builder, generation, validation, sample, and UI.
- PART 07: SINGLE and DATING expose five family topics only. Married customers must explicitly select child status, giving nine or ten topics. Child evidence is excluded for unmarried customers; full report validation rejects related text, including summary and closing. The renderer also rejects leaked reports.
- Fixed pregnancy and grandchild headings are removed. Neither is generated automatically.
- PART 07 uses up to 11 editorial pages. Unmarried customers' six omitted pages expand existing personality, career, business, wealth, and yearly topics without adding headings.
- Annual chapter uses the requested year plus five following years. Daeun titles use actual calculated age ranges and pillars, with all calculated intervals retained. Thus actual length can differ from 148p.
- The prior 130-section minimum meant one section per physical page. V5.6 uses 90 minimum topics, retains the 90,000-character minimum and novelty/evidence checks, and scales chapter length floors to the new topic allocation. Child chapter requirements apply only to married customers.
- Engine rules and coefficients are unchanged. Preview uses the existing deterministic mock provider; paid live-model quality is not certified by mock validation.

Validation: unit/regression tests, three-state server rendering, production build, and Preview browser/API verification.
