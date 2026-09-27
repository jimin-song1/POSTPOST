# M23 Trace / Calibration Audit Tooling v1

## Purpose

This tooling observes the frozen v1 engine. It does not alter coefficients, thresholds, rules, or customer UI. A trace connects one anonymous case to the existing production `SajuAnalysis` and shows the 41 calculation stages from input normalization through the `LIFETIME_GENERAL` interpretation input.

The trace is evidence for investigation, not a mechanism for fitting POSTPOST to another service.

## Architecture

- `trace-builder.ts`: projects the production result into the ordered 41-step audit schema.
- `reconstruction.ts`: independently rebuilds critical scores from existing evidence and contribution ledgers.
- `html-renderer.ts`: produces a collapsible, local-only review document with input → calculation → result columns.
- `summary.ts`: creates a non-ranking comparison row for finding repeated engine patterns and mismatches.
- `private-runner.ts`: accepts only anonymous `CASE-001` style files beneath an ignored private root.
- `calibration-trace.spec.ts`: uses the public synthetic fixture to verify determinism, reconstruction, privacy, and output parity.

Large Seun/Wolun collections remain complete at their score/evidence level, while deeply repeated interaction objects are summarized in the trace. Reconstruction checks retain the expected value, rebuilt value, numerical difference, and evidence IDs. The raw production result remains the source of truth.

## Private case format

Create `calibration/private/CASE-001.json`. This path is ignored by Git.

```json
{
  "caseId": "CASE-001",
  "input": {
    "name": "local-only",
    "gender": "female",
    "calendarType": "solar",
    "birthDate": "YYYY-MM-DD",
    "birthTime": "HH:MM",
    "birthTimeKnown": true,
    "birthCountry": "KR",
    "birthCityKnown": true,
    "birthCity": "local-only"
  },
  "assessments": [
    {
      "domain": "PERSONALITY",
      "classification": "UNKNOWN",
      "mismatchTypes": [],
      "notes": "local-only notes"
    }
  ],
  "externalComparisons": []
}
```

Run:

```sh
npm run calibration:private -- calibration/private/CASE-001.json
```

Outputs:

- `calibration/private/output/CASE-001.trace.json`
- `calibration/private/output/CASE-001.trace.html`
- `calibration/private/output/CASE-001.summary.json`

After adding multiple anonymous cases, create the cross-case pattern view:

```sh
npm run calibration:summary -- calibration/private/CASE-001.json calibration/private/CASE-002.json
```

This writes `calibration/private/output/calibration-summary.json`. It is explicitly marked as a pattern/mismatch audit rather than a ranking.

The runner rejects input and output paths outside:

- `calibration/private/**`
- `benchmarks/private/**`
- `fixtures/private/**`

It also stops with `TRACE_ERROR` if any reconstructable production score differs from its evidence reconstruction.

## Review order

1. Verify normalized time, absolute instant, natural time, solar-term boundary, pillars, hidden stems, and Ten Gods.
2. If a fact is wrong, classify it as `FACT_ERROR` and stop downstream interpretation review.
3. Review element, strength, structure, useful-god, fortune, category, wellness, and children reconstructions.
4. Record each domain as `MATCH`, `PARTIAL`, `MISMATCH`, or `UNKNOWN`.
5. Classify mismatches as `FACT_ERROR`, `SCHOOL_DIFFERENCE`, `COEFFICIENT_DIFFERENCE`, `INTERPRETATION_DIFFERENCE`, `USER_EXPERIENCE_MISMATCH`, or `TRACE_ERROR`.
6. Treat external services as comparison material only. Their disagreement never automatically makes POSTPOST wrong.

## Reconstruction coverage

- Native element contributions, seasonal multipliers, adjusted values, and total conservation
- Strength evidence sum and final score
- Structure quality evidence sum
- Per-engine useful-god normalization, effective weights, consensus/conflict adjustment, and final score
- Fortune favorability, activation, and transformation alignment independently
- Category support/activity evidence without combining the axes
- Wellness Daeun attention contributions
- Children bond, count tendency, symbolic energy, and Daeun activation

## Privacy

Public tests use `SYNTHETIC_INPUT` only. Default programmatic traces redact name, birth date, birth time, and city. The private runner includes those values only in ignored local output so fact-level review remains possible. No private case or generated trace may be committed.

## Current limitations

- The tool observes existing v1 evidence. A module cannot expose a coefficient or intermediate value that the production result itself does not retain.
- Large Wolun datasets produce substantial local JSON files; HTML uses samples for readability while reconstruction checks cover all periods.
- This milestone does not decide whether a mismatch warrants calibration. That decision requires multiple reviewed cases after fact verification.
