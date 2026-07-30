import { describe, expect, it } from "vitest";
import { cloneDefaults } from "./defaults";
import { solveFast } from "./fastSolver";
import { buildResultInsights } from "./resultInsights";

describe("manager result insights", () => {
  it("builds coverage, day load, room utilization and recommendations", () => {
    const input = cloneDefaults();
    const result = solveFast(input);
    const insights = buildResultInsights(input, result);
    expect(insights.totalSessions).toBe(3);
    expect(insights.coveragePercent).toBeGreaterThan(0);
    expect(insights.dayBars).toHaveLength(input.days.filter((day) => day.enabled).length);
    expect(insights.usedRooms).toBeGreaterThan(0);
    expect(insights.recommendations.length).toBeGreaterThan(0);
  });

  it("reports mandatory coverage separately", () => {
    const input = cloneDefaults();
    const result = solveFast(input);
    const insights = buildResultInsights(input, result);
    expect(insights.mandatoryTotal).toBe(2);
    expect(insights.mandatoryScheduled).toBeLessThanOrEqual(insights.mandatoryTotal);
  });
});
