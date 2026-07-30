# درس‌چین

درس‌چین یک برنامهٔ فارسی RTL برای زمان‌بندی دروس دانشگاهی است. تجربهٔ اصلی برای مدیر گروه طراحی شده و ورود دستی، Excel، JSON، دو روش حل و گزارش قابل‌توضیح را فراهم می‌کند.

## روش‌های حل

- **روش سریع:** جست‌وجوی ابتکاری قطعی داخل مرورگر؛ بدون اثبات بهینگی.
- **روش دقیق:** OR-Tools CP-SAT در Vercel Python Function؛ حداکثر ۴۰ گروه درسی و ۲۸۵ ثانیه بودجهٔ داخلی. فقط `OPTIMAL` به معنی «بهینهٔ اثبات‌شده» است.

اگر روش دقیق جواب قابل استفاده‌ای ندهد، روش سریع خودکار اجرا می‌شود.

## اجرای محلی

```bash
npm install
npm run dev
```

برای API دقیق:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
vercel dev
```

پس از نخستین `npm install`، فایل `package-lock.json` ایجاد می‌شود و باید همراه تغییرات commit شود.

## بررسی‌ها

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:prod
npm run check:python
npm run test:api
```

## ساختار

- `src/domain`: مدل، validation، candidate generation، metrics و fast solver
- `src/services`: exact solver client، JSON/CSV/XLSX
- `api`: CP-SAT و Vercel handler
- `docs`: specification، ADR، پژوهش، threat model و گزارش‌ها
- `public/templates`: Excel نمونه

## حریم خصوصی

روش سریع در مرورگر اجرا می‌شود. روش دقیق دادهٔ جاری را برای همان درخواست به Vercel می‌فرستد. برنامه عمداً داده را در database، localStorage، URL یا analytics ذخیره نمی‌کند. این توضیح یک تضمین مطلق امنیت زیرساخت یا دستگاه کاربر نیست.

## Typography and attribution

تنها فونت پروژه Vazirmatn است و از بستهٔ self-hosted Fontsource در build استفاده می‌شود.

[کاری از حسین کریمی](https://www.linkedin.com/in/hossein-karimi-8a452153/)

- Production: https://darschin.vercel.app/
- Source: https://github.com/Hhhkarimi/darschin
