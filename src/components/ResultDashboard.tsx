import { buildResultInsights, type InsightBar } from "../domain/resultInsights";
import type { SolveResult, TimetableInput } from "../domain/types";

export function ResultDashboard({ input, result }: { input: TimetableInput; result: SolveResult }) {
  const insights = buildResultInsights(input, result);
  const publishable = !result.hardViolations.length && result.publishable !== false;
  return <section className="manager-dashboard" aria-labelledby="manager-dashboard-title">
    <header className="dashboard-heading"><div><span>داشبورد مدیریتی</span><h3 id="manager-dashboard-title">خلاصهٔ تصمیم‌گیری مدیر گروه</h3></div><p>این شاخص‌ها نتیجه را خلاصه می‌کنند؛ مقدار تابع جریمه فقط در چارچوب وزن‌های همین مسئله معنا دارد و بین دو مسئلهٔ متفاوت قابل مقایسهٔ مستقیم نیست.</p></header>
    <div className="dashboard-overview">
      <div className="coverage-card"><div className="coverage-ring" style={{ "--coverage-angle": `${insights.coveragePercent * 3.6}deg` } as any}><strong>{insights.coveragePercent.toLocaleString("fa-IR")}٪</strong><span>پوشش جلسات</span></div><div><b>{insights.scheduledSessions.toLocaleString("fa-IR")} از {insights.totalSessions.toLocaleString("fa-IR")}</b><p>جلسه در برنامه قرار گرفته است.</p></div></div>
      <div className="decision-card"><span>وضعیت انتشار</span><strong className={publishable ? "decision-valid" : "decision-invalid"}>{publishable ? "قابل انتشار پس از بازبینی" : "نامعتبر برای انتشار"}</strong><small>{result.manuallyEdited ? "نتیجه پس از حل به‌صورت دستی ویرایش شده است." : "نتیجهٔ فعلی مستقیماً از حل‌کننده آمده است."}</small></div>
      <DashboardMetric label="پوشش جلسات اجباری" value={`${insights.mandatoryCoveragePercent.toLocaleString("fa-IR")}٪`} detail={`${insights.mandatoryScheduled.toLocaleString("fa-IR")} از ${insights.mandatoryTotal.toLocaleString("fa-IR")}`} />
      <DashboardMetric label="میانگین استفاده از ظرفیت" value={`${insights.averageRoomUtilizationPercent.toLocaleString("fa-IR")}٪`} detail={`${insights.usedRooms.toLocaleString("fa-IR")} اتاق استفاده‌شده`} />
      <DashboardMetric label="پرتراکم‌ترین روز" value={insights.busiestDayLabel} detail={`${insights.busiestDayPeriods.toLocaleString("fa-IR")} بازهٔ اشغال‌شده`} />
      <DashboardMetric label="بیشترین بار استاد" value={insights.heaviestInstructorLabel} detail={`${insights.heaviestInstructorPeriods.toLocaleString("fa-IR")} بازه در هفته`} />
    </div>
    <div className="dashboard-charts">
      <BarChart title="توزیع بار هفتگی" description="مجموع بازه‌های اشغال‌شده در هر روز" bars={insights.dayBars} empty="جلسه‌ای برای نمایش وجود ندارد." />
      <BarChart title="سهم عوامل جریمه" description="تعداد رخداد ضرب‌در وزن تنظیم‌شده" bars={insights.penaltyBars} empty="هیچ جریمهٔ نرمی در نتیجه ثبت نشده است." />
      <BarChart title="استفاده از ظرفیت اتاق‌ها" description="میانگین نسبت تعداد دانشجو به ظرفیت اتاق" bars={insights.roomBars} empty="هیچ اتاقی در برنامه استفاده نشده است." />
    </div>
    <section className="manager-notes" aria-labelledby="manager-notes-title"><h4 id="manager-notes-title">نکات قابل اقدام</h4><ul>{insights.recommendations.map((item) => <li key={item}>{item}</li>)}</ul><p>{insights.unusedRooms.toLocaleString("fa-IR")} اتاق تعریف‌شده در این نتیجه استفاده نشده است.</p></section>
  </section>;
}

function DashboardMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="dashboard-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function BarChart({ title, description, bars, empty }: { title: string; description: string; bars: InsightBar[]; empty: string }) {
  return <figure className="bar-chart"><figcaption><strong>{title}</strong><span>{description}</span></figcaption>{bars.length ? <div className="bar-chart-body" role="img" aria-label={`${title}: ${bars.map((bar) => `${bar.label} ${bar.detail}`).join("؛ ")}`}>{bars.map((bar) => <div className="bar-row" key={bar.id}><div className="bar-label"><span>{bar.label}</span><small>{bar.detail}</small></div><div className="bar-track"><span style={{ width: `${Math.min(100, Math.max(0, bar.percent))}%` }} /></div></div>)}</div> : <p className="empty-note">{empty}</p>}</figure>;
}
