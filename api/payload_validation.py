from __future__ import annotations

import math
import re
from typing import Any

MAX_BODY_BYTES = 2 * 1024 * 1024
MAX_COURSES_EXACT = 40
MAX_SESSIONS = 1000
MAX_ROOMS = 500
MAX_TEXT_LENGTH = 160
MAX_SOFT_WEIGHT = 1_000_000
MAX_CONFLICT_WEIGHT = 10_000
MAX_FAST_ATTEMPTS = 1_000
DANGEROUS_KEYS = {"__proto__", "prototype", "constructor"}
ROOM_TYPES = {"lecture", "computer", "laboratory", "workshop", "studio", "any"}
WEEK_PATTERNS = {"all", "odd", "even"}
WEIGHT_KEYS = {
    "unscheduledSession", "instructorUndesiredTime", "groupUndesiredTime", "sessionUndesiredTime",
    "preferredRoomRank", "missingPreferredEquipment", "dailyLoad", "consecutivePeriods",
    "resourceGaps", "buildingTravel", "sameCourseSameDay", "minimumDayGap", "softConflict",
}


def _inspect(value: Any, depth: int = 0) -> str | None:
    if depth > 30:
        return "عمق داده بیش از حد مجاز است."
    if isinstance(value, list):
        if len(value) > 10_000:
            return "یکی از آرایه‌ها بیش از حد بزرگ است."
        for item in value:
            issue = _inspect(item, depth + 1)
            if issue:
                return issue
    elif isinstance(value, dict):
        for key, child in value.items():
            if key in DANGEROUS_KEYS:
                return f"کلید ناامن «{key}» پذیرفته نمی‌شود."
            issue = _inspect(child, depth + 1)
            if issue:
                return issue
    return None


def _valid_text(value: Any) -> bool:
    return isinstance(value, str) and 0 < len(value.strip()) <= MAX_TEXT_LENGTH


