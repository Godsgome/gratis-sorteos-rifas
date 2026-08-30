import { getDb } from './db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const db = await getDb();
        const { visitorId } = req.body;

        if (!visitorId) {
            return res.status(400).json({ error: 'visitorId required' });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Expire old codes from previous days
        await db.collection('codes').updateMany(
            { visitorId, estado: 'generado', createdAt: { $lt: todayStart } },
            { $set: { estado: 'expirado' } }
        );

        // Check if user already has a code from today (1 code per day)
        const existing = await db.collection('codes').findOne({
            visitorId,
            estado: 'generado',
            createdAt: { $gte: todayStart }
        });

        if (existing) {
            return res.status(200).json({
                codeA: existing.codigoA,
                paginaB_id: existing.paginaB_id,
                linkAcortado: existing.linkAcortado
            });
        }

        // Check if user already used a code today
        const usedToday = await db.collection('codes').findOne({
            visitorId,
            estado: 'utilizado',
            usedAt: { $gte: todayStart }
        });

        if (usedToday) {
            return res.status(429).json({ error: 'Ya generaste tu código hoy. Vuelve mañana.' });
        }

        // Get available shorteners
        const shorteners = await db.collection('shorteners').find({ type: 'dou-acor' }).toArray();
        if (shorteners.length === 0) {
            return res.status(500).json({ error: 'No hay acortadores disponibles' });
        }

        // Pick random shortener
        const shortener = shorteners[Math.floor(Math.random() * shorteners.length)];
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
            codeA: codigoA,
            paginaB_id: shortener.paginaB_id,
            linkAcortado: shortener.linkAcortado
        });

    } catch (error) {
        return res.status(500).json({ error: 'Error interno' });
    }
}
