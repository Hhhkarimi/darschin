# ADR 0001: Independent weekly sessions

- Status: Accepted
- Date: 2026-07-30

## Context

The former model stored `meetingsPerWeek` and one shared duration and resource definition on a course section. Real three-credit courses may have one fixed and one variable meeting; workshops and laboratories may have different duration, equipment, room type, or instructor from another meeting.

## Decision

A `CourseSection` owns one or more independent `WeeklySession` records. Course-level defaults are used only when creating a session. Each session stores resolved values and can override all scheduling-relevant properties.

`groupNumber` identifies the offered group, is a positive integer unique in the current dataset, and cannot be reused after deletion in that dataset.

## Consequences

- Solver variables and diagnostics use session identifiers.
- Excel has separate `دروس` and `جلسات` sheets.
- Migration from schema v2 requires expanding `meetingsPerWeek` into sessions.
- The UI keeps common data simple through inherited defaults while preserving per-session control.
