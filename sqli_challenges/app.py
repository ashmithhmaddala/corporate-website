"""
SQL INJECTION VULNERABILITIES - CTF CHALLENGES
================================================
Contains 3 SQL injection vulnerabilities for the CTF event.

VULNERABILITIES:
1. Login Bypass (Authentication)
2. UNION-based SQLi (Data Exfiltration)
3. Blind Boolean SQLi (Advanced)

FLAGS:
1. FLAG{sql_login_bypass_success}
2. FLAG{union_injection_master}
3. FLAG{blind_sqli_champion}
"""

from flask import Flask, request, render_template_string
import sqlite3
import os

app = Flask(__name__)

DB_PATH = "ctf_database.db"

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

def init_db():
    """Initialize database with sample data and flags"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Users table
    c.execute("DROP TABLE IF EXISTS users")
    c.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT,
            password TEXT,
            email TEXT,
            role TEXT
        )
    """)
    c.executemany("INSERT INTO users VALUES (?,?,?,?,?)", [
        (1, "admin", "admin123", "admin@ctf.com", "admin"),
        (2, "user1", "pass123", "user1@ctf.com", "user"),
        (3, "user2", "pass456", "user2@ctf.com", "user"),
    ])

    # Products table
    c.execute("DROP TABLE IF EXISTS products")
    c.execute("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            name TEXT,
            category TEXT,
            price REAL
        )
    """)
    c.executemany("INSERT INTO products VALUES (?,?,?,?)", [
        (1, "Laptop", "Electronics", 999.99),
        (2, "Mouse", "Electronics", 29.99),
        (3, "Keyboard", "Electronics", 79.99),
        (4, "Monitor", "Electronics", 299.99),
    ])

    # Secret flags table (hidden)
    c.execute("DROP TABLE IF EXISTS secret_flags")
    c.execute("""
        CREATE TABLE secret_flags (
            id INTEGER PRIMARY KEY,
            flag_name TEXT,
            flag_value TEXT
        )
    """)
    c.executemany("INSERT INTO secret_flags VALUES (?,?,?)", [
        (1, "flag1", "FLAG{sql_login_bypass_success}"),
        (2, "flag2", "FLAG{union_injection_master}"),
        (3, "flag3", "FLAG{blind_sqli_champion}"),
    ])

    conn.commit()
    conn.close()


def get_db():
    return sqlite3.connect(DB_PATH)


# ═══════════════════════════════════════════════════════════════════════════════
# VULNERABILITY 1: SQL INJECTION IN LOGIN (Authentication Bypass)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def home():
    return """
    <h1>SQL Injection CTF Challenges</h1>
    <ul>
        <li><a href="/challenge1">Challenge 1: Login Bypass</a></li>
        <li><a href="/challenge2">Challenge 2: UNION Injection</a></li>
        <li><a href="/challenge3">Challenge 3: Blind SQL Injection</a></li>
    </ul>
    """


@app.route("/challenge1", methods=["GET", "POST"])
def challenge1():
    """
    VULNERABILITY 1: SQL Injection in Login
    
    Exploit: username = admin'--
    This bypasses the password check by commenting out the rest of the query.
    
    Flag: FLAG{sql_login_bypass_success}
    """
    message = ""
    
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        
        conn = get_db()
        c = conn.cursor()
        
        # VULNERABLE QUERY - String concatenation
        query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
        
        try:
            c.execute(query)
            user = c.fetchone()
            
            if user:
                if user[4] == "admin":  # Check if admin role
                    # Get FLAG 1
                    flag_row = c.execute("SELECT flag_value FROM secret_flags WHERE id=1").fetchone()
                    message = f'<p style="color:green">Login successful as admin!</p><h2>FLAG: {flag_row[0]}</h2>'
                else:
                    message = f'<p style="color:orange">Logged in as {user[1]} but you need admin access!</p>'
            else:
                message = '<p style="color:red">Invalid credentials</p>'
        except Exception as e:
            message = f'<p style="color:red">Error: {e}</p>'
        
        conn.close()
    
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head><title>Challenge 1 - Login Bypass</title></head>
    <body>
        <h1>Challenge 1: Login Bypass</h1>
        <p>Find a way to login as admin without knowing the password!</p>
        {{ message|safe }}
        <form method="POST">
            <label>Username: <input type="text" name="username"></label><br><br>
            <label>Password: <input type="password" name="password"></label><br><br>
            <button type="submit">Login</button>
        </form>
        <br><a href="/">Back to Home</a>
    </body>
    </html>
    """, message=message)


