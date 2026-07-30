# پژوهش استانداردها و راهنمایی‌های بیرونی

تاریخ بررسی: 2026-07-30

## الزامات و راهنمایی‌های بیرونی

### Accessibility

WCAG 2.2 معیارهای تازه‌ای مانند visible focus، focus not obscured و حداقل target size را اضافه کرده است. برای درس‌چین، ورودی‌های جدولی، switcherها، dialogها و timetable باید با صفحه‌کلید قابل استفاده باشند و focus پس از خطا یا پایان حل به محل مناسب منتقل شود.

منابع:

- WCAG 2.2 overview and changes: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- Status messages: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- Error identification: https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- Focus order: https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html
- Tables tutorial: https://www.w3.org/WAI/tutorials/tables/
- Dialog modal pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

Project recommendation:

- Visual grid and semantic table must derive from the same result array.
- Do not emulate a spreadsheet grid unless full keyboard semantics are implemented.
- Use native controls for editors.
- Use `role=status`/`aria-live` for solver progress and move focus to validation summary or result heading.
- Minimum interactive target should be approximately 24 CSS pixels or larger, with larger primary controls.

### Performance

Current Core Web Vitals are LCP, INP, and CLS. “Good” thresholds at the 75th percentile are LCP ≤ 2.5 seconds, INP ≤ 200 ms, and CLS ≤ 0.1.

Sources:

- https://web.dev/articles/defining-core-web-vitals-thresholds
- https://web.dev/articles/optimize-inp

Project recommendation:

- Keep CP-SAT outside the browser main thread.
- Bound fast attempts and measure long tasks with large valid fixtures.
- Dynamically import ExcelJS.
- Self-host only required Vazirmatn assets through Vite.
- Budget initial JS before Excel/solver tooling: 250 KiB gzip target; Excel chunk excluded.

### SEO

Google documents that JavaScript content can be rendered, but testing rendered HTML remains necessary. Canonical links are most reliable in source HTML. Sitemaps should list canonical public URLs, not private or parameterized application states.

Sources:

- JavaScript SEO basics: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Canonical URLs: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Robots meta/X-Robots-Tag: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Structured-data policies: https://developers.google.com/search/docs/appearance/structured-data/sd-policies

Project recommendation:

- Index the public home content only.
- Exclude `/api/`, query-string prototype variants, and all user state.
- Put canonical, title, description, Open Graph, and JSON-LD in source HTML.
- Use `SoftwareApplication`/`WebApplication`, `Person`, and `WebSite` only for visible factual content.
- Do not add ratings, pricing, endorsements, or invented FAQ markup.

### GEO

No formal search-engine standard defines “GEO”. The project treats it as accurate extraction and citation support, not ranking manipulation.

Project recommendation:

- Answer “what, who, constraints, solver, guarantee, data processing, limits, creator, source” in visible concise prose.
- Keep claims synchronized with solver statuses.
- `llms.txt` is included as an experimental, non-authoritative discovery aid. It does not replace robots, sitemap, visible content, or structured data.
- Avoid hidden text and repetitive AI-targeted pages.

### Security and privacy

OWASP recommends safe DOM APIs, restrictive CSP, correct JSON content type, robust input validation, and explicit handling of spreadsheet formula injection.

Sources:

- DOM XSS prevention: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- CSP: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- HTTP headers: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- Input validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- CSV injection: https://owasp.org/www-community/attacks/CSV_Injection

Project recommendation:

- Treat all imported names as text.
- Cap size, depth, entities, and solver time.
- Prefix formula-leading spreadsheet cells and quote CSV fields.
- Do not claim browser-only processing when exact mode is selected.
- Do not add client-side storage by default.

### Vercel and OR-Tools

Vercel Python Functions support Python dependencies and currently document a 500 MB uncompressed standard bundle limit. Fluid Compute allows a five-minute Hobby function budget. OR-Tools CP-SAT uses integer models and distinguishes OPTIMAL, FEASIBLE, INFEASIBLE, MODEL_INVALID, and UNKNOWN.

Sources:

- Vercel Python runtime: https://vercel.com/docs/functions/runtimes/python
- Vercel duration: https://vercel.com/docs/functions/configuring-functions/duration
- CP-SAT: https://developers.google.com/optimization/cp/cp_solver
- Solver time limits: https://developers.google.com/optimization/cp/cp_tasks

Project recommendation:

- Configure 300 seconds at platform level and 285 seconds inside CP-SAT.
- Pin OR-Tools.
- Verify actual deployed bundle and cold-start behavior before claiming production readiness.
