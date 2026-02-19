# 🚩 CTF Flags — Vault

| # | Vulnerability | Endpoint | Source File & Line | Flag |
|---|---|---|---|---|
| 1 | Command Injection | `POST /api/tools/ping`, `/api/tools/dns`, `/api/tools/traceroute` | `server.js` L919, L942, L956 — unsanitized `host` passed to `exec()` | `CTF{c0mm4nd_1nj3ct10n_m4st3r}` |
| 2 | SSRF (Server-Side Request Forgery) | `POST /api/tools/fetch-url`, `/api/webhooks/test` | `server.js` L973, L1006 — fetches any URL including internal services | `CTF{ss4f_1nt3rn4l_4cc3ss}` |
| 3 | Path Traversal | `GET /api/files/download`, `/api/files/list`, `/api/files/read` | `server.js` L1043, L1072, L1090 — no path sanitization | `CTF{p4th_tr4v3rs4l_pr0}` |
| 4 | IDOR (Insecure Direct Object Ref) | `GET /api/users/:id` | `server.js` L1125 — returns any user's full data including plaintext password | `CTF{1d0r_us3r_d4t4_l34k}` |
| 5 | Stored XSS | `POST /api/notes` | `server.js` L1291 (API) · `notes.html` L245, L265-L266 — `innerHTML` without sanitization | `CTF{st0r3d_x55_1n_n0t3s}` |
| 6 | Reflected XSS | Dashboard search box | `dashboard.js` L152, L172 — `filterSecrets()` injects query via `innerHTML` | `CTF{r3fl3ct3d_x55_1n_s34rch}` |
| 7 | SQL Injection (Simulated) | `GET /api/search?q=' UNION SELECT * --` | `server.js` L1647 — SQL keywords trigger full database dump | `CTF{sql_1nj3ct10n_s1mul4t3d}` |
| 8 | Insecure Deserialization | `POST /api/import` with `format=auto` | `server.js` L1206, L1226 — `eval()` used to parse input | `CTF{1ns3cur3_d3s3r14l1z4t10n}` |
| 9 | Hidden Admin Panel | `GET /api/admin/dashboard` | `server.js` L1439 (API) · `admin.html` (UI) — header `X-Admin: true` or `?admin=true` bypasses check | `CTF{h1dd3n_4dm1n_p4n3l_f0und}` |
| 10 | Debug Endpoint Exposed | `GET /api/debug` | `server.js` L1508 — no auth, dumps all sessions, users, passwords, env vars | `CTF{d3bug_3ndp01nt_3xp0s3d}` |
| 11 | Backup Data Leak | `GET /api/backup`, `/backup.sql` | `server.js` L1548, L1804 — no auth, full database dump with credentials | `CTF{b4ckup_d4t4_l34k3d}` |
| 12 | Open Redirect | `GET /redirect?url=`, `/api/auth/callback?redirect_uri=` | `server.js` L1180, L1192 — no URL validation | `CTF{0p3n_r3d1r3ct_vuln}` |
| 13 | Predictable Password Reset | `POST /api/auth/forgot-password` | `server.js` L1365 — token is `base64(email:timestamp)`, leaked in response body | `CTF{pr3d1ct4bl3_r3s3t_t0k3n}` |
| 14 | User Enumeration | `GET /api/users/check?email=` | `server.js` L1108 — different response reveals if email exists | `CTF{us3r_3num3r4t10n_l34k}` |
| 15 | Mass Assignment | `PUT /api/users/update` | `server.js` L1154 — no field filtering, `{"role":"admin"}` escalates privileges | `CTF{m4ss_4ss1gnm3nt_r0l3}` |
| 16 | Authentication Bypass | `POST /api/auth/token` | `server.js` L1725 — generates valid token with email only, no password required | `CTF{w34k_4uth_byp4ss}` |
| 17 | Unrestricted File Upload (PHP RCE) | `POST /api/profile/picture` | `server.js` L508 — accepts `.php` files, served statically from `/uploads/` | `CTF{php_f1l3_upl04d_rc3}` |
| 18 | .env File Exposure | `GET /.env` | `server.js` L1756 — serves production config with DB creds, API keys, admin password | `CTF{3nv_f1l3_3xp0s3d}` |
| 19 | Information Disclosure | `GET /api/debug/error`, `/api/config`, `/.git/config`, `/config.json` | `server.js` L1585, L1601, L1887, L1860 — stack traces, DB/SMTP creds, deploy tokens | `CTF{1nf0_d1scl0sur3_st4ck_tr4c3}` |
| 20 | CORS Misconfiguration | Every response | `server.js` L50-L56 — reflects any `Origin` with `Access-Control-Allow-Credentials: true` | `CTF{c0rs_w1ld_c4rd_4cc3ss}` |
| 21 | SQL Injection - Login Bypass | POST /challenge1 | app.py — Authentication bypass via SQL comment injection | FLAG{sql_login_bypass_success}
| 22 | SQL Injection - UNION Attack | GET /challenge2?search= | app.py — Data exfiltration from hidden tables using UNION SELECT | FLAG{union_injection_master}
| 23 | SQL Injection - Blind Boolean | GET /challenge3?id= | app.py — Extract data character-by-character via boolean conditions | FLAG{blind_sqli_champion}

---

## Bonus: Non-flag Vulnerabilities

- **Plaintext password storage** — all passwords stored as plain strings in memory
- **No rate limiting** — login/register endpoints have no brute-force protection
- **No CSRF protection** — no CSRF tokens on any forms
- **Sessions never expire** — tokens are valid forever until server restart
- **Verbose server headers** — `X-Powered-By`, `X-Debug-Mode`, `X-Internal-IP` on every response
- **No ownership checks on secrets** — any user can read/edit/delete any secret
- **Unauthenticated admin user management** — `PUT/DELETE /api/admin/users/:id` require no auth
- **Notes viewable without auth** — `GET /api/notes/:id` has no authentication
- **Notes deletable by any user** — no ownership check on `DELETE /api/notes/:id`
- **All secrets exported in plaintext** — `GET /api/export` dumps all values

---

## Discovery Hints

| Resource | What it reveals |
|---|---|
| `/robots.txt` | Lists all sensitive paths (admin, debug, backup, .env, .git, uploads) |
| `/api/health` | Leaks Node version, platform, memory, user/secret counts |
| `/config.json` | Application config with internal URLs and feature flags |
| `/backup.sql` | Fake SQL dump with extra admin accounts and credentials |
| `/.git/config` | Git config with deploy token |
| Response headers | `X-Powered-By`, `Server`, `X-Debug-Mode`, `X-Internal-IP` |

## Demo Credentials

| Email | Password | Role |
|---|---|---|
| `admin@vault.dev` | `admin123` | admin |
| `john@acme.com` | `password123` | owner |
| `jane@acme.com` | `password123` | admin |
