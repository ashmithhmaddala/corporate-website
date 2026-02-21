// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Header background on scroll
const header = document.querySelector('.header');
if (header) {
    const updateHeader = () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const bgColor = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 10, 10, 0.95)';
        const bgTransparent = 'transparent';
        
        if (window.scrollY > 50) {
            header.style.background = bgColor;
        } else {
            header.style.background = bgTransparent;
        }
    };
    
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();
    
    // Re-run on theme change
    const observer = new MutationObserver(updateHeader);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Apply initial styles and observe elements
document.querySelectorAll('.sol-card, .quote-card, .plan').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

// Terminal typing effect
const terminalBody = document.querySelector('.term-body');
if (terminalBody) {
    const lines = terminalBody.querySelectorAll('p');
    lines.forEach((line, index) => {
        line.style.opacity = '0';
        setTimeout(() => {
            line.style.transition = 'opacity 0.3s ease';
            line.style.opacity = '1';
        }, index * 400);
    });
}

// Demo window secret reveal
const secretValues = {
    'DATABASE_URL': 'postgresql://user:pass@db.vault.dev:5432/prod',
    'STRIPE_SECRET_KEY': 'sk_live_DEMO_KEY_REPLACE_ME',
    'AWS_ACCESS_KEY_ID': 'AKIAIOSFODNN7EXAMPLE',
    'SENDGRID_API_KEY': 'SG.xxxxxxxxxxxxxxxxxxxxx',
    'STRIPE_TEST_KEY': 'sk_test_51ABC123XYZ456789',
    'DEBUG_MODE': 'true',
    'LOG_LEVEL': 'verbose',
    'SENTRY_DSN': 'https://abc123@sentry.io/456',
    'API_MOCK_ENABLED': 'true',
    'HOT_RELOAD': 'enabled'
};

document.querySelectorAll('.secret').forEach(secret => {
    const val = secret.querySelector('.val');
    const key = secret.querySelector('.key');
    if (val && key) {
        const hidden = '••••••••••••••••••••';
        let isRevealed = false;
        
        secret.style.cursor = 'pointer';
        
        secret.addEventListener('mouseenter', () => {
            if (!isRevealed) {
                val.textContent = 'Click to reveal';
                val.style.color = 'var(--text-muted)';
            }
        });
        
        secret.addEventListener('mouseleave', () => {
            if (!isRevealed) {
                val.textContent = hidden;
                val.style.color = '';
            }
        });
        
        secret.addEventListener('click', () => {
            const keyName = key.textContent;
            if (isRevealed) {
                val.textContent = hidden;
                val.style.color = '';
                isRevealed = false;
            } else {
                val.textContent = secretValues[keyName] || 'secret_value_here';
                val.style.color = 'var(--green)';
                isRevealed = true;
            }
        });
    }
});

// Environment tabs in demo
const envData = {
    production: { title: 'Production', count: '12 secrets', url: 'vault.dev/acme/production' },
    staging: { title: 'Staging', count: '8 secrets', url: 'vault.dev/acme/staging' },
    development: { title: 'Development', count: '5 secrets', url: 'vault.dev/acme/development' }
};

document.querySelectorAll('.env').forEach(env => {
    env.addEventListener('click', () => {
        const envName = env.dataset.env;
        if (!envName) return;
        
        // Update active state
        document.querySelectorAll('.env').forEach(e => e.classList.remove('active'));
        env.classList.add('active');
        
        // Update header info
        const titleEl = document.getElementById('env-title');
        const countEl = document.getElementById('env-count');
        const urlEl = document.getElementById('demo-url');
        
        if (titleEl) titleEl.textContent = envData[envName].title;
        if (countEl) countEl.textContent = envData[envName].count;
        if (urlEl) urlEl.textContent = envData[envName].url;
        
        // Switch secrets lists
        document.querySelectorAll('.secrets-list').forEach(list => {
            list.style.display = 'none';
        });
        const activeList = document.getElementById(`secrets-${envName}`);
        if (activeList) activeList.style.display = 'block';
    });
});

// Copy to clipboard utility (for future use)
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    // ESC to close mobile menu
    if (e.key === 'Escape') {
        const navCenter = document.querySelector('.nav-center');
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        if (navCenter && navCenter.classList.contains('active')) {
            navCenter.classList.remove('active');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        }
    }
});

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navCenter = document.querySelector('.nav-center');

if (mobileMenuToggle && navCenter) {
    mobileMenuToggle.addEventListener('click', () => {
        const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
        mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
        navCenter.classList.toggle('active');
    });
    
    // Close menu when clicking a nav link
    navCenter.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navCenter.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
        });
    });
}

// Theme Toggle
const themeToggle = document.querySelector('.theme-toggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function getTheme() {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return prefersDark.matches ? 'dark' : 'light';
}

// Initialize theme
const currentTheme = getTheme();
if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'light' ? 'dark' : 'light');
    });
}

// Listen for system theme changes
prefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// Cookie Consent
const cookieBanner = document.getElementById('cookie-banner');
const cookieAccept = document.querySelector('.cookie-accept');
const cookieDecline = document.querySelector('.cookie-decline');

function setCookieConsent(value) {
    localStorage.setItem('cookie-consent', value);
    if (cookieBanner) cookieBanner.classList.remove('show');
}

if (cookieBanner && !localStorage.getItem('cookie-consent')) {
    setTimeout(() => {
        cookieBanner.classList.add('show');
    }, 1500);
}

if (cookieAccept) {
    cookieAccept.addEventListener('click', () => setCookieConsent('accepted'));
}

if (cookieDecline) {
    cookieDecline.addEventListener('click', () => setCookieConsent('declined'));
}

// Form validation feedback
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = '#ef4444';
                setTimeout(() => {
                    input.style.borderColor = '';
                }, 2000);
            }
        });
        
        if (!isValid) {
            e.preventDefault();
        }
    });
});

// Lazy load images (for future use)
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
    });
}

// Performance: reduce motion for users who prefer it
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('[style*="transition"]').forEach(el => {
        el.style.transition = 'none';
    });
}

console.log('Vault · Secrets Infrastructure');
