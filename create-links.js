#!/usr/bin/env node
// create-links.js - Create 50 double-shortened links with random page IDs
// Run locally: node create-links.js
// Needs .env file with CUTY_KEY, EXE_KEY, MONGODB_URI

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

function loadEnv() {
    try {
        const content = readFileSync('.env', 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...rest] = line.split('=');
            if (key && rest.length) {
                process.env[key.trim()] = rest.join('=').trim();
            }
        });
    } catch (e) {
        console.error('ERROR: Create .env with CUTY_KEY, EXE_KEY, MONGODB_URI');
        process.exit(1);
    }
}

loadEnv();

const CUTY_KEY = process.env.CUTY_KEY;
const EXE_KEY = process.env.EXE_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const GITHUB_PAGES_URL = process.env.GITHUB_PAGES_URL || 'https://godsgome.github.io/gratis-sorteos-rifas/b.html';

if (!CUTY_KEY || !EXE_KEY || !MONGODB_URI) {
    console.error('ERROR: Missing CUTY_KEY, EXE_KEY, or MONGODB_URI in .env');
    process.exit(1);
}

function generateRandomPageIds(count, min, max) {
    const ids = new Set();
    while (ids.size < count) {
        ids.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return [...ids];
}

async function shortenWithCuty(url) {
    const response = await fetch(`https://cuty.io/api?api=${CUTY_KEY}&url=${encodeURIComponent(url)}&format=json`);
    const data = await response.json();
    return data.shortenedUrl || null;
}

async function shortenWithExe(url) {
    const response = await fetch(`https://exe.io/api?api=${EXE_KEY}&url=${encodeURIComponent(url)}&format=json`);
    const data = await response.json();
    return data.shortenedUrl || null;
}

async function doubleShorten(page) {
    const url = `${GITHUB_PAGES_URL}#pag=${page}`;
    console.log(`  URL: ${url}`);
    
    const cutyUrl = await shortenWithCuty(url);
    if (!cutyUrl) {
        console.log(`  ERROR cuty.io`);
        return null;
    }
    console.log(`  cuty: ${cutyUrl}`);
    
    await new Promise(r => setTimeout(r, 2000));
    
    const exeUrl = await shortenWithExe(cutyUrl);
    if (!exeUrl) {
        console.log(`  ERROR exe.io`);
        return null;
    }
    console.log(`  exe:  ${exeUrl}`);
    
    return exeUrl;
}

async function main() {
    const TOTAL = 50;
    console.log(`=== Creando ${TOTAL} links dobles (cuty→exe) con IDs random ===\n`);
    
    const pageIds = generateRandomPageIds(TOTAL, 1, 9999);
    console.log('IDs generados:', pageIds.join(', '));
    console.log('');
    
    const results = [];
    
    for (let i = 0; i < TOTAL; i++) {
        const page = pageIds[i];
        console.log(`[${i + 1}/${TOTAL}] Página ${page}:`);
        const finalUrl = await doubleShorten(page);
        
        results.push({
            paginaB_id: page,
            linkAcortado: finalUrl,
            type: 'dou-acor',
            account: 'cuenta1',
            createdAt: new Date()
        });
        
        console.log('');
        await new Promise(r => setTimeout(r, 3000));
    }
    
    console.log('=== Guardando en MongoDB Atlas ===\n');
    
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db('rifas-gratis');
        
        await db.collection('shorteners').deleteMany({ type: 'dou-acor' });
        
        const valid = results.filter(r => r.linkAcortado);
        if (valid.length > 0) {
            await db.collection('shorteners').insertMany(valid);
            console.log(`OK ${valid.length} shorteners guardados en Atlas`);
        } else {
            console.log('WARNING: Ningún shortener válido');
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.close();
    }
    
    console.log('\n=== Resultado ===');
    results.forEach((r, i) => {
        console.log(`  [${i+1}] pag=${r.paginaB_id} -> ${r.linkAcortado || 'FAILED'}`);
    });
    
    const ok = results.filter(r => r.linkAcortado).length;
    console.log(`\nTotal: ${ok}/${TOTAL} exitosos`);
}

main();
