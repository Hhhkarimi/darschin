import { describe, expect, it } from "vitest";
import { cloneDefaults } from "./defaults";
import { allSessions, backToBackTravelConflict, buildCandidates } from "./solverCommon";

 describe("buildCandidates", () => {
  it("keeps a fixed session at its exact start", () => {
    const input = cloneDefaults();
    const ref = allSessions(input).find((item) => item.session.id === "s-math1-fixed")!;
    const candidates = buildCandidates(ref, input);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((item) => item.dayId === "sat" && item.startPeriod === 1)).toBe(true);
  });

  it("allows a two-period laboratory to cross the common break only when enabled", () => {
    const input = cloneDefaults();
    const ref = allSessions(input).find((item) => item.session.id === "s-db-lab")!;
    ref.session.fixedSlot = "sat:2";
    ref.session.allowBreakCrossing = true;
    expect(buildCandidates(ref, input).some((item) => item.occupiedPeriods.join(",") === "2,3")).toBe(true);
    ref.session.allowBreakCrossing = false;
    expect(buildCandidates(ref, input)).toEqual([]);
  });

  it("does not penalize or reject overcapacity rooms as long as capacity is sufficient", () => {
    const input = cloneDefaults();
    const ref = allSessions(input)[0];
    expect(buildCandidates(ref, input).some((item) => item.roomId === "r-a101")).toBe(true);
  });
  it("treats an adjacent period separated by a configured break as soft travel", () => {
    const input = cloneDefaults();
    input.courses[0].sessions[0].fixedSlot = null;
    const refs = allSessions(input);
    const first = { sessionId: refs[0].session.id, courseId: refs[0].course.id, dayId: "sat", startPeriod: 2, occupiedPeriods: [2], roomId: "r-a101" };
    const second = { sessionId: refs[1].session.id, courseId: refs[1].course.id, dayId: "sat", startPeriod: 3, occupiedPeriods: [3], roomId: "r-comp1" };
    expect(backToBackTravelConflict(first, second, refs[0], refs[1], input)).toBe(false);
  });

});
