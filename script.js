// Application State
let state = {
    currentComplaint: null,
    complaints: [],
    complaintCounter: 1000,
    currentCompletionIndex: null,
    selectedCompletionImage: null
};

// Close instructions overlay
function closeInstructions() {
    document.getElementById('instructions').style.display = 'none';
}

// Helper function to format time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Helper function to add WhatsApp message
function addWhatsAppMessage(text, type, hasImage = false, imageUrl = '', location = '') {
    const chatContainer = document.getElementById('whatsapp-chat');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;

    let content = '';

    if (hasImage && imageUrl) {
        content += `<img src="${imageUrl}" alt="Complaint Image" class="message-image">`;
    }

    if (text) {
        content += `<div class="message-text">${text}</div>`;
    }

    if (location) {
        content += `<div class="message-location"><span class="location-icon">📍</span>${location}</div>`;
    }

    content += `<div class="message-time">${getCurrentTime()}</div>`;

    messageDiv.innerHTML = content;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Helper function to update stats
function updateStats() {
    const total = state.complaints.length;
    const pending = state.complaints.filter(c => c.status === 'pending').length;
    const processing = state.complaints.filter(c => c.status === 'processing').length;
    const completed = state.complaints.filter(c => c.status === 'completed').length;

    document.getElementById('total-complaints').textContent = total;
    document.getElementById('pending-complaints').textContent = pending;
    document.getElementById('processing-complaints').textContent = processing;
    document.getElementById('completed-complaints').textContent = completed;
}

// Helper function to render complaints table
function renderComplaintsTable() {
    const tableBody = document.getElementById('complaints-list');

    if (state.complaints.length === 0) {
        tableBody.innerHTML = '<div class="no-complaints">No complaints registered yet</div>';
        return;
    }

    tableBody.innerHTML = '';

    state.complaints.forEach((complaint, index) => {
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
            actionButton = `<button class="btn-assign" onclick="assignComplaint(${index})">Assign</button>`;
        } else if (complaint.status === 'processing') {
            actionButton = `<button class="btn-complete" onclick="completeComplaint(${index})">Mark Complete</button>`;
        } else {
            actionButton = `<span style="color: #198754; font-size: 20px;">✓</span>`;
        }

        row.innerHTML = `
            <div class="complaint-id">#${complaint.id}</div>
            <div class="complaint-location">${complaint.location}</div>
            <div class="complaint-type">${complaint.type}</div>
            <div><span class="status-badge ${statusClass}">${statusText}</span></div>
            <div class="assigned-officer">${complaint.assignedTo || '-'}</div>
            <div>${actionButton}</div>
        `;

        tableBody.appendChild(row);
    });
}

// Step 1: User sends complaint
function sendComplaint() {
    const sendBtn = document.getElementById('send-complaint');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    // Create SVG image for sewage problem
    const sewageBeforeImage = createSewageBeforeImage();

    setTimeout(() => {
        // Add user message with image and location
        addWhatsAppMessage(
            'There is sewage overflowing on the street. Please help!',
            'sent',
            true,
            sewageBeforeImage,
            'Mayiladuthurai, Tamil Nadu, India'
        );

        // Create complaint in system
        const complaint = {
            id: state.complaintCounter++,
            location: 'Mayiladuthurai, Tamil Nadu',
            type: 'Sewage Overflow',
            status: 'pending',
            assignedTo: null,
            beforeImage: sewageBeforeImage,
            afterImage: null
        };

        state.complaints.push(complaint);
        state.currentComplaint = complaint;

        // Update portal
        updateStats();
        renderComplaintsTable();

        // Send automated response
        setTimeout(() => {
            addWhatsAppMessage(
                '✅ Thank you for your complaint. Your issue has been registered with ID #' + complaint.id + ' for Mayiladuthurai location.\n\nWe will track the resolution and notify you once it is completed.',
                'received'
            );

            sendBtn.textContent = '✓ Complaint Sent';
        }, 1500);
    }, 1000);
}

