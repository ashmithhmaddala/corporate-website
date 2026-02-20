# CTF Login Challenge - Admin Portal

## 🎯 Challenge Overview

This is a deliberately vulnerable login application for a Capture The Flag (CTF) security event. Red teams must find vulnerabilities to capture the flag, while blue teams must patch these vulnerabilities to defend the system.

## 📋 Event Format

- **Red Team**: Find vulnerabilities and capture the flag
- **Blue Team**: Patch vulnerabilities to prevent exploitation
- **Scoring**: 
  - Red Team: Points for each successful flag capture
  - Blue Team: Points for each vulnerability patched
  - Multiple rounds of attack/defend

## 🎁 Flag

`flag{who_let_the_intern_handle_security}`

Located at: `/admin.html` (requires authentication)

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ctf-login-challenge
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Access the application:
- Login Page: http://localhost:3000/login.html
- Admin Page: http://localhost:3000/admin.html (protected)

## 🔓 Initial Vulnerabilities (For Red Team to Find)

### 1. Client-Side Authentication Bypass
- **Location**: `public/script.js`
- **Description**: Credentials are hardcoded in the frontend JavaScript
- **Severity**: Critical
- **How to Exploit**: 
  - View page source or inspect JavaScript files
  - Credentials visible in plain text: `sys_admin:P@ssw0rd!847`

### 2. Exposed Credentials File
- **Location**: `public/credentials.txt`
- **Description**: Base64 encoded credentials accessible via HTTP
- **Severity**: Critical
- **How to Exploit**:
  - Access http://localhost:3000/credentials.txt
  - Decode base64: `UEBzc3cwcmQhODQ3` → `P@ssw0rd!847`

### 3. Direct Page Access (After Client Bypass)
- **Location**: Navigation to `admin.html`
- **Description**: Client-side authentication allows direct access to admin page
- **Severity**: High
- **How to Exploit**: 
  - Use hardcoded credentials to bypass client-side check
  - Directly navigate to admin.html

## 🛡️ Blue Team Objectives

### Priority 1: Remove Client-Side Authentication
- **Action**: Delete hardcoded credentials from `script.js`
- **Implementation**: Make AJAX call to server endpoint instead
```javascript
// Replace client-side check with server call
fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        window.location.href = data.redirect;
    } else {
        document.getElementById("message").innerText = data.message;
    }
});
```

### Priority 2: Remove/Secure Credentials File
- **Action**: Delete `public/credentials.txt` or move outside public directory
- **Rationale**: No credentials should be accessible via HTTP

### Priority 3: Implement Server-Side Session Protection
- **Action**: Enhance session validation
- **Status**: Basic implementation exists, can be strengthened

### Priority 4: Additional Hardening (Optional)
- Add rate limiting to prevent brute force
- Implement HTTPS/TLS
- Add CSRF protection
- Hash passwords in database (currently plaintext)
- Add logging and monitoring
- Implement account lockout after failed attempts

## 📁 File Structure

```
ctf-login-challenge/
├── server.js              # Express server with login endpoint
├── package.json           # Dependencies
├── db.json               # User credentials database
├── public/               # Static files served by Express
│   ├── login.html        # Login page
│   ├── admin.html        # Protected admin page with flag
│   ├── script.js         # Frontend logic (VULNERABLE)
│   ├── style.css         # Styling
│   └── credentials.txt   # Exposed credentials (VULNERABLE)
└── README.md            # This file
```

## 🎮 How to Play

### For Red Team:
1. Access the login page
2. Find vulnerabilities to gain access
3. Capture the flag from admin page
4. Report to event organizer for points
5. Wait for blue team to patch
6. Find new vulnerabilities after patches

### For Blue Team:
1. Review the code for vulnerabilities
2. Patch identified security issues
3. Test that login still works correctly
4. Prevent red team access
5. Document patches made
6. Prepare for next attack round

## 🔒 Secure Implementation Example (For Blue Team Reference)

After patching, the system should:
- ✅ Use server-side authentication only
- ✅ No credentials in frontend code
- ✅ No exposed credential files
- ✅ Proper session management
- ✅ Secure password storage (hashed)
- ✅ Rate limiting on login attempts
- ✅ HTTPS in production

## 📝 Notes

- Server runs on port 3000
- Session secret: `ctf-secret-key` (should be changed in production)
- Database is JSON file (use real database in production)
- Passwords stored in plaintext (should be hashed in production)

## ⚠️ Disclaimer

This application is intentionally vulnerable for educational purposes. DO NOT use this code in production environments.

---

Good luck to both teams! 🚀
