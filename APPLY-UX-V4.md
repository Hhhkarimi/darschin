# اعمال نسخهٔ بازمهندسی‌شده UX

این بسته فقط فایل‌های مرتبط با بازمهندسی رابط، داشبورد، راهنما، Excel نمونه و تست‌ها را شامل می‌شود و به تنظیمات فعلی Vercel، Python و packageها دست نمی‌زند.

## روش پیشنهادی

در ریشهٔ مخزن:

```bash
# روش اول: patch
git apply darschin-ux-v4.patch

# یا روش دوم: فایل‌های ZIP را با حفظ مسیر کپی کنید.

npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run check:static
```

سپس:

```bash
git add src public/templates/darschin-input-template.xlsx docs/ux-reengineering-v4.md docs/ux-v4-verification.txt APPLY-UX-V4.md CHANGELOG.md
git commit -m "Re-engineer manager workflow and result dashboard"
git push
```

## فایل‌های جدید

- `src/components/FormControls.tsx`
- `src/components/Glossary.tsx`
- `src/components/ResultDashboard.tsx`
- `src/domain/inputMutations.ts`
- `src/domain/resultInsights.ts`
- تست‌های متناظر
- `docs/ux-reengineering-v4.md`

## نکته

این patch بر مبنای نسخه‌ای ساخته شده که جهت برنامهٔ هفتگی در آن «روزها در ردیف و بازه‌ها در ستون» است.
