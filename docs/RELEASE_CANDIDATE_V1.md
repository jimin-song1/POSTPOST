# POSTPOST Release Candidate v1 QA

Date: 2026-09-25  
Base: PR #29 merge `9ee2ec9dd33eec9bd7153c1e56ea225f823d450a`

## Decision

**NOT READY FOR PAID PRODUCTION RELEASE.** The deterministic product and customer UI are suitable for an RC, but the paid-release system is incomplete and the current deployment cannot guarantee persistent file caching or saved result access.

## Verified

- Final regression: **726 tests passed**; typecheck, production build and `git diff --check` passed.
- The deterministic engine was not changed. Canonical pillars remain `乙亥 / 乙酉 / 甲子 / 戊辰`, day master `甲`, raw elements `木3 火0 土2 金1 水2`.
- Korea natural-time 09:29/09:30, natural-midnight rollover, ipchun and all 12 solar-term month boundaries, first daeun start, calendar +10-year daeun boundaries, seun crossing a daeun boundary, and wolun crossing a daeun boundary are covered by start-inclusive/end-exclusive tests.
- Supported-range edges and overseas rejection remain explicit; unsupported countries are not silently treated as KST.
- Repeated deterministic subsets serialize identically.
- AI schema, grounding, invalid evidence, score/label/pillar/year fact locks, one repair only, timeout/provider failures, and deterministic-result immutability are covered by mock-provider tests.
- Provider input excludes name, city, raw birth date/time and the complete `birthInput` object.
- Mobile layouts at 375×667, 390×844 and 430×932 and desktop layouts at 1280×900 and 1440×1000 were checked using the committed synthetic fixture. At every viewport `documentElement.scrollWidth <= innerWidth`; 22 semantic headings and no unnamed buttons were found. The result uses visible focus styles and text labels in addition to color. Exactly 12 wolun cards for the selected seun were present; the 802+ source rows were not mounted.
- Production build succeeds without an OpenAI key. Deterministic analysis remains available; an AI request returns an isolated provider configuration failure.

## Screenshots

- `qa-screenshots/result-375x667.png`
- `qa-screenshots/result-390x844.png`
- `qa-screenshots/result-430x932.png`
- `qa-screenshots/result-1280x900.png`
- `qa-screenshots/result-1440x1000.png`

## Live OpenAI smoke

Not run: `OPENAI_API_KEY` is unavailable in this secure local environment. COMPREHENSIVE, WEALTH, BUSINESS, RELATIONSHIP and YEARLY live results therefore remain unverified for provider success, live copy quality, token metadata and production cache read/write. CI continues to avoid live API use.

## Production cache

The file cache passes local persistence, cache hit/miss and corrupt-entry recovery tests. The linked deployment is Vercel/serverless; its function filesystem is ephemeral and must not be treated as durable production storage. Keep the M17 abstraction, but connect a durable backend before paid release.

## Observability and privacy

Server logs include request/provider identifiers, analysis hash, report and model versions, latency, token usage, cache hit/miss, validation status, repair and error code paths. Static audit found no committed `.env`, secret value, client API key access, complete prompt/response logging, or complete birth-input logging. Provider input remains minimal and the customer header shows only display name, gender context, calendar basis and pillars.

## Release blockers

1. No payment flow, post-payment entitlement, duplicate-payment protection, or refund/cancellation integration exists.
2. No durable result store or account-based reload/relogin/cross-device retrieval exists.
3. File cache is not durable on the current serverless deployment target.
4. The required five-report live OpenAI smoke has not been run with a production-like model configuration.
5. Operational policy and monitoring for paid-service failures have not been demonstrated end to end.

## Non-blocking follow-ups

- Add automated browser accessibility tooling and performance budgets to CI.
- Correlate cache hit/miss events with the interpretation request ID in one structured event.
- Move future QA screenshots to a dedicated release artifact system once one is available.
