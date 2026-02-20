const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const CryptoJS = require('crypto-js');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// --- BACKEND INFORMATION DISCLOSURE CHALLENGE ---
// This vulnerability leaks a secret flag in the HTTP Response Headers.
// To find it, hackers must check the Network Tab in DevTools.
app.use((req, res, next) => {
    res.setHeader('X-System-Admin-Flag', 'FLAG{H3AD3R_D3T3CT1V3_2026}');
    next();
});








// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});


const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/x-php', 'text/x-php', 'application/php'];
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.php'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files and PHP files are allowed'));
        }
    }
});


// Middleware
// VULN: Wide-open CORS - allows any origin with credentials
app.use(cors({
    origin: function(origin, callback) {
        callback(null, true); // Reflect any origin
    },
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text({ type: 'text/xml' }));
app.use(bodyParser.raw({ type: 'application/xml' }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(uploadsDir));

// VULN: Verbose error headers and server info exposure
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'Express 4.18.2 / Node.js 18.17.0');
    res.setHeader('Server', 'Vault-Server/2.1.0');
    res.setHeader('X-Debug-Mode', 'enabled');
    res.setHeader('X-Internal-IP', '10.0.1.42');
    next();
});

// ============================================
// In-memory Database (simulating real database)
// ============================================

// Users store
const users = new Map();
// Pre-populate with demo users
users.set('admin@vault.dev', {
    id: 'user_1',
    email: 'admin@vault.dev',
    password: 'admin123', // In production, this would be hashed
    name: 'Admin User',
    role: 'admin',
    bio: 'Security and encryption specialist',
    phone: '+1 (555) 000-0001',
    location: 'San Francisco, CA',
    profilePicture: null,
    createdAt: new Date()
});
users.set('john@acme.com', {
    id: 'user_2',
    email: 'john@acme.com',
    password: 'password123',
    name: 'John Doe',
    role: 'owner',
    bio: 'Product Manager at Acme Corp',
    phone: '+1 (555) 000-0002',
    location: 'New York, NY',
    profilePicture: null,
    createdAt: new Date()
});
users.set('jane@acme.com', {
    id: 'user_3',
    email: 'jane@acme.com',
    password: 'password123',
    name: 'Jane Smith',
    role: 'admin',
    bio: 'DevOps Engineer at Acme Corp',
    phone: '+1 (555) 000-0003',
    location: 'Austin, TX',
    profilePicture: null,
    createdAt: new Date()
});

// Sessions store
const sessions = new Map();

// Secrets store
const secretsStore = new Map();
let secretCounter = 0;

// Pre-populate with demo secrets
const demoSecrets = [
    { key: 'DATABASE_URL', value: 'postgresql://user:pass@db.vault.dev:5432/prod', environment: 'production', userId: 'user_2' },
    { key: 'STRIPE_SECRET_KEY', value: 'sk_live_DEMO_KEY_REPLACE_ME', environment: 'production', userId: 'user_2' },
    { key: 'AWS_ACCESS_KEY_ID', value: 'AKIAIOSFODNN7EXAMPLE', environment: 'production', userId: 'user_2' },
    { key: 'SENDGRID_API_KEY', value: 'SG.xxxxxxxxxxxxxxxxxxxxx', environment: 'production', userId: 'user_2' },
    { key: 'DATABASE_URL', value: 'postgresql://user:pass@db.vault.dev:5432/staging', environment: 'staging', userId: 'user_2' },
    { key: 'STRIPE_TEST_KEY', value: 'sk_test_51ABC123XYZ456789', environment: 'staging', userId: 'user_2' },
    { key: 'DEBUG_MODE', value: 'true', environment: 'staging', userId: 'user_2' },
    { key: 'DATABASE_URL', value: 'postgresql://localhost:5432/dev', environment: 'development', userId: 'user_2' },
    { key: 'API_MOCK_ENABLED', value: 'true', environment: 'development', userId: 'user_2' },
    { key: 'HOT_RELOAD', value: 'enabled', environment: 'development', userId: 'user_2' },
];

demoSecrets.forEach(secret => {
    secretCounter++;
    const id = `secret_${secretCounter}`;
    secretsStore.set(id, {
        id,
        ...secret,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
    });
});

// Audit log
const auditLog = [];

// Encrypted messages store (original functionality)
const dataStore = new Map();
let messageCounter = 0;

// Notes store (Stored XSS vulnerability)
const notesStore = new Map();
let noteCounter = 0;

// Password reset tokens (predictable tokens vulnerability)
const resetTokens = new Map();

// API keys store (sensitive data)
const apiKeys = new Map();
apiKeys.set('vault-internal', { key: 'vlt_sk_prod_S3cr3tK3y_2024_MASTER', owner: 'system', permissions: 'admin', created: new Date() });
apiKeys.set('vault-webhook', { key: 'whk_live_aB3xK9mN2pQ7rT5v', owner: 'system', permissions: 'webhook', created: new Date() });

