import { describe, expect, it } from "vitest";
import { cloneDefaults } from "../domain/defaults";
import { solveFast } from "../domain/fastSolver";
import { buildTimetableMatrix } from "./excel";

describe("buildTimetableMatrix", () => {
  it("places enabled days in rows and periods in columns", () => {
    const input = cloneDefaults();
    const result = solveFast(input);
    const matrix = buildTimetableMatrix(input, result.schedule, false);
    const enabledDays = input.days.filter((day) => day.enabled);

    expect(matrix.headers[0]).toBe("روز / زمان");
    expect(matrix.headers).toHaveLength(input.periods.length + 1);
    expect(matrix.headers[1]).toContain(input.periods[0].label);
    expect(matrix.rows).toHaveLength(enabledDays.length);
    expect(matrix.rows[0][0]).toBe(enabledDays[0].label);

    const scheduled = result.schedule[0];
    const dayRow = enabledDays.findIndex((day) => day.id === scheduled.dayId);
    expect(String(matrix.rows[dayRow][scheduled.startPeriod + 1])).toContain(scheduled.courseCode);
  });
});
