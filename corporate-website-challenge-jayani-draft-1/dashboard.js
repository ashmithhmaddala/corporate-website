// Dashboard JavaScript
const API_BASE = '';

// State
let currentUser = null;
let currentEnv = 'production';
let secrets = { production: [], staging: [], development: [] };

// DOM Elements
const secretsList = document.getElementById('secretsList');
const emptyState = document.getElementById('emptyState');
const secretModal = document.getElementById('secretModal');
const secretForm = document.getElementById('secretForm');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupEnvTabs();
    setupModal();
    setupUserMenu();
    setupSearch();
    loadSecrets();
    loadProjects();
    loadAuditLog();
    loadTeam();
});

// Auth Check
function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = JSON.parse(user);
    updateUserUI();
}

function updateUserUI() {
    if (!currentUser) return;

    const initials = currentUser.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;

    // Settings form
    document.getElementById('settingsName').value = currentUser.name;
    document.getElementById('settingsEmail').value = currentUser.email;
}

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;

            // Update active nav
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Show page
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const pageEl = document.getElementById(`page-${page}`);
            if (pageEl) pageEl.classList.add('active');

            // Update breadcrumb
            document.getElementById('currentPage').textContent =
                page.charAt(0).toUpperCase() + page.slice(1);
        });
    });
}

// Environment Tabs
function setupEnvTabs() {
    const tabs = document.querySelectorAll('.env-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentEnv = tab.dataset.env;
            renderSecrets();
        });
    });
}

// User Menu
function setupUserMenu() {
    const menuBtn = document.getElementById('userMenuBtn');
    const dropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileDropdown = dropdown?.querySelector('.dropdown-item[data-page="profile"]');

    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdown?.classList.remove('show');
    });

    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Add navigation for profile dropdown
    profileDropdown?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'profile.html';
    });
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

// Search
function setupSearch() {
    const searchInput = document.getElementById('searchInput');

    searchInput?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterSecrets(query);
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInput?.focus();
        }
    });
}

function filterSecrets(query) {
    const rows = document.querySelectorAll('.secret-row');
    let matchCount = 0;
    rows.forEach(row => {
        const key = row.querySelector('.secret-key')?.textContent.toLowerCase();
        const visible = key?.includes(query) || !query;
        row.style.display = visible ? 'grid' : 'none';
        if (visible) matchCount++;
    });

    // Show search feedback
    let searchFeedback = document.getElementById('searchFeedback');
    if (!searchFeedback) {
        searchFeedback = document.createElement('div');
        searchFeedback.id = 'searchFeedback';
        searchFeedback.style.cssText = 'padding: 1rem; font-size: 0.875rem; color: var(--text-muted);';
        document.getElementById('secretsList')?.appendChild(searchFeedback);
    }

    if (query && matchCount === 0) {
        searchFeedback.innerHTML = 'No results found for "<strong>' + query + '</strong>"';
        searchFeedback.style.display = 'block';
    } else {
        searchFeedback.style.display = 'none';
    }
}

// Modal
function setupModal() {
    const addBtn = document.getElementById('addSecretBtn');
    const addFirstBtn = document.getElementById('addFirstSecret');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelModal');
    const backdrop = document.querySelector('.modal-backdrop');

    const openModal = (editMode = false, secret = null) => {
        document.getElementById('modalTitle').textContent = editMode ? 'Edit Secret' : 'Add Secret';
        document.getElementById('secretEnv').value = currentEnv;

        if (secret) {
            document.getElementById('secretId').value = secret.id;
            document.getElementById('secretKey').value = secret.key;
            document.getElementById('secretValue').value = secret.value;
            document.getElementById('secretEnv').value = secret.environment;
        } else {
            secretForm.reset();
            document.getElementById('secretId').value = '';
        }

        secretModal.classList.add('show');
    };

    const closeModal = () => {
        secretModal.classList.remove('show');
        secretForm.reset();
    };

    addBtn?.addEventListener('click', () => openModal());
    addFirstBtn?.addEventListener('click', () => openModal());
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    // Save secret
    secretForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('secretId').value;
        const key = document.getElementById('secretKey').value;
        const value = document.getElementById('secretValue').value;
        const environment = document.getElementById('secretEnv').value;

        try {
            if (id) {
                await updateSecret(id, { key, value, environment });
                showToast('Secret updated successfully', 'success');
            } else {
                await createSecret({ key, value, environment });
                showToast('Secret created successfully', 'success');
            }

            closeModal();
            loadSecrets();
        } catch (error) {
            showToast(error.message || 'Failed to save secret', 'error');
        }
    });

    // Expose for edit buttons
    window.openEditModal = (id) => {
        const allSecrets = [...secrets.production, ...secrets.staging, ...secrets.development];
        const secret = allSecrets.find(s => s.id === id);
        if (secret) openModal(true, secret);
    };
}