// CTF Flags (hidden throughout the application)
const FLAGS = {
    FLAG_COMMAND_INJECTION: 'CTF{c0mm4nd_1nj3ct10n_m4st3r}',
    FLAG_PATH_TRAVERSAL: 'CTF{p4th_tr4v3rs4l_pr0}',
    FLAG_SSRF: 'CTF{ss4f_1nt3rn4l_4cc3ss}',
    FLAG_IDOR: 'CTF{1d0r_us3r_d4t4_l34k}',
    FLAG_ADMIN_PANEL: 'CTF{h1dd3n_4dm1n_p4n3l_f0und}',
    FLAG_DEBUG_ENDPOINT: 'CTF{d3bug_3ndp01nt_3xp0s3d}',
    FLAG_BACKUP_LEAK: 'CTF{b4ckup_d4t4_l34k3d}',
    FLAG_OPEN_REDIRECT: 'CTF{0p3n_r3d1r3ct_vuln}',
    FLAG_STORED_XSS: 'CTF{st0r3d_x55_1n_n0t3s}',
    FLAG_DESERIALIZATION: 'CTF{1ns3cur3_d3s3r14l1z4t10n}',
    FLAG_USER_ENUM: 'CTF{us3r_3num3r4t10n_l34k}',
    FLAG_PREDICTABLE_RESET: 'CTF{pr3d1ct4bl3_r3s3t_t0k3n}',
    FLAG_FILE_UPLOAD: 'CTF{php_f1l3_upl04d_rc3}',
    FLAG_XSS_SEARCH: 'CTF{r3fl3ct3d_x55_1n_s34rch}',
    FLAG_ENV_EXPOSURE: 'CTF{3nv_f1l3_3xp0s3d}',
    FLAG_SQLI_SIMULATION: 'CTF{sql_1nj3ct10n_s1mul4t3d}',
    FLAG_JWT_BYPASS: 'CTF{w34k_4uth_byp4ss}',
    FLAG_MASS_ASSIGNMENT: 'CTF{m4ss_4ss1gnm3nt_r0l3}',
    FLAG_CORS_MISCCONFIG: 'CTF{c0rs_w1ld_c4rd_4cc3ss}',
    FLAG_INFO_DISCLOSURE: 'CTF{1nf0_d1scl0sur3_st4ck_tr4c3}'
};

// ============================================
// Helper Functions
// ============================================

function generateToken() {
    return CryptoJS.lib.WordArray.random(32).toString();
}

function generateMessageId() {
    messageCounter++;
    return `MSG-${Date.now()}-${messageCounter}`;
}

function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function logAudit(userId, action, resource, details = {}) {
    auditLog.unshift({
        id: generateId('audit'),
        userId,
        action,
        resource,
        details,
        timestamp: new Date(),
        ip: '127.0.0.1' // In production, get from request
    });

    // Keep only last 1000 entries
    if (auditLog.length > 1000) {
        auditLog.pop();
    }
}

// Simple auth middleware
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const session = sessions.get(token);

    if (!session) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.user = session.user;
    req.token = token;
    next();
}

// Clean up expired data
function cleanExpiredMessages() {
    const now = Date.now();
    for (const [id, data] of dataStore.entries()) {
        if (now > data.expiresAt) {
            dataStore.delete(id);
        }
    }
}

// ============================================
// Routes: Static Pages
// ============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// Routes: Authentication
// ============================================

// Register
app.post('/api/auth/register', (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters'
            });
        }

        if (users.has(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        const userId = generateId('user');
        const user = {
            id: userId,
            name,
            email,
            password, // In production: hash this!
            role: 'member',
            createdAt: new Date()
        };

        users.set(email, user);

        // Create session
        const token = generateToken();
        sessions.set(token, {
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            createdAt: new Date()
        });

        logAudit(userId, 'registered', 'account');

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const user = users.get(email);

        if (!user || user.password !== password) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Create session
        const token = generateToken();
        sessions.set(token, {
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            createdAt: new Date()
        });

        logAudit(user.id, 'logged in', 'session');

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// Logout
app.post('/api/auth/logout', authenticate, (req, res) => {
    sessions.delete(req.token);
    logAudit(req.user.id, 'logged out', 'session');
    res.json({ success: true });
});

// Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
    const user = users.get(req.user.email);
    const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        profilePicture: user.profilePicture || null
    };
    res.json(userData);
});

