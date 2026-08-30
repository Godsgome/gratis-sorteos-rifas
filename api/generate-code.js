// api/generate-code.js - Generate a new code
import db from './db.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { visitorId } = req.body;

        if (!visitorId) {
            return res.status(400).json({ error: 'visitorId required' });
        }

        // Check if user already has a code
        const existing = await db.collection('codes').findOne({
            visitorId,
            estado: 'generado'
        });

        if (existing) {
            return res.status(200).json({
                codeA: existing.codigoA,
                paginaB_id: existing.paginaB_id,
                linkAcortado: existing.linkAcortado
            });
        }

        // Get available shortener
        const shorteners = await db.collection('shorteners')
            .find({ type: 'dou-acor' })
            .toArray();

        if (shorteners.length === 0) {
            return res.status(500).json({ error: 'No shorteners available' });
        }

        // Pick random shortener
        const shortener = shorteners[Math.floor(Math.random() * shorteners.length)];

        // Generate 3-digit code
        const codigoA = String(Math.floor(100 + Math.random() * 900));

        // Save to database
        await db.collection('codes').insertOne({
            codigoA,
            visitorId,
            paginaB_id: shortener.paginaB_id,
            estado: 'generado',
            linkAcortado: shortener.linkAcortado,
            createdAt: new Date()
        });

        return res.status(200).json({
            codeA,
            paginaB_id: shortener.paginaB_id,
            linkAcortado: shortener.linkAcortado
        });

    } catch (error) {
        console.error('Generate code error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
