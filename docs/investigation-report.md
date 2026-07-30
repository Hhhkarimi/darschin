# گزارش بررسی اولیه

## وضعیت پیشین

نسخهٔ بررسی‌شده یک SPA کوچک React/Vite بود که رابط در `App.tsx` و مدل، validation و heuristic در `domain.ts` متمرکز شده بود. Router، backend، test runner، lint، CI، CSP، sitemap، structured data، Vazirmatn و creator credit وجود نداشت.

حل‌کنندهٔ پیشین candidateهای مجاز را تولید و با ترتیب‌دهی محدودترین جلسه، چند شروع pseudo-random ثابت و بهبود محلی جواب را انتخاب می‌کرد. این روش deterministic بود، اما اثبات بهینگی نداشت و روی main thread اجرا می‌شد.

## ریسک‌های مهم مشاهده‌شده

- عنوان «بدون تداخل» qualification کافی نداشت.
- verifier مستقل از منطق تولید جواب نبود.
- JSON بدون محدودیت اندازه و عمق parse می‌شد.
- CSV در برابر formula injection ایمن نبود.
- typography از Tahoma/Arial و monospace استفاده می‌کرد.
- timetable جایگزین semantic table نداشت.
- focus پس از خطا یا حل مدیریت نمی‌شد.
- metadata به title و description پایه محدود بود.
- هیچ تست یا automation کیفیتی وجود نداشت.
- solver synchronous می‌توانست main thread را مسدود کند.

## منبع حقیقت شاخص‌ها

شاخص‌های schedule، unscheduled، hard violations، objective، penalty breakdown و duration در یک `SolveResult` مشترک بودند؛ اما تعریف preference rate و room utilization نیازمند qualification بود. در مدل جدید این دو درصد مبهم حذف شده‌اند و breakdown خام و objective صریح نمایش داده می‌شوند.
