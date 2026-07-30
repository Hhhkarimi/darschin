import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cloneDefaults } from "../domain/defaults";
import { solveFast } from "../domain/fastSolver";
import { ScheduleViews } from "./ScheduleViews";

describe("ScheduleViews", () => {
  it("shows days as rows and periods as columns in the accessible timetable", () => {
    const input = cloneDefaults();
    const result = solveFast(input);
    render(<ScheduleViews input={input} result={result} onResultChange={() => undefined} />);

    screen.getByRole("button", { name: "جدول دسترس‌پذیر" }).click();

    const table = screen.getByRole("table", { name: /روزهای هفته در ردیف و بازه‌های زمانی در ستون/ });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: input.days.find((day) => day.enabled)?.label })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: new RegExp(input.periods[0].label) })).toBeInTheDocument();
  });
});