// Update profile
app.put('/api/auth/profile', authenticate, (req, res) => {
    try {
        const { name, email } = req.body;
        const user = users.get(req.user.email);

        if (name) user.name = name;
        if (email && email !== req.user.email) {
            if (users.has(email)) {
                return res.status(400).json({ success: false, error: 'Email already in use' });
            }
            users.delete(req.user.email);
            user.email = email;
            users.set(email, user);
        }

        // Update session
        const session = sessions.get(req.token);
        session.user = { id: user.id, name: user.name, email: user.email, role: user.role };

        logAudit(user.id, 'updated', 'profile');

        res.json({ success: true, user: session.user });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

// Change password
app.put('/api/auth/password', authenticate, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = users.get(req.user.email);

        if (user.password !== currentPassword) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }

        user.password = newPassword;
        logAudit(user.id, 'changed', 'password');

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
});

// ============================================
// Routes: Profile Management
// ============================================

// Get profile
app.get('/api/profile', authenticate, (req, res) => {
    try {
        const user = users.get(req.user.email);
        const profile = {
            id: user.id,
            name: user.name,
            email: user.email,
            bio: user.bio || '',
            phone: user.phone || '',
            location: user.location || '',
            profilePicture: user.profilePicture || null,
            role: user.role
        };
        res.json(profile);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
});

// Update profile
app.put('/api/profile', authenticate, (req, res) => {
    try {
        const { name, bio, phone, location } = req.body;
        const user = users.get(req.user.email);

        if (name) user.name = name;
        if (bio !== undefined) user.bio = bio;
        if (phone !== undefined) user.phone = phone;
        if (location !== undefined) user.location = location;

        // Update session
        const session = sessions.get(req.token);
        session.user.name = user.name;

        logAudit(user.id, 'updated', 'profile');

        const profile = {
            id: user.id,
            name: user.name,
            email: user.email,
            bio: user.bio || '',
            phone: user.phone || '',
            location: user.location || '',
            profilePicture: user.profilePicture || null,
            role: user.role
        };

        res.json({ success: true, profile });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});




// Upload profile picture
app.post('/api/profile/picture', authenticate, upload.single('profilePicture'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const user = users.get(req.user.email);
        
        // Delete old profile picture if exists
        if (user.profilePicture) {
            const oldPath = path.join(__dirname, user.profilePicture);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Store relative path
        const picturePath = `/uploads/${req.file.filename}`;
        user.profilePicture = picturePath;

        logAudit(user.id, 'uploaded', 'profile picture');

        res.json({ 
            success: true, 
            profilePicture: picturePath,
            message: 'Profile picture uploaded successfully'
        });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
    }
});

// Change password (new endpoint for profile page)
app.put('/api/profile/password', authenticate, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = users.get(req.user.email);

        if (user.password !== currentPassword) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }

        user.password = newPassword;
        logAudit(user.id, 'changed', 'password');

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
});

// ============================================
// Routes: Secrets Management
// ============================================

// List secrets
app.get('/api/secrets', authenticate, (req, res) => {
    try {
        const userSecrets = [];
        for (const [id, secret] of secretsStore.entries()) {
            // In a real app, filter by organization/team
            userSecrets.push({
                id: secret.id,
                key: secret.key,
                value: secret.value,
                environment: secret.environment,
                createdAt: secret.createdAt,
                updatedAt: secret.updatedAt
            });
        }

        res.json(userSecrets);

    } catch (error) {
        console.error('List secrets error:', error);
        res.status(500).json({ success: false, error: 'Failed to list secrets' });
    }
});

// Get single secret
app.get('/api/secrets/:id', authenticate, (req, res) => {
    try {
        const secret = secretsStore.get(req.params.id);

        if (!secret) {
            return res.status(404).json({ success: false, error: 'Secret not found' });
        }

        logAudit(req.user.id, 'viewed', secret.key);

        res.json({
            success: true,
            secret: {
                id: secret.id,
                key: secret.key,
                value: secret.value,
                environment: secret.environment,
                createdAt: secret.createdAt,
                updatedAt: secret.updatedAt
            }
        });

    } catch (error) {
        console.error('Get secret error:', error);
        res.status(500).json({ success: false, error: 'Failed to get secret' });
    }
});

// Create secret
app.post('/api/secrets', authenticate, (req, res) => {
    try {
        const { key, value, environment } = req.body;

        if (!key || !value) {
            return res.status(400).json({ success: false, error: 'Key and value are required' });
        }

        const id = generateId('secret');
        const secret = {
            id,
            key,
            value,
            environment: environment || 'development',
            userId: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        secretsStore.set(id, secret);
        logAudit(req.user.id, 'created', key);

        res.status(201).json({
            success: true,
            secret: {
                id: secret.id,
                key: secret.key,
                value: secret.value,
                environment: secret.environment,
                createdAt: secret.createdAt,
                updatedAt: secret.updatedAt
            }
        });

    } catch (error) {
        console.error('Create secret error:', error);
        res.status(500).json({ success: false, error: 'Failed to create secret' });
    }
});

// Update secret
app.put('/api/secrets/:id', authenticate, (req, res) => {
    try {
        const secret = secretsStore.get(req.params.id);

        if (!secret) {
            return res.status(404).json({ success: false, error: 'Secret not found' });
        }

        const { key, value, environment } = req.body;

        if (key) secret.key = key;
        if (value) secret.value = value;
        if (environment) secret.environment = environment;
        secret.updatedAt = new Date();

        logAudit(req.user.id, 'updated', secret.key);

        res.json({
            success: true,
            secret: {
                id: secret.id,
                key: secret.key,
                value: secret.value,
                environment: secret.environment,
                createdAt: secret.createdAt,
                updatedAt: secret.updatedAt
            }
        });

    } catch (error) {
        console.error('Update secret error:', error);
        res.status(500).json({ success: false, error: 'Failed to update secret' });
    }
});

// Delete secret
app.delete('/api/secrets/:id', authenticate, (req, res) => {
    try {
        const secret = secretsStore.get(req.params.id);

        if (!secret) {
            return res.status(404).json({ success: false, error: 'Secret not found' });
        }

        const key = secret.key;
        secretsStore.delete(req.params.id);
        logAudit(req.user.id, 'deleted', key);

        res.json({ success: true, message: 'Secret deleted successfully' });

    } catch (error) {
        console.error('Delete secret error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete secret' });
    }
});

// ============================================
// Routes: Audit Log
// ============================================

app.get('/api/audit', authenticate, (req, res) => {
    try {
        // Return last 50 entries
        const entries = auditLog.slice(0, 50).map(entry => ({
            id: entry.id,
            action: entry.action,
            resource: entry.resource,
            timestamp: entry.timestamp,
            userId: entry.userId
        }));

        res.json(entries);

    } catch (error) {
        console.error('Audit log error:', error);
        res.status(500).json({ success: false, error: 'Failed to get audit log' });
    }
});

// ============================================
// Routes: Team Management
// ============================================

app.get('/api/team', authenticate, (req, res) => {
    try {
        const members = [];
        for (const [email, user] of users.entries()) {
            members.push({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            });
        }
        res.json(members);

    } catch (error) {
        console.error('Team list error:', error);
        res.status(500).json({ success: false, error: 'Failed to list team' });
    }
});

// ============================================
// Routes: Original Encryption API
// ============================================

// Encrypt endpoint
app.post('/api/encrypt', (req, res) => {
    try {
        const { data, key } = req.body;

        if (!data || !key) {
            return res.status(400).json({
                success: false,
                error: 'Missing data or encryption key'
            });
        }

        if (key.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Encryption key must be at least 8 characters'
            });
        }

        // Perform AES-256 encryption
        const encrypted = CryptoJS.AES.encrypt(data, key).toString();
        const messageId = generateMessageId();

        // Store encrypted data temporarily (expires in 1 hour)
        dataStore.set(messageId, {
            encrypted: encrypted,
            timestamp: Date.now(),
            expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
        });

        cleanExpiredMessages();

        res.json({
            success: true,
            encrypted: encrypted,
            messageId: messageId,
            message: 'Data encrypted successfully'
        });

    } catch (error) {
        console.error('Encryption error:', error);
        res.status(500).json({
            success: false,
            error: 'Encryption failed on server'
        });
    }
});

