# ADR 0004: Excel as the primary bulk data format

- Status: Accepted
- Date: 2026-07-30

## Decision

Manual guided entry is the primary experience. Excel is the supported bulk workflow preferred by department managers. JSON is secondary and technical.

The input workbook separates courses, sessions, instructors, student groups, rooms, equipment, conflicts, and settings. Result workbooks contain schedule, unscheduled sessions, violations, quality summary, and separate sheets per instructor, student group, and room.

CSV remains a flat human-readable export and applies spreadsheet-formula neutralization. Invalid schedules remain exportable after confirmation and are labeled in both filename and content.
