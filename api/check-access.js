// api/check-access.js - Check if user has access to a page
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
        const { visitorId, paginaB_id } = req.body;

        if (!visitorId || !paginaB_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user has a code for this page
        const code = await db.collection('codes').findOne({
            visitorId,
            paginaB_id: parseInt(paginaB_id),
            estado: 'generado'
        });

        return res.status(200).json({
            hasAccess: !!code
        });

    } catch (error) {
        console.error('Check access error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
