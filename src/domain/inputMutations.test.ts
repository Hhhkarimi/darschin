import { describe, expect, it } from "vitest";
import { cloneDefaults } from "./defaults";
import { removeEquipment, removeInstructor, removePeriod, removeRoom, removeStudentGroup } from "./inputMutations";

describe("input mutations", () => {
  it("reassigns instructor and student group references before deletion", () => {
    const input = cloneDefaults();
    const nextInstructor = removeInstructor(input, "i-ahmadi", "i-rahimi");
    expect(nextInstructor.instructors.some((item) => item.id === "i-ahmadi")).toBe(false);
    expect(nextInstructor.courses.flatMap((course) => course.sessions).some((session) => session.instructorId === "i-ahmadi")).toBe(false);

    const nextGroup = removeStudentGroup(input, "g-cs-a", "g-cs-b");
    expect(nextGroup.studentGroups.some((item) => item.id === "g-cs-a")).toBe(false);
    expect(nextGroup.courses.flatMap((course) => course.sessions).some((session) => session.studentGroupId === "g-cs-a")).toBe(false);
  });

  it("cleans room and equipment references", () => {
    const input = cloneDefaults();
    input.courses[0].sessions[0].fixedRoomId = "r-a101";
    input.courses[0].sessions[0].preferredRoomIds = ["r-a101", "r-a202"];
    const withoutRoom = removeRoom(input, "r-a101");
    expect(withoutRoom.courses[0].sessions[0].fixedRoomId).toBeNull();
    expect(withoutRoom.courses[0].sessions[0].preferredRoomIds).toEqual(["r-a202"]);

    const withoutEquipment = removeEquipment(input, "projector");
    expect(withoutEquipment.rooms.every((room) => !room.equipmentIds.includes("projector"))).toBe(true);
    expect(withoutEquipment.courses.every((course) => !course.defaults.requiredEquipmentIds.includes("projector"))).toBe(true);
  });

  it("removes any period and remaps all slot references", () => {
    const input = cloneDefaults();
    input.closedSlots = ["sat:1", "sun:3"];
    input.courses[0].sessions[0].fixedSlot = "sat:1";
    input.instructors[0].timeRules.unavailableSlots = ["sun:3"];
    const next = removePeriod(input, 1);
    expect(next.periods.map((period) => period.index)).toEqual([0, 1, 2, 3, 4]);
    expect(next.closedSlots).toEqual(["sun:2"]);
    expect(next.courses[0].sessions[0].fixedSlot).toBeNull();
    expect(next.instructors[0].timeRules.unavailableSlots).toEqual(["sun:2"]);
  });
});
