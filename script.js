// Application State
let state = {
    complaints: [],
    complaintCounter: 1000,
    currentAssignmentIndex: null,
    currentCompletionIndex: null,
    selectedCompletionImage: null,
    isAdminLoggedIn: false
};

// Admin credentials (in production, this should be server-side)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// Test data for quick seeding (developer tool)
const TEST_DATA_SAMPLES = [
    {
        location: "Gandhi Street, Ward 15, Near Bus Stand",
        description: "Sewage water overflowing from manhole causing unhygienic conditions. The issue has persisted for 3 days and affecting nearby residents.",
        contact: "9876543210"
    },
    {
        location: "Bharathi Nagar Main Road, Ward 8",
        description: "Broken underground sewage pipe causing water stagnation. Strong odor and breeding mosquitoes in the area.",
        contact: "9988776655"
    },
    {
        location: "Nehru Street, Corner of Station Road, Ward 22",
        description: "Clogged drainage system causing sewage backup during rain. Water entering residential properties.",
        contact: "9123456789"
    },
    {
        location: "Kamaraj Salai, Behind Market Complex, Ward 12",
        description: "Open sewage drain without proper cover. Safety hazard for pedestrians and children playing nearby.",
        contact: "9445566778"
    }
];

// Translations for multi-language support
const TRANSLATIONS = {
    en: {
        title: "Mayiladuthurai Municipal Corporation",
        subtitle: "Citizen Complaint Management System",
        adminLogin: "Admin Login",
        formTitle: "Submit a Sewage Complaint",
        formDescription: "Report sewage issues in your area. We will track and resolve your complaint promptly.",
        labelLocation: "Location *",
        placeholderLocation: "Enter street address or area name",
        labelDescription: "Description *",
        placeholderDescription: "Describe the sewage issue...",
        labelContact: "Contact Number *",
        placeholderContact: "Your phone number",
        labelPhoto: "Upload Photo of the Issue *",
        uploadText: "Click to upload or drag and drop",
        uploadHint: "JPG, PNG up to 10MB",
        changeImage: "Change Image",
        submitButton: "Submit Complaint",
        successTitle: "Complaint Submitted Successfully!",
        successMessage: "Your complaint has been registered with ID:",
        successInfo: "We will track your complaint and notify you once it is resolved.",
        okButton: "OK"
    },
    ta: {
        title: "மயிலாடுதுறை நகராட்சி",
        subtitle: "குடிமக்கள் புகார் மேலாண்மை அமைப்பு",
        adminLogin: "நிர்வாகி உள்நுழைவு",
        formTitle: "சாக்கடை புகார் சமர்ப்பிக்கவும்",
        formDescription: "உங்கள் பகுதியில் உள்ள சாக்கடை பிரச்சனைகளை தெரிவிக்கவும். உங்கள் புகாரை நாங்கள் கண்காணித்து விரைவில் தீர்வு காண்போம்.",
        labelLocation: "இடம் *",
        placeholderLocation: "தெரு முகவரி அல்லது பகுதியின் பெயரை உள்ளிடவும்",
        labelDescription: "விளக்கம் *",
        placeholderDescription: "சாக்கடை பிரச்சனையை விவரிக்கவும்...",
        labelContact: "தொடர்பு எண் *",
        placeholderContact: "உங்கள் தொலைபேசி எண்",
        labelPhoto: "பிரச்சனையின் புகைப்படத்தை பதிவேற்றவும் *",
        uploadText: "பதிவேற்ற கிளிக் செய்யவும் அல்லது இழுத்து விடவும்",
        uploadHint: "JPG, PNG 10MB வரை",
        changeImage: "படத்தை மாற்றவும்",
        submitButton: "புகார் சமர்ப்பிக்கவும்",
        successTitle: "புகார் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!",
        successMessage: "உங்கள் புகார் பதிவு செய்யப்பட்டது. அடையாள எண்:",
        successInfo: "உங்கள் புகாரை நாங்கள் கண்காணித்து தீர்வு கிடைத்தவுடன் உங்களுக்கு தெரிவிப்போம்.",
        okButton: "சரி"
    }
};

