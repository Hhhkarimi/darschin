import { describe, expect, it } from "vitest";
import { cloneDefaults } from "../domain/defaults";
import { solveFast } from "../domain/fastSolver";
import { resultToCsv, safeFilenamePart } from "./downloads";

 describe("CSV integrity", () => {
  it("neutralizes spreadsheet formula prefixes", () => {
    const input = cloneDefaults();
    input.courses[0].name = "=HYPERLINK(\"https://example.com\")";
    const csv = resultToCsv(input, solveFast(input));
    expect(csv).toContain("'=HYPERLINK");
  });

  it("neutralizes full-width spreadsheet formula prefixes", () => {
    const input = cloneDefaults();
    input.courses[0].name = "＝2+2";
    expect(resultToCsv(input, solveFast(input))).toContain("'＝2+2");
  });

  it("removes filesystem-unsafe filename characters", () => {
    expect(safeFilenamePart('a/b:c*?"<>|')).toBe("a-b-c------");
  });
});
