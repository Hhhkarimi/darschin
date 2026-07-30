import { describe, expect, it } from "vitest";
import { migrateImportedInput } from "./migrate";

 describe("legacy JSON migration", () => {
  it("creates independent sessions and converts fixed slots", () => {
    const result = migrateImportedInput({
      courses: [{ id: "C1", code: "MATH-1", name: "ریاضی ۱", instructors: ["استاد الف"], studentGroups: ["گروه ۱"], enrollment: 20, meetingsPerWeek: 2, duration: 1, roomType: "lecture", requiredFeatures: ["پروژکتور"], fixedSlots: { "1": "0-1" } }],
      rooms: [{ id: "R1", name: "کلاس", building: "الف", capacity: 30, roomType: "lecture", features: ["پروژکتور"], unavailableSlots: [] }],
      instructorRules: {}, groupRules: {}, settings: {}, weights: {}, conflicts: [],
    });
    expect(result.migrated).toBe(true);
    expect(result.input.courses[0].sessions).toHaveLength(2);
    expect(result.input.courses[0].sessions[0].fixedSlot).toBe("sat:1");
  });
});
