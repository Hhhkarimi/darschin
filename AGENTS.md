# Repository instructions

- Communicate with the project owner in Persian.
- Keep code, identifiers, tests, commit messages, ADRs, and technical documents in the repository's existing language.
- Vazirmatn is the only project font. Do not add a font CDN or another project font.
- Preserve the visible creator credit «کاری از حسین کریمی» and its exact approved LinkedIn URL.
- Never describe a heuristic result as globally optimal. Only CP-SAT `OPTIMAL` may be labeled «بهینهٔ اثبات‌شده».
- Never claim a timetable is conflict-free without validating all supported hard constraints against the exact normalized input.
- Do not change hard constraints, penalty meanings, or default weights silently.
- Use vertical red-green-refactor slices and test public seams in `src/domain`, `src/services`, and `api`.
- Do not put user scheduling data in URLs, analytics, logs, or persistent browser storage.
- Sanitize spreadsheet exports against formula injection and enforce import size/depth limits.
- Run `npm run verify`, `npm run audit:prod`, `npm run check:python`, and `npm run test:api` before publishing.
