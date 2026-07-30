import { useEffect, useMemo, useRef, useState } from "react";
import { CourseEditor } from "./components/CourseEditor";
import { PrototypeGallery } from "./components/PrototypeGallery";
import { ResourceEditors } from "./components/ResourceEditors";
import { RulesEditor } from "./components/RulesEditor";
import { ScheduleViews } from "./components/ScheduleViews";
import { cloneDefaults } from "./domain/defaults";
import { createUnsolvedResult } from "./domain/fastSolver";
import { PENALTY_LABELS } from "./domain/constants";
import { migrateImportedInput } from "./domain/migrate";
import type { SoftWeights, SolveResult, SolverMode, TimetableInput } from "./domain/types";
import { parseJsonInput, validateInput } from "./domain/validation";
import { downloadCsv, downloadJson } from "./services/downloads";
import { downloadExcelTemplate, exportResultExcel, importExcel } from "./services/excel";
import { solveTimetable } from "./services/solveService";

type Step = "courses" | "resources" | "rules" | "review" | "result";

export default function App() {
  if (window.location.pathname === "/prototype") return <PrototypeGallery />;
  const [input, setInput] = useState<TimetableInput>(() => cloneDefaults());
  const [result, setResult] = useState<SolveResult>(() => createUnsolvedResult());
  const [step, setStep] = useState<Step>("courses");
  const [solverMode, setSolverMode] = useState<SolverMode>("fast");
  const [solving, setSolving] = useState(false);
  const [notice, setNotice] = useState("دادهٔ نمونه آمادهٔ ویرایش است.");
  const [jsonText, setJsonText] = useState("");
  const [jsonOpen, setJsonOpen] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const jsonTextArea = useRef<HTMLTextAreaElement>(null);
  const jsonReturnFocus = useRef<HTMLElement | null>(null);
  const solveController = useRef<AbortController | null>(null);
  const inputRevision = useRef(0);
  const issues = useMemo(() => validateInput(input), [input]);
  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");
  const sessionCount = input.courses.reduce((sum, course) => sum + course.sessions.length, 0);

  useEffect(() => () => solveController.current?.abort(), []);
  useEffect(() => { if (jsonOpen) jsonTextArea.current?.focus(); }, [jsonOpen]);
  useEffect(() => { if (solverMode === "exact" && input.courses.length > input.settings.exactCourseLimit) setSolverMode("fast"); }, [input.courses.length, input.settings.exactCourseLimit, solverMode]);

  const updateInput = (next: TimetableInput) => {
    inputRevision.current += 1;
    setInput(next);
    setResult(createUnsolvedResult());
  };

  const openJson = () => {
    jsonReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setJsonText(JSON.stringify(input, null, 2));
    setJsonOpen(true);
  };
  const closeJson = () => {
    setJsonOpen(false);
    requestAnimationFrame(() => jsonReturnFocus.current?.focus());
  };

  const run = async () => {
    if (errors.length) {
      setNotice(`پیش از حل، ${errors.length.toLocaleString("fa-IR")} خطای ورودی را اصلاح کنید.`);
      document.getElementById("validation-summary")?.focus();
      return;
    }
    setSolving(true);
    const startedRevision = inputRevision.current;
    const controller = new AbortController();
    solveController.current = controller;
    setNotice(solverMode === "exact" ? "داده‌ها به‌صورت موقت برای حل دقیق ارسال شدند. این اجرا ممکن است تا پنج دقیقه طول بکشد." : "روش سریع در Web Worker مرورگر در حال اجرا است.");
    try {
      const solved = await solveTimetable(structuredClone(input), solverMode, controller.signal);
      if (startedRevision !== inputRevision.current) { setNotice("داده‌ها هنگام حل تغییر کردند؛ نتیجهٔ قدیمی کنار گذاشته شد."); return; }
      setResult({ ...solved, publishable: !solved.hardViolations.length && solved.status !== "failed-required" });
      setStep("result");
      setNotice(resultNotice(solved));
      requestAnimationFrame(() => resultHeading.current?.focus());
    } catch (error) {
      setNotice(error instanceof DOMException && error.name === "AbortError" ? "اجرای حل‌کننده متوقف شد." : "حل‌کننده با خطای پیش‌بینی‌نشده متوقف شد.");
    } finally {
      solveController.current = null;
      setSolving(false);
    }
  };

  const importJson = () => {
    try {
      const parsed = parseJsonInput(jsonText);
      const migrated = migrateImportedInput(parsed);
      const nextIssues = validateInput(migrated.input).filter((item) => item.severity === "error");
      if (nextIssues.length) throw new Error(nextIssues[0].message);
      updateInput(migrated.input);
      closeJson();
      setNotice(migrated.warnings.length ? `JSON خوانده شد. ${migrated.warnings.join(" ")}` : "JSON با موفقیت خوانده شد. پیش از حل، داده‌ها را بازبینی کنید.");
      setStep("review");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "JSON معتبر نیست.");
    }
  };

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">رفتن به محتوای اصلی</a>
    <header className="topbar">
      <a className="brand" href="/" aria-label="درس‌چین، صفحه اصلی"><span className="brand-mark" aria-hidden="true">د</span><span><b>درس‌چین</b><small>برنامه‌ریزی دروس دانشگاهی</small></span></a>
      <nav aria-label="ناوبری اصلی"><a href="#workflow">ورود داده</a><a href="#methods">روش حل</a><a href="#methodology">روش‌شناسی</a><a href="#privacy">حریم خصوصی</a><a href="/prototype?variant=guided">نمونه‌های UX</a></nav>
      <a className="source-link" href="https://github.com/Hhhkarimi/darschin" target="_blank" rel="noopener noreferrer">کد منبع</a>
    </header>

    <main id="main-content">
      <section className="hero">
        <div><span className="eyebrow">برای مدیران گروه دانشگاهی</span><h1>برنامهٔ هفتگی را با داده‌های روشن و نتیجهٔ قابل دفاع بسازید.</h1><p>گروه‌های درسی، جلسه‌های مستقل، استادان، دانشجویان، فضاها و محدودیت‌ها را تعریف کنید؛ سپس میان روش سریع مرورگری و روش دقیق CP-SAT انتخاب کنید.</p><div className="hero-actions"><a className="primary-link" href="#workflow">شروع ورود دستی</a><button type="button" className="secondary-button" onClick={downloadExcelTemplate}>دریافت Excel نمونه</button></div></div>
        <aside className="trust-card"><strong>تعریف دقیق نتیجه</strong><ul><li>«بهینه» فقط برای وضعیت OPTIMAL</li><li>برنامهٔ ناقص با جلسات تخصیص‌نیافته مشخص می‌شود</li><li>نقض دستی قید سخت، خروجی را نامعتبر می‌کند</li><li>روش سریع هیچ ادعای بهینگی ندارد</li></ul></aside>
      </section>

      <section className="stats-row" aria-label="خلاصه داده جاری"><div><strong>{input.courses.length.toLocaleString("fa-IR")}</strong><span>گروه درسی</span></div><div><strong>{sessionCount.toLocaleString("fa-IR")}</strong><span>جلسه هفتگی</span></div><div><strong>{input.rooms.length.toLocaleString("fa-IR")}</strong><span>فضای آموزشی</span></div><div><strong>{errors.length.toLocaleString("fa-IR")}</strong><span>خطای ورودی</span></div></section>

      <section id="workflow" className="workflow-shell">
        <aside className="workflow-nav"><h2>گردش‌کار</h2>{(["courses", "resources", "rules", "review", "result"] as Step[]).map((item, index) => <button type="button" key={item} disabled={solving || (item === "result" && result.status === "unknown")} className={step === item ? "active" : ""} onClick={() => setStep(item)}><b>{(index + 1).toLocaleString("fa-IR")}</b><span>{stepLabel(item)}</span></button>)}<div className="workflow-import"><button type="button" onClick={downloadExcelTemplate}>Excel نمونه</button><label className="file-button">ورود Excel<input type="file" accept=".xlsx" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const next = await importExcel(file, input); updateInput(next); setNotice("Excel خوانده شد؛ داده‌ها را بازبینی کنید."); setStep("review"); } catch (error) { setNotice(error instanceof Error ? error.message : "خواندن Excel ناموفق بود."); } event.currentTarget.value = ""; }} /></label><button type="button" onClick={openJson}>JSON</button></div></aside>
        <div className="workflow-content">
          <div className="live-notice" role="status" aria-live="polite">{notice}</div>
          {step === "courses" && <CourseEditor input={input} onChange={updateInput} />}
          {step === "resources" && <ResourceEditors input={input} onChange={updateInput} />}
          {step === "rules" && <RulesEditor input={input} onChange={updateInput} />}
          {step === "review" && <ReviewStep input={input} errors={errors} warnings={warnings} solverMode={solverMode} setSolverMode={setSolverMode} solving={solving} run={run} cancel={() => solveController.current?.abort()} />}
          {step === "result" && <ResultStep input={input} result={result} setResult={setResult} resultHeading={resultHeading} />}
        </div>
      </section>

      <section id="methods" className="public-section"><header><span>روش حل</span><h2>دو انتخاب با محدودیت‌های شفاف</h2></header><div className="method-grid"><article><h3>روش سریع مرورگری</h3><p>داده از دستگاه خارج نمی‌شود. جست‌وجوی ابتکاری برای پاسخ سریع مناسب است، اما بهینگی سراسری را اثبات نمی‌کند.</p></article><article><h3>روش دقیق CP-SAT</h3><p>برای حداکثر ۴۰ گروه درسی، داده به‌طور موقت به تابع Python روی Vercel ارسال می‌شود. نتیجه فقط در وضعیت OPTIMAL «بهینهٔ اثبات‌شده» است.</p></article></div></section>
      <section id="methodology" className="public-section prose"><header><span>روش‌شناسی و محدودیت‌ها</span><h2>درس‌چین چه چیزی را بررسی می‌کند؟</h2></header><p>قیود سخت پشتیبانی‌شده شامل تداخل استاد، گروه دانشجویی و اتاق، ظرفیت، نوع فضا، تجهیزات الزامی، تعطیلی، زمان ممنوع، زمان و اتاق ثابت، تعارض سخت، الگوی زوج و فرد و ممنوعیت جابه‌جایی پشت‌سرهم میان ساختمان‌های متفاوت است. ترجیحات نرم از طریق تابع جریمه رتبه‌بندی می‌شوند.</p><p>برنامهٔ کامل یا ناقص پس از حل دوباره ارزیابی می‌شود. تشخیص تخصیص‌نیافتن، توضیح کمکی است و لزوماً یک اثبات کامل از همهٔ علت‌های ناممکن‌بودن نیست.</p></section>
      <section id="privacy" className="public-section prose"><header><span>حریم خصوصی و امنیت</span><h2>داده کجا پردازش می‌شود؟</h2></header><p>روش سریع تمام پردازش را در مرورگر انجام می‌دهد. روش دقیق، ورودی جاری را برای همان درخواست به تابع Vercel می‌فرستد. برنامه عمداً آن را در پایگاه داده، localStorage، URL یا سرویس تحلیل‌گر ذخیره نمی‌کند؛ بااین‌حال امنیت دستگاه، مرورگر و زیرساخت میزبان خارج از تضمین مطلق این برنامه است.</p></section>
    </main>

    {jsonOpen && <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="json-title" onKeyDown={(event) => trapDialogFocus(event, closeJson)}><header><h2 id="json-title">ورود و خروج JSON</h2><button type="button" aria-label="بستن" onClick={closeJson}>×</button></header><p>حداکثر حجم ورودی ۲ مگابایت است. ساختارهای بسیار عمیق و کلیدهای ناامن رد می‌شوند.</p><textarea ref={jsonTextArea} aria-label="متن JSON" dir="ltr" value={jsonText} onChange={(event) => setJsonText(event.target.value)} /><div className="dialog-actions"><button type="button" onClick={() => downloadJson(input)}>دریافت JSON جاری</button><button type="button" className="primary-small" onClick={importJson}>خواندن و اعتبارسنجی</button></div></section></div>}

    <footer className="site-footer"><div><strong>درس‌چین</strong><span>ابزار متن‌باز برنامه‌ریزی دروس دانشگاهی</span></div><nav aria-label="پیوندهای پایانی"><a href="https://github.com/Hhhkarimi/darschin" target="_blank" rel="noopener noreferrer">کد منبع</a><a href="#methodology">محدودیت‌ها</a><a href="#privacy">حریم خصوصی</a></nav><a className="creator-credit" href="https://www.linkedin.com/in/hossein-karimi-8a452153/" target="_blank" rel="noopener noreferrer">کاری از حسین کریمی</a></footer>
  </div>;
}

