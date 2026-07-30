import type { SolveResult, TimetableInput } from "../domain/types";
import { solveFast } from "../domain/fastSolver";
import { allSessions, diagnoseUnscheduled, validatePlacementSet } from "../domain/solverCommon";

const EXACT_TIMEOUT_MS = 299_000;

function isSolveResult(value: unknown): value is SolveResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SolveResult>;
  return Array.isArray(item.schedule) && Array.isArray(item.unscheduled) && Array.isArray(item.hardViolations) && typeof item.status === "string" && typeof item.objective === "number";
}

export function solveFastInWorker(input: TimetableInput, fallbackReason?: string, signal?: AbortSignal): Promise<SolveResult> {
  if (typeof Worker === "undefined") return new Promise((resolve) => window.setTimeout(() => resolve(solveFast(input, fallbackReason)), 0));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/fastSolver.worker.ts", import.meta.url), { type: "module", name: "darschin-fast-solver" });
    const cleanup = () => { worker.terminate(); signal?.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reject(new DOMException("Solver aborted", "AbortError")); };
    signal?.addEventListener("abort", abort, { once: true });
    worker.onerror = () => { cleanup(); reject(new Error("روش سریع در Web Worker اجرا نشد.")); };
    worker.onmessage = (event: MessageEvent<{ ok: boolean; result?: SolveResult; error?: string }>) => {
      cleanup();
      if (event.data.ok && event.data.result && isSolveResult(event.data.result)) resolve(event.data.result);
      else reject(new Error(event.data.error || "پاسخ روش سریع معتبر نیست."));
    };
    worker.postMessage({ input, fallbackReason });
  });
}

async function fallbackFast(input: TimetableInput, reason: string, signal?: AbortSignal): Promise<SolveResult> {
  try {
    return await solveFastInWorker(input, reason, signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return solveFast(input, reason);
  }
}

export async function solveExactWithFallback(input: TimetableInput, signal?: AbortSignal): Promise<SolveResult> {
  if (input.courses.length > input.settings.exactCourseLimit) {
    return fallbackFast(input, `روش دقیق برای بیش از ${input.settings.exactCourseLimit} گروه درسی فعال نیست.`, signal);
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort("exact-timeout"), EXACT_TIMEOUT_MS);
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result: unknown = await response.json();
    if (!isSolveResult(result)) throw new Error("پاسخ حل‌کننده معتبر نیست.");
    if (result.status === "unknown" || (!result.schedule.length && result.solverStatus === "UNKNOWN")) {
      return fallbackFast(input, "حل دقیق در مهلت پنج‌دقیقه‌ای جواب قابل استفاده‌ای پیدا نکرد.", signal);
    }
    const verifiedViolations = validatePlacementSet(result.schedule.map(({ sessionId, courseId, dayId, startPeriod, occupiedPeriods, roomId }) => ({ sessionId, courseId, dayId, startPeriod, occupiedPeriods, roomId })), input);
    const hardViolations = [...new Set([...result.hardViolations, ...verifiedViolations])];
    const placements = result.schedule.map(({ sessionId, courseId, dayId, startPeriod, occupiedPeriods, roomId }) => ({ sessionId, courseId, dayId, startPeriod, occupiedPeriods, roomId }));
    const refBySession = new Map(allSessions(input).map((ref) => [ref.session.id, ref]));
    const unscheduled = result.unscheduled.map((item) => {
      const ref = refBySession.get(item.sessionId);
      return ref ? { ...item, reasons: diagnoseUnscheduled(ref, placements, input) } : item;
    });
    return {
      ...result,
      unscheduled,
      hardViolations,
      publishable: hardViolations.length === 0 && result.status !== "failed-required",
      diagnostics: verifiedViolations.length ? [...result.diagnostics, "اعتبارسنج مستقل مرورگر با مدل CP-SAT ناسازگاری پیدا کرد؛ نتیجه برای انتشار نامعتبر است."] : result.diagnostics,
    };
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Solver aborted", "AbortError");
    const reason = error instanceof DOMException && error.name === "AbortError"
      ? "حل دقیق به پایان مهلت رسید."
      : "سرویس حل دقیق در دسترس نبود.";
    return fallbackFast(input, reason, signal);
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export async function solveTimetable(input: TimetableInput, mode: "fast" | "exact", signal?: AbortSignal): Promise<SolveResult> {
  if (mode === "fast") return solveFastInWorker(input, undefined, signal);
  return solveExactWithFallback(input, signal);
}