// Decrypt endpoint
app.post('/api/decrypt', (req, res) => {
    try {
        const { encrypted, key } = req.body;

        if (!encrypted || !key) {
            return res.status(400).json({
                success: false,
                error: 'Missing encrypted data or decryption key'
            });
        }

        // Perform AES-256 decryption
        const decrypted = CryptoJS.AES.decrypt(encrypted, key);
        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

        if (!plaintext) {
            return res.status(400).json({
                success: false,
                error: 'Decryption failed - invalid key or corrupted data'
            });
        }

        res.json({
            success: true,
            decrypted: plaintext,
            message: 'Data decrypted successfully'
        });

    } catch (error) {
        console.error('Decryption error:', error);
        res.status(400).json({
            success: false,
            error: 'Decryption failed - invalid key or corrupted data'
        });
    }
});

// Retrieve stored encrypted message by ID
app.get('/api/message/:id', (req, res) => {
    try {
        const messageId = req.params.id;
        const message = dataStore.get(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found or expired'
            });
        }

        // Check if message has expired
        if (Date.now() > message.expiresAt) {
            dataStore.delete(messageId);
            return res.status(404).json({
                success: false,
                error: 'Message has expired'
            });
        }

        res.json({
            success: true,
            encrypted: message.encrypted,
            expiresAt: new Date(message.expiresAt).toISOString()
        });

    } catch (error) {
        console.error('Retrieve error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve message'
        });
    }
});

// Health check endpoint
// VULN: Exposes internal info
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        users_count: users.size,
        secrets_count: secretsStore.size,
        messages_stored: dataStore.size,
        notes_count: notesStore.size,
        node_version: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// VULN: Command Injection - Diagnostic Tools
// ============================================

// Ping endpoint - passes unsanitized input to exec()
app.post('/api/tools/ping', authenticate, (req, res) => {
    const { host } = req.body;

    if (!host) {
        return res.status(400).json({ success: false, error: 'Host is required' });
    }

    // VULN: Direct command injection - no sanitization
    const cmd = process.platform === 'win32' 
        ? `ping -n 2 ${host}` 
        : `ping -c 2 ${host}`;

    exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
        res.json({
            success: !error,
            command: cmd,
            output: stdout || stderr || (error ? error.message : ''),
            flag: error ? undefined : FLAGS.FLAG_COMMAND_INJECTION
        });
    });
});

// DNS lookup - also injectable
app.post('/api/tools/dns', authenticate, (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ success: false, error: 'Domain is required' });

    // VULN: Command injection via nslookup
    exec(`nslookup ${domain}`, { timeout: 10000 }, (error, stdout, stderr) => {
        res.json({
            success: !error,
            output: stdout || stderr || (error ? error.message : '')
        });
    });
});

// Traceroute
app.post('/api/tools/traceroute', authenticate, (req, res) => {
    const { host } = req.body;
    if (!host) return res.status(400).json({ success: false, error: 'Host is required' });

    const cmd = process.platform === 'win32' ? `tracert -d -h 5 ${host}` : `traceroute -m 5 ${host}`;
    exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
        res.json({
            success: !error,
            output: stdout || stderr || (error ? error.message : '')
        });
    });
});

// ============================================
// VULN: SSRF - URL Fetch
// ============================================

app.post('/api/tools/fetch-url', authenticate, (req, res) => {
    const { targetUrl } = req.body;

    if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // VULN: SSRF - can access internal services, cloud metadata, etc.
    try {
        const parsedUrl = new URL(targetUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        protocol.get(targetUrl, { timeout: 5000 }, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                res.json({
                    success: true,
                    status: response.statusCode,
                    headers: response.headers,
                    body: data.substring(0, 10000),
                    flag: FLAGS.FLAG_SSRF
                });
            });
        }).on('error', (err) => {
            res.json({ success: false, error: err.message });
        });
    } catch (err) {
        res.status(400).json({ success: false, error: 'Invalid URL: ' + err.message });
    }
});

// Webhook test - SSRF variant
app.post('/api/webhooks/test', authenticate, (req, res) => {
    const { url: webhookUrl, payload } = req.body;

    if (!webhookUrl) return res.status(400).json({ success: false, error: 'Webhook URL required' });

    try {
        const parsedUrl = new URL(webhookUrl);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        };

        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        const request = protocol.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                res.json({ success: true, statusCode: response.statusCode, response: data.substring(0, 5000) });
            });
        });

        request.on('error', (err) => res.json({ success: false, error: err.message }));
        request.write(JSON.stringify(payload || {}));
        request.end();
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// ============================================
// VULN: Path Traversal - File Operations
// ============================================

app.get('/api/files/download', authenticate, (req, res) => {
    const { filename } = req.query;

    if (!filename) {
        return res.status(400).json({ success: false, error: 'Filename is required' });
    }

    // VULN: Path traversal - no sanitization on filename
    // e.g., ?filename=../../../../etc/passwd
    const filePath = path.join(__dirname, 'uploads', filename);

    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ 
                success: true, 
                filename: filename,
                content: content,
                flag: FLAGS.FLAG_PATH_TRAVERSAL
            });
        } else {
            res.status(404).json({ success: false, error: 'File not found: ' + filePath }); // VULN: leaks absolute path
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, stack: err.stack }); // VULN: leaks stack trace
    }
});

// File listing
app.get('/api/files/list', authenticate, (req, res) => {
    const { dir } = req.query;
    
    // VULN: Directory listing with path traversal
    const targetDir = dir ? path.join(__dirname, dir) : uploadsDir;
    
    try {
        const files = fs.readdirSync(targetDir).map(f => {
            const stat = fs.statSync(path.join(targetDir, f));
            return { name: f, size: stat.size, isDirectory: stat.isDirectory(), modified: stat.mtime };
        });
        res.json({ success: true, directory: targetDir, files }); // VULN: exposes server paths
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, path: targetDir });
    }
});

// File read (raw)
app.get('/api/files/read', authenticate, (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'Path required' });

    // VULN: Arbitrary file read
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        res.type('text/plain').send(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// VULN: IDOR - User Data Access
// ============================================

// VULN: User enumeration endpoint (must be before :id route)
app.get('/api/users/check', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const exists = users.has(email);
    // VULN: Reveals whether an email is registered
    res.json({ 
        exists: exists,
        message: exists ? 'This email is already registered' : 'Email is available',
        flag: exists ? FLAGS.FLAG_USER_ENUM : undefined
    });
});