// Step 2: Admin assigns complaint
function assignComplaint(index) {
    const complaint = state.complaints[index];
    complaint.status = 'processing';
    complaint.assignedTo = 'Sanitation Officer Ravi Kumar';

    updateStats();
    renderComplaintsTable();

    // Show notification
    showNotification('Complaint #' + complaint.id + ' assigned to ' + complaint.assignedTo);
}

// Step 3: Officer completes complaint - Opens modal
function completeComplaint(index) {
    state.currentCompletionIndex = index;
    state.selectedCompletionImage = null;

    // Reset modal state
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('preview-img').src = '';
    document.getElementById('btn-submit-completion').disabled = true;

    // Show modal
    document.getElementById('completion-modal').classList.add('active');
}

// Close completion modal
function closeCompletionModal() {
    document.getElementById('completion-modal').classList.remove('active');
    state.currentCompletionIndex = null;
    state.selectedCompletionImage = null;
}

// Use sample image
function useSampleImage() {
    state.selectedCompletionImage = createSewageAfterImage();
    showImagePreview(state.selectedCompletionImage);
}

// Change image
function changeImage() {
    document.getElementById('image-upload').click();
}

// Show image preview
function showImagePreview(imageSrc) {
    document.getElementById('upload-area').style.display = 'none';
    document.getElementById('image-preview').style.display = 'block';
    document.getElementById('preview-img').src = imageSrc;
    document.getElementById('btn-submit-completion').disabled = false;
}

// Submit completion with image
function submitCompletion() {
    if (state.currentCompletionIndex === null || !state.selectedCompletionImage) {
        return;
    }

    const complaint = state.complaints[state.currentCompletionIndex];
    complaint.status = 'completed';
    complaint.afterImage = state.selectedCompletionImage;

    updateStats();
    renderComplaintsTable();

    // Close modal
    closeCompletionModal();

    // Send WhatsApp notification to user
    setTimeout(() => {
        addWhatsAppMessage(
            '🎉 Great news! Your complaint #' + complaint.id + ' has been resolved.\n\nThe sewage issue at your location has been fixed. Please see the attached photo for confirmation.',
            'received',
            true,
            complaint.afterImage
        );

        // User sends thank you message
        setTimeout(() => {
            addWhatsAppMessage(
                'Thank you so much! The area is clean now. Great work! 🙏',
                'sent'
            );
        }, 2000);
    }, 1000);

    showNotification('Complaint #' + complaint.id + ' marked as completed');
}

