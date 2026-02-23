import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_key_change_me';

// Use the Railway Volume path if present, otherwise fallback to local public/uploads for dev
const UPLOAD_DIR = process.env.RAILWAY_ENVIRONMENT ? '/data/images' : path.join(process.cwd(), 'public/uploads');

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure Multer for local disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileExtension = file.originalname.split('.').pop() || 'jpg';
        cb(null, `${file.fieldname} -${timestamp} -${randomStr}.${fileExtension} `);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Authentication Middleware
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

// Get all complaints
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM complaints ORDER BY id DESC');
        res.json({ complaints: result.rows });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch complaints', message: error.message });
    }
});

// Create a new complaint
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { location, description, contact } = req.body;
        const imageFile = req.file;

        if (!location || !description || !imageFile) {
            return res.status(400).json({ error: 'Missing required fields: location, description, and image are required' });
        }

        // The file is already saved to disk by multer, we just need the path.
        // We store the relative URL string so the frontend can access it via the static file server
        const imageUrl = `/ images / ${imageFile.filename} `;

        const result = await pool.query(
            `INSERT INTO complaints(location, description, contact, status, before_image_url)
VALUES($1, $2, $3, 'pending', $4)
RETURNING * `,
            [location, description, contact, imageUrl]
        );

        res.status(201).json({
            success: true,
            message: 'Complaint created successfully',
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Create complaint error:', error);
        res.status(500).json({ error: 'Failed to create complaint', message: error.message });
    }
});

// Update a complaint (assign or complete)
router.put('/:id', authenticateToken, upload.single('after_image'), async (req, res) => {
    const { id } = req.params;
    const { status, assigned_to } = req.body;
    const afterImage = req.file;

    try {
        let updateFields = [];
        let values = [];
        let queryIndex = 1;

        if (status) {
            updateFields.push(`status = $${queryIndex++} `);
            values.push(status);
        }

        if (assigned_to) {
            updateFields.push(`assigned_to = $${queryIndex++} `);
            values.push(assigned_to);
        }

        if (afterImage) {
            const afterImageUrl = `/ images / ${afterImage.filename} `;
            updateFields.push(`after_image_url = $${queryIndex++} `);
            values.push(afterImageUrl);
        }

        if (status === 'completed') {
            updateFields.push(`completed_at = NOW()`);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        const query = `UPDATE complaints SET ${updateFields.join(', ')} WHERE id = $${queryIndex} RETURNING * `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        res.json({
            success: true,
            message: 'Complaint updated successfully',
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Update complaint error:', error);
        res.status(500).json({ error: 'Failed to update complaint', message: error.message });
    }
});

// Delete a complaint
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const checkResult = await pool.query('SELECT * FROM complaints WHERE id = $1', [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        const complaint = checkResult.rows[0];
        const filesToDelete = [];

        // Extract filename from the stored URL string (e.g. "/images/file-123.jpg" -> "file-123.jpg")
        if (complaint.before_image_url) {
            const key = complaint.before_image_url.split('/').pop();
            if (key) filesToDelete.push(path.join(UPLOAD_DIR, key));
        }
        if (complaint.after_image_url) {
            const key = complaint.after_image_url.split('/').pop();
            if (key) filesToDelete.push(path.join(UPLOAD_DIR, key));
        }

        for (const filePath of filesToDelete) {
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    console.error(`Failed to delete local image ${filePath}: `, err);
                }
            }
        }

        await pool.query('DELETE FROM complaints WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Complaint deleted successfully',
            deletedId: id
        });
    } catch (error) {
        console.error('Delete complaint error:', error);
        res.status(500).json({ error: 'Failed to delete complaint', message: error.message });
    }
});

export default router;
