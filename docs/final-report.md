# گزارش نهایی توسعهٔ درس‌چین

تاریخ: ۱۴۰۵/۰۵/۰۸ (2026-07-30)

## آنچه بررسی شد

مخزن و نسخهٔ منتشرشده، معماری React/Vite، مدل دامنه و heuristic قبلی، شاخص‌ها، JSON/CSV، RTL، typography، دسترس‌پذیری، امنیت، SEO/GEO، رفتار Vercel و محدودیت‌های اجرای حل‌کننده بررسی شدند. گزارش پایه در `docs/investigation-report.md` ثبت شده است.

## تصمیم‌های محصول و دامنه

- مخاطب اصلی: مدیر گروه.
- ورود اصلی: دستی و هدایت‌شده؛ Excel مسیر رسمی ورود گروهی و JSON مسیر فنی است.
- هر ارائهٔ درس یک گروه درسی مستقل با شمارهٔ مثبت، یکتا و غیرقابل‌ویرایش است.
- هر گروه درسی دارای جلسه‌های هفتگی مستقل است؛ جلسه‌ها از پیش‌فرض‌های گروه ساخته می‌شوند و سپس می‌توانند مشخصات مستقل داشته باشند.
- استاد و گروه دانشجویی دادهٔ قطعی هر جلسه‌اند؛ حل‌کننده فقط زمان و اتاق غیرثابت را انتخاب می‌کند.
- تمام معانی قیود سخت، ترجیحات نرم، هفته‌های زوج/فرد، وقفه، سفر میان ساختمان‌ها و برنامهٔ ناقص در `CONTEXT.md` و specification ثبت شده‌اند.

## جهت UX انتخاب‌شده

گردش‌کار Guided برای مدیر گروه به‌عنوان تجربهٔ production انتخاب شد. چهار نمونهٔ disposable در `/prototype?variant=guided|dashboard|data|role` باقی مانده‌اند تا trade-offها قابل مشاهده باشند.

## ماژول‌های اصلی تغییرکرده

- مدل و validation: `src/domain/*`
- روش سریع و Web Worker: `src/domain/fastSolver.ts`, `src/workers/fastSolver.worker.ts`
- مدل دقیق: `api/cp_sat_solver.py`, `api/payload_validation.py`, `api/solve.py`
- رابط: `src/App.tsx`, `src/components/*`, `src/styles/global.css`
- فایل‌ها: `src/services/excel.ts`, `src/services/downloads.ts`
- استقرار و metadata: `vercel.json`, `index.html`, `public/*`
- مستندات: `CONTEXT.md`, `docs/*`, `SECURITY.md`, `AGENTS.md`

## معماری و حل‌کننده

- منطق دامنه از React جدا و seamهای عمومی برای validation، candidate generation، evaluation و verification ایجاد شد.
- روش سریع deterministic، محدودشده، قابل توقف و خارج از main thread است.
- روش دقیق OR-Tools CP-SAT در Vercel Python Function اجرا می‌شود؛ سقف آن ۴۰ گروه درسی و بودجهٔ داخلی ۲۸۵ ثانیه است.
- هدف‌ها lexicographic هستند: حفظ جلسه‌های اجباری، بیشینه‌کردن تعداد جلسات، سپس کمینه‌کردن جریمه‌های نرم.
- فقط `OPTIMAL` «بهینهٔ اثبات‌شده» است؛ `FEASIBLE` با qualification نمایش داده می‌شود.
- نبود جواب قابل استفاده، timeout یا عدم دسترسی API باعث fallback خودکار به روش سریع می‌شود.
- جواب exact پس از بازگشت، دوباره در مرورگر در برابر قیود سخت پشتیبانی‌شده بررسی می‌شود.

## یکپارچگی JSON و Excel/CSV

- JSON: سقف ۲ MiB، عمق و اندازهٔ آرایه محدود، رد کلیدهای prototype-pollution و validation ساختاری.
- JSONهای قدیمی با migration صریح خوانده می‌شوند و تغییرات غیرهم‌ارز هشدار می‌گیرند.
- Excel نمونه ۹ برگه دارد و ورود آن به ۴ MiB، ۲۰ برگه و ۱۰٬۰۰۰ سطر محدود است.
- Excel خروجی شامل برنامه، تخصیص‌نیافته‌ها، نقض‌ها، کیفیت و برگه‌های مستقل استاد/گروه/اتاق است.
- CSV و Excel در برابر spreadsheet formula injection محافظت می‌شوند.
- فایل نامعتبر هم در نام فایل و هم داخل محتوا برچسب «نامعتبر» دارد.

