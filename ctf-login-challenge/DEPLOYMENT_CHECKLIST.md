# 🎯 CTF Event Deployment Checklist

## Pre-Event Setup (Do This First!)

### 1. Environment Setup
- [ ] Install Node.js (v18+) on hosting machine
- [ ] Install npm
- [ ] Clone/copy repository to hosting location
- [ ] Run `npm install` to install dependencies
- [ ] Run `./verify-setup.sh` to verify everything is configured

### 2. Test Run
- [ ] Start server with `npm start`
- [ ] Open browser to http://localhost:3000/login.html
- [ ] Test login with credentials: `sys_admin` / `P@ssw0rd!847`
- [ ] Verify flag appears on admin page
- [ ] Verify vulnerabilities are present:
  - [ ] Open DevTools → Sources → script.js (should see hardcoded creds)
  - [ ] Access http://localhost:3000/credentials.txt (should be accessible)
  - [ ] Navigate directly to /admin.html after client-side login

### 3. Network Setup (If Hosting for Multiple Teams)
- [ ] Determine hosting method:
  - [ ] Local network (recommended for in-person events)
  - [ ] Cloud hosting (for remote events)
- [ ] Configure firewall to allow port 3000
- [ ] Test access from another machine
- [ ] Note down the IP address/URL for participants

---

## Event Day Checklist

### 30 Minutes Before Event
- [ ] Start the server: `npm start`
- [ ] Verify server is accessible
- [ ] Prepare scoring sheet (SCORING_SHEET.md)
- [ ] Set up display for leaderboard (optional)

### Team Briefing (Give Each Team)
- [ ] Challenge URL: http://[YOUR-IP]:3000/login.html
- [ ] Challenge objective (get the flag)
- [ ] Rules explanation:
  - [ ] Red Team: Find vulnerabilities, capture flag, report
  - [ ] Blue Team: Patch vulnerabilities, prevent access
- [ ] Reporting method (Slack, form, verbal, etc.)
- [ ] Time limit per round

### During Event - Red Team Monitoring
When a team reports flag capture, verify:
- [ ] Ask: "Which vulnerability did you exploit?"
- [ ] Record: Team name, time, method used
- [ ] Award points based on agreed scoring
- [ ] Confirm flag is correct: `flag{who_let_the_intern_handle_security}`

### During Event - Blue Team Monitoring
When blue team claims a patch:
- [ ] Review their code changes
- [ ] Test if vulnerability is actually patched
- [ ] Test if legitimate login still works
- [ ] Award points for verified patches
- [ ] Document what was patched

### Between Rounds
- [ ] Stop the server
- [ ] Update code with blue team patches
- [ ] Restart server
- [ ] Announce next round to red team
- [ ] Update scoring sheet

---

## Vulnerability Verification Guide

### ✅ How to Verify Red Team Exploits

**Method 1: Client-Side Bypass**
- Ask them to show you the credentials in script.js
- Expected: `sys_admin` / `P@ssw0rd!847`

**Method 2: Credentials File**
- Ask them to navigate to /credentials.txt
- Ask them to decode: `UEBzc3cwcmQhODQ3` → `P@ssw0rd!847`

**Method 3: Direct Access**
- If they used client-side bypass, they can access admin.html directly

### ✅ How to Verify Blue Team Patches

**Patch 1: Remove Client-Side Auth**
```bash
# Check if script.js still has hardcoded credentials
grep "P@ssw0rd!847" public/script.js
# Should return nothing if patched
```

**Patch 2: Remove Credentials File**
```bash
# Check if credentials.txt still exists
ls public/credentials.txt
# Should return "No such file" if patched
```

**Patch 3: Server-Side Validation**
```bash
# Verify login now uses server endpoint
grep "fetch.*login" public/script.js
# Should see fetch call to /login endpoint
```

---

## Scoring Guide (Recommended)

### Red Team Points
- First flag capture: 150 points
- Subsequent captures: 100 points each
- Novel vulnerability discovery: +50 bonus
- Fastest time: +25 bonus

### Blue Team Points
- Critical vulnerability patched (verified): 100 points
- High vulnerability patched (verified): 50 points
- Maintaining functionality: 25 points
- Complete security (no captures in round): 200 bonus

---

## Troubleshooting

### Server Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill the process if needed
kill -9 [PID]
```

### Can't Access from Other Machines
```bash
# Check server is listening on all interfaces
# Modify server.js if needed:
app.listen(3000, '0.0.0.0', () => {
    console.log('Server running at http://0.0.0.0:3000');
});
```

### Login Doesn't Work After Blue Team Patch
- Verify db.json still exists
- Check credentials match
- Verify server.js /login endpoint is working
- Check browser console for errors

---

## Post-Event

### Cleanup
- [ ] Stop the server
- [ ] Archive scores
- [ ] Collect team feedback
- [ ] Take screenshots for documentation

### Debrief Topics
- Most creative exploits found
- Most effective patches
- Lessons learned by both teams
- Discussion of real-world implications

### Documentation
- [ ] Save final scoring sheet
- [ ] Document unique vulnerabilities found
- [ ] Note interesting techniques used
- [ ] Prepare security tips summary

---

## Quick Reference

**Default Credentials:**
- Username: `sys_admin`
- Password: `P@ssw0rd!847`

**Flag:**
- `flag{who_let_the_intern_handle_security}`

**Initial Vulnerabilities:**
1. Hardcoded credentials in script.js (Critical)
2. Exposed credentials.txt file (Critical)
3. Client-side authentication only (High)

**Server Commands:**
- Start: `npm start`
- Stop: `Ctrl+C`
- Restart: `Ctrl+C` then `npm start`

---

## Emergency Contacts

Organizer: ___________________
Tech Support: ___________________
Venue IT: ___________________

---

**Good luck with your event! 🎉**
