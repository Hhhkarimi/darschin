import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), "utf8");
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

for (const path of ["package.json", "vercel.json", "public/manifest.webmanifest"]) JSON.parse(read(path));
assert(existsSync(join(root, "public/templates/darschin-input-template.xlsx")), "Excel template is missing");

const index = read("index.html");
const ldMatch = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(ldMatch, "JSON-LD block is missing");
JSON.parse(ldMatch[1]);
const hash = createHash("sha256").update(ldMatch[1]).digest("base64");
assert(read("vercel.json").includes(`sha256-${hash}`), "CSP JSON-LD hash is stale");

const productionRoots = ["src", "public"];
const files = [];
const walk = (path) => {
  for (const entry of readdirSync(join(root, path))) {
    const next = join(path, entry);
    const stat = statSync(join(root, next));
    if (stat.isDirectory()) walk(next);
    else if (!next.endsWith(".xlsx")) files.push(next);
  }
};
for (const path of productionRoots) walk(path);
files.push("index.html");
const productionText = files.map((path) => `\n/* ${relative(root, join(root, path))} */\n${read(path)}`).join("\n");

for (const forbidden of [/fonts\.google/i, /use\.typekit/i, /font-family\s*:[^;]*(Tahoma|Arial|monospace|Georgia|Times)/i]) {
  assert(!forbidden.test(productionText), `Forbidden typography pattern: ${forbidden}`);
}
assert(productionText.includes("Vazirmatn"), "Vazirmatn is not referenced");
assert(productionText.includes("کاری از حسین کریمی"), "Visible creator credit is missing");
assert(productionText.includes("https://www.linkedin.com/in/hossein-karimi-8a452153/"), "Creator URL is incorrect");
assert(productionText.includes("https://github.com/Hhhkarimi/darschin"), "Source URL is incorrect");
assert(!/بدون تداخل/.test(productionText), "Unsupported conflict-free claim found");
assert(!/بهینه(?:\s|‌)است/.test(productionText), "Unsupported optimality claim found");

const vercel = read("vercel.json");
for (const header of ["Content-Security-Policy", "frame-ancestors 'none'", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
  assert(vercel.includes(header), `Security header/control missing: ${header}`);
}
assert(read("public/robots.txt").includes("Disallow: /api/"), "robots.txt must exclude API");
assert(read("public/sitemap.xml").includes("https://darschin.vercel.app/"), "sitemap canonical URL is missing");
console.log(`STATIC_CHECK_OK (${files.length} production text files)`);
