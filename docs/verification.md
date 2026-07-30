# Verification record

Date: 2026-07-30

## Executed successfully in the delivery environment

| Check | Command | Result |
|---|---|---|
| Offline structural TypeScript check | `tsc -p tools/offline-verification/tsconfig.local.json --noEmit --noUnusedLocals --noUnusedParameters` | PASS |
| Domain JavaScript compilation | `tsc -p tools/offline-verification/tsconfig.domain.json` | PASS |
| Domain smoke test | `node /tmp/darschin-smoke.cjs` | PASS: 3/3 sample sessions, 0 hard violations |
| Python syntax | `python3 -m compileall -q api` | PASS |
| API validation tests | `python3 -m unittest discover -s api/tests -v` | PASS: 6 validation tests; 2 CP-SAT tests skipped |
| Dependency-free metadata/security check | `node scripts/check-static.mjs` | PASS |
| Excel template inspection | `artifact_tool` import/inspection | PASS: 9 sheets, 0 formula errors |
| JSON/CSP/structured-data syntax | included in `check:static` | PASS |
| Typography/credit/source claim checks | included in `check:static` | PASS |

## Not executable in this environment

- `npm install` failed because the provided internal npm registry returned HTTP 404 for `@eslint/js@9.39.5`.
- Consequently real dependency-backed `npm run typecheck`, ESLint, Vitest, Vite production build, bundle analysis, browser/E2E accessibility checks, and `npm audit` could not run here.
- `pip install ortools==9.15.6755` failed because the provided internal Python package mirror exposed no OR-Tools distributions.
- Consequently the two real CP-SAT tests, Vercel function bundle/cold-start verification, deployed security-header inspection, and five-minute production solve were not executable here.
- No live deployment was changed, and no Git branch, commit, or pull request was created.

## Required terminal verification before production deployment

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run check:static
npm audit --omit=dev --audit-level=high

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m compileall -q api
python -m unittest discover -s api/tests -p 'test_*.py' -v

vercel dev
vercel deploy
```

After deployment, verify response headers, `/api/solve`, JSON-LD, robots, sitemap, rendered Persian content, font requests, Core Web Vitals, and CP-SAT behavior with both feasible and timed-out fixtures.
