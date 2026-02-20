const express = require('express');
const fs = require('fs');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'ctf-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Login endpoint - validates against db.json
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Read credentials from db.json
        const dbData = fs.readFileSync('db.json', 'utf8');
        const db = JSON.parse(dbData);
        
        // Find matching user
        const user = db.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // Set session
            req.session.authenticated = true;
            req.session.username = username;
            
            res.json({ 
                success: true, 
                message: 'Login successful',
                redirect: '/admin.html'
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Protected route - check if user is authenticated
app.get('/admin.html', (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/login.html');
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Login page: http://localhost:${PORT}/login.html`);
});
