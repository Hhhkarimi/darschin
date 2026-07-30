# SEO and GEO implementation plan

## Indexing policy

| Surface | Indexable | Canonical | Sitemap | Structured data |
|---|---|---|---|---|
| Public home and explanatory content | Yes | `/` | Yes | WebApplication, SoftwareApplication, Person, WebSite |
| Guided editor state | No distinct URL | `/` | No extra URL | No user-data markup |
| `/api/solve` | No | None | No | None |
| `/prototype?variant=*` | No parameter indexing | `/` remains public canonical | No | None |
| User filters and imported data | Never in URL | N/A | No | None |

## Implemented baseline

- Persian title and description.
- Source canonical.
- `lang=fa`, `dir=rtl`.
- Open Graph and Twitter metadata.
- JSON-LD with factual creator and source links.
- `robots.txt`, `sitemap.xml`, manifest, and social image.
- Visible methodology, privacy, limitations, creator, and source content.
- Query variants disallowed in robots as crawl guidance; no sensitive state is encoded in URLs.

## Verification

- Inspect built `index.html`.
- Validate JSON-LD syntax and visible-content match.
- Check robots and sitemap URLs after deployment.
- Use Google Rich Results Test/URL Inspection for rendered output.
- Check 404 and deep-link handling on Vercel.

## Experimental GEO item

`llms.txt` is included only as a concise, factual machine-readable summary. It must be removed if ecosystem guidance shows harmful or misleading effects. It is not an established standard.