// API Functions
async function loadSecrets() {
    try {
        const response = await fetch(`${API_BASE}/api/secrets`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            secrets = {
                production: data.filter(s => s.environment === 'production'),
                staging: data.filter(s => s.environment === 'staging'),
                development: data.filter(s => s.environment === 'development')
            };
        } else {
            // Demo data if API fails
            secrets = getDemoSecrets();
        }

        updateEnvCounts();
        renderSecrets();
    } catch (error) {
        console.log('Using demo data');
        secrets = getDemoSecrets();
        updateEnvCounts();
        renderSecrets();
    }
}

function getDemoSecrets() {
    return {
        production: [
            { id: '1', key: 'DATABASE_URL', value: 'postgresql://user:pass@db.vault.dev:5432/prod', environment: 'production', updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
            { id: '2', key: 'STRIPE_SECRET_KEY', value: 'sk_live_DEMO_KEY_REPLACE_ME', environment: 'production', updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            { id: '3', key: 'AWS_ACCESS_KEY_ID', value: 'AKIAIOSFODNN7EXAMPLE', environment: 'production', updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            { id: '4', key: 'SENDGRID_API_KEY', value: 'SG.xxxxxxxxxxxxxxxxxxxxx', environment: 'production', updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        ],
        staging: [
            { id: '5', key: 'DATABASE_URL', value: 'postgresql://user:pass@db.vault.dev:5432/staging', environment: 'staging', updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
            { id: '6', key: 'STRIPE_TEST_KEY', value: 'sk_test_51ABC123XYZ456789', environment: 'staging', updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
            { id: '7', key: 'DEBUG_MODE', value: 'true', environment: 'staging', updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
        development: [
            { id: '8', key: 'DATABASE_URL', value: 'postgresql://localhost:5432/dev', environment: 'development', updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
            { id: '9', key: 'API_MOCK_ENABLED', value: 'true', environment: 'development', updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
            { id: '10', key: 'HOT_RELOAD', value: 'enabled', environment: 'development', updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        ]
    };
}

async function createSecret(data) {
    const response = await fetch(`${API_BASE}/api/secrets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
    });

    if (response.status === 401) {
        logout();
        return;
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create secret');
    }

    return response.json();
}

async function updateSecret(id, data) {
    const response = await fetch(`${API_BASE}/api/secrets/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update secret');
    }

    return response.json();
}

async function deleteSecret(id) {
    if (!confirm('Are you sure you want to delete this secret?')) return;

    try {
        const response = await fetch(`${API_BASE}/api/secrets/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showToast('Secret deleted successfully', 'success');
            loadSecrets();
        } else {
            // Demo mode - just remove from local
            for (const env of Object.keys(secrets)) {
                secrets[env] = secrets[env].filter(s => s.id !== id);
            }
            updateEnvCounts();
            renderSecrets();
            showToast('Secret deleted successfully', 'success');
        }
    } catch (error) {
        // Demo mode fallback
        for (const env of Object.keys(secrets)) {
            secrets[env] = secrets[env].filter(s => s.id !== id);
        }
        updateEnvCounts();
        renderSecrets();
        showToast('Secret deleted successfully', 'success');
    }
}

function updateEnvCounts() {
    document.getElementById('prod-count').textContent = secrets.production.length;
    document.getElementById('staging-count').textContent = secrets.staging.length;
    document.getElementById('dev-count').textContent = secrets.development.length;
}

function renderSecrets() {
    const envSecrets = secrets[currentEnv] || [];

    if (envSecrets.length === 0) {
        secretsList.innerHTML = '';
        secretsList.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    secretsList.innerHTML = envSecrets.map(secret => `
        <div class="secret-row" data-id="${secret.id}">
            <div class="secret-key">${escapeHtml(secret.key)}</div>
            <div class="secret-value">
                <span class="secret-value-text" data-revealed="false">••••••••••••••••••••</span>
                <button class="btn-reveal" onclick="toggleReveal(this, '${escapeHtml(secret.value)}')" title="Reveal">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>
                <button class="btn-reveal" onclick="copyToClipboard('${escapeHtml(secret.value)}')" title="Copy">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            </div>
            <div class="secret-updated">${formatTimeAgo(secret.updatedAt)}</div>
            <div class="secret-actions">
                <button class="btn-action" onclick="openEditModal('${secret.id}')" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-action delete" onclick="deleteSecret('${secret.id}')" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function toggleReveal(btn, value) {
    const valueEl = btn.parentElement.querySelector('.secret-value-text');
    const isRevealed = valueEl.dataset.revealed === 'true';

    if (isRevealed) {
        valueEl.textContent = '••••••••••••••••••••';
        valueEl.classList.remove('revealed');
        valueEl.dataset.revealed = 'false';
    } else {
        valueEl.textContent = value;
        valueEl.classList.add('revealed');
        valueEl.dataset.revealed = 'true';
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// Projects
async function loadProjects() {
    const grid = document.getElementById('projectsGrid');

    // Demo projects
    const projects = [
        { id: '1', name: 'Backend API', description: 'Main backend services', secrets: 12, members: 5, icon: '🔧' },
        { id: '2', name: 'Web App', description: 'Frontend application', secrets: 8, members: 4, icon: '🌐' },
        { id: '3', name: 'Mobile App', description: 'iOS and Android apps', secrets: 6, members: 3, icon: '📱' },
        { id: '4', name: 'Infrastructure', description: 'DevOps and cloud config', secrets: 15, members: 2, icon: '☁️' },
    ];

    grid.innerHTML = projects.map(p => `
        <div class="project-card" onclick="selectProject('${p.id}')">
            <div class="project-header">
                <div class="project-icon">${p.icon}</div>
            </div>
            <h3 class="project-name">${escapeHtml(p.name)}</h3>
            <p class="project-desc">${escapeHtml(p.description)}</p>
            <div class="project-stats">
                <span class="project-stat"><strong>${p.secrets}</strong> secrets</span>
                <span class="project-stat"><strong>${p.members}</strong> members</span>
            </div>
        </div>
    `).join('');
}

function selectProject(id) {
    // Navigate to secrets filtered by project
    document.querySelector('.nav-item[data-page="secrets"]').click();
    showToast('Project selected', 'success');
}

// Audit Log
async function loadAuditLog() {
    const list = document.getElementById('auditList');

    // Demo audit entries
    const auditLog = [
        { id: '1', action: 'created', resource: 'DATABASE_URL', user: 'John Doe', time: new Date(Date.now() - 2 * 60 * 60 * 1000), type: 'create' },
        { id: '2', action: 'updated', resource: 'STRIPE_SECRET_KEY', user: 'Jane Smith', time: new Date(Date.now() - 5 * 60 * 60 * 1000), type: 'update' },
        { id: '3', action: 'logged in', resource: '', user: 'John Doe', time: new Date(Date.now() - 8 * 60 * 60 * 1000), type: 'auth' },
        { id: '4', action: 'deleted', resource: 'OLD_API_KEY', user: 'Jane Smith', time: new Date(Date.now() - 24 * 60 * 60 * 1000), type: 'delete' },
        { id: '5', action: 'created', resource: 'AWS_ACCESS_KEY_ID', user: 'John Doe', time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), type: 'create' },
    ];

    list.innerHTML = auditLog.map(entry => `
        <div class="audit-item">
            <div class="audit-icon ${entry.type}">
                ${getAuditIcon(entry.type)}
            </div>
            <div class="audit-content">
                <div class="audit-action">
                    <strong>${escapeHtml(entry.user)}</strong> ${entry.action} ${entry.resource ? `<code>${escapeHtml(entry.resource)}</code>` : ''}
                </div>
                <div class="audit-meta">${entry.type === 'auth' ? 'Authentication' : 'Secrets'}</div>
            </div>
            <div class="audit-time">${formatTimeAgo(entry.time)}</div>
        </div>
    `).join('');
}

function getAuditIcon(type) {
    const icons = {
        create: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        update: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        delete: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
        auth: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>'
    };
    return icons[type] || icons.update;
}

// Team
async function loadTeam() {
    const list = document.getElementById('teamList');

    // Demo team
    const team = [
        { id: '1', name: 'John Doe', email: 'john@acme.com', role: 'owner' },
        { id: '2', name: 'Jane Smith', email: 'jane@acme.com', role: 'admin' },
        { id: '3', name: 'Bob Wilson', email: 'bob@acme.com', role: 'member' },
        { id: '4', name: 'Alice Brown', email: 'alice@acme.com', role: 'member' },
    ];

    list.innerHTML = team.map(member => `
        <div class="team-member">
            <div class="member-avatar">${member.name.split(' ').map(n => n[0]).join('')}</div>
            <div class="member-info">
                <div class="member-name">${escapeHtml(member.name)}</div>
                <div class="member-email">${escapeHtml(member.email)}</div>
            </div>
            <span class="member-role ${member.role}">${member.role}</span>
        </div>
    `).join('');
}

// Settings forms
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('settingsName').value;
    const email = document.getElementById('settingsEmail').value;

    // Update local user
    currentUser.name = name;
    currentUser.email = email;
    localStorage.setItem('user', JSON.stringify(currentUser));
    updateUserUI();

    showToast('Profile updated successfully', 'success');
});

document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (newPass !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (newPass.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }

    // In a real app, this would call the API
    showToast('Password updated successfully', 'success');
    document.getElementById('passwordForm').reset();
});

document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
});

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(date) {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString();
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    toastEl.querySelector('.toast-message').textContent = message;
    toastEl.className = `toast ${type} show`;

    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3000);
}

// Invite modal (placeholder)
document.getElementById('inviteBtn')?.addEventListener('click', () => {
    const email = prompt('Enter email address to invite:');
    if (email) {
        showToast(`Invitation sent to ${email}`, 'success');
    }
});

// New project modal (placeholder)
document.getElementById('addProjectBtn')?.addEventListener('click', () => {
    const name = prompt('Enter project name:');
    if (name) {
        showToast(`Project "${name}" created`, 'success');
        loadProjects();
    }
});

console.log('Vault Dashboard loaded');
