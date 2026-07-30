# Darschin v3 specification

Status: approved through product clarification on 2026-07-30.

## 1. Problem statement

Department managers need to enter a semester’s course sections and independent weekly sessions, express hard constraints and soft preferences, produce a weekly timetable, understand partial or invalid results, adjust the timetable manually, and export trustworthy files. The existing heuristic-only SPA cannot provide an exact-mode solver, independent session data, Excel workflow, sufficient security controls, or accessible equivalent result views.

## 2. Selected solution

A Persian RTL guided workflow with:

- manual-first entry;
- official Excel template/import;
- JSON import/export;
- deterministic browser heuristic;
- OR-Tools CP-SAT Vercel Function for up to 40 course sections;
- automatic fallback;
- common result, diagnostic, manual-edit, and export contracts.

## 3. Target audiences

Primary: department manager.

Secondary: education-office staff, scheduling officers, instructors reviewing schedules, technical Excel/JSON users, and open-source evaluators.

## 4. Numbered user stories

1. As a department manager, I can create a course section with an immutable positive group number unique in the current dataset.
2. I can define defaults and create independent weekly sessions from them.
3. I can override session instructor, student group, enrollment, duration, week pattern, room type, equipment, fixed time, fixed room, and preferences.
4. I can mark a session required.
5. I can define common teaching days, periods, and breaks.
6. I can decide whether a multi-period session crosses a break; break time does not count toward duration.
7. I can define instructor and student-group unavailable and undesired days/slots.
8. I can define session unavailable and undesired days/slots.
9. I can define room unavailability, building, capacity, type, and equipment.
10. I can define hard or soft course-section conflicts that apply to all sessions.
11. I can rank preferred rooms and define preferred equipment.
12. I can configure global soft weights.
13. I can download a sample Excel workbook and import a completed workbook.
14. I can review validation errors before solving.
15. I can choose fast browser mode.
16. I can choose CP-SAT mode when course count is at most 40 and consent to transient server processing.
17. I see OPTIMAL as proven optimal and FEASIBLE as not proven optimal.
18. If exact mode fails to return a usable solution, fast mode runs automatically and is labeled fallback.
19. I can inspect full, partial, failed-required, and invalid results.
20. I can inspect reasons for unscheduled sessions.
21. I can view the timetable visually and in an equivalent semantic table.
22. I can filter by instructor, student group, course section, or room without changing underlying data.
23. I can manually move a session and immediately recalculate penalties and violations.
24. A hard-violating move requires severe confirmation and marks the result invalid for publication.
25. I can export CSV and multi-sheet Excel; invalid exports require confirmation and are labeled in filename and content.
26. Excel results include schedule, unscheduled sessions, violations, quality summary, and per-instructor/group/room sheets.
27. I can always find methodology, privacy, limitations, source, and creator information.

## 5. Solver behavior

- Every session is optional in the mathematical model to preserve partial diagnostics.
- Unscheduled sessions receive a dominant penalty.
- Required unscheduled sessions set overall status to `failed-required`.
- Hard constraints are never converted to weights.
- Week overlap: all overlaps odd/even; odd and even do not overlap.
- Multi-period sessions occupy one room throughout.
- Back-to-back different-building placements for a shared instructor or group are forbidden.
- Other same-day different-building pairs receive a fixed soft penalty.
- Same-course same-day and minimum-day-gap penalties are pairwise.
- No capacity-waste, late-period, or cross-session room-stability penalty exists.

## 6. Validation and diagnostics

Validation covers schema version, sizes, duplicates, immutable group-number reuse, references, positive counts, duration, slot format, fixed room, room/equipment references, conflicts, and exact-course cap.

Diagnostics distinguish input invalidity, a session with no static candidate, required-session failure, solver timeout/unknown, fallback, and manually introduced hard violations. Diagnostic reasons are helpful explanations, not complete infeasibility proofs.

## 7. Accessibility

- WCAG 2.2 AA target.
- Native form controls and explicit labels.
- Visible focus and skip link.
- Status announcements.
- Focus on validation summary after failure and result heading after solving.
- Visual schedule and semantic table equivalence.
- No color-only status communication.
- Reduced-motion support.
- Mobile horizontal overflow remains keyboard reachable.
- Dialog has modal semantics; focus trap is a follow-up if a dedicated dialog library is adopted.

## 8. Typography and RTL

Vazirmatn is the only font, delivered locally through the build. All surfaces, code-like inputs, exports, and prototypes use it. RTL is default; identifiers and time inputs may use LTR direction without another font.

## 9. Files

- JSON: maximum 2 MiB, depth 30, dangerous object keys rejected.
- Excel input: maximum 4 MiB; known sheets and headers.
- CSV: UTF-8 BOM, quoted fields, formula-leading values neutralized.
- XLSX: correct MIME, creator metadata, separate report sheets.
- Object URLs are revoked.

## 10. Security and privacy

- No analytics, database, authentication, or persistent browser storage.
- Exact mode uses same-origin POST and no-store responses.
- API accepts JSON only and caps body size.
- CSP, frame-ancestors, nosniff, referrer, and permissions policies are configured.
- No user data in URLs.
- No source maps in production.
- External links use safe attributes.

## 11. SEO and GEO

Public human-readable content is indexable. API, parameters, and user state are not. Source HTML contains canonical, Persian metadata, social metadata, factual JSON-LD, creator credit, source link, methodology, privacy, and limitations. No unsupported performance, security, scale, optimality, or endorsement claims are allowed.

## 12. Performance budgets

- Initial application JavaScript excluding lazy Excel chunk: target ≤250 KiB gzip.
- Vazirmatn payload: ship only variable weight asset needed by Fontsource; verify generated files.
- No solver long task in exact mode.
- Fast mode must remain bounded and future Web Worker migration is allowed.
- Good CWV targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75.

## 13. States

Required states: empty, editing, validation failure, ready, fast solving, exact solving, exact fallback, optimal, feasible, partial, failed-required, manually invalid, import error, export warning, and no-JavaScript.

## 14. Migration

Schema v3 is the production contract. A future migration utility may expand v2 `meetingsPerWeek` into sessions. This implementation does not silently reinterpret v2 input as v3.

## 15. Testing seams

Public stable seams:

- `validateInput`
- `buildCandidates`
- `validatePlacementSet`
- `evaluatePlacements`
- `solveFast`
- `solve_payload`
- CSV generation
- Excel import/export mapping
- result views and manual move workflow

## 16. Out of scope

Authentication, backend persistence, multi-semester history, automatic instructor assignment, automatic subgroup creation, analytics, institutional integrations, CP-SAT above 40 course sections, and mathematical proof for heuristic results.

## 17. Acceptance criteria

1. Production build and typecheck pass.
2. Exact-mode payload deploys with OR-Tools within Vercel bundle limits.
3. All supported hard constraints have browser validation and CP-SAT coverage tests.
4. Exact status labels match OR-Tools semantics.
5. Exact failure automatically yields labeled fast fallback.
6. JSON and spreadsheet malicious fixtures do not execute and are handled safely.
7. No project font other than Vazirmatn is requested.
8. Creator credit and exact approved links are visible and represented in metadata.
9. Visual schedule and semantic table contain equivalent sessions.
10. Invalid manual results export only after confirmation and contain «نامعتبر».
11. Security headers are present after deployment.
12. No private state is indexable or encoded in URLs.
