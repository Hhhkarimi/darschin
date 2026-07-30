# CONTEXT — Darschin

## Product identity

Darschin («درس‌چین») is a Persian RTL university course-timetabling application created by Hossein Karimi.

- Production: https://darschin.vercel.app/
- Source: https://github.com/Hhhkarimi/darschin
- Creator: https://www.linkedin.com/in/hossein-karimi-8a452153/

The visible creator credit is always «کاری از حسین کریمی» and links to the approved LinkedIn URL.

## Primary audience

The primary audience is a university department manager. The default workflow therefore prioritizes manual, guided data entry, validation, review, explainable output, and Excel interoperability. JSON remains available for technical users.

## Stable domain decisions

- The application schedules one current semester dataset. It does not maintain cross-semester history.
- A course section is one independent offered group. Three offerings of Mathematics I count as three course sections.
- `groupNumber` is a positive integer, unique across the current semester dataset, immutable after creation, and not reusable after deletion within that dataset.
- A course section contains independent weekly sessions.
- A session inherits defaults when created, but stores resolved values and may override instructor, student group, enrollment, duration, room requirements, equipment, week pattern, fixed time, fixed room, and preferences.
- Each session has exactly one instructor and one student group as input data. The solver never assigns instructors or student groups.
- Workshop and laboratory sessions may occupy multiple teaching periods. They stay in the same room for their whole duration.
- Break time is not counted as teaching duration. A session may cross a configured common break only when `allowBreakCrossing` is enabled.
- Every session has a week pattern: all, odd, or even. Odd and even sessions may share resources at the same nominal slot.
- University closures, unavailable times, capacity, required room type, required equipment, fixed time, fixed room, resource collisions, hard course conflicts, and back-to-back travel between different buildings are hard constraints.
- Undesired times, ranked preferred rooms, preferred equipment, daily load, consecutive periods, gaps, building changes with at least one free period, same-course same-day pairs, minimum day gaps, and soft course conflicts are soft penalties.
- Room overcapacity and late-day placement are not penalized.
- Same-course same-day penalties are pairwise.
- Soft weights are global for the whole scheduling problem.
- Partial schedules are displayable. Unscheduled required sessions make the result unsuccessful, but the partial schedule remains visible.
- Manual moves may violate hard constraints only after a severe confirmation. Such results are labeled invalid for publication. CSV and Excel remain downloadable after confirmation and carry «نامعتبر» in filename and content.

## Solver policy

Two methods are presented:

1. `fast`: deterministic multi-start browser heuristic. No optimality proof.
2. `exact`: OR-Tools CP-SAT in a Vercel Python Function, only for at most 40 course sections.

The exact solver receives a maximum internal time budget of 285 seconds so that the request can finish within a five-minute function budget. Only CP-SAT `OPTIMAL` is described as proven optimal. `FEASIBLE` is valid but not proven optimal. If exact mode returns no usable solution, times out, or is unavailable, the same normalized input is automatically sent to the browser heuristic and the result is labeled as fallback.

Unscheduled sessions receive a very large objective penalty, making omission a last resort. Required sessions are still modeled as optional so that the system can return a partial diagnostic schedule instead of losing all useful output.

## Privacy and indexing

- Fast mode processes data in the browser.
- Exact mode sends the current input to the same-origin Vercel function for transient processing.
- The application intentionally does not persist scheduling data in a database, analytics service, localStorage, or public URL.
- Public explanatory content is indexable.
- API responses, query-string variants, and user-entered application state are excluded from indexing.

## Typography

Vazirmatn is the only project font. It is supplied through `@fontsource-variable/vazirmatn`, bundled by Vite, and served from the application origin. `sans-serif` is only a technical fallback.