// Current language state
let currentLanguage = localStorage.getItem('language') || 'en';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadComplaintsFromStorage();
    setupEventListeners();
    setupDeveloperTools();

    // Apply saved language preference
    applyLanguage(currentLanguage);

    // Check if admin is logged in
    const adminLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (adminLoggedIn === 'true') {
        state.isAdminLoggedIn = true;
        showAdminDashboard();
    }
});

// ============ DATA PERSISTENCE ============

function saveComplaintsToStorage() {
    localStorage.setItem('complaints', JSON.stringify(state.complaints));
    localStorage.setItem('complaintCounter', state.complaintCounter.toString());
}

function loadComplaintsFromStorage() {
    const savedComplaints = localStorage.getItem('complaints');
    const savedCounter = localStorage.getItem('complaintCounter');

    if (savedComplaints) {
        state.complaints = JSON.parse(savedComplaints);
    }

    if (savedCounter) {
        state.complaintCounter = parseInt(savedCounter);
    }
}

// ============ VIEW NAVIGATION ============

function showPublicView() {
    document.getElementById('public-view').style.display = 'block';
    document.getElementById('admin-login-view').style.display = 'none';
    document.getElementById('admin-dashboard-view').style.display = 'none';
}

function showAdminLogin() {
    document.getElementById('public-view').style.display = 'none';
    document.getElementById('admin-login-view').style.display = 'block';
    document.getElementById('admin-dashboard-view').style.display = 'none';
}

function showAdminDashboard() {
    document.getElementById('public-view').style.display = 'none';
    document.getElementById('admin-login-view').style.display = 'none';
    document.getElementById('admin-dashboard-view').style.display = 'block';

    updateAdminStats();
    renderComplaintsTable();
}

function logout() {
    state.isAdminLoggedIn = false;
    sessionStorage.removeItem('adminLoggedIn');
    showPublicView();

    // Clear login form
    document.getElementById('admin-login-form').reset();
}

// ============ EVENT LISTENERS ============

function setupEventListeners() {
    // Public complaint form
    const complaintForm = document.getElementById('complaint-form');
    complaintForm.addEventListener('submit', handleComplaintSubmit);

    // Public image upload
    const publicUploadBox = document.getElementById('public-upload-box');
    const publicImageUpload = document.getElementById('public-image-upload');

    publicUploadBox.addEventListener('click', () => {
        publicImageUpload.click();
    });

    publicImageUpload.addEventListener('change', (e) => {
        handlePublicImageUpload(e);
    });

    // Drag and drop for public upload
    publicUploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        publicUploadBox.classList.add('dragover');
    });

    publicUploadBox.addEventListener('dragleave', () => {
        publicUploadBox.classList.remove('dragover');
    });

    publicUploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        publicUploadBox.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file, 'public');
        }
    });

    // Admin login form
    const adminLoginForm = document.getElementById('admin-login-form');
    adminLoginForm.addEventListener('submit', handleAdminLogin);

    // Completion image upload
    const uploadArea = document.getElementById('upload-area');
    const completionImageUpload = document.getElementById('completion-image-upload');

    uploadArea.addEventListener('click', () => {
        completionImageUpload.click();
    });

    completionImageUpload.addEventListener('change', (e) => {
        handleCompletionImageUpload(e);
    });

    // Drag and drop for completion upload
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file, 'completion');
        }
    });
}

// ============ PUBLIC COMPLAINT SUBMISSION ============

function handlePublicImageUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageFile(file, 'public');
    }
}

function handleImageFile(file, type) {
    const reader = new FileReader();
    reader.onload = (event) => {
        if (type === 'public') {
            showPublicImagePreview(event.target.result);
        } else if (type === 'completion') {
            showCompletionImagePreview(event.target.result);
        }
    };
    reader.readAsDataURL(file);
}

function showPublicImagePreview(imageSrc) {
    document.getElementById('public-upload-box').style.display = 'none';
    document.getElementById('public-image-preview').style.display = 'block';
    document.getElementById('public-preview-img').src = imageSrc;
}

function changePublicImage() {
    document.getElementById('public-image-upload').click();
}

