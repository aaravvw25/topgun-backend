# TOPGUNS HIT — Registration Backend

A small, solid Express API that replaces the Google Apps Script with a real
database. Free to run using Supabase (database) + Render (server).

## What's included
- `POST /api/register` — validates and saves a registration
- `GET /api/registrations` — lists all registrations (admin-only, needs a key)
- `GET /api/registrations/export` — downloads all registrations as CSV (admin-only)
- `GET /health` — simple uptime check

Every field is validated again on the server (never trust the browser), phone
numbers are unique (no duplicate sign-ups), and there's rate limiting on the
register endpoint so it can't be spammed.

---

## Step 1 — Create your free database (Supabase)

1. Go to https://supabase.com → sign up → **New project**.
2. Pick a name and a strong database password (save it somewhere).
3. Once the project is ready, go to **Project Settings → Database →
   Connection string → URI**. Copy it. It looks like:
   ```
   postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxx.supabase.co:5432/postgres
   ```
4. That's it — you don't need to create any tables manually, the server does
   it automatically the first time it starts.

## Step 2 — Deploy the backend (Render, free tier)

1. Push this folder to a GitHub repo (or upload it directly — Render also
   supports "deploy from a public repo" or drag-and-drop via their CLI).
2. Go to https://render.com → sign up → **New → Web Service** → connect your repo.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Under **Environment**, add these variables:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase connection string from Step 1 |
   | `ADMIN_KEY` | any long random string you make up, e.g. `tg-8f2k...` |
   | `ALLOWED_ORIGIN` | your live site's URL, e.g. `https://topgunshit.com` (use `*` for now if you don't have the final domain yet) |
5. Click **Deploy**. When it's live, Render gives you a URL like:
   ```
   https://topguns-backend.onrender.com
   ```
6. Test it's alive by visiting `https://topguns-backend.onrender.com/health`
   in your browser — you should see `{"status":"ok",...}`.

> Note: Render's free tier "sleeps" a service after 15 minutes of no traffic
> and takes ~30-50 seconds to wake up on the next request. Fine for a
> registration form; if that delay ever bothers you, upgrade to Render's
> cheapest paid tier ($7/mo) to keep it always-on.

## Step 3 — Point your website at the new backend

In your `index.html`, find this line (originally pointing to Google Apps Script):

```js
const SCRIPT_URL = 'https://script.google.com/macros/s/.../exec';
```

Replace it with your Render URL + `/api/register`:

```js
const SCRIPT_URL = 'https://topguns-backend.onrender.com/api/register';
```

Nothing else in your form code needs to change — the response shape
(`{ result: 'success' }` or `{ result: 'error', message: '...' }`) matches
what your existing JavaScript already expects.

## Step 4 — View your registrations

Open this URL in a tool like Postman, or just visit it and enter the key when
prompted (or add `?key=` — see note below):

```
GET https://topguns-backend.onrender.com/api/registrations
Header: x-admin-key: <your ADMIN_KEY>
```

To download everything as a spreadsheet-ready CSV:

```
GET https://topguns-backend.onrender.com/api/registrations/export
Header: x-admin-key: <your ADMIN_KEY>
```

(Browsers can't easily send custom headers by just typing a URL — use a
browser extension like "ModHeader", Postman, or `curl`:
```
curl -H "x-admin-key: YOUR_KEY" https://topguns-backend.onrender.com/api/registrations
```
)

## Local testing (optional)

```bash
npm install
cp .env.example .env      # then edit .env with your real DATABASE_URL
npm start
```

Then test with:
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"9876543210","email":"test@test.com","age":"25","division":"Men'"'"'s RX","tshirt":"L","emergencyContact":"9999999999","tgMembership":"TG123"}'
```

---

## Why this setup (no glitches)

- **Server-side validation** — even if someone bypasses your form's JS, bad
  data can't get into the database.
- **Unique phone constraint** — prevents accidental double registrations.
- **Rate limiting** — stops bots from spamming the form.
- **Real database (Postgres)** — no risk of losing data on redeploy, unlike
  SQLite on Render's free ephemeral disk.
- **CORS locked to your domain** — once you set `ALLOWED_ORIGIN`, only your
  actual website can submit to this API.
- **Central error handling** — the server never crashes on bad input; it
  always responds with a clean JSON error instead.
