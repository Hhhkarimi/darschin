import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cloneDefaults } from "../domain/defaults";
import { solveFast } from "../domain/fastSolver";
import { ScheduleViews } from "./ScheduleViews";

 describe("ScheduleViews", () => {
  it("offers an equivalent accessible table view", async () => {
    const input = cloneDefaults();
    const result = solveFast(input);
    render(<ScheduleViews input={input} result={result} onResultChange={() => undefined} />);
    screen.getByRole("button", { name: "جدول دسترس‌پذیر" }).click();
    expect(screen.getByRole("table", { name: /همهٔ اطلاعات/ })).toBeInTheDocument();
  });
});
