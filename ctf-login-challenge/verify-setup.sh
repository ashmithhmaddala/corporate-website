#!/bin/bash

# CTF Challenge Setup Verification Script

echo "🔍 CTF Login Challenge - Setup Verification"
echo "============================================"
echo ""

# Check Node.js
echo "✓ Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo "  Node.js version: $(node --version)"
else
    echo "  ❌ Node.js not found! Please install Node.js v18 or higher"
    exit 1
fi

# Check npm
echo "✓ Checking npm installation..."
if command -v npm &> /dev/null; then
    echo "  npm version: $(npm --version)"
else
    echo "  ❌ npm not found! Please install npm"
    exit 1
fi

echo ""
echo "✓ Checking file structure..."

# Check required files
files=(
    "server.js"
    "package.json"
    "db.json"
    "public/login.html"
    "public/admin.html"
    "public/script.js"
    "public/style.css"
    "public/credentials.txt"
    "README.md"
)

missing_files=0
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ❌ $file (missing)"
        missing_files=$((missing_files + 1))
    fi
done

echo ""

if [ $missing_files -eq 0 ]; then
    echo "✅ All files present!"
else
    echo "❌ Missing $missing_files file(s)"
    exit 1
fi

echo ""
echo "✓ Checking vulnerabilities are in place..."

# Check if credentials are in script.js
if grep -q "P@ssw0rd!847" public/script.js; then
    echo "  ✓ Hardcoded credentials found in script.js (VULNERABLE ✓)"
else
    echo "  ❌ Hardcoded credentials NOT found in script.js"
fi

# Check if credentials.txt exists
if [ -f "public/credentials.txt" ]; then
    echo "  ✓ credentials.txt exposed in public/ (VULNERABLE ✓)"
else
    echo "  ❌ credentials.txt not found in public/"
fi

echo ""
echo "============================================"
echo "📦 Next Steps:"
echo "============================================"
echo ""
echo "1. Install dependencies:"
echo "   npm install"
echo ""
echo "2. Start the server:"
echo "   npm start"
echo ""
echo "3. Access the application:"
echo "   http://localhost:3000/login.html"
echo ""
echo "4. Test credentials:"
echo "   Username: sys_admin"
echo "   Password: P@ssw0rd!847"
echo ""
echo "5. Verify flag:"
echo "   Navigate to admin.html after login"
echo "   Flag: flag{who_let_the_intern_handle_security}"
echo ""
echo "✅ Setup verification complete!"
echo ""
