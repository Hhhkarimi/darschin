import { useMemo } from "react";

const variants = {
  guided: { title: "A — گردش‌کار هدایت‌شده", audience: "مدیر گروه تازه‌کار", stages: ["دروس و جلسات", "فضاها و تجهیزات", "دسترسی", "تعارض‌ها", "سیاست حل", "بازبینی", "حل", "خروجی"] },
  dashboard: { title: "B — داشبورد عملیات", audience: "کارشناس باتجربه", stages: ["نمای کلی داده", "هشدارها", "وضعیت حل", "کیفیت", "تشخیص", "برنامه"] },
  data: { title: "C — فضای کار داده‌محور", audience: "کاربر فنی و داده‌های حجیم", stages: ["Excel و JSON", "اعتبارسنجی", "خلاصه مدل", "اجرای دسته‌ای", "تمامیت خروجی"] },
  role: { title: "D — ورود نقش‌محور", audience: "چند مخاطب متفاوت", stages: ["مدیر گروه", "کارشناس برنامه‌ریزی", "استاد بازبین", "کاربر JSON", "ارزیاب پروژه"] },
} as const;

type VariantKey = keyof typeof variants;

export function PrototypeGallery() {
  const selected = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get("variant") as VariantKey | null;
    return value && value in variants ? value : "guided";
  }, []);
  const variant = variants[selected];
  return <main className="prototype-page">
    <header className="prototype-banner"><strong>نمونهٔ دورریختنی</strong><span>این مسیر برای مقایسهٔ جهت‌های UX است و معماری production را تعریف نمی‌کند.</span><a href="/">بازگشت به برنامه</a></header>
    <nav className="prototype-switcher" aria-label="انتخاب نمونه">{Object.entries(variants).map(([key, item]) => <a className={key === selected ? "active" : ""} key={key} href={`/prototype?variant=${key}`}>{item.title}</a>)}</nav>
    <section className={`prototype-shell prototype-${selected}`}>
      <aside><span>درس‌چین</span><h1>{variant.title}</h1><p>بهینه‌شده برای {variant.audience}</p><ol>{variant.stages.map((stage, index) => <li key={stage}><b>{(index + 1).toLocaleString("fa-IR")}</b>{stage}</li>)}</ol></aside>
      <div className="prototype-content">
        <header><div><small>دادهٔ نمونه</small><h2>نیمسال جاری دانشکده فنی</h2></div><div className="prototype-actions"><button>ورود Excel</button><button>بازبینی و حل</button></div></header>
        <div className="prototype-kpis"><div><strong>۲۸</strong><span>گروه درسی</span></div><div><strong>۴۶</strong><span>جلسه</span></div><div><strong>۳</strong><span>هشدار</span></div><div><strong>CP-SAT</strong><span>روش انتخابی</span></div></div>
        <div className="prototype-canvas"><section><h3>آنچه مدیر گروه اکنون باید تصمیم بگیرد</h3><p>سه گروه شمارهٔ تکراری دارند، یک آزمایشگاه تجهیزات کافی ندارد و دو جلسهٔ اجباری زمان ثابت ناسازگار دارند.</p><div className="prototype-list"><button>بررسی شماره گروه‌ها <span>۳ مورد</span></button><button>بررسی فضاها <span>۱ مورد</span></button><button>بررسی زمان‌های ثابت <span>۲ مورد</span></button></div></section><section><h3>وضعیت حل</h3><div className="prototype-solver"><b>روش سریع</b><span>داخل مرورگر · بدون ارسال داده</span></div><div className="prototype-solver selected"><b>روش دقیق</b><span>CP-SAT · حداکثر ۴۰ درس · تا ۵ دقیقه</span></div></section></div>
      </div>
    </section>
    <footer><a href="https://www.linkedin.com/in/hossein-karimi-8a452153/" target="_blank" rel="noopener noreferrer">کاری از حسین کریمی</a></footer>
  </main>;
}