function ReviewStep({ input, errors, warnings, solverMode, setSolverMode, solving, run, cancel }: { input: TimetableInput; errors: ReturnType<typeof validateInput>; warnings: ReturnType<typeof validateInput>; solverMode: SolverMode; setSolverMode: (mode: SolverMode) => void; solving: boolean; run: () => void; cancel: () => void }) {
  const exactDisabled = input.courses.length > input.settings.exactCourseLimit;
  return <section className="editor-panel" aria-labelledby="review-title"><header className="section-title"><div><span>مرحله ۴</span><h2 id="review-title">بازبینی پیش از حل</h2></div><p>خطاهای داده باید اصلاح شوند. هشدارها مانع روش سریع نیستند.</p></header><div id="validation-summary" className={`validation-summary ${errors.length ? "has-errors" : "is-valid"}`} tabIndex={-1}><strong>{errors.length ? `${errors.length.toLocaleString("fa-IR")} خطا` : "دادهٔ ورودی معتبر است"}</strong>{errors.map((issue) => <p key={`${issue.path}-${issue.message}`}>{issue.message}</p>)}{warnings.map((issue) => <p key={`${issue.path}-${issue.message}`}>{issue.message}</p>)}</div><div className="review-summary"><div><span>گروه‌های درسی</span><strong>{input.courses.length.toLocaleString("fa-IR")}</strong></div><div><span>جلسات</span><strong>{input.courses.reduce((sum, course) => sum + course.sessions.length, 0).toLocaleString("fa-IR")}</strong></div><div><span>جلسات اجباری</span><strong>{input.courses.flatMap((course) => course.sessions).filter((session) => session.required).length.toLocaleString("fa-IR")}</strong></div><div><span>تعارض‌ها</span><strong>{input.conflicts.length.toLocaleString("fa-IR")}</strong></div></div><div className="solver-choice"><button type="button" className={solverMode === "fast" ? "selected" : ""} aria-pressed={solverMode === "fast"} onClick={() => setSolverMode("fast")}><b>روش سریع</b><span>داخل مرورگر، بدون ارسال داده</span><small>بهینگی اثبات نمی‌شود</small></button><button type="button" disabled={exactDisabled} className={solverMode === "exact" ? "selected" : ""} aria-pressed={solverMode === "exact"} onClick={() => setSolverMode("exact")}><b>روش دقیق CP-SAT</b><span>ارسال موقت به Vercel، حداکثر پنج دقیقه</span><small>{exactDisabled ? `برای بیش از ${input.settings.exactCourseLimit} درس غیرفعال است` : "فقط OPTIMAL بهینهٔ اثبات‌شده است"}</small></button></div><div className="solve-actions"><button type="button" className="solve-button" disabled={solving || errors.length > 0} onClick={run}>{solving ? "در حال حل…" : "حل و ارزیابی برنامه"}</button>{solving && <button type="button" className="danger-button" onClick={cancel}>توقف حل</button>}</div></section>;
}