function handleComplaintSubmit(e) {
    e.preventDefault();

    const location = document.getElementById('complaint-location').value;
    const description = document.getElementById('complaint-description').value;
    const contact = document.getElementById('complaint-contact').value;
    const image = document.getElementById('public-preview-img').src;

    if (!image) {
        alert('Please upload a photo of the issue');
        return;
    }

    // Create complaint
    const complaint = {
        id: state.complaintCounter++,
        location: location,
        description: description,
        contact: contact,
        status: 'pending',
        assignedTo: null,
        beforeImage: image,
        afterImage: null,
        submittedAt: new Date().toISOString(),
        completedAt: null
    };

    state.complaints.push(complaint);
    saveComplaintsToStorage();

    // Show success modal
    document.getElementById('complaint-id-display').textContent = '#' + complaint.id;
    document.getElementById('success-modal').classList.add('active');

    // Reset form
    document.getElementById('complaint-form').reset();
    document.getElementById('public-upload-box').style.display = 'block';
    document.getElementById('public-image-preview').style.display = 'none';
    document.getElementById('public-preview-img').src = '';
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.remove('active');
}

// ============ ADMIN AUTHENTICATION ============

function handleAdminLogin(e) {
    e.preventDefault();

    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        state.isAdminLoggedIn = true;
        sessionStorage.setItem('adminLoggedIn', 'true');
        showAdminDashboard();
    } else {
        alert('Invalid credentials. Please try again.');
    }
}

// ============ ADMIN DASHBOARD ============

function updateAdminStats() {
    const total = state.complaints.length;
    const pending = state.complaints.filter(c => c.status === 'pending').length;
    const processing = state.complaints.filter(c => c.status === 'processing').length;
    const completed = state.complaints.filter(c => c.status === 'completed').length;

    document.getElementById('total-complaints').textContent = total;
    document.getElementById('pending-complaints').textContent = pending;
    document.getElementById('processing-complaints').textContent = processing;
    document.getElementById('completed-complaints').textContent = completed;
}

function renderComplaintsTable() {
    const tableBody = document.getElementById('complaints-list');

    if (state.complaints.length === 0) {
        tableBody.innerHTML = '<div class="no-complaints">No complaints registered yet</div>';
        return;
    }

    tableBody.innerHTML = '';

    // Sort complaints by ID (newest first)
    const sortedComplaints = [...state.complaints].sort((a, b) => b.id - a.id);

    sortedComplaints.forEach((complaint, index) => {
        const actualIndex = state.complaints.findIndex(c => c.id === complaint.id);
        const row = document.createElement('div');
        row.className = 'complaint-row';

        let statusClass = 'status-pending';
        let statusText = 'Pending';
        if (complaint.status === 'processing') {
            statusClass = 'status-processing';
            statusText = 'In Process';
        } else if (complaint.status === 'completed') {
            statusClass = 'status-completed';
            statusText = 'Completed';
        }

        let actionButton = '';
        if (complaint.status === 'pending') {
            actionButton = `<button class="btn-assign" onclick="openAssignModal(${actualIndex})">Assign</button>`;
        } else if (complaint.status === 'processing') {
            actionButton = `<button class="btn-complete" onclick="openCompletionModal(${actualIndex})">Mark Complete</button>`;
        } else {
            actionButton = `<span class="completed-icon">✓</span>`;
        }

        const shortDescription = complaint.description.length > 50
            ? complaint.description.substring(0, 50) + '...'
            : complaint.description;

        row.innerHTML = `
            <div class="complaint-id" data-label="ID:">#${complaint.id}</div>
            <div class="complaint-location" data-label="Location:">${complaint.location}</div>
            <div class="complaint-description" data-label="Description:" title="${complaint.description}">${shortDescription}</div>
            <div class="complaint-contact" data-label="Contact:">${complaint.contact}</div>
            <div data-label="Status:"><span class="status-badge ${statusClass}">${statusText}</span></div>
            <div class="assigned-officer" data-label="Assigned To:">${complaint.assignedTo || '-'}</div>
            <div class="complaint-actions" data-label="Action:">
                <button class="btn-view" onclick="viewComplaint(${actualIndex})" title="View Details">👁️</button>
                ${actionButton}
            </div>
        `;

        tableBody.appendChild(row);
    });
}

