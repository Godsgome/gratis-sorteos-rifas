import { getDb } from './db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const db = await getDb();
        const { codigoA, visitorId, paginaB_id } = req.body;

        if (!codigoA || !visitorId || !paginaB_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const code = await db.collection('codes').findOne({
            codigoA,
            visitorId,
            paginaB_id: parseInt(paginaB_id),
            estado: 'generado'
        });

        if (!code) {
            return res.status(404).json({ error: 'Invalid or used code' });
        }

        await db.collection('codes').updateOne(
            { _id: code._id },
            { $set: { estado: 'utilizado', usedAt: new Date() } }
        );

        const rewardCode = 'R' + Math.floor(1000 + Math.random() * 9000);

        await db.collection('rewards').insertOne({
            codigoA, rewardCode, visitorId,
            paginaB_id: parseInt(paginaB_id),
            createdAt: new Date()
        });

        return res.status(200).json({ success: true, rewardCode });

    } catch (error) {
        console.error('Validate code error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