function ResultStep({ input, result, setResult, resultHeading }: { input: TimetableInput; result: SolveResult; setResult: (next: SolveResult) => void; resultHeading: React.RefObject<HTMLHeadingElement | null> }) {
  const invalid = result.hardViolations.length > 0 || result.publishable === false;
  const exportWithWarning = async (kind: "csv" | "excel") => {
    if (invalid && !window.confirm("این برنامه دارای نقض قید سخت یا جلسهٔ اجباری تخصیص‌نیافته است. خروجی با برچسب «نامعتبر» ساخته شود؟")) return;
    if (kind === "csv") downloadCsv(input, result); else await exportResultExcel(input, result);
  };
  return <section aria-labelledby="result-heading"><h2 id="result-heading" className="sr-focus-heading" tabIndex={-1} ref={resultHeading}>نتیجهٔ حل برنامه</h2><div className="result-actions"><button type="button" onClick={() => exportWithWarning("csv")}>دریافت CSV</button><button type="button" onClick={() => exportWithWarning("excel")}>دریافت Excel چندبرگه</button><button type="button" onClick={() => downloadJson(input)}>دریافت JSON ورودی</button></div><div className="quality-grid"><Metric label="جلسات تخصیص‌یافته" value={result.schedule.length} /><Metric label="جلسات تخصیص‌نیافته" value={result.unscheduled.length} /><Metric label="نقض سخت" value={result.hardViolations.length} /><Metric label="تابع جریمه" value={result.objective} /><Metric label="زمان حل (ms)" value={result.durationMs} />{result.bestBound !== undefined && <Metric label="بهترین کران" value={result.bestBound} />}</div>{result.solverStatus && <p className="solver-status">وضعیت CP-SAT: <b dir="ltr">{result.solverStatus}</b></p>}{result.diagnostics.map((item) => <p className="diagnostic-note" key={item}>{item}</p>)}{(result.unscheduled.length > 0 || result.hardViolations.length > 0 || result.validationErrors.length > 0) && <section className="diagnostics" aria-labelledby="diagnostics-title"><h3 id="diagnostics-title">گزارش خطا و تخصیص‌نیافتن</h3>{result.validationErrors.map((item) => <p key={item}>{item}</p>)}{result.hardViolations.map((item) => <p className="hard-error" key={item}>نقض سخت: {item}</p>)}{result.unscheduled.map((item) => <details key={item.sessionId}><summary>{item.required ? "اجباری — " : ""}{item.label}</summary><ul>{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></details>)}</section>}<ScheduleViews input={input} result={result} onResultChange={setResult} /><section className="penalty-card"><h3>تفکیک جریمه‌ها</h3><div>{Object.entries(result.breakdown).map(([key, value]) => <span key={key}>{PENALTY_LABELS[key as keyof SoftWeights]}: {value.toLocaleString("fa-IR")}</span>)}</div></section></section>;
}

function trapDialogFocus(event: React.KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === "Escape") { event.preventDefault(); close(); return; }
  if (event.key !== "Tab") return;
  const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function Metric({ label, value }: { label: string; value: number }) { return <div><span>{label}</span><strong>{value.toLocaleString("fa-IR")}</strong></div>; }
function stepLabel(step: Step) { return ({ courses: "دروس و جلسات", resources: "منابع و فضاها", rules: "قواعد و وزن‌ها", review: "بازبینی و حل", result: "نتیجه و خروجی" })[step]; }
function resultNotice(result: SolveResult): string { if (result.status === "optimal") return "حل دقیق با بهینگی اثبات‌شده پایان یافت."; if (result.status === "fallback") return `روش سریع پس از توقف روش دقیق اجرا شد. ${result.fallbackReason ?? ""}`; if (result.status === "failed-required") return "برنامه ناقص است و حداقل یک جلسهٔ اجباری تخصیص نیافته است."; if (result.unscheduled.length) return "برنامهٔ ناقص تولید شد؛ جلسات تخصیص‌نیافته را بررسی کنید."; return "برنامهٔ معتبر تولید شد؛ بهینگی آن اثبات نشده است."; }
