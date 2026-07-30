from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from typing import Any, Iterable

from ortools.sat.python import cp_model

from api.payload_validation import MAX_BODY_BYTES, MAX_COURSES_EXACT, MAX_SESSIONS, validate_payload as _validate_payload


@dataclass(frozen=True)
class SessionRef:
    course: dict[str, Any]
    session: dict[str, Any]


@dataclass(frozen=True)
class Candidate:
    session_id: str
    course_id: str
    day_id: str
    day_index: int
    start_period: int
    occupied_periods: tuple[int, ...]
    room_id: str
    room_index: int
    building: str


def _patterns_overlap(first: str, second: str) -> bool:
    return first == "all" or second == "all" or first == second


def _active_in_week(pattern: str, week: str) -> bool:
    return pattern == "all" or pattern == week


def _slot_key(day_id: str, period: int) -> str:
    return f"{day_id}:{period}"


def _all_sessions(payload: dict[str, Any]) -> list[SessionRef]:
    return [SessionRef(course, session) for course in payload["courses"] for session in course["sessions"]]


def _rules_block(rules: dict[str, Any], day_id: str, occupied: Iterable[int], kind: str) -> bool:
    days = set(rules.get(f"{kind}Days", []))
    slots = set(rules.get(f"{kind}Slots", []))
    return day_id in days or any(_slot_key(day_id, period) in slots for period in occupied)


def _occupied_periods(periods: list[dict[str, Any]], start: int, duration: int, allow_break_crossing: bool) -> tuple[int, ...] | None:
    occupied: list[int] = []
    cursor = start
    while len(occupied) < duration and cursor < len(periods):
        occupied.append(cursor)
        if not allow_break_crossing and periods[cursor].get("breakAfter") and len(occupied) < duration:
            return None
        cursor += 1
    return tuple(occupied) if len(occupied) == duration else None


def _room_matches(session: dict[str, Any], room: dict[str, Any]) -> bool:
    fixed_room = session.get("fixedRoomId")
    if fixed_room and fixed_room != room["id"]:
        return False
    if int(room["capacity"]) < int(session["enrollment"]):
        return False
    if session.get("roomType", "any") != "any" and session["roomType"] != room["roomType"]:
        return False
    room_equipment = set(room.get("equipmentIds", []))
    return all(equipment in room_equipment for equipment in session.get("requiredEquipmentIds", []))


def _build_candidates(ref: SessionRef, payload: dict[str, Any], lookups: dict[str, Any]) -> list[Candidate]:
    session = ref.session
    instructor = lookups["instructors"].get(session["instructorId"])
    group = lookups["groups"].get(session["studentGroupId"])
    if not instructor or not group:
        return []
    fixed_slot = session.get("fixedSlot")
    fixed_day, fixed_period = (fixed_slot.split(":", 1) if fixed_slot else (None, None))
    closed = set(payload.get("closedSlots", []))
    result: list[Candidate] = []
    rooms = [(index, room) for index, room in enumerate(payload["rooms"]) if _room_matches(session, room)]

    for day_index, day in enumerate(payload["days"]):
        if not day.get("enabled", True):
            continue
        day_id = day["id"]
        if fixed_day is not None and fixed_day != day_id:
            continue
        for start in range(len(payload["periods"])):
            if fixed_period is not None and int(fixed_period) != start:
                continue
            occupied = _occupied_periods(payload["periods"], start, int(session["durationPeriods"]), bool(session.get("allowBreakCrossing")))
            if occupied is None:
                continue
            if any(_slot_key(day_id, period) in closed for period in occupied):
                continue
            if _rules_block(session.get("timeRules", {}), day_id, occupied, "unavailable"):
                continue
            if _rules_block(instructor.get("timeRules", {}), day_id, occupied, "unavailable"):
                continue
            if _rules_block(group.get("timeRules", {}), day_id, occupied, "unavailable"):
                continue
            for room_index, room in rooms:
                unavailable = set(room.get("unavailableSlots", []))
                if any(_slot_key(day_id, period) in unavailable for period in occupied):
                    continue
                result.append(Candidate(
                    session["id"], ref.course["id"], day_id, day_index, start, occupied,
                    room["id"], room_index, room["building"],
                ))
    return result