// ============ OFFICER ASSIGNMENT ============

function openAssignModal(index) {
    state.currentAssignmentIndex = index;
    document.getElementById('officer-select').value = '';
    document.getElementById('assign-modal').classList.add('active');
}

function closeAssignModal() {
    document.getElementById('assign-modal').classList.remove('active');
    state.currentAssignmentIndex = null;
}

function confirmAssignment() {
    const officer = document.getElementById('officer-select').value;

    if (!officer) {
        alert('Please select an officer');
        return;
    }

    if (state.currentAssignmentIndex === null) return;

    const complaint = state.complaints[state.currentAssignmentIndex];
    complaint.status = 'processing';
    complaint.assignedTo = officer;

    saveComplaintsToStorage();
    updateAdminStats();
    renderComplaintsTable();
    closeAssignModal();

    showNotification('Complaint #' + complaint.id + ' assigned to ' + officer);
}

// ============ COMPLAINT COMPLETION ============

function openCompletionModal(index) {
    state.currentCompletionIndex = index;
    state.selectedCompletionImage = null;

    // Reset modal state
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('completion-image-preview').style.display = 'none';
    document.getElementById('completion-preview-img').src = '';
    document.getElementById('btn-submit-completion').disabled = true;

    // Show modal
    document.getElementById('completion-modal').classList.add('active');
}

function closeCompletionModal() {
    document.getElementById('completion-modal').classList.remove('active');
    state.currentCompletionIndex = null;
    state.selectedCompletionImage = null;
}

function handleCompletionImageUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            showCompletionImagePreview(event.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function showCompletionImagePreview(imageSrc) {
    state.selectedCompletionImage = imageSrc;
    document.getElementById('upload-area').style.display = 'none';
    document.getElementById('completion-image-preview').style.display = 'block';
    document.getElementById('completion-preview-img').src = imageSrc;
    document.getElementById('btn-submit-completion').disabled = false;
}

function changeCompletionImage() {
    document.getElementById('completion-image-upload').click();
}

function submitCompletion() {
    if (state.currentCompletionIndex === null || !state.selectedCompletionImage) {
        return;
    }

    const complaint = state.complaints[state.currentCompletionIndex];
    complaint.status = 'completed';
    complaint.afterImage = state.selectedCompletionImage;
    complaint.completedAt = new Date().toISOString();

    saveComplaintsToStorage();
    updateAdminStats();
    renderComplaintsTable();
    closeCompletionModal();

    showNotification('Complaint #' + complaint.id + ' marked as completed');
}

// ============ VIEW COMPLAINT DETAILS ============

function viewComplaint(index) {
    const complaint = state.complaints[index];

    const submittedDate = new Date(complaint.submittedAt).toLocaleString();
    const completedDate = complaint.completedAt ? new Date(complaint.completedAt).toLocaleString() : 'Not completed';

    let statusClass = 'status-pending';
    let statusText = 'Pending';
    if (complaint.status === 'processing') {
        statusClass = 'status-processing';
        statusText = 'In Process';
    } else if (complaint.status === 'completed') {
        statusClass = 'status-completed';
        statusText = 'Completed';
    }

    let afterImageHTML = '';
    if (complaint.afterImage) {
        afterImageHTML = `
            <div class="detail-section">
                <h4>After Photo (Resolved)</h4>
                <img src="${complaint.afterImage}" alt="After Photo" class="detail-image">
            </div>
        `;
    }

    const detailsHTML = `
        <div class="complaint-details">
            <div class="detail-row">
                <div class="detail-label">Complaint ID:</div>
                <div class="detail-value complaint-id-value">#${complaint.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value"><span class="status-badge ${statusClass}">${statusText}</span></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Location:</div>
                <div class="detail-value">${complaint.location}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Contact:</div>
                <div class="detail-value">${complaint.contact}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Assigned To:</div>
                <div class="detail-value">${complaint.assignedTo || 'Not assigned'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Submitted:</div>
                <div class="detail-value">${submittedDate}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Completed:</div>
                <div class="detail-value">${completedDate}</div>
            </div>
            <div class="detail-section">
                <h4>Description</h4>
                <p class="detail-description">${complaint.description}</p>
            </div>
            <div class="detail-section">
                <h4>Before Photo (Issue Reported)</h4>
                <img src="${complaint.beforeImage}" alt="Before Photo" class="detail-image">
            </div>
            ${afterImageHTML}
        </div>
    `;

    document.getElementById('complaint-details-content').innerHTML = detailsHTML;
    document.getElementById('view-complaint-modal').classList.add('active');
}

function closeViewModal() {
    document.getElementById('view-complaint-modal').classList.remove('active');
}

// ============ DEVELOPER TOOLS ============

function setupDeveloperTools() {
    // Create developer button for test data seeding
    createDevSeedButton();

    // Setup keyboard shortcut (Ctrl/Cmd + Shift + D)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            seedTestData();
        }
    });

    // Check for URL parameter to auto-seed
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('seed') === 'true' || urlParams.get('dev') === 'true') {
        seedTestData();
    }
}

