import type { CandidatePlacement, SolveResult, TimetableInput } from "./types";
import { validationErrors } from "./validation";
import { allSessions, backToBackTravelConflict, buildCandidates, diagnoseUnscheduled, placementPairHardConflict, validatePlacementSet } from "./solverCommon";
import { candidatePenalty, emptyPenaltyBreakdown, evaluatePlacements, toScheduleItems } from "./metrics";

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function createUnsolvedResult(): SolveResult {
  return {
    mode: "fast", engine: "browser-heuristic", status: "unknown", schedule: [], unscheduled: [], hardViolations: [], objective: 0,
    breakdown: emptyPenaltyBreakdown(), durationMs: 0, validationErrors: [], diagnostics: ["هنوز حل‌کننده اجرا نشده است."], publishable: false,
  };
}

export function solveFast(input: TimetableInput, fallbackReason?: string): SolveResult {
  const started = performance.now();
  const errors = validationErrors(input);
  const refs = allSessions(input);
  const empty = evaluatePlacements([], input).breakdown;
  if (errors.length) return {
    mode: "fast", engine: "browser-heuristic", status: "invalid", schedule: [], unscheduled: [], hardViolations: [], objective: 0,
    breakdown: empty, durationMs: 0, validationErrors: errors, diagnostics: [], fallbackReason,
  };

  const candidates = new Map(refs.map((ref) => [ref.session.id, buildCandidates(ref, input)]));
  const refBySession = new Map(refs.map((ref) => [ref.session.id, ref]));
  let best: CandidatePlacement[] = [];
  let bestRequiredMissing = Number.POSITIVE_INFINITY;
  let bestUnscheduled = Number.POSITIVE_INFINITY;
  let bestSoftObjective = Number.POSITIVE_INFINITY;
  const attempts = Math.min(input.settings.fastAttempts, refs.length > 100 ? 60 : input.settings.fastAttempts);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const random = seededRandom(7_313_981 + attempt * 104_729);
    const ordered = refs
      .map((ref) => ({ ref, jitter: random(), count: candidates.get(ref.session.id)?.length ?? 0 }))
      .sort((a, b) => a.count - b.count || Number(b.ref.session.required) - Number(a.ref.session.required) || b.ref.session.durationPeriods - a.ref.session.durationPeriods || a.jitter - b.jitter)
      .map((item) => item.ref);
    const placements: CandidatePlacement[] = [];
    ordered.forEach((ref) => {
      const feasible = (candidates.get(ref.session.id) ?? [])
        .filter((candidate) => placements.every((other) => {
          const otherRef = refBySession.get(other.sessionId)!;
          return !placementPairHardConflict(candidate, other, ref, otherRef, input) && !backToBackTravelConflict(candidate, other, ref, otherRef, input);
        }))
        .map((candidate) => ({ candidate, score: candidatePenalty(candidate, placements, input) + (attempt ? random() * 7 : 0) }))
        .sort((a, b) => a.score - b.score);
      if (!feasible.length) return;
      const shortlist = Math.min(feasible.length, attempt ? 3 : 1);
      placements.push(feasible[Math.floor(random() * shortlist)].candidate);
    });
    const evaluation = evaluatePlacements(placements, input);
    const scheduledIds = new Set(placements.map((placement) => placement.sessionId));
    const requiredMissing = refs.filter((ref) => ref.session.required && !scheduledIds.has(ref.session.id)).length;
    const unscheduled = refs.length - placements.length;
    const softObjective = evaluation.objective - evaluation.breakdown.unscheduledSession * input.weights.unscheduledSession;
    const isBetter = requiredMissing < bestRequiredMissing
      || (requiredMissing === bestRequiredMissing && unscheduled < bestUnscheduled)
      || (requiredMissing === bestRequiredMissing && unscheduled === bestUnscheduled && softObjective < bestSoftObjective);
    if (isBetter) {
      bestRequiredMissing = requiredMissing;
      bestUnscheduled = unscheduled;
      bestSoftObjective = softObjective;
      best = placements;
    }
  }

  const evaluation = evaluatePlacements(best, input);
  const scheduledIds = new Set(best.map((placement) => placement.sessionId));
  const unscheduled = refs.filter((ref) => !scheduledIds.has(ref.session.id)).map((ref) => ({
    courseId: ref.course.id,
    sessionId: ref.session.id,
    label: `${ref.course.code}، گروه ${ref.course.groupNumber} — ${ref.session.label}`,
    required: ref.session.required,
    reasons: diagnoseUnscheduled(ref, best, input),
  }));
  const requiredMissing = unscheduled.some((item) => item.required);
  const verifiedViolations = validatePlacementSet(best, input);
  return {
    mode: "fast",
    engine: "browser-heuristic",
    status: requiredMissing ? "failed-required" : unscheduled.length ? (fallbackReason ? "fallback" : "partial") : (fallbackReason ? "fallback" : "feasible"),
    schedule: toScheduleItems(best, input),
    unscheduled,
    hardViolations: [...new Set([...evaluation.hardViolations, ...verifiedViolations])],
    objective: evaluation.objective,
    breakdown: evaluation.breakdown,
    durationMs: Math.round((performance.now() - started) * 10) / 10,
    validationErrors: [],
    diagnostics: [
      ...(fallbackReason ? [`روش دقیق قابل استفاده نبود؛ روش سریع خودکار اجرا شد: ${fallbackReason}`] : []),
      "روش سریع یک جست‌وجوی ابتکاری قطعی است و بهینگی سراسری را اثبات نمی‌کند.",
    ],
    fallbackReason,
  };
}
