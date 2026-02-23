import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import pool from '../db.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_key_change_me';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'gov-complaint-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-62cfd0f5ce354768976829718b8e95cd.r2.dev';

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

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileExtension = imageFile.originalname.split('.').pop() || 'jpg';
        const fileName = `before-${timestamp}-${randomStr}.${fileExtension}`;

        const putCommand = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName,
            Body: imageFile.buffer,
            ContentType: imageFile.mimetype,
        });

        await s3Client.send(putCommand);
        const imageUrl = `${R2_PUBLIC_URL}/${fileName}`;

        const result = await pool.query(
            `INSERT INTO complaints (location, description, contact, status, before_image_url)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING *`,
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
            updateFields.push(`status = $${queryIndex++}`);
            values.push(status);
        }

        if (assigned_to) {
            updateFields.push(`assigned_to = $${queryIndex++}`);
            values.push(assigned_to);
        }

        if (afterImage) {
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(7);
            const fileExtension = afterImage.originalname.split('.').pop() || 'jpg';
            const fileName = `after-${timestamp}-${randomStr}.${fileExtension}`;

            const putCommand = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: fileName,
                Body: afterImage.buffer,
                ContentType: afterImage.mimetype,
            });

            await s3Client.send(putCommand);
            const afterImageUrl = `${R2_PUBLIC_URL}/${fileName}`;

            updateFields.push(`after_image_url = $${queryIndex++}`);
            values.push(afterImageUrl);
        }

        if (status === 'completed') {
            updateFields.push(`completed_at = NOW()`);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        const query = `UPDATE complaints SET ${updateFields.join(', ')} WHERE id = $${queryIndex} RETURNING *`;

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
        const deleteParams = [];

        if (complaint.before_image_url) {
            const key = complaint.before_image_url.split('/').pop();
            if (key) deleteParams.push({ Bucket: R2_BUCKET_NAME, Key: key });
        }
        if (complaint.after_image_url) {
            const key = complaint.after_image_url.split('/').pop();
            if (key) deleteParams.push({ Bucket: R2_BUCKET_NAME, Key: key });
        }

        for (const params of deleteParams) {
            try {
                await s3Client.send(new DeleteObjectCommand(params));
            } catch (s3error) {
                console.error('Failed to delete image from R2:', s3error);
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