// Get any user by ID  (no ownership check)
app.get('/api/users/:id', authenticate, (req, res) => {
    const targetId = req.params.id;

    for (const [email, user] of users.entries()) {
        if (user.id === targetId) {
            // VULN: Returns full user data including password
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    password: user.password, // VULN: Password exposure
                    role: user.role,
                    bio: user.bio,
                    phone: user.phone,
                    location: user.location,
                    profilePicture: user.profilePicture,
                    createdAt: user.createdAt
                },
                flag: FLAGS.FLAG_IDOR
            });
        }
    }

    res.status(404).json({ success: false, error: 'User not found' });
});

// ============================================
// VULN: Mass Assignment
// ============================================

app.put('/api/users/update', authenticate, (req, res) => {
    const user = users.get(req.user.email);
    
    // VULN: Mass assignment - user can set ANY field including role
    // Send { "role": "admin" } to escalate privileges
    Object.keys(req.body).forEach(key => {
        user[key] = req.body[key];
    });

    // Update session too  
    const session = sessions.get(req.token);
    session.user = { id: user.id, name: user.name, email: user.email, role: user.role };

    logAudit(user.id, 'mass_updated', 'profile');

    res.json({ 
        success: true, 
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        flag: req.body.role ? FLAGS.FLAG_MASS_ASSIGNMENT : undefined
    });
});

// ============================================
// VULN: Open Redirect
// ============================================

app.get('/redirect', (req, res) => {
    const { url: redirectUrl, ref } = req.query;

    // VULN: Open redirect - no validation on target URL
    if (redirectUrl) {
        return res.redirect(redirectUrl);
    }

    res.status(400).json({ error: 'URL parameter required', hint: 'Try /redirect?url=https://evil.com' });
});

// OAuth callback with open redirect
app.get('/api/auth/callback', (req, res) => {
    const { code, state, redirect_uri } = req.query;
    
    // VULN: redirect_uri is not validated
    if (redirect_uri) {
        return res.redirect(redirect_uri + '?code=' + (code || 'demo_code') + '&state=' + (state || ''));
    }
    
    res.json({ code: code || 'demo_code', state, flag: FLAGS.FLAG_OPEN_REDIRECT });
});

// ============================================
// VULN: Insecure Deserialization / Code Injection
// ============================================

