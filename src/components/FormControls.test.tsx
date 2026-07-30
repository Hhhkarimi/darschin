import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cloneDefaults } from "../domain/defaults";
import { FixedSlotSelect, SlotPicker } from "./FormControls";

describe("guided form controls", () => {
  it("shows human-readable fixed slot options instead of raw slot ids", () => {
    const input = cloneDefaults();
    render(<FixedSlotSelect input={input} value={null} onChange={() => undefined} />);
    expect(screen.getByRole("option", { name: /بازه ۱.*08:00/ })).toBeInTheDocument();
    expect(screen.queryByText("sat:0")).not.toBeInTheDocument();
  });

  it("renders a day-by-period slot matrix", () => {
    const input = cloneDefaults();
    render(<SlotPicker input={input} value={[]} onChange={() => undefined} ariaLabel="بازه‌های ممنوع" />);
    expect(screen.getByRole("checkbox", { name: /شنبه، بازه ۱/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "شنبه" })).toBeInTheDocument();
  });
});
