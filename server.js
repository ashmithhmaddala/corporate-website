const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const CryptoJS = require('crypto-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

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
    createdAt: new Date()
});
users.set('john@acme.com', {
    id: 'user_2',
    email: 'john@acme.com',
    password: 'password123',
    name: 'John Doe',
    role: 'owner',
    createdAt: new Date()
});
users.set('jane@acme.com', {
    id: 'user_3',
    email: 'jane@acme.com',
    password: 'password123',
    name: 'Jane Smith',
    role: 'admin',
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
    res.json({ success: true, user: req.user });
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
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        users_count: users.size,
        secrets_count: secretsStore.size,
        messages_stored: dataStore.size,
        timestamp: new Date().toISOString()
    });
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
    console.log(`\n[DEMO] Pre-loaded users:`);
    console.log(`   admin@vault.dev / admin123`);
    console.log(`   john@acme.com / password123`);
    console.log(`   jane@acme.com / password123`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
