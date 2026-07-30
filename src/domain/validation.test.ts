import { describe, expect, it } from "vitest";
import { cloneDefaults } from "./defaults";
import { parseJsonInput, validateInput } from "./validation";

 describe("validateInput", () => {
  it("accepts the bundled sample", () => {
    expect(validateInput(cloneDefaults()).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("rejects duplicate immutable group numbers", () => {
    const input = cloneDefaults();
    input.courses[1].groupNumber = input.courses[0].groupNumber;
    expect(validateInput(input).some((issue) => issue.message.includes("تکراری"))).toBe(true);
  });

  it("rejects a retired group number", () => {
    const input = cloneDefaults();
    input.retiredGroupNumbers = [input.courses[0].groupNumber];
    expect(validateInput(input).some((issue) => issue.message.includes("قبلاً"))).toBe(true);
  });
});

describe("parseJsonInput", () => {
  it("rejects dangerous object keys", () => {
    expect(() => parseJsonInput('{"constructor":{"prototype":{"polluted":true}}}')).toThrow(/ناامن/);
  });

  it("rejects excessive nesting", () => {
    const value = `${"[".repeat(32)}0${"]".repeat(32)}`;
    expect(() => parseJsonInput(value)).toThrow(/عمق/);
  });
});
