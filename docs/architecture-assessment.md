# Architecture assessment

## Implemented boundaries

- `src/domain/types.ts`: public domain and result contracts.
- `src/domain/validation.ts`: client import and model validation.
- `src/domain/solverCommon.ts`: candidate generation, overlap semantics, hard-constraint verification, and unscheduled diagnostics.
- `src/domain/metrics.ts`: one source of truth for soft-penalty counts and objective evaluation.
- `src/domain/fastSolver.ts`: deterministic bounded multi-start heuristic.
- `src/workers/fastSolver.worker.ts`: off-main-thread fast execution.
- `src/services/solveService.ts`: solver selection, cancellation, exact-mode timeout, fallback, and independent client verification.
- `api/payload_validation.py`: server trust-boundary validation independent of OR-Tools.
- `api/cp_sat_solver.py`: CP-SAT model and lexicographic solve phases.
- `src/services/excel.ts` and `downloads.ts`: guarded import/export seams.
- React editor and result components consume domain contracts without embedding solver rules.

## Required changes completed

- Replaced the shared-duration course model with independent weekly sessions.
- Added a same-origin Python server boundary for CP-SAT.
- Added one result contract across both engines.
- Added explicit publishability, manual-edit, fallback, partial, and proven-optimal states.
- Removed synchronous fast solving from the browser main thread.
- Added explicit legacy JSON migration instead of silent semantic changes.

## Security fixes completed

- JSON/API/Excel size and structural limits.
- Deep-object and dangerous-key checks.
- Same-origin JSON-only API with no-store responses.
- Spreadsheet-formula neutralization for CSV and Excel.
- CSP, clickjacking, MIME-sniffing, referrer, and permissions controls.
- No user scheduling data in URLs, analytics, logs, localStorage, or a database.

## Performance work completed

- Fast solving is bounded, deterministic, cancellable, and runs in a Web Worker.
- Exact solving runs outside the browser with a 285-second internal budget.
- ExcelJS is dynamically imported.
- Object URLs are revoked after downloads.
- Exact mode is disabled above 40 course sections.

## Remaining optional architecture work

- Virtualize very large editor and result tables.
- Add stronger CP-SAT assumption-based infeasibility explanations.
- Add a persisted, versioned schema registry only if future integrations require it.
- Introduce authenticated server-side jobs only if five-minute synchronous solving proves insufficient and the product owner approves a backend expansion.
