# Threat model — Darschin

Method: lightweight STRIDE with explicit resource-exhaustion analysis.

## Assets and trust boundaries

Protected assets include scheduling input, solver output, integrity of hard constraints, exported files, creator identity, application availability, and user trust.

Trust boundaries:

1. User-controlled manual, JSON, and Excel input entering React.
2. Browser to same-origin `/api/solve`.
3. Vercel Function to OR-Tools native dependency.
4. Application to downloaded JSON, CSV, and XLSX files.
5. Build dependency and deployment supply chain.

The current design intentionally has no database, authentication, analytics, localStorage, or schedule data in URLs.

## Risk register

| Threat | Likelihood | Impact | Current mitigation | Verification | Remaining risk |
|---|---:|---:|---|---|---|
| Oversized JSON/Excel | Medium | High | 2 MiB JSON, 4 MiB Excel, entity caps | unit and UI tests | Browser still allocates the selected file |
| Deep JSON or prototype keys | Medium | High | depth 30, dangerous-key rejection | malicious fixture tests | JSON.parse happens before traversal but size is capped |
| Duplicate identifiers/group numbers | High | High | validation in browser and API | domain tests | Excel users may need clearer row references |
| HTML/script-like names | Medium | High | React text rendering; no `dangerouslySetInnerHTML`; CSP | XSS regression tests | browser extensions remain outside control |
| CSV formula injection | Medium | High | quote escaping and formula prefixing | export tests with `= + - @` | spreadsheet behavior is not universal |
| Pathological solver input | Medium | High | 40-course exact cap, 1000-session cap, 285s solver limit, bounded fast attempts | load fixtures | 40 courses can still contain many candidate combinations |
| UI freezing in fast mode | Medium | Medium | bounded attempts and exact mode off-main-thread | long-task measurement | Web Worker remains future work |
| Third-party data leakage | Low | High | no analytics/CDN fonts; exact endpoint same origin | network inspection | Vercel operational logging is provider-controlled |
| Unsafe external links | Low | Medium | `noopener noreferrer` | DOM test | linked sites are external trust zones |
| Missing security headers | Low | High | CSP, frame-ancestors, nosniff, referrer and permissions policies | deployed header check | policy must be retested after new integrations |
| Vulnerable dependency | Medium | High | pinned versions, lockfile and audit policy | `npm audit`, Dependabot/CI recommended | transitive dependency risk remains |
| Secrets in repository | Low | High | no required secrets; `.env*` ignored | secret scan | deployment settings can still contain secrets |
| Sensitive data in URLs/index | Low | High | no URL state; robots disallow query variants/API; API `X-Robots-Tag` | crawl inspection | screenshots/history outside application control |
| Stale object URLs | Low | Medium | revoke after downloads | repeated-download test | ExcelJS buffers still require temporary memory |
| Incorrect MIME types | Low | Medium | explicit JSON/CSV/XLSX MIME types | export test | browser download handling varies |
| Misleading security/privacy claim | Medium | High | qualified visible copy and ADR | claim review | infrastructure behavior can change |

## Abuse controls intentionally not added

No backend account system, encryption layer, telemetry, rate-limit dependency, or database was added because there is no approved requirement. Platform-level abuse controls should be evaluated after real traffic is observed.