function createDevSeedButton() {
    // Only create button in public view
    const publicView = document.getElementById('public-view');
    if (!publicView) return;

    // Create small, unobtrusive button
    const button = document.createElement('button');
    button.id = 'dev-seed-btn';
    button.innerHTML = '🔧';
    button.title = 'Developer Tool: Seed Test Data (Ctrl+Shift+D)';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 45px;
        height: 45px;
        border-radius: 50%;
        background: #2563eb;
        color: white;
        border: none;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 999;
        transition: all 0.3s ease;
        opacity: 0.7;
    `;

    // Hover effect
    button.addEventListener('mouseenter', () => {
        button.style.opacity = '1';
        button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.opacity = '0.7';
        button.style.transform = 'scale(1)';
    });

    // Click handler
    button.addEventListener('click', () => {
        seedTestData();
    });

    // Add to body
    document.body.appendChild(button);

    // Hide button when not in public view
    const observer = new MutationObserver(() => {
        const isPublicViewVisible = publicView.style.display !== 'none';
        button.style.display = isPublicViewVisible ? 'block' : 'none';
    });

    observer.observe(publicView, { attributes: true, attributeFilter: ['style'] });
}

function seedTestData() {
    // Check if we're in the public view
    const publicView = document.getElementById('public-view');
    if (!publicView || publicView.style.display === 'none') {
        return;
    }

    // Get a random sample from test data
    const sample = TEST_DATA_SAMPLES[Math.floor(Math.random() * TEST_DATA_SAMPLES.length)];

    // Fill the form fields
    document.getElementById('complaint-location').value = sample.location;
    document.getElementById('complaint-description').value = sample.description;
    document.getElementById('complaint-contact').value = sample.contact;

    // Show visual feedback
    showNotification('Test data loaded! Remember to upload an image before submitting.');

    // Add a subtle highlight animation to the filled fields
    const fields = ['complaint-location', 'complaint-description', 'complaint-contact'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        field.style.transition = 'background-color 0.5s ease';
        field.style.backgroundColor = '#dbeafe';
        setTimeout(() => {
            field.style.backgroundColor = '';
        }, 1000);
    });
}

// ============ UTILITY FUNCTIONS ============

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============ MULTI-LANGUAGE SUPPORT ============

function toggleLanguage() {
    // Switch between English and Tamil
    currentLanguage = currentLanguage === 'en' ? 'ta' : 'en';

    // Save preference
    localStorage.setItem('language', currentLanguage);

    // Apply the new language
    applyLanguage(currentLanguage);
}

function applyLanguage(lang) {
    const translations = TRANSLATIONS[lang];

    if (!translations) {
        console.error('Language not found:', lang);
        return;
    }

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });

    // Update all elements with data-i18n-placeholder attribute (for input placeholders)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            element.placeholder = translations[key];
        }
    });

    // Update the language toggle button text to show the other language
    const toggleButton = document.getElementById('language-toggle');
    if (toggleButton) {
        toggleButton.textContent = lang === 'en' ? 'தமிழ்' : 'English';
    }

    // Update HTML lang attribute
    document.documentElement.lang = lang;
}