def _valid_positive_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _valid_nonnegative_number(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _duplicate(values: list[Any]) -> bool:
    try:
        return len(values) != len(set(values))
    except TypeError:
        return True


def _slot_valid(value: Any, day_ids: set[str], period_count: int) -> bool:
    if not isinstance(value, str):
        return False
    match = re.fullmatch(r"([^:]+):(\d+)", value.strip())
    return bool(match and match.group(1) in day_ids and 0 <= int(match.group(2)) < period_count)


def validate_payload(payload: Any) -> list[str]:
    if not isinstance(payload, dict):
        return ["بدنهٔ درخواست باید یک شیء JSON باشد."]
    issue = _inspect(payload)
    if issue:
        return [issue]

    required_arrays = ["days", "periods", "equipment", "instructors", "studentGroups", "rooms", "courses", "conflicts", "closedSlots", "retiredGroupNumbers"]
    errors = [f"فیلد {key} باید آرایه باشد." for key in required_arrays if not isinstance(payload.get(key), list)]
    for key in ("weights", "settings"):
        if not isinstance(payload.get(key), dict):
            errors.append(f"فیلد {key} باید شیء باشد.")
    if errors:
        return errors
    if payload.get("schemaVersion") != 3:
        errors.append("نسخهٔ مدل داده باید ۳ باشد.")

    days = payload["days"]
    periods = payload["periods"]
    if not days or not any(isinstance(day, dict) and day.get("enabled", True) for day in days):
        errors.append("حداقل یک روز آموزشی فعال لازم است.")
    if not periods:
        errors.append("حداقل یک بازهٔ آموزشی لازم است.")
    if not payload["courses"]:
        errors.append("حداقل یک گروه درسی لازم است.")
    if not payload["instructors"]:
        errors.append("حداقل یک استاد لازم است.")
    if not payload["studentGroups"]:
        errors.append("حداقل یک گروه دانشجویی لازم است.")
    if not payload["rooms"]:
        errors.append("حداقل یک فضای آموزشی لازم است.")
    if len(payload["courses"]) > MAX_COURSES_EXACT:
        errors.append(f"روش دقیق حداکثر برای {MAX_COURSES_EXACT} گروه درسی فعال است.")
    if len(payload["rooms"]) > MAX_ROOMS:
        errors.append(f"تعداد فضاها از حد {MAX_ROOMS} بیشتر است.")

    day_ids = [day.get("id") for day in days if isinstance(day, dict)]
    enabled_day_ids = {day.get("id") for day in days if isinstance(day, dict) and _valid_text(day.get("id"))}
    if _duplicate(day_ids) or any(not _valid_text(value) for value in day_ids):
        errors.append("شناسهٔ روزها باید غیرخالی و یکتا باشد.")
    for index, period in enumerate(periods):
        if not isinstance(period, dict) or period.get("index") != index or not _valid_text(period.get("label")):
            errors.append("بازه‌های آموزشی باید اندیس متوالی و برچسب معتبر داشته باشند.")
            break

    collections = {
        "تجهیز": payload["equipment"],
        "استاد": payload["instructors"],
        "گروه دانشجویی": payload["studentGroups"],
        "فضا": payload["rooms"],
        "گروه درسی": payload["courses"],
        "تعارض": payload["conflicts"],
    }
    for label, items in collections.items():
        ids = [item.get("id") for item in items if isinstance(item, dict)]
        if len(ids) != len(items) or _duplicate(ids) or any(not _valid_text(value) for value in ids):
            errors.append(f"شناسه‌های {label} باید غیرخالی و یکتا باشند.")

    equipment_ids = {item["id"] for item in payload["equipment"] if isinstance(item, dict) and _valid_text(item.get("id"))}
    instructor_ids = {item["id"] for item in payload["instructors"] if isinstance(item, dict) and _valid_text(item.get("id"))}
    group_ids = {item["id"] for item in payload["studentGroups"] if isinstance(item, dict) and _valid_text(item.get("id"))}
    room_ids = {item["id"] for item in payload["rooms"] if isinstance(item, dict) and _valid_text(item.get("id"))}
    course_ids = {item["id"] for item in payload["courses"] if isinstance(item, dict) and _valid_text(item.get("id"))}

    for item in payload["instructors"]:
        if not isinstance(item, dict) or not _valid_text(item.get("name")):
            errors.append("هر استاد باید نام معتبر داشته باشد.")
    for item in payload["studentGroups"]:
        if not isinstance(item, dict) or not _valid_text(item.get("name")) or not _valid_positive_int(item.get("size")):
            errors.append("هر گروه دانشجویی باید نام و تعداد معتبر داشته باشد.")
    for room in payload["rooms"]:
        if not isinstance(room, dict):
            continue
        if not _valid_text(room.get("name")) or not _valid_text(room.get("building")) or not _valid_positive_int(room.get("capacity")):
            errors.append("هر فضا باید نام، ساختمان و ظرفیت معتبر داشته باشد.")
        if room.get("roomType") not in ROOM_TYPES - {"any"}:
            errors.append("نوع یکی از فضاها معتبر نیست.")
        if not isinstance(room.get("equipmentIds"), list) or any(value not in equipment_ids for value in room.get("equipmentIds", [])):
            errors.append("تجهیزات یکی از فضاها معتبر نیستند.")
        if not isinstance(room.get("unavailableSlots"), list) or any(not _slot_valid(value, enabled_day_ids, len(periods)) for value in room.get("unavailableSlots", [])):
            errors.append("بازهٔ رزروشدهٔ یکی از فضاها معتبر نیست.")

    if any(not _slot_valid(value, enabled_day_ids, len(periods)) for value in payload["closedSlots"]):
        errors.append("یکی از بازه‌های تعطیلی دانشگاه معتبر نیست.")

    group_numbers: list[Any] = []
    session_ids: list[Any] = []
    session_count = 0
    for course in payload["courses"]:
        if not isinstance(course, dict):
            errors.append("هر گروه درسی باید یک شیء باشد.")
            continue
        group_numbers.append(course.get("groupNumber"))
        if not _valid_positive_int(course.get("groupNumber")) or not _valid_text(course.get("code")) or not _valid_text(course.get("name")):
            errors.append("هر گروه درسی باید شماره، کد و نام معتبر داشته باشد.")
        sessions = course.get("sessions")
        if not isinstance(sessions, list) or not sessions:
            errors.append("هر گروه درسی حداقل یک جلسه لازم دارد.")
            continue
        session_count += len(sessions)
        for session in sessions:
            if not isinstance(session, dict):
                errors.append("هر جلسه باید یک شیء باشد.")
                continue
            session_ids.append(session.get("id"))
            if not _valid_text(session.get("id")) or not _valid_text(session.get("label")):
                errors.append("شناسه و برچسب هر جلسه باید معتبر باشد.")
            if session.get("instructorId") not in instructor_ids or session.get("studentGroupId") not in group_ids:
                errors.append("استاد یا گروه دانشجویی یکی از جلسه‌ها وجود ندارد.")
            if not _valid_positive_int(session.get("enrollment")) or not _valid_positive_int(session.get("durationPeriods")) or session.get("durationPeriods", 0) > len(periods):
                errors.append("تعداد دانشجو یا مدت یکی از جلسه‌ها معتبر نیست.")
            if session.get("roomType") not in ROOM_TYPES or session.get("weekPattern") not in WEEK_PATTERNS:
                errors.append("نوع فضا یا الگوی هفتهٔ یکی از جلسه‌ها معتبر نیست.")
            if session.get("fixedRoomId") not in (None, "") and session.get("fixedRoomId") not in room_ids:
                errors.append("اتاق ثابت یکی از جلسه‌ها وجود ندارد.")
            if session.get("fixedSlot") not in (None, "") and not _slot_valid(session.get("fixedSlot"), enabled_day_ids, len(periods)):
                errors.append("زمان ثابت یکی از جلسه‌ها معتبر نیست.")
            for key in ("requiredEquipmentIds", "preferredEquipmentIds"):
                if not isinstance(session.get(key), list) or any(value not in equipment_ids for value in session.get(key, [])):
                    errors.append("تجهیزات یکی از جلسه‌ها معتبر نیستند.")
            if not isinstance(session.get("preferredRoomIds"), list) or any(value not in room_ids for value in session.get("preferredRoomIds", [])):
                errors.append("اتاق ترجیحی یکی از جلسه‌ها معتبر نیست.")
            rules = session.get("timeRules")
            if not isinstance(rules, dict):
                errors.append("قواعد زمانی یکی از جلسه‌ها معتبر نیست.")
            else:
                slots = list(rules.get("unavailableSlots", [])) + list(rules.get("undesiredSlots", [])) if isinstance(rules.get("unavailableSlots", []), list) and isinstance(rules.get("undesiredSlots", []), list) else [None]
                if any(not _slot_valid(value, enabled_day_ids, len(periods)) for value in slots):
                    errors.append("قواعد زمانی یکی از جلسه‌ها شامل بازهٔ نامعتبر است.")

    if session_count > MAX_SESSIONS:
        errors.append(f"تعداد جلسه‌ها از حد {MAX_SESSIONS} بیشتر است.")
    if _duplicate(group_numbers) or any(not _valid_positive_int(value) for value in group_numbers):
        errors.append("شماره گروه در کل نیمسال باید عدد صحیح مثبت و یکتا باشد.")
    if _duplicate(session_ids) or any(not _valid_text(value) for value in session_ids):
        errors.append("شناسهٔ جلسه‌ها باید غیرخالی و یکتا باشد.")
    retired = payload["retiredGroupNumbers"]
    if any(not _valid_positive_int(value) for value in retired) or any(value in set(retired) for value in group_numbers):
        errors.append("شماره گروه حذف‌شده نباید دوباره استفاده شود.")

    conflict_pairs: set[tuple[str, str]] = set()
    for conflict in payload["conflicts"]:
        if not isinstance(conflict, dict):
            continue
        pair = tuple(sorted((str(conflict.get("firstCourseId", "")), str(conflict.get("secondCourseId", "")))))
        if pair in conflict_pairs:
            errors.append("برای یک جفت گروه درسی بیش از یک تعارض تعریف شده است.")
        conflict_pairs.add(pair)
        if conflict.get("firstCourseId") not in course_ids or conflict.get("secondCourseId") not in course_ids or conflict.get("firstCourseId") == conflict.get("secondCourseId"):
            errors.append("ارجاع یکی از تعارض‌های درسی معتبر نیست.")
        if conflict.get("kind") not in {"hard", "soft"} or not _valid_nonnegative_number(conflict.get("weight")) or conflict.get("weight", 0) > MAX_CONFLICT_WEIGHT:
            errors.append("نوع یا وزن یکی از تعارض‌ها معتبر نیست.")

    weights = payload["weights"]
    if not WEIGHT_KEYS.issubset(weights) or any(not _valid_nonnegative_number(weights.get(key)) or weights.get(key, 0) > MAX_SOFT_WEIGHT for key in WEIGHT_KEYS):
        errors.append("تمام وزن‌های تابع هدف باید عدد نامنفی و محدود باشند.")
    settings = payload["settings"]
    required_settings = {
        "exactCourseLimit", "exactTimeLimitSeconds", "fastAttempts", "minimumDayGap",
        "defaultInstructorMaxDailyPeriods", "defaultGroupMaxDailyPeriods",
        "defaultInstructorMaxConsecutivePeriods", "defaultGroupMaxConsecutivePeriods",
    }
    if not required_settings.issubset(settings):
        errors.append("تنظیمات لازم حل‌کننده کامل نیستند.")
    if settings.get("exactCourseLimit") != MAX_COURSES_EXACT:
        errors.append("سقف روش دقیق باید دقیقاً ۴۰ گروه درسی باشد.")
    if weights.get("unscheduledSession") != MAX_SOFT_WEIGHT:
        errors.append("جریمهٔ جلسهٔ تخصیص‌نیافته باید روی مقدار محافظتی ثابت بماند.")
    if not _valid_positive_int(settings.get("exactTimeLimitSeconds")) or settings.get("exactTimeLimitSeconds") > 285:
        errors.append("زمان روش دقیق باید بین ۱ و ۲۸۵ ثانیه باشد.")
    if not _valid_positive_int(settings.get("fastAttempts")) or not 20 <= settings.get("fastAttempts", 0) <= MAX_FAST_ATTEMPTS:
        errors.append("تعداد تلاش‌های روش سریع معتبر نیست.")
    if not _valid_nonnegative_number(settings.get("minimumDayGap")) or settings.get("minimumDayGap", 0) > len(days):
        errors.append("حداقل فاصلهٔ روزانه معتبر نیست.")
    for key in (
        "defaultInstructorMaxDailyPeriods", "defaultGroupMaxDailyPeriods",
        "defaultInstructorMaxConsecutivePeriods", "defaultGroupMaxConsecutivePeriods",
    ):
        if not _valid_nonnegative_number(settings.get(key)) or settings.get(key, 0) > len(periods):
            errors.append("مقادیر بار روزانه و توالی پیش‌فرض باید در محدودهٔ تعداد بازه‌ها باشند.")
            break

    return list(dict.fromkeys(errors))


# Backwards-compatible private name for existing tests.
_validate_payload = validate_payload