// Show notification
function showNotification(message) {
    // Create a simple toast notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #198754;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Create SVG image for sewage before (problem state)
function createSewageBeforeImage() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
            <!-- Sky -->
            <rect fill="#87CEEB" width="400" height="200"/>

            <!-- Ground/Road -->
            <rect fill="#666" y="200" width="400" height="100"/>

            <!-- Road markings -->
            <rect fill="#fff" y="245" x="20" width="40" height="10" opacity="0.7"/>
            <rect fill="#fff" y="245" x="80" width="40" height="10" opacity="0.7"/>
            <rect fill="#fff" y="245" x="140" width="40" height="10" opacity="0.7"/>
            <rect fill="#fff" y="245" x="200" width="40" height="10" opacity="0.7"/>
            <rect fill="#fff" y="245" x="260" width="40" height="10" opacity="0.7"/>
            <rect fill="#fff" y="245" x="320" width="40" height="10" opacity="0.7"/>

            <!-- Building -->
            <rect fill="#8B4513" x="20" y="120" width="100" height="80"/>
            <rect fill="#333" x="35" y="140" width="20" height="25"/>
            <rect fill="#333" x="75" y="140" width="20" height="25"/>
            <rect fill="#654321" x="30" y="175" width="60" height="25"/>

            <!-- Tree -->
            <rect fill="#8B4513" x="330" y="160" width="15" height="40"/>
            <circle fill="#228B22" cx="337" cy="150" r="30"/>

            <!-- SEWAGE OVERFLOW (main problem) -->
            <ellipse fill="#4a3f35" cx="200" cy="250" rx="80" ry="30" opacity="0.8"/>
            <ellipse fill="#3d3328" cx="180" cy="255" rx="60" ry="25" opacity="0.6"/>
            <ellipse fill="#6b5d4f" cx="220" cy="260" rx="50" ry="20" opacity="0.7"/>

            <!-- Sewage flowing -->
            <path d="M 200 250 Q 180 270 160 280" stroke="#3d3328" stroke-width="8" fill="none" opacity="0.6"/>
            <path d="M 210 255 Q 230 275 250 285" stroke="#3d3328" stroke-width="6" fill="none" opacity="0.6"/>

            <!-- Drain/Manhole -->
            <circle fill="#222" cx="200" cy="230" r="15"/>
            <circle fill="#444" cx="200" cy="230" r="12"/>

            <!-- Warning sign -->
            <polygon fill="#FFD700" points="350,210 340,230 360,230" stroke="#333" stroke-width="2"/>
            <text x="350" y="227" font-size="14" font-weight="bold" text-anchor="middle" fill="#333">!</text>

            <!-- Problem indicator text -->
            <text x="200" y="290" font-size="12" font-weight="bold" text-anchor="middle" fill="#ff0000">SEWAGE OVERFLOW</text>
        </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Create SVG image for sewage after (resolved state)
function createSewageAfterImage() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
            <!-- Sky -->
            <rect fill="#87CEEB" width="400" height="200"/>

            <!-- Sun -->
            <circle fill="#FFD700" cx="350" cy="50" r="30"/>

            <!-- Ground/Road (CLEAN) -->
            <rect fill="#808080" y="200" width="400" height="100"/>

            <!-- Road markings (bright and clear) -->
            <rect fill="#fff" y="245" x="20" width="40" height="10"/>
            <rect fill="#fff" y="245" x="80" width="40" height="10"/>
            <rect fill="#fff" y="245" x="140" width="40" height="10"/>
            <rect fill="#fff" y="245" x="200" width="40" height="10"/>
            <rect fill="#fff" y="245" x="260" width="40" height="10"/>
            <rect fill="#fff" y="245" x="320" width="40" height="10"/>

            <!-- Building -->
            <rect fill="#8B4513" x="20" y="120" width="100" height="80"/>
            <rect fill="#4da6ff" x="35" y="140" width="20" height="25"/>
            <rect fill="#4da6ff" x="75" y="140" width="20" height="25"/>
            <rect fill="#654321" x="30" y="175" width="60" height="25"/>

            <!-- Tree -->
            <rect fill="#8B4513" x="330" y="160" width="15" height="40"/>
            <circle fill="#32CD32" cx="337" cy="150" r="30"/>

            <!-- Clean manhole cover (properly sealed) -->
            <circle fill="#555" cx="200" cy="240" r="18"/>
            <circle fill="#666" cx="200" cy="240" r="15"/>
            <circle fill="#777" cx="200" cy="240" r="5"/>
            <line x1="195" y1="240" x2="205" y2="240" stroke="#888" stroke-width="1"/>
            <line x1="200" y1="235" x2="200" y2="245" stroke="#888" stroke-width="1"/>

            <!-- Success checkmark -->
            <circle fill="#22C55E" cx="350" cy="220" r="25"/>
            <path d="M 340 220 L 347 227 L 360 210" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>

            <!-- Clean status text -->
            <text x="200" y="290" font-size="12" font-weight="bold" text-anchor="middle" fill="#22C55E">CLEANED ✓</text>
        </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('send-complaint').addEventListener('click', sendComplaint);

    // Image upload functionality
    const uploadArea = document.getElementById('upload-area');
    const imageUpload = document.getElementById('image-upload');

    // Click to upload
    uploadArea.addEventListener('click', () => {
        imageUpload.click();
    });

    // Handle file selection
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                state.selectedCompletionImage = event.target.result;
                showImagePreview(state.selectedCompletionImage);
            };
            reader.readAsDataURL(file);
        }
    });

    // Drag and drop functionality
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
            const reader = new FileReader();
            reader.onload = (event) => {
                state.selectedCompletionImage = event.target.result;
                showImagePreview(state.selectedCompletionImage);
            };
            reader.readAsDataURL(file);
        }
    });
});

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
