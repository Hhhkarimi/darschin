import { describe, expect, it } from "vitest";
import { cloneDefaults } from "./defaults";
import { solveFast } from "./fastSolver";

 describe("solveFast", () => {
  it("is deterministic for the same normalized input", () => {
    const input = cloneDefaults();
    expect(solveFast(input).schedule).toEqual(solveFast(input).schedule);
  });

  it("returns a partial failed result when a required session has no room", () => {
    const input = cloneDefaults();
    input.rooms = [];
    const result = solveFast(input);
    expect(result.status).toBe("invalid");
  });

  it("never claims proven optimality", () => {
    expect(solveFast(cloneDefaults()).status).not.toBe("optimal");
  });
});
