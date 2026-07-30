# Local delivery instructions

This directory is a complete replacement working tree without `.git` metadata. To apply it to a fresh clone while preserving the clone's Git history:

```bash
git clone https://github.com/Hhhkarimi/darschin.git darschin-repo
rsync -a --delete --exclude='.git/' /path/to/darschin-delivery/ darschin-repo/
cd darschin-repo
npm install
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm run verify
npm run check:static
python -m compileall -q api
python -m unittest discover -s api/tests -p 'test_*.py' -v
```

The first successful `npm install` creates a new `package-lock.json`; review and commit it. Then test with `vercel dev`, deploy to a preview, verify `/api/solve` and response headers, and only then commit/push.
