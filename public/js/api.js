// API Interaction Module

export async function loginAdmin(username, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Login failed');
    }

    if (data.token) {
        sessionStorage.setItem('adminToken', data.token);
    }

    return data;
}

export async function fetchComplaints() {
    const response = await fetch('/api/complaints', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch complaints');
    }

    return data.complaints || [];
}

export async function createComplaint(location, description, contact, imageFile) {
    const formData = new FormData();
    formData.append('location', location);
    formData.append('description', description);
    formData.append('contact', contact);
    formData.append('image', imageFile);

    const response = await fetch('/api/complaints', {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to create complaint');
    }

    return data.complaint;
}

export async function updateComplaint(id, updateData) {
    const formData = new FormData();

    if (updateData.status) {
        formData.append('status', updateData.status);
    }

    if (updateData.assignedTo) {
        formData.append('assigned_to', updateData.assignedTo);
    }

    if (updateData.afterImage) {
        formData.append('after_image', updateData.afterImage);
    }

    const token = sessionStorage.getItem('adminToken');
    const response = await fetch(`/api/complaints/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to update complaint');
    }

    return data.complaint;
}

export async function deleteComplaintAPI(id) {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch(`/api/complaints/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to delete complaint');
    }

    return await response.json();
}
