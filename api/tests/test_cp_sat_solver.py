import unittest

try:
    from api.cp_sat_solver import solve_payload
except ModuleNotFoundError as error:
    solve_payload = None
    IMPORT_ERROR = error
else:
    IMPORT_ERROR = None


def base_payload():
    return {
        "schemaVersion": 3,
        "title": "test",
        "days": [{"id": "sat", "label": "شنبه", "enabled": True}],
        "periods": [
            {"index": 0, "label": "۱", "start": "08:00", "end": "09:30", "breakAfter": False},
            {"index": 1, "label": "۲", "start": "09:45", "end": "11:15", "breakAfter": False},
        ],
        "closedSlots": [],
        "equipment": [],
        "instructors": [{"id": "i1", "name": "استاد", "timeRules": {"unavailableDays": [], "unavailableSlots": [], "undesiredDays": [], "undesiredSlots": []}, "softMaxDailyPeriods": 4, "softMaxConsecutivePeriods": 4}],
        "studentGroups": [{"id": "g1", "name": "گروه", "size": 20, "timeRules": {"unavailableDays": [], "unavailableSlots": [], "undesiredDays": [], "undesiredSlots": []}, "softMaxDailyPeriods": 4, "softMaxConsecutivePeriods": 4}],
        "rooms": [{"id": "r1", "name": "اتاق", "building": "الف", "capacity": 30, "roomType": "lecture", "equipmentIds": [], "unavailableSlots": []}],
        "courses": [], "conflicts": [], "retiredGroupNumbers": [],
        "weights": {
            "unscheduledSession": 1000000, "instructorUndesiredTime": 1, "groupUndesiredTime": 1,
            "sessionUndesiredTime": 1, "preferredRoomRank": 1, "missingPreferredEquipment": 1,
            "dailyLoad": 1, "consecutivePeriods": 1, "resourceGaps": 1, "buildingTravel": 1,
            "sameCourseSameDay": 1, "minimumDayGap": 1, "softConflict": 1,
        },
        "settings": {
            "exactCourseLimit": 40, "exactTimeLimitSeconds": 5, "fastAttempts": 20, "minimumDayGap": 1,
            "defaultInstructorMaxDailyPeriods": 4, "defaultGroupMaxDailyPeriods": 4,
            "defaultInstructorMaxConsecutivePeriods": 4, "defaultGroupMaxConsecutivePeriods": 4,
        },
    }


def session(session_id, pattern="all", required=False, enrollment=20):
    return {
        "id": session_id, "label": session_id, "required": required, "instructorId": "i1", "studentGroupId": "g1",
        "enrollment": enrollment, "durationPeriods": 1, "allowBreakCrossing": False, "roomType": "lecture",
        "requiredEquipmentIds": [], "preferredEquipmentIds": [], "weekPattern": pattern,
        "fixedSlot": "sat:0", "fixedRoomId": "r1", "preferredRoomIds": [],
        "timeRules": {"unavailableDays": [], "unavailableSlots": [], "undesiredDays": [], "undesiredSlots": []},
    }


@unittest.skipIf(solve_payload is None, f"OR-Tools is not installed: {IMPORT_ERROR}")
class CpSatSolverTests(unittest.TestCase):
    def test_odd_and_even_sessions_may_share_room_and_time(self):
        payload = base_payload()
        payload["courses"] = [
            {"id": "c1", "groupNumber": 1, "code": "C1", "name": "C1", "sessions": [session("s1", "odd")]},
            {"id": "c2", "groupNumber": 2, "code": "C2", "name": "C2", "sessions": [session("s2", "even")]},
        ]
        result = solve_payload(payload)
        self.assertIn(result["solverStatus"], {"OPTIMAL", "FEASIBLE"})
        self.assertEqual(len(result["schedule"]), 2)
        self.assertEqual(result["unscheduled"], [])

    def test_impossible_required_session_marks_result_failed(self):
        payload = base_payload()
        payload["courses"] = [{"id": "c1", "groupNumber": 1, "code": "C1", "name": "C1", "sessions": [session("s1", required=True, enrollment=999)]}]
        result = solve_payload(payload)
        self.assertEqual(result["status"], "failed-required")
        self.assertEqual(len(result["unscheduled"]), 1)
        self.assertFalse(result["publishable"])


if __name__ == "__main__":
    unittest.main()
