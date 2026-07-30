# ADR 0002: Browser heuristic plus OR-Tools CP-SAT

- Status: Accepted
- Date: 2026-07-30

## Context

Managers need both a private, responsive option and a stronger optimization option. OR-Tools does not provide an official browser JavaScript API. Vercel supports Python Functions and dependency installation.

## Decision

Keep a deterministic browser heuristic as `fast` mode and add OR-Tools CP-SAT as `exact` mode in `api/solve.py`.

- Exact mode is limited to 40 course sections.
- CP-SAT receives at most 285 seconds.
- Vercel function duration is 300 seconds.
- Only `OPTIMAL` means proven optimal.
- `FEASIBLE` means valid but not proven optimal.
- `UNKNOWN`, timeout, network failure, or unusable response triggers the browser fallback.

## Consequences

- Exact mode sends data to Vercel and must disclose that before execution.
- The two engines share the same public input and result contracts.
- A large unscheduled-session penalty makes omission a last resort while still allowing partial diagnostics.
- Results must identify engine, solver status, fallback reason, and publishability.
