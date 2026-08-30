import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let db;

export async function getDb() {
    if (!db) {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('rifas-gratis');
    }
    return db;
}
