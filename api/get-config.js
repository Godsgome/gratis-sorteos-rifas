import { getDb } from './db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const db = await getDb();
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'name required' });
        }

        const config = await db.collection('config').findOne({ name });

        return res.status(200).json({ value: config ? config.value : null });

    } catch (error) {
        return res.status(500).json({ error: 'Error interno' });
    }
}