## دسترس‌پذیری، RTL و typography

- ناوبری keyboard، skip link، focus پس از validation/solve، status live، dialog modal با Escape/focus trap، توقف حل و reduced motion اضافه شد.
- نمای بصری timetable و جدول معنایی معادل از یک دادهٔ مشترک استفاده می‌کنند؛ چاپ همیشه از جدول استفاده می‌کند.
- layout فارسی RTL و responsive است و overflowهای جدول کنترل شده‌اند.
- Vazirmatn تنها فونت پروژه است و از بستهٔ self-hosted Fontsource در build می‌آید.
- اعتبار «کاری از حسین کریمی» با URL دقیق LinkedIn در footer و creator metadata قرار دارد.

## SEO و GEO

- title/description/canonical، Open Graph/Twitter، `lang=fa`, `dir=rtl`، manifest، robots، sitemap، social image و JSON-LD اضافه شدند.
- structured data فقط اطلاعات قابل مشاهده و تأییدشدهٔ WebApplication/SoftwareApplication/Person/WebSite را بیان می‌کند.
- محتوای عمومی روش‌شناسی، محدودیت، privacy، source و creator قابل crawl است؛ API و state کاربر index نمی‌شوند.
- `llms.txt` فقط یک پیشنهاد آزمایشی و غیرجایگزین برای استانداردهای crawl است.

## امنیت و حریم خصوصی

- CSP، `frame-ancestors`, MIME sniffing، Referrer Policy، Permissions Policy، COOP و no-store API اضافه شدند.
- متن کاربر با APIهای معمول React به‌صورت text رندر می‌شود؛ HTML خام وارد DOM نمی‌شود.
- روش سریع داده را خارج نمی‌کند؛ روش دقیق آن را موقتاً به همان origin Vercel می‌فرستد و برنامه عمداً persistence یا analytics ندارد.
- زمان، تعداد entity، اندازهٔ payload و ابعاد solver محدود شده‌اند.
- threat model و روش گزارش مسئولانهٔ آسیب‌پذیری مستند شده‌اند.

## عملکرد

- fast solver از main thread جدا شد.
- ExcelJS lazy-load می‌شود.
- object URLها آزاد می‌شوند.
- exact solver و fast attempts سقف دارند.
- اندازهٔ bundle نهایی در این محیط قابل اندازه‌گیری نبود، چون dependency installation ممکن نشد.

## تست‌ها و وضعیت نهایی

موفق:

```text
tsc -p tools/offline-verification/tsconfig.local.json --noEmit --noUnusedLocals --noUnusedParameters  PASS
tsc -p tools/offline-verification/tsconfig.domain.json                                            PASS
node /tmp/darschin-smoke.cjs                                           PASS
python3 -m compileall -q api                                           PASS
python3 -m unittest discover -s api/tests -v                           PASS: 6 / SKIP: 2 CP-SAT
node scripts/check-static.mjs                                          PASS
artifact_tool Excel inspection                                        PASS: 9 sheets / 0 formula errors
```

اجرانشده به علت محدودیت registry محیط:

- dependency-backed TypeScript/Vitest/ESLint/Vite build
- `npm audit`
- نصب OR-Tools و اجرای دو تست واقعی CP-SAT
- deployment و بررسی live headers/Core Web Vitals/bundle/cold start

جزئیات و فرمان‌های لازم در `docs/verification.md` آمده است.

## محدودیت‌های باقی‌مانده

- deployment واقعی CP-SAT باید در Vercel proof شود.
- package-lock پس از نخستین `npm install` در محیط دارای registry عمومی ساخته و commit شود.
- diagnostics تخصیص‌نیافتن توضیح کمکی است، نه unsat-core رسمی.
- editorهای بسیار بزرگ هنوز virtualization ندارند.
- هیچ backend ذخیره‌سازی، authentication یا analytics اضافه نشده است.

## کار اختیاری بعدی

پس از موفقیت deployment، profile کردن datasetهای نزدیک سقف ۴۰ گروه، افزودن fixtureهای سازمانی، اندازه‌گیری bundle/Core Web Vitals و در صورت نیاز تقویت diagnostics با assumption literals پیشنهاد می‌شود.