app.post('/api/import', authenticate, (req, res) => {
    const { data, format } = req.body;

    if (!data) return res.status(400).json({ error: 'Data is required' });

    try {
        let parsed;
        
        if (format === 'json') {
            parsed = JSON.parse(data);
        } else if (format === 'env') {
            // Parse .env format
            parsed = {};
            data.split('\n').forEach(line => {
                const [key, ...vals] = line.split('=');
                if (key && key.trim()) parsed[key.trim()] = vals.join('=').trim();
            });
        } else {
            // VULN: eval() for "flexible" parsing
            parsed = eval('(' + data + ')');
        }

        // Import as secrets
        let imported = 0;
        if (typeof parsed === 'object') {
            Object.entries(parsed).forEach(([key, value]) => {
                const id = generateId('secret');
                secretsStore.set(id, {
                    id, key, value: String(value),
                    environment: 'development',
                    userId: req.user.id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                imported++;
            });
        }

        res.json({ 
            success: true, 
            imported, 
            message: `Imported ${imported} secrets`,
            flag: FLAGS.FLAG_DESERIALIZATION
        });
    } catch (err) {
        res.status(400).json({ 
            success: false, 
            error: 'Parse error: ' + err.message, 
            stack: err.stack // VULN: Stack trace exposure
        });
    }
});

// Export secrets
app.get('/api/export', authenticate, (req, res) => {
    const { format } = req.query;
    const allSecrets = [];

    for (const [id, secret] of secretsStore.entries()) {
        allSecrets.push({
            id: secret.id,
            key: secret.key,
            value: secret.value, // VULN: Exports all plaintext values
            environment: secret.environment,
            userId: secret.userId,
            createdAt: secret.createdAt
        });
    }

    if (format === 'env') {
        const envContent = allSecrets.map(s => `${s.key}=${s.value}`).join('\n');
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename=secrets.env');
        return res.send(envContent);
    }

    res.json({ success: true, count: allSecrets.length, secrets: allSecrets });
});

// ============================================
// VULN: Notes System (Stored XSS)
// ============================================

// Create note - no sanitization
app.post('/api/notes', authenticate, (req, res) => {
    const { title, content, isPublic } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    noteCounter++;
    const note = {
        id: `note_${noteCounter}`,
        title: title,        // VULN: No sanitization - Stored XSS
        content: content,    // VULN: No sanitization - Stored XSS
        author: req.user.name,
        authorId: req.user.id,
        isPublic: isPublic || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: []
    };

    notesStore.set(note.id, note);
    logAudit(req.user.id, 'created', 'note: ' + title);

    res.json({ success: true, note, flag: FLAGS.FLAG_STORED_XSS });
});

// Get all notes (public + own)
app.get('/api/notes', authenticate, (req, res) => {
    const notes = [];
    for (const [id, note] of notesStore.entries()) {
        notes.push(note); // VULN: Returns ALL notes, not just user's own
    }
    res.json(notes);
});

// Get single note by ID
app.get('/api/notes/:id', (req, res) => {
    // VULN: No authentication required to view notes
    const note = notesStore.get(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
});

// Add comment to note
app.post('/api/notes/:id/comments', authenticate, (req, res) => {
    const note = notesStore.get(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const comment = {
        id: generateId('comment'),
        content: req.body.content, // VULN: Stored XSS in comments too
        author: req.user.name,
        authorId: req.user.id,
        createdAt: new Date()
    };

    note.comments.push(comment);
    res.json({ success: true, comment });
});

// Delete note
app.delete('/api/notes/:id', authenticate, (req, res) => {
    // VULN: No ownership check - any user can delete any note
    if (!notesStore.has(req.params.id)) {
        return res.status(404).json({ error: 'Note not found' });
    }
    notesStore.delete(req.params.id);
    res.json({ success: true });
});

// ============================================
// VULN: Forgot Password - Predictable Reset Tokens
// ============================================

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = users.get(email);
    if (!user) {
        // VULN: Different response reveals whether email exists
        return res.status(404).json({ 
            success: false, 
            error: 'No account found with that email address',
            flag: FLAGS.FLAG_USER_ENUM
        });
    }

    // VULN: Predictable reset token (base64 of email + timestamp)
    const resetToken = Buffer.from(email + ':' + Date.now()).toString('base64');
    resetTokens.set(resetToken, { email, createdAt: Date.now(), expiresAt: Date.now() + 3600000 });

    res.json({ 
        success: true, 
        message: 'Password reset link has been sent to your email',
        // VULN: Token leaked in response (would normally only be in email)
        debug_token: resetToken,
        reset_url: `/forgot-password.html?token=${resetToken}`,
        flag: FLAGS.FLAG_PREDICTABLE_RESET
    });
});

app.post('/api/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

    const resetData = resetTokens.get(token);
    if (!resetData) return res.status(400).json({ error: 'Invalid or expired reset token' });

    if (Date.now() > resetData.expiresAt) {
        resetTokens.delete(token);
        return res.status(400).json({ error: 'Reset token has expired' });
    }

    const user = users.get(resetData.email);
    if (!user) return res.status(400).json({ error: 'User not found' });

    user.password = newPassword; // VULN: No password complexity enforcement on reset
    resetTokens.delete(token);
    logAudit(user.id, 'reset', 'password');

    res.json({ success: true, message: 'Password has been reset successfully' });
});

// ============================================
// VULN: Hidden Admin Panel / Debug Endpoints
// ============================================

// Admin check - weak authentication
app.get('/api/admin/check', (req, res) => {
    // VULN: Admin check via cookie or query parameter
    const isAdmin = req.query.admin === 'true' || 
                    req.headers['x-admin'] === 'true' ||
                    req.headers.cookie?.includes('admin=true');

    if (isAdmin) {
        return res.json({ 
            success: true, 
            admin: true,
            flag: FLAGS.FLAG_ADMIN_PANEL,
            panels: ['/admin.html', '/api/admin/dashboard', '/api/debug', '/api/backup']
        });
    }

    res.status(403).json({ success: false, error: 'Admin access required' });
});

// Admin dashboard data
app.get('/api/admin/dashboard', (req, res) => {
    // VULN: No real auth check - just checks header
    if (req.headers['x-admin'] !== 'true' && req.query.admin !== 'true') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const allUsers = [];
    for (const [email, user] of users.entries()) {
        allUsers.push({
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password, // VULN: Exposes all passwords
            role: user.role,
            createdAt: user.createdAt
        });
    }

    const allSecrets = [];
    for (const [id, secret] of secretsStore.entries()) {
        allSecrets.push(secret);
    }

    res.json({
        success: true,
        stats: {
            totalUsers: users.size,
            totalSecrets: secretsStore.size,
            totalNotes: notesStore.size,
            totalSessions: sessions.size,
            serverUptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        },
        users: allUsers,
        secrets: allSecrets,
        recentAudit: auditLog.slice(0, 20),
        apiKeys: Array.from(apiKeys.entries()),
        flags: FLAGS, // VULN: Exposes all CTF flags!
        flag: FLAGS.FLAG_ADMIN_PANEL
    });
});

// Admin user management
app.put('/api/admin/users/:id', (req, res) => {
    // VULN: No authentication at all
    const targetId = req.params.id;
    
    for (const [email, user] of users.entries()) {
        if (user.id === targetId) {
            Object.assign(user, req.body); // VULN: Mass assignment
            return res.json({ success: true, user });
        }
    }
    res.status(404).json({ error: 'User not found' });
});

// Admin delete user
app.delete('/api/admin/users/:id', (req, res) => {
    // VULN: No authentication
    for (const [email, user] of users.entries()) {
        if (user.id === req.params.id) {
            users.delete(email);
            return res.json({ success: true, message: 'User deleted' });
        }
    }
    res.status(404).json({ error: 'User not found' });
});

// Debug endpoint - dumps everything
app.get('/api/debug', (req, res) => {
    // VULN: No authentication - exposes all internal state
    const debugData = {
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            cwd: process.cwd(),
            env: {
                NODE_ENV: process.env.NODE_ENV,
                PORT: process.env.PORT,
                SECRET_KEY: 'vault-master-key-2024-prod',
                DB_CONNECTION: 'postgresql://admin:Sup3rS3cr3t@db.vault-internal.com:5432/production',
                REDIS_URL: 'redis://default:r3d1s_p4ss@cache.vault-internal.com:6379',
                AWS_SECRET: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                STRIPE_KEY: 'sk_live_51ABC123',
                SENDGRID_KEY: 'SG.vault_prod_key_xxxxx'
            },
            uptime: process.uptime(),
            memory: process.memoryUsage()
        },
        sessions: Array.from(sessions.entries()).map(([token, session]) => ({
            token: token, // VULN: Exposes active session tokens!
            user: session.user,
            createdAt: session.createdAt
        })),
        users: Array.from(users.entries()).map(([email, user]) => ({
            email,
            password: user.password, // VULN: Plaintext passwords
            role: user.role
        })),
        secretsCount: secretsStore.size,
        flag: FLAGS.FLAG_DEBUG_ENDPOINT
    };

    res.json(debugData);
});

