import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import complaintsRouter from './routes/complaints.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_key_change_me';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure routes
app.use('/api/complaints', complaintsRouter);

// --- Auth & Health Routes ---

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const client = await pool.connect();
        client.release();
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
});

// Admin Login (Temporary hardcoded, will move to JWT later)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === validUsername && password === validPassword) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, message: 'Login successful', token, user: { username } });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