def _and_var(model: cp_model.CpModel, first: cp_model.IntVar, second: cp_model.IntVar, name: str) -> cp_model.IntVar:
    both = model.new_bool_var(name)
    model.add(both <= first)
    model.add(both <= second)
    model.add(both >= first + second - 1)
    return both


def _or_var(model: cp_model.CpModel, values: list[cp_model.IntVar], name: str) -> cp_model.IntVar:
    result = model.new_bool_var(name)
    if values:
        model.add_max_equality(result, values)
    else:
        model.add(result == 0)
    return result


def _static_reasons(ref: SessionRef, payload: dict[str, Any]) -> list[str]:
    session = ref.session
    rooms = payload["rooms"]
    capacity = [room for room in rooms if int(room["capacity"]) >= int(session["enrollment"])]
    reasons: list[str] = []
    if not capacity:
        reasons.append("هیچ فضای آموزشی ظرفیت کافی ندارد.")
    typed = [room for room in capacity if session.get("roomType", "any") == "any" or room["roomType"] == session["roomType"]]
    if capacity and not typed:
        reasons.append("نوع فضای موردنیاز موجود نیست.")
    equipped = [room for room in typed if all(eq in room.get("equipmentIds", []) for eq in session.get("requiredEquipmentIds", []))]
    if typed and not equipped:
        reasons.append("هیچ فضا تمام تجهیزات الزامی را ندارد.")
    if session.get("fixedRoomId") and not any(room["id"] == session["fixedRoomId"] for room in equipped):
        reasons.append("اتاق ثابت با ظرفیت، نوع یا تجهیزات جلسه سازگار نیست.")
    return reasons or ["تعطیلی، عدم دسترسی یا ترکیب تعارض‌ها گزینه‌های معتبر را مسدود کرده است."]