// Backup endpoint
app.get('/api/backup', (req, res) => {
    // VULN: No auth - full database dump
    const backup = {
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        users: [],
        secrets: [],
        notes: [],
        auditLog: auditLog.slice(0, 100),
        apiKeys: Array.from(apiKeys.entries()),
        flag: FLAGS.FLAG_BACKUP_LEAK
    };

    for (const [email, user] of users.entries()) {
        backup.users.push({
            id: user.id,
            email: user.email,
            password: user.password,
            name: user.name,
            role: user.role,
            bio: user.bio,
            phone: user.phone
        });
    }

    for (const [id, secret] of secretsStore.entries()) {
        backup.secrets.push(secret);
    }

    for (const [id, note] of notesStore.entries()) {
        backup.notes.push(note);
    }

    res.json(backup);
});

// Stack trace endpoint
app.get('/api/debug/error', (req, res) => {
    // VULN: Intentional error with full stack trace
    try {
        const obj = undefined;
        obj.property.access; // Will throw
    } catch (err) {
        res.status(500).json({
            error: err.message,
            stack: err.stack,
            flag: FLAGS.FLAG_INFO_DISCLOSURE,
            hint: 'Check /api/debug for more information'
        });
    }
});

// Config endpoint
app.get('/api/config', (req, res) => {
    // VULN: Exposes application configuration
    res.json({
        app: 'Vault',
        version: '2.1.0',
        debug: true,
        database: {
            host: 'db.vault-internal.com',
            port: 5432,
            name: 'vault_production',
            user: 'vault_admin',
            password: 'V4ult_DB_P@ss_2024!' // VULN: Hardcoded DB password
        },
        redis: {
            host: 'cache.vault-internal.com',
            port: 6379,
            password: 'r3d1s_c4ch3_s3cr3t'
        },
        jwt: {
            secret: 'vault-jwt-secret-key-do-not-share-2024',
            expiresIn: '7d'
        },
        encryption: {
            masterKey: 'aes-256-master-key-vault-prod',
            algorithm: 'aes-256-cbc'
        },
        smtp: {
            host: 'smtp.vault.dev',
            user: 'noreply@vault.dev',
            pass: 'smtp_p4ssw0rd_2024'
        },
        internalEndpoints: [
            '/api/debug',
            '/api/backup',
            '/api/admin/dashboard',
            '/api/config',
            '/api/debug/error',
            '/.env'
        ]
    });
});

// ============================================
// VULN: Search with SQL Injection Simulation
// ============================================

app.get('/api/search', authenticate, (req, res) => {
    const { q, type } = req.query;
    
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

    // VULN: Simulated SQL injection - if query contains SQL keywords, show "query"
    const sqlKeywords = ['SELECT', 'UNION', 'DROP', 'INSERT', 'DELETE', 'UPDATE', '--', "' OR", '" OR', '1=1'];
    const isSqlInjection = sqlKeywords.some(kw => q.toUpperCase().includes(kw));

    if (isSqlInjection) {
        return res.json({
            success: true,
            simulatedQuery: `SELECT * FROM secrets WHERE key LIKE '%${q}%' OR value LIKE '%${q}%'`,
            warning: 'SQL injection detected but processed anyway!',
            databaseDump: Array.from(secretsStore.values()).map(s => ({
                key: s.key,
                value: s.value,
                environment: s.environment,
                userId: s.userId
            })),
            flag: FLAGS.FLAG_SQLI_SIMULATION
        });
    }

    // Normal search
    const results = [];
    for (const [id, secret] of secretsStore.entries()) {
        if (secret.key.toLowerCase().includes(q.toLowerCase()) || 
            secret.value.toLowerCase().includes(q.toLowerCase())) {
            results.push({ id, key: secret.key, environment: secret.environment });
        }
    }

    res.json({ success: true, query: q, results, count: results.length });
});

// ============================================
// VULN: XML Processing (XXE hint)
// ============================================

