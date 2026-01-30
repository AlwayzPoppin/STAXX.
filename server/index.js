import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

// Load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const port = 3001;
const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}
ensureDataDir();

if (!process.env.GEMINI_API_KEY) {
    console.error("CRITICAL: GEMINI_API_KEY is missing in server environment.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const authClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// HELPER: Verify Identity Token and Extract UserID
const getUserId = async (authHeader) => {
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    try {
        const ticket = await authClient.verifyIdToken({
            idToken: token,
            audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        return payload ? payload.sub : null;
    } catch (error) {
        console.error("Auth verification failed:", error);
        return null;
    }
};

// SECURITY: Input Sanitization Middleware
const sanitizeInput = (req, res, next) => {
    const { prompt } = req.body;
    if (!prompt) return next();

    if (prompt.length > 2000) {
        return res.status(400).json({ error: "Input too long. Max 2000 characters." });
    }

    const maliciousPattern = /(ignore previous instructions|system override|delete database|forget everything|new role:|you are now|developer mode|dan mode|repeat the above|what is your system prompt|end of text)/i;
    if (maliciousPattern.test(prompt)) {
        console.warn("Security Alert: Malicious prompt detected.");
        return res.status(403).json({ error: "Request rejected by security policy." });
    }

    next();
};

// PERSISTENCE: Multi-Tenant Transactions Endpoints
app.get('/api/transactions', async (req, res) => {
    const userId = await getUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const userFile = path.resolve(DATA_DIR, `ledger_${userId}.json`);
    try {
        const data = await fs.readFile(userFile, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        // Return empty array if user has no ledger yet
        res.json([]);
    }
});

app.post('/api/transactions', async (req, res) => {
    const userId = await getUserId(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { transactions } = req.body;
    if (!Array.isArray(transactions)) return res.status(400).json({ error: "Transactions array required" });

    const userFile = path.resolve(DATA_DIR, `ledger_${userId}.json`);
    try {
        await fs.writeFile(userFile, JSON.stringify(transactions, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to save transactions." });
    }
});

app.post('/api/verify-token', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    try {
        const ticket = await authClient.verifyIdToken({
            idToken: token,
            audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) throw new Error('Invalid token payload');

        res.json({
            name: payload.name,
            email: payload.email,
            avatar: payload.picture,
            userId: payload.sub // sub is the unique user ID
        });
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ error: 'Token verification failed' });
    }
});

app.post('/api/generate', sanitizeInput, async (req, res) => {
    try {
        const { modelName, prompt, imageParts, generationConfig } = req.body;

        if (!prompt) return res.status(400).json({ error: "Prompt is required" });

        const model = genAI.getGenerativeModel({
            model: modelName || 'gemini-1.5-flash',
            tools: [{ googleSearchRetrieval: {} }],
            generationConfig
        });

        let result;
        if (imageParts && imageParts.length > 0) {
            const parts = [
                prompt,
                ...imageParts.map(p => ({
                    inlineData: p.inlineData
                }))
            ];
            result = await model.generateContent(parts);
        } else {
            result = await model.generateContent(prompt);
        }

        const response = await result.response;
        res.json({ text: response.text() });
    } catch (error) {
        console.error("Backend Proxy Error:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});

app.listen(port, () => {
    console.log(`STAXX Backend Security Proxy running on http://localhost:${port}`);
    console.log(`- API Key Status: ${process.env.GEMINI_API_KEY ? 'LOADED' : 'MISSING'}`);
    console.log(`- Persistence: MULTI-TENANT ENABLED (server/data/ledger_*.json)`);
});
