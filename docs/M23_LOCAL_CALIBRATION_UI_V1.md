# M23 Local Calibration UI v1

This workbench is deliberately local-only. It does not add a customer route, authentication, remote storage, analytics, or public fixtures.

## Enable locally

Run the development server with `CALIBRATION_MODE=1` and open `/dev/calibration`. Both the explicit flag and a non-production `NODE_ENV` are required. Production and Vercel builds return 404 from the page and every API endpoint.

Private case files are written with owner-only permissions below `calibration/private/cases/` and are ignored by Git. A case uses `CASE-001.input.json`, `CASE-001.audit.json`, `CASE-001.result.json`, and `CASE-001.trace.json`. The API validates `^CASE-\d{3,}$` and resolves only exact filenames below that directory.

The analyze action calls `calculateSaju` and then `buildCalibrationTrace`; there is no calibration-specific engine. Trace details are fetched one step at a time, so the 802+ monthly periods are not mounted in the initial DOM.

Only synthetic data may be used for committed tests and screenshots. Real cases must wait for explicit UI approval.
