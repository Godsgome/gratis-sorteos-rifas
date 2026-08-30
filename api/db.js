// api/db.js - Shared MongoDB connection
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const db = client.db('rifas-gratis');

export default db;