def solve_payload(payload: dict[str, Any]) -> dict[str, Any]:
    started = perf_counter()
    errors = _validate_payload(payload)
    if errors:
        return {
            "mode": "exact", "engine": "ortools-cp-sat", "status": "invalid", "solverStatus": "MODEL_INVALID",
            "schedule": [], "unscheduled": [], "hardViolations": [], "objective": 0, "breakdown": {},
            "durationMs": round((perf_counter() - started) * 1000, 1), "validationErrors": errors, "diagnostics": [],
            "publishable": False,
        }

    refs = _all_sessions(payload)
    ref_by_session = {ref.session["id"]: ref for ref in refs}
    lookups = {
        "instructors": {item["id"]: item for item in payload["instructors"]},
        "groups": {item["id"]: item for item in payload["studentGroups"]},
        "rooms": {item["id"]: item for item in payload["rooms"]},
    }
    candidates_by_session = {ref.session["id"]: _build_candidates(ref, payload, lookups) for ref in refs}
    model = cp_model.CpModel()
    variables: dict[tuple[str, int], cp_model.IntVar] = {}
    scheduled_vars: dict[str, cp_model.IntVar] = {}
    objective_terms: list[cp_model.LinearExpr] = []
    unscheduled_expressions: list[cp_model.LinearExpr] = []
    required_unscheduled_expressions: list[cp_model.LinearExpr] = []
    weights = {key: int(value) for key, value in payload["weights"].items()}
    settings = payload["settings"]
    raw_counts: dict[str, list[cp_model.LinearExpr]] = {key: [] for key in weights}
    enabled_days = [day for day in payload["days"] if day.get("enabled", True)]
    day_index = {day["id"]: index for index, day in enumerate(payload["days"])}
    periods = range(len(payload["periods"]))
    weeks = ("odd", "even")
    buildings = sorted({room["building"] for room in payload["rooms"]})

    # Placement variables and dominant unscheduled penalty.
    for ref in refs:
        session_id = ref.session["id"]
        session_vars: list[cp_model.IntVar] = []
        for index, _candidate in enumerate(candidates_by_session[session_id]):
            variable = model.new_bool_var(f"place__{session_id}__{index}")
            variables[(session_id, index)] = variable
            session_vars.append(variable)
        scheduled = model.new_bool_var(f"scheduled__{session_id}")
        scheduled_vars[session_id] = scheduled
        if session_vars:
            model.add(sum(session_vars) == scheduled)
        else:
            model.add(scheduled == 0)
        unscheduled = 1 - scheduled
        unscheduled_expressions.append(unscheduled)
        if ref.session.get("required"):
            required_unscheduled_expressions.append(unscheduled)
        objective_terms.append(weights["unscheduledSession"] * unscheduled)
        raw_counts["unscheduledSession"].append(unscheduled)

    # Reusable derived session selections.
    session_day: dict[tuple[str, str], cp_model.IntVar] = {}
    session_day_building: dict[tuple[str, str, str], cp_model.IntVar] = {}
    session_occ: dict[tuple[str, str, str, int], cp_model.IntVar] = {}
    for ref in refs:
        sid = ref.session["id"]
        candidates = candidates_by_session[sid]
        for day in enabled_days:
            day_vars = [variables[(sid, index)] for index, candidate in enumerate(candidates) if candidate.day_id == day["id"]]
            session_day[(sid, day["id"])] = _or_var(model, day_vars, f"day__{sid}__{day['id']}")
            for building in buildings:
                building_vars = [variables[(sid, index)] for index, candidate in enumerate(candidates) if candidate.day_id == day["id"] and candidate.building == building]
                session_day_building[(sid, day["id"], building)] = _or_var(model, building_vars, f"day_building__{sid}__{day['id']}__{building}")
            for week in weeks:
                for period in periods:
                    matching = [
                        variables[(sid, index)]
                        for index, candidate in enumerate(candidates)
                        if candidate.day_id == day["id"] and period in candidate.occupied_periods and _active_in_week(ref.session["weekPattern"], week)
                    ]
                    session_occ[(sid, day["id"], week, period)] = _or_var(model, matching, f"session_occ__{sid}__{day['id']}__{week}__{period}")

    # Candidate-local penalties.
    for ref in refs:
        instructor = lookups["instructors"].get(ref.session["instructorId"], {})
        group = lookups["groups"].get(ref.session["studentGroupId"], {})
        for index, candidate in enumerate(candidates_by_session[ref.session["id"]]):
            variable = variables[(ref.session["id"], index)]
            room = lookups["rooms"][candidate.room_id]
            local: dict[str, int] = {}
            if _rules_block(instructor.get("timeRules", {}), candidate.day_id, candidate.occupied_periods, "undesired"):
                local["instructorUndesiredTime"] = 1
            if _rules_block(group.get("timeRules", {}), candidate.day_id, candidate.occupied_periods, "undesired"):
                local["groupUndesiredTime"] = 1
            if _rules_block(ref.session.get("timeRules", {}), candidate.day_id, candidate.occupied_periods, "undesired"):
                local["sessionUndesiredTime"] = 1
            preferred_rooms = ref.session.get("preferredRoomIds", [])
            if preferred_rooms:
                try:
                    rank = preferred_rooms.index(candidate.room_id)
                except ValueError:
                    rank = len(preferred_rooms) + 1
                if rank:
                    local["preferredRoomRank"] = rank
            missing = sum(1 for equipment in ref.session.get("preferredEquipmentIds", []) if equipment not in room.get("equipmentIds", []))
            if missing:
                local["missingPreferredEquipment"] = missing
            for key, count in local.items():
                objective_terms.append(weights[key] * count * variable)
                raw_counts[key].extend([variable] * count)

    # Resource and room occupancy. Grouping by concrete week handles odd/even overlap correctly.
    resource_occ: dict[tuple[str, str, str, str, int], cp_model.IntVar] = {}
    resource_building_occ: dict[tuple[str, str, str, str, int, str], cp_model.IntVar] = {}
    resource_specs = [
        ("instructor", payload["instructors"], "instructorId", "defaultInstructorMaxDailyPeriods", "defaultInstructorMaxConsecutivePeriods"),
        ("group", payload["studentGroups"], "studentGroupId", "defaultGroupMaxDailyPeriods", "defaultGroupMaxConsecutivePeriods"),
    ]
    for resource_type, entities, session_field, daily_default, consecutive_default in resource_specs:
        for entity in entities:
            matching_refs = [ref for ref in refs if ref.session.get(session_field) == entity["id"]]
            for day in enabled_days:
                for week in weeks:
                    occupancy: list[cp_model.IntVar] = []
                    for period in periods:
                        matching_vars: list[cp_model.IntVar] = []
                        for ref in matching_refs:
                            if not _active_in_week(ref.session["weekPattern"], week):
                                continue
                            matching_vars.extend(
                                variables[(ref.session["id"], index)]
                                for index, candidate in enumerate(candidates_by_session[ref.session["id"]])
                                if candidate.day_id == day["id"] and period in candidate.occupied_periods
                            )
                        occupied = model.new_bool_var(f"occ__{resource_type}__{entity['id']}__{day['id']}__{week}__{period}")
                        if matching_vars:
                            model.add(sum(matching_vars) == occupied)  # equality enforces no collision
                        else:
                            model.add(occupied == 0)
                        resource_occ[(resource_type, entity["id"], day["id"], week, period)] = occupied
                        occupancy.append(occupied)
                        for building in buildings:
                            building_vars: list[cp_model.IntVar] = []
                            for ref in matching_refs:
                                if not _active_in_week(ref.session["weekPattern"], week):
                                    continue
                                building_vars.extend(
                                    variables[(ref.session["id"], index)]
                                    for index, candidate in enumerate(candidates_by_session[ref.session["id"]])
                                    if candidate.day_id == day["id"] and candidate.building == building and period in candidate.occupied_periods
                                )
                            resource_building_occ[(resource_type, entity["id"], day["id"], week, period, building)] = _or_var(
                                model, building_vars, f"building_occ__{resource_type}__{entity['id']}__{day['id']}__{week}__{period}__{building}",
                            )

                    load = model.new_int_var(0, len(payload["periods"]), f"load__{resource_type}__{entity['id']}__{day['id']}__{week}")
                    model.add(load == sum(occupancy))
                    daily_limit = int(entity.get("softMaxDailyPeriods") or settings[daily_default])
                    daily_excess = model.new_int_var(0, len(payload["periods"]), f"daily_excess__{resource_type}__{entity['id']}__{day['id']}__{week}")
                    model.add_max_equality(daily_excess, [load - daily_limit, 0])
                    objective_terms.append(weights["dailyLoad"] * daily_excess)
                    raw_counts["dailyLoad"].append(daily_excess)

                    consecutive_limit = int(entity.get("softMaxConsecutivePeriods") or settings[consecutive_default])
                    teaching_segments: list[list[cp_model.IntVar]] = []
                    segment: list[cp_model.IntVar] = []
                    for period_index, occupied_var in enumerate(occupancy):
                        segment.append(occupied_var)
                        if payload["periods"][period_index].get("breakAfter") or period_index == len(occupancy) - 1:
                            teaching_segments.append(segment)
                            segment = []
                    for segment_index, teaching_segment in enumerate(teaching_segments):
                        if not (0 < consecutive_limit < len(teaching_segment)):
                            continue
                        for start in range(0, len(teaching_segment) - consecutive_limit):
                            window = teaching_segment[start:start + consecutive_limit + 1]
                            excess = model.new_int_var(0, 1, f"consecutive__{resource_type}__{entity['id']}__{day['id']}__{week}__{segment_index}__{start}")
                            model.add_max_equality(excess, [sum(window) - consecutive_limit, 0])
                            objective_terms.append(weights["consecutivePeriods"] * excess)
                            raw_counts["consecutivePeriods"].append(excess)

                    for period in range(1, len(occupancy) - 1):
                        before = _or_var(model, occupancy[:period], f"before__{resource_type}__{entity['id']}__{day['id']}__{week}__{period}")
                        after = _or_var(model, occupancy[period + 1:], f"after__{resource_type}__{entity['id']}__{day['id']}__{week}__{period}")
                        gap = model.new_bool_var(f"gap__{resource_type}__{entity['id']}__{day['id']}__{week}__{period}")
                        model.add(gap <= before)
                        model.add(gap <= after)
                        model.add(gap + occupancy[period] <= 1)
                        model.add(gap >= before + after - occupancy[period] - 1)
                        objective_terms.append(weights["resourceGaps"] * gap)
                        raw_counts["resourceGaps"].append(gap)

                    # Different buildings in adjacent teaching periods are forbidden unless a defined break separates them.
                    for period in range(len(payload["periods"]) - 1):
                        if payload["periods"][period].get("breakAfter"):
                            continue
                        for first_building in buildings:
                            for second_building in buildings:
                                if first_building == second_building:
                                    continue
                                model.add(
                                    resource_building_occ[(resource_type, entity["id"], day["id"], week, period, first_building)]
                                    + resource_building_occ[(resource_type, entity["id"], day["id"], week, period + 1, second_building)]
                                    <= 1
                                )

    # Room occupancy.
    for room in payload["rooms"]:
        for day in enabled_days:
            for week in weeks:
                for period in periods:
                    matching_vars: list[cp_model.IntVar] = []
                    for ref in refs:
                        if not _active_in_week(ref.session["weekPattern"], week):
                            continue
                        matching_vars.extend(
                            variables[(ref.session["id"], index)]
                            for index, candidate in enumerate(candidates_by_session[ref.session["id"]])
                            if candidate.room_id == room["id"] and candidate.day_id == day["id"] and period in candidate.occupied_periods
                        )
                    if matching_vars:
                        model.add(sum(matching_vars) <= 1)

    # Sessions of the same course section cannot overlap.
    for course in payload["courses"]:
        course_refs = [ref for ref in refs if ref.course["id"] == course["id"]]
        for day in enabled_days:
            for week in weeks:
                for period in periods:
                    occupancy = [session_occ[(ref.session["id"], day["id"], week, period)] for ref in course_refs]
                    if occupancy:
                        model.add(sum(occupancy) <= 1)

    # Explicit hard and soft course conflicts, using session occupancy rather than candidate pairs.
    refs_by_course: dict[str, list[SessionRef]] = {}
    for ref in refs:
        refs_by_course.setdefault(ref.course["id"], []).append(ref)
    for conflict in payload.get("conflicts", []):
        first_refs = refs_by_course.get(conflict["firstCourseId"], [])
        second_refs = refs_by_course.get(conflict["secondCourseId"], [])
        for first_ref in first_refs:
            for second_ref in second_refs:
                if not _patterns_overlap(first_ref.session["weekPattern"], second_ref.session["weekPattern"]):
                    continue
                overlap_slots: list[cp_model.IntVar] = []
                for day in enabled_days:
                    for week in weeks:
                        if not (_active_in_week(first_ref.session["weekPattern"], week) and _active_in_week(second_ref.session["weekPattern"], week)):
                            continue
                        for period in periods:
                            first_occ = session_occ[(first_ref.session["id"], day["id"], week, period)]
                            second_occ = session_occ[(second_ref.session["id"], day["id"], week, period)]
                            if conflict["kind"] == "hard":
                                model.add(first_occ + second_occ <= 1)
                            else:
                                overlap_slots.append(_and_var(model, first_occ, second_occ, f"soft_slot__{conflict['id']}__{first_ref.session['id']}__{second_ref.session['id']}__{day['id']}__{week}__{period}"))
                if conflict["kind"] == "soft" and overlap_slots:
                    overlap = _or_var(model, overlap_slots, f"soft_overlap__{conflict['id']}__{first_ref.session['id']}__{second_ref.session['id']}")
                    count = max(1, int(conflict.get("weight", 1)))
                    objective_terms.append(weights["softConflict"] * count * overlap)
                    raw_counts["softConflict"].extend([overlap] * count)

    # Same-course same-day and minimum day-gap penalties.
    for course in payload["courses"]:
        course_refs = refs_by_course.get(course["id"], [])
        for first_index, first_ref in enumerate(course_refs):
            for second_ref in course_refs[first_index + 1:]:
                if not _patterns_overlap(first_ref.session["weekPattern"], second_ref.session["weekPattern"]):
                    continue
                for first_day in enabled_days:
                    for second_day in enabled_days:
                        pair = _and_var(
                            model,
                            session_day[(first_ref.session["id"], first_day["id"])],
                            session_day[(second_ref.session["id"], second_day["id"])],
                            f"course_days__{first_ref.session['id']}__{second_ref.session['id']}__{first_day['id']}__{second_day['id']}",
                        )
                        distance = abs(day_index[first_day["id"]] - day_index[second_day["id"]])
                        if first_day["id"] == second_day["id"]:
                            objective_terms.append(weights["sameCourseSameDay"] * pair)
                            raw_counts["sameCourseSameDay"].append(pair)
                        deficit = max(0, int(settings["minimumDayGap"]) - distance)
                        if deficit:
                            objective_terms.append(weights["minimumDayGap"] * deficit * pair)
                            raw_counts["minimumDayGap"].extend([pair] * deficit)

    # A fixed travel penalty per session pair when either the instructor or student group is shared.
    # Count the pair once even when both resources are shared. Adjacent pairs without a break are already forbidden.
    for first_index, first_ref in enumerate(refs):
        for second_ref in refs[first_index + 1:]:
            shares_resource = (
                first_ref.session["instructorId"] == second_ref.session["instructorId"]
                or first_ref.session["studentGroupId"] == second_ref.session["studentGroupId"]
            )
            if not shares_resource or not _patterns_overlap(first_ref.session["weekPattern"], second_ref.session["weekPattern"]):
                continue
            for day in enabled_days:
                for first_building in buildings:
                    for second_building in buildings:
                        if first_building == second_building:
                            continue
                        pair = _and_var(
                            model,
                            session_day_building[(first_ref.session["id"], day["id"], first_building)],
                            session_day_building[(second_ref.session["id"], day["id"], second_building)],
                            f"travel_pair__{first_ref.session['id']}__{second_ref.session['id']}__{day['id']}__{first_building}__{second_building}",
                        )
                        objective_terms.append(weights["buildingTravel"] * pair)
                        raw_counts["buildingTravel"].append(pair)

    # Lexicographic optimization: first protect required sessions, then maximize total scheduled sessions,
    # then minimize all soft penalties without changing the coverage found in phase one.
    soft_objective_terms = objective_terms[len(refs):]
    required_missing_expr = sum(required_unscheduled_expressions) if required_unscheduled_expressions else 0
    total_missing_expr = sum(unscheduled_expressions) if unscheduled_expressions else 0
    coverage_objective = required_missing_expr * (len(refs) + 1) + total_missing_expr
    total_budget = min(285.0, float(settings.get("exactTimeLimitSeconds", 285)))
    coverage_budget = min(90.0, max(1.0, total_budget * 0.35))

    model.minimize(coverage_objective)
    coverage_solver = cp_model.CpSolver()
    coverage_solver.parameters.max_time_in_seconds = coverage_budget
    coverage_solver.parameters.num_search_workers = 8
    coverage_solver.parameters.random_seed = 2_607_143
    coverage_status = coverage_solver.solve(model)
    if coverage_status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "mode": "exact", "engine": "ortools-cp-sat", "status": "unknown", "solverStatus": coverage_solver.status_name(coverage_status),
            "schedule": [], "unscheduled": [], "hardViolations": [], "objective": 0,
            "breakdown": {key: 0 for key in weights}, "durationMs": round((perf_counter() - started) * 1000, 1),
            "validationErrors": [], "diagnostics": ["حل‌کننده در مهلت تعیین‌شده جواب قابل استفاده‌ای برنگرداند."],
            "publishable": False,
        }

    best_required_missing = int(coverage_solver.value(required_missing_expr)) if required_unscheduled_expressions else 0
    best_total_missing = int(coverage_solver.value(total_missing_expr)) if unscheduled_expressions else 0
    if required_unscheduled_expressions:
        model.add(required_missing_expr == best_required_missing)
    if unscheduled_expressions:
        model.add(total_missing_expr == best_total_missing)
    for variable in variables.values():
        model.add_hint(variable, int(coverage_solver.value(variable)))
    for variable in scheduled_vars.values():
        model.add_hint(variable, int(coverage_solver.value(variable)))

    model.minimize(sum(soft_objective_terms) if soft_objective_terms else 0)
    quality_solver = cp_model.CpSolver()
    quality_solver.parameters.max_time_in_seconds = max(1.0, total_budget - (perf_counter() - started))
    quality_solver.parameters.num_search_workers = 8
    quality_solver.parameters.random_seed = 2_607_143
    quality_status = quality_solver.solve(model)
    if quality_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        solver = quality_solver
    else:
        solver = coverage_solver
    proven_optimal = coverage_status == cp_model.OPTIMAL and quality_status == cp_model.OPTIMAL
    status_name = "OPTIMAL" if proven_optimal else "FEASIBLE"

    selected: list[Candidate] = []
    for ref in refs:
        for index, candidate in enumerate(candidates_by_session[ref.session["id"]]):
            if solver.value(variables[(ref.session["id"], index)]):
                selected.append(candidate)

    scheduled_ids = {candidate.session_id for candidate in selected}
    schedule: list[dict[str, Any]] = []
    for candidate in selected:
        ref = ref_by_session[candidate.session_id]
        instructor = lookups["instructors"][ref.session["instructorId"]]
        group = lookups["groups"][ref.session["studentGroupId"]]
        room = lookups["rooms"][candidate.room_id]
        schedule.append({
            "sessionId": candidate.session_id,
            "courseId": candidate.course_id,
            "dayId": candidate.day_id,
            "startPeriod": candidate.start_period,
            "occupiedPeriods": list(candidate.occupied_periods),
            "roomId": candidate.room_id,
            "courseCode": ref.course["code"],
            "courseName": ref.course["name"],
            "groupNumber": ref.course["groupNumber"],
            "sessionLabel": ref.session["label"],
            "instructorId": instructor["id"],
            "instructorName": instructor["name"],
            "studentGroupId": group["id"],
            "studentGroupName": group["name"],
            "roomName": room["name"],
            "building": room["building"],
            "weekPattern": ref.session["weekPattern"],
            "required": bool(ref.session.get("required")),
        })
    schedule.sort(key=lambda item: (day_index[item["dayId"]], item["startPeriod"], item["courseCode"]))

    unscheduled = []
    for ref in refs:
        if ref.session["id"] in scheduled_ids:
            continue
        unscheduled.append({
            "courseId": ref.course["id"],
            "sessionId": ref.session["id"],
            "label": f"{ref.course['code']}، گروه {ref.course['groupNumber']} — {ref.session['label']}",
            "required": bool(ref.session.get("required")),
            "reasons": _static_reasons(ref, payload),
        })

    breakdown = {key: 0 for key in weights}
    for key, expressions in raw_counts.items():
        breakdown[key] = sum(int(solver.value(expression)) for expression in expressions)
    required_missing = any(item["required"] for item in unscheduled)
    if required_missing:
        result_status = "failed-required"
    elif unscheduled:
        result_status = "partial"
    elif proven_optimal:
        result_status = "optimal"
    else:
        result_status = "feasible"

    diagnostics = [
        "بهینهٔ اثبات‌شده" if proven_optimal else "امکان‌پذیر، اما بهینگی اثبات نشده",
        "هدف‌ها به ترتیب حفظ جلسه‌های اجباری، بیشینه‌کردن تعداد جلسه‌های تخصیص‌یافته و سپس کاهش جریمه‌های نرم حل می‌شوند.",
        "داده‌ها فقط برای اجرای این درخواست پردازش می‌شوند؛ برنامه ذخیره‌سازی دائمی انجام نمی‌دهد.",
    ]
    publishable = not required_missing
    result = {
        "mode": "exact",
        "engine": "ortools-cp-sat",
        "status": result_status,
        "solverStatus": status_name,
        "schedule": schedule,
        "unscheduled": unscheduled,
        "hardViolations": [],
        "objective": sum(int(breakdown[key]) * int(weights[key]) for key in weights),
        "breakdown": breakdown,
        "durationMs": round((perf_counter() - started) * 1000, 1),
        "validationErrors": [],
        "diagnostics": diagnostics,
        "publishable": publishable,
    }
    if coverage_status == cp_model.OPTIMAL and quality_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        result["bestBound"] = int(breakdown["unscheduledSession"]) * int(weights["unscheduledSession"]) + int(round(quality_solver.best_objective_bound))
    return result
