import unittest

from api.payload_validation import validate_payload


class PayloadValidationTests(unittest.TestCase):
    def base(self):
        return {
            "schemaVersion": 3,
            "title": "test",
            "days": [{"id": "sat", "label": "شنبه", "enabled": True}],
            "periods": [{"index": 0, "label": "۱", "start": "08:00", "end": "09:30", "breakAfter": False}],
            "equipment": [],
            "instructors": [{"id": "i1", "name": "استاد", "timeRules": {"unavailableDays": [], "unavailableSlots": [], "undesiredDays": [], "undesiredSlots": []}, "softMaxDailyPeriods": 4, "softMaxConsecutivePeriods": 4}],
            "studentGroups": [{"id": "g1", "name": "گروه", "size": 20, "timeRules": {"unavailableDays": [], "unavailableSlots": [], "undesiredDays": [], "undesiredSlots": []}, "softMaxDailyPeriods": 4, "softMaxConsecutivePeriods": 4}],
            "rooms": [{"id": "r1", "name": "اتاق", "building": "الف", "capacity": 30, "roomType": "lecture", "equipmentIds": [], "unavailableSlots": []}],
            "courses": [{"id": "c1", "groupNumber": 1, "code": "C1", "name": "C1", "sessions": [{"id": "s1", "label": "s1", "required": False, "instructorId": "i1", "studentGroupId": "g1", "enrollment": 20, "durationPeriods": 1, "allowBreakCrossing": False, "roomType": "lecture", "requiredEquipmentIds": [], "preferredEquipmentIds": [], "weekPattern": "all", "fixedSlot": None, "fixedRoomId": None, "preferredRoomIds": [], "timeRules": {"unavailableDays": [], "unavailableSlots": [], "undesiredDays": [], "undesiredSlots": []}}]}],
            "conflicts": [],
            "closedSlots": [], "retiredGroupNumbers": [],
            "weights": {
                "unscheduledSession": 1000000, "instructorUndesiredTime": 1, "groupUndesiredTime": 1,
                "sessionUndesiredTime": 1, "preferredRoomRank": 1, "missingPreferredEquipment": 1,
                "dailyLoad": 1, "consecutivePeriods": 1, "resourceGaps": 1, "buildingTravel": 1,
                "sameCourseSameDay": 1, "minimumDayGap": 1, "softConflict": 1,
            },
            "settings": {"exactCourseLimit": 40, "exactTimeLimitSeconds": 285, "fastAttempts": 20, "minimumDayGap": 1, "defaultInstructorMaxDailyPeriods": 1, "defaultGroupMaxDailyPeriods": 1, "defaultInstructorMaxConsecutivePeriods": 1, "defaultGroupMaxConsecutivePeriods": 1},
        }

    def test_accepts_minimal_payload(self):
        self.assertEqual(validate_payload(self.base()), [])

    def test_rejects_more_than_40_courses(self):
        payload = self.base()
        template = payload["courses"][0]
        payload["courses"] = [{**template, "id": f"c{i}", "groupNumber": i + 1, "sessions": [{**template["sessions"][0], "id": f"s{i}"}]} for i in range(41)]
        self.assertTrue(any("40" in item for item in validate_payload(payload)))

    def test_rejects_duplicate_group_numbers(self):
        payload = self.base()
        template = payload["courses"][0]
        payload["courses"] = [
            template,
            {**template, "id": "c2", "groupNumber": 1, "code": "C2", "sessions": [{**template["sessions"][0], "id": "s2"}]},
        ]
        self.assertTrue(any("یکتا" in item for item in validate_payload(payload)))

    def test_rejects_dangerous_keys(self):
        payload = self.base()
        payload["constructor"] = {"prototype": {"polluted": True}}
        self.assertTrue(any("ناامن" in item for item in validate_payload(payload)))

    def test_rejects_missing_solver_setting(self):
        payload = self.base()
        del payload["settings"]["minimumDayGap"]
        self.assertTrue(any("تنظیمات لازم" in item for item in validate_payload(payload)))

    def test_rejects_invalid_weight(self):
        payload = self.base()
        payload["weights"]["softConflict"] = -1
        self.assertTrue(any("وزن" in item for item in validate_payload(payload)))


if __name__ == "__main__":
    unittest.main()
