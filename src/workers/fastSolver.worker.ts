/// <reference lib="webworker" />

import { solveFast } from "../domain/fastSolver";
import type { TimetableInput } from "../domain/types";

type Request = { input: TimetableInput; fallbackReason?: string };

self.onmessage = (event: MessageEvent<Request>) => {
  try {
    const result = solveFast(event.data.input, event.data.fallbackReason);
    self.postMessage({ ok: true, result });
  } catch {
    self.postMessage({ ok: false, error: "روش سریع با خطای داخلی متوقف شد." });
  }
};