app.post('/api/import/xml', authenticate, (req, res) => {
    const xmlData = req.body;
    
    if (!xmlData || typeof xmlData !== 'string') {
        return res.status(400).json({ error: 'XML data required', contentType: 'text/xml' });
    }

    // Basic XML parsing (vulnerable concept)
    try {
        const secrets = [];
        const regex = /<secret>\s*<key>(.*?)<\/key>\s*<value>(.*?)<\/value>\s*(?:<env>(.*?)<\/env>)?\s*<\/secret>/gs;
        let match;
        
        while ((match = regex.exec(xmlData)) !== null) {
            const id = generateId('secret');
            const secret = {
                id,
                key: match[1],
                value: match[2], // VULN: No sanitization
                environment: match[3] || 'development',
                userId: req.user.id,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            secretsStore.set(id, secret);
            secrets.push(secret);
        }

        res.json({ success: true, imported: secrets.length, secrets });
    } catch (err) {
        res.status(400).json({ error: 'XML parse error: ' + err.message, stack: err.stack });
    }
});

// ============================================
// VULN: Weak JWT/Token Authentication Bypass
// ============================================

app.post('/api/auth/token', (req, res) => {
    const { email, role } = req.body;
    
    // VULN: Can generate token for any user without password
    // Just need to know the email
    const user = users.get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = generateToken();
    sessions.set(token, {
        user: { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: role || user.role // VULN: Can override role
        },
        createdAt: new Date()
    });

    res.json({ 
        success: true, 
        token, 
        user: { id: user.id, name: user.name, email: user.email, role: role || user.role },
        flag: FLAGS.FLAG_JWT_BYPASS
    });
});

// ============================================
// VULN: Exposed .env and sensitive files
// ============================================

app.get('/.env', (req, res) => {
    res.type('text/plain').send(`# Vault Production Configuration
# WARNING: This file contains sensitive data

NODE_ENV=production
PORT=3000
SECRET_KEY=vault-master-key-2024-prod

# Database
DATABASE_URL=postgresql://vault_admin:V4ult_DB_P@ss_2024!@db.vault-internal.com:5432/vault_production
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://default:r3d1s_c4ch3_s3cr3t@cache.vault-internal.com:6379

# AWS
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7DEMOKEY
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
S3_BUCKET=vault-secrets-prod

# Stripe
STRIPE_SECRET_KEY=sk_live_51HG4xyz789
STRIPE_WEBHOOK_SECRET=whsec_abc123

# SendGrid
SENDGRID_API_KEY=SG.vault_prod_key_xxxxx

# JWT
JWT_SECRET=vault-jwt-secret-key-do-not-share-2024
JWT_EXPIRY=7d

# Admin
ADMIN_EMAIL=admin@vault.dev
ADMIN_PASSWORD=admin123

# Internal API
INTERNAL_API_KEY=vlt_sk_prod_S3cr3tK3y_2024_MASTER

# CTF Flag
FLAG=${FLAGS.FLAG_ENV_EXPOSURE}
`);
});

// ============================================
// VULN: Sensitive file exposure
// ============================================

app.get('/backup.sql', (req, res) => {
    res.type('text/plain').send(`-- Vault Database Backup
-- Generated: ${new Date().toISOString()}
-- Server: db.vault-internal.com:5432
-- Database: vault_production

-- FLAG: ${FLAGS.FLAG_BACKUP_LEAK}

CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (id, email, password, name, role) VALUES
('user_1', 'admin@vault.dev', 'admin123', 'Admin User', 'admin'),
('user_2', 'john@acme.com', 'password123', 'John Doe', 'owner'),
('user_3', 'jane@acme.com', 'password123', 'Jane Smith', 'admin'),
('user_4', 'superadmin@vault.dev', 'V4ult_Sup3r_4dm1n!', 'Super Admin', 'superadmin'),
('user_5', 'backup@vault.dev', 'backup_2024_secure', 'Backup Service', 'service');

CREATE TABLE secrets (
    id VARCHAR(50) PRIMARY KEY,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    environment VARCHAR(50) DEFAULT 'development',
    user_id VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO secrets (id, key, value, environment, user_id) VALUES
('s1', 'MASTER_KEY', 'mk-prod-2024-aB3xK9mN2pQ7rT5v', 'production', 'user_1'),
('s2', 'DATABASE_URL', 'postgresql://vault_admin:V4ult_DB_P@ss_2024!@db.vault-internal.com:5432/vault_production', 'production', 'user_1'),
('s3', 'STRIPE_LIVE_KEY', 'sk_live_51HG4xyz789realkey', 'production', 'user_2'),
('s4', 'AWS_SECRET_KEY', 'wJalrXUtnFEMI/K7MDENG/actualkey', 'production', 'user_1');

CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    key_value VARCHAR(255) NOT NULL,
    owner VARCHAR(50),
    permissions VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO api_keys (key_value, owner, permissions) VALUES
('vlt_sk_prod_S3cr3tK3y_2024_MASTER', 'system', 'admin'),
('vlt_sk_prod_W3bh00k_K3y', 'webhook', 'write'),
('vlt_pk_prod_Publ1c_K3y', 'public', 'read');

-- End of backup
`);
});

app.get('/config.json', (req, res) => {
    res.json({
        application: 'Vault Secrets Manager',
        version: '2.1.0',
        build: 'prod-20240215',
        api: {
            baseUrl: 'https://api.vault.dev',
            internalUrl: 'http://10.0.1.42:3000',
            adminPanel: '/admin.html',
            debugEndpoint: '/api/debug',
            backupEndpoint: '/api/backup'
        },
        database: {
            host: 'db.vault-internal.com',
            credentials: 'vault_admin:V4ult_DB_P@ss_2024!'
        },
        features: {
            debugMode: true,
            adminPanel: true,
            fileUpload: true,
            xmlImport: true,
            commandTools: true
        }
    });
});

// Git config exposure
app.get('/.git/config', (req, res) => {
    res.type('text/plain').send(`[core]
    repositoryformatversion = 0
    filemode = true
    bare = false
    logallrefupdates = true

[remote "origin"]
    url = https://github.com/vault-security/vault-secrets-manager.git
    fetch = +refs/heads/*:refs/remotes/origin/*

[branch "main"]
    remote = origin
    merge = refs/heads/main

[user]
    name = vault-deploy
    email = deploy@vault.dev

# Deploy token (DO NOT SHARE)
[credential]
    helper = store
    # token: ghp_f4k3T0k3nD3pl0yK3y2024Vault
`);
});

// ============================================
// Cleanup & Server Start
// ============================================

// Run cleanup every 10 minutes
setInterval(cleanExpiredMessages, 10 * 60 * 1000);

// Start server
app.listen(PORT, () => {
    console.log(`\n[VAULT] Backend Server`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[OK] Server running on: http://localhost:${PORT}`);
    console.log(`\n[API] Auth Endpoints:`);
    console.log(`   POST /api/auth/register  - Register new user`);
    console.log(`   POST /api/auth/login     - Login`);
    console.log(`   POST /api/auth/logout    - Logout`);
    console.log(`   GET  /api/auth/me        - Get current user`);
    console.log(`\n[API] Secrets Endpoints:`);
    console.log(`   GET    /api/secrets      - List all secrets`);
    console.log(`   POST   /api/secrets      - Create secret`);
    console.log(`   GET    /api/secrets/:id  - Get secret`);
    console.log(`   PUT    /api/secrets/:id  - Update secret`);
    console.log(`   DELETE /api/secrets/:id  - Delete secret`);
    console.log(`\n[API] Other Endpoints:`);
    console.log(`   GET  /api/audit          - Get audit log`);
    console.log(`   GET  /api/team           - Get team members`);
    console.log(`   GET  /api/health         - Health check`);
    console.log(`   POST /api/notes          - Create note`);
    console.log(`   GET  /api/notes          - List notes`);
    console.log(`   POST /api/tools/ping     - Network ping`);
    console.log(`   POST /api/tools/fetch-url - URL fetch`);
    console.log(`   POST /api/import         - Import secrets`);
    console.log(`   GET  /api/export         - Export secrets`);
    console.log(`   GET  /api/search         - Search secrets`);
    console.log(`\n[DEMO] Pre-loaded users:`);
    console.log(`   admin@vault.dev / admin123`);
    console.log(`   john@acme.com / password123`);
    console.log(`   jane@acme.com / password123`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