# ═══════════════════════════════════════════════════════════════════════════════
# VULNERABILITY 2: UNION-BASED SQL INJECTION (Data Exfiltration)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/challenge2", methods=["GET"])
def challenge2():
    """
    VULNERABILITY 2: UNION-based SQL Injection
    
    Exploit: ?search=' UNION SELECT id,flag_name,999,flag_value FROM secret_flags WHERE id=2--
    This extracts data from the secret_flags table.
    
    Flag: FLAG{union_injection_master}
    """
    search = request.args.get("search", "")
    results = []
    error = ""
    
    if search:
        conn = get_db()
        c = conn.cursor()
        
        # VULNERABLE QUERY - String concatenation with LIKE
        query = f"SELECT id, name, price, category FROM products WHERE name LIKE '%{search}%'"
        
        try:
            c.execute(query)
            results = c.fetchall()
        except Exception as e:
            error = f"Error: {e}"
        
        conn.close()
    
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head><title>Challenge 2 - UNION Injection</title></head>
    <body>
        <h1>Challenge 2: UNION-based SQL Injection</h1>
        <p>Extract FLAG 2 from a hidden table using UNION SELECT!</p>
        <p><i>Hint: There's a table called 'secret_flags' with flag_value column</i></p>
        
        <form method="GET">
            <label>Search Products: <input type="text" name="search" value="{{ search }}"></label>
            <button type="submit">Search</button>
        </form>
        
        {% if error %}
        <p style="color:red">{{ error }}</p>
        {% endif %}
        
        {% if results %}
        <h3>Results:</h3>
        <table border="1" cellpadding="5">
            <tr><th>ID</th><th>Name</th><th>Price</th><th>Category</th></tr>
            {% for row in results %}
            <tr>
                <td>{{ row[0] }}</td>
                <td>{{ row[1] }}</td>
                <td>{{ row[2] }}</td>
                <td>{{ row[3] }}</td>
            </tr>
            {% endfor %}
        </table>
        {% endif %}
        
        <br><a href="/">Back to Home</a>
    </body>
    </html>
    """, search=search, results=results, error=error)


# ═══════════════════════════════════════════════════════════════════════════════
# VULNERABILITY 3: BLIND BOOLEAN-BASED SQL INJECTION
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/challenge3", methods=["GET"])
def challenge3():
    """
    VULNERABILITY 3: Blind Boolean-based SQL Injection
    
    Exploit: Extract flag character by character using boolean conditions
    Example: ?id=1 AND (SELECT SUBSTR(flag_value,1,1) FROM secret_flags WHERE id=3)='F'
    
    If TRUE: "User found"
    If FALSE: "User not found"
    
    Flag: FLAG{blind_sqli_champion}
    """
    user_id = request.args.get("id", "")
    result = ""
    
    if user_id:
        conn = get_db()
        c = conn.cursor()
        
        # VULNERABLE QUERY - No quotes, allows boolean injection
        query = f"SELECT * FROM users WHERE id = {user_id}"
        
        try:
            c.execute(query)
            user = c.fetchone()
            
            if user:
                result = '<p style="color:green">✓ User found</p>'
            else:
                result = '<p style="color:red">✗ User not found</p>'
        except Exception as e:
            result = f'<p style="color:red">Error: {e}</p>'
        
        conn.close()
    
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head><title>Challenge 3 - Blind SQLi</title></head>
    <body>
        <h1>Challenge 3: Blind Boolean SQL Injection</h1>
        <p>Extract FLAG 3 character by character using boolean conditions!</p>
        <p><i>Hint: Use SUBSTR() and test each character. Flag is in secret_flags table, id=3</i></p>
        
        <form method="GET">
            <label>User ID: <input type="text" name="id" value="{{ user_id }}"></label>
            <button type="submit">Check</button>
        </form>
        
        {{ result|safe }}
        
        <h3>Example Payload:</h3>
        <code>1 AND (SELECT SUBSTR(flag_value,1,1) FROM secret_flags WHERE id=3)='F'</code>
        
        <br><br><a href="/">Back to Home</a>
    </body>
    </html>
    """, user_id=user_id, result=result)


# ═══════════════════════════════════════════════════════════════════════════════
# RUN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print("Initializing database...")
        init_db()
        print("Database ready!")
    
    print("\n" + "="*60)
    print("  SQL INJECTION CTF CHALLENGES")
    print("="*60)
    print("  Challenge 1: http://localhost:5000/challenge1")
    print("  Challenge 2: http://localhost:5000/challenge2")
    print("  Challenge 3: http://localhost:5000/challenge3")
    print("="*60 + "\n")
    
    app.run(debug=True, host="0.0.0.0", port=5000)
