# Quality and testing

The project uses a single local quality gate, run with `npm run test:quality`.

## Automated criteria

- **Coverage:** 100% of statements, branches, functions and lines in `src/game`.
- **Controls:** keyboard, pause, focus, firing, touch directional pad, direct arena joystick and pointer cancellation.
- **Accessibility:** axe-core checks in ready and paused states on desktop and mobile, covering WCAG 2 A/AA, 2.1 A/AA and 2.2 AA.
- **Performance:** a production build measured over 120 frames at `1440 × 1000` desktop and `390 × 844` mobile viewports.
- **Security:** CSP assertions, absence of dynamic execution and inline handlers, unexpected-origin blocking and dependency auditing.
- **Release readiness:** a reproducible production build.

## Performance budgets

| Metric | Limit |
| --- | ---: |
| Local load | 2,500 ms |
| Average frame | 24 ms |
| p95 frame | 34 ms |
| Long tasks | 2 |
| Initial transfer | 4.5 MB |
| JavaScript heap | 128 MB |

The thresholds are deliberately conservative to avoid false positives in a headless browser. Measured results are printed on every run, and exceeding any budget fails the test.

## Continuous integration

GitHub Actions runs the complete quality gate on every push to `main`, on every pull request targeting `main`, and on manual dispatch. The workflow uses Node.js 24 and a Chromium browser on Ubuntu. Coverage output and the production build are retained as downloadable workflow artefacts.

The workflow receives read-only repository permissions and uses `npm ci` for deterministic dependency installation.

## Commands

```bash
npm run test:coverage
npm run test:e2e
npm run test:performance
npm run test:security
npm run test:quality
```
