# SQL Injection CTF Challenges

Three SQL injection vulnerabilities for the cybersecurity CTF event.

## Setup

```bash
pip install flask
python app.py
```

Visit `http://localhost:5000`

## The Challenges

### Challenge 1: Login Bypass (Easy)
- **URL:** `/challenge1`
- **Type:** Authentication bypass
- **Flag:** `FLAG{sql_login_bypass_success}`
- **Hint:** SQL comments start with `--`

### Challenge 2: UNION Injection (Medium)
- **URL:** `/challenge2`
- **Type:** Data exfiltration via UNION SELECT
- **Flag:** `FLAG{union_injection_master}`
- **Hint:** Find the hidden `secret_flags` table

### Challenge 3: Blind SQL Injection (Hard)
- **URL:** `/challenge3`
- **Type:** Boolean-based blind SQLi
- **Flag:** `FLAG{blind_sqli_champion}`
- **Hint:** Extract data character by character using `SUBSTR()`

## Files

- `app.py` - The vulnerable web application
- `EXPLOITS.md` - Solutions and exploit payloads (for organizers only)
- `requirements.txt` - Dependencies

## Database Tables

The app creates these tables:
- `users` - User accounts (admin, user1, user2)
- `products` - Sample product catalog
- `secret_flags` - Contains the 3 flags (hidden)

## For Integration

The other team members can integrate these challenges by:
1. Using the route handlers from `app.py`
2. Copying the database init code
3. Adjusting the HTML templates to match your site's design
4. The core vulnerability code remains the same

## Security Note

⚠️ **These vulnerabilities are intentional for educational purposes.**
Never deploy this code to production!
