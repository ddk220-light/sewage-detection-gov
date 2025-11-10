// Developer Documentation Portal
// Password-protected internal documentation viewer

const DEV_PASSWORD = 'dev123'; // Hardcoded password for developer access

// Documentation files to load
const DOCS_FILES = {
    'Project Planning': [
        { name: 'Business Requirements', path: 'docs/business_requirements.txt', type: 'txt' },
        { name: 'Product Requirements', path: 'docs/product_requirements.txt', type: 'txt' },
        { name: 'Engineering Design', path: 'docs/eng_design_document.txt', type: 'txt' },
        { name: 'UI Design Document', path: 'docs/ui_design_document.txt', type: 'txt' },
        { name: 'UI Mocks', path: 'docs/ui_mocks.txt', type: 'txt' },
        { name: 'Go-To-Market Plan', path: 'docs/GTM.txt', type: 'txt' },
        { name: 'Cloudflare Details', path: 'docs/cloudflare_details.txt', type: 'txt' },
        { name: 'Usage Instructions', path: 'docs/usage_instructions.txt', type: 'txt' }
    ],
    'Execution & Tracking': [
        { name: 'Execution Tracker', path: 'execute/execution_tracker.md', type: 'md' },
        { name: 'Backlog', path: 'execute/backlog.md', type: 'md' },
        { name: 'Bug Tracker', path: 'execute/bug_tracker.md', type: 'md' },
        { name: 'README', path: 'execute/README.md', type: 'md' }
    ],
    'Epics': [
        { name: 'EPIC-001: Core Complaint System', path: 'execute/epics/EPIC-001-core-complaint-system.md', type: 'md' }
    ]
};

// Check if user is authenticated
function checkAuth() {
    return sessionStorage.getItem('devAuth') === 'true';
}

// Handle login form submission
document.getElementById('dev-login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const password = document.getElementById('dev-password').value;
    const errorMsg = document.getElementById('error-msg');

    if (password === DEV_PASSWORD) {
        sessionStorage.setItem('devAuth', 'true');
        showPortal();
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('dev-password').value = '';
        document.getElementById('dev-password').focus();
    }
});

// Show the documentation portal
function showPortal() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('dev-portal').style.display = 'block';
    initializePortal();
}

// Initialize the documentation portal
function initializePortal() {
    buildSidebar();
    loadAllDocumentation();
}

// Build the sidebar navigation
function buildSidebar() {
    const sidebarContent = document.getElementById('sidebar-content');
    let html = '';

    for (const [category, files] of Object.entries(DOCS_FILES)) {
        html += `<h3>${category}</h3><ul>`;
        files.forEach((file, index) => {
            const fileId = `${category.replace(/\s+/g, '-')}-${index}`;
            html += `<li><a href="#${fileId}" onclick="scrollToDoc('${fileId}')">${file.name}</a></li>`;
        });
        html += '</ul>';
    }

    sidebarContent.innerHTML = html;
}

// Load all documentation files
async function loadAllDocumentation() {
    const docsContent = document.getElementById('docs-content');
    docsContent.innerHTML = '<div class="loading">Loading documentation</div>';

    let html = '';

    for (const [category, files] of Object.entries(DOCS_FILES)) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileId = `${category.replace(/\s+/g, '-')}-${i}`;
            html += await loadFile(file, fileId);
        }
    }

    docsContent.innerHTML = html;
}

// Load a single documentation file
async function loadFile(file, fileId) {
    try {
        const response = await fetch(file.path);
        if (!response.ok) {
            throw new Error(`Failed to load ${file.path}`);
        }

        const content = await response.text();

        let renderedContent;
        if (file.type === 'md') {
            // Render markdown using marked.js
            renderedContent = marked.parse(content);
        } else {
            // Display text files as pre-formatted text
            renderedContent = `<pre>${escapeHtml(content)}</pre>`;
        }

        return `
            <div id="${fileId}" class="doc-container" style="margin-bottom: 40px;">
                <div class="file-header">📄 ${file.path}</div>
                <div class="file-content">
                    ${renderedContent}
                </div>
            </div>
        `;
    } catch (error) {
        console.error(`Error loading ${file.path}:`, error);
        return `
            <div id="${fileId}" class="doc-container" style="margin-bottom: 40px;">
                <div class="file-header">📄 ${file.path}</div>
                <div class="file-content">
                    <p style="color: #e74c3c;">Error loading file: ${error.message}</p>
                </div>
            </div>
        `;
    }
}

// Scroll to a specific document
function scrollToDoc(fileId) {
    const element = document.getElementById(fileId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update active link in sidebar
        document.querySelectorAll('.dev-sidebar a').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`.dev-sidebar a[href="#${fileId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

// Logout function
function devLogout() {
    sessionStorage.removeItem('devAuth');
    document.getElementById('dev-portal').style.display = 'none';
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('dev-password').value = '';
    document.getElementById('error-msg').style.display = 'none';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (checkAuth()) {
        showPortal();
    }
});

// Handle browser back button to update active link
window.addEventListener('hashchange', function() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        document.querySelectorAll('.dev-sidebar a').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`.dev-sidebar a[href="#${hash}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
});
