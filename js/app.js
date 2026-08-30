// js/app.js - Main application logic
// Works for both Punto A (index.html) and Punto B (b.html)

// IMPORTANT: This is your Vercel deployment URL
// Change this after you deploy to Vercel
const API_URL = 'https://rifas-vercel.vercel.app';

// State
let visitorId = null;
let isPointA = false;
let isPointB = false;

// Detect which page we're on
if (window.location.pathname.endsWith('b.html') || window.location.hash.includes('pag=')) {
    isPointB = true;
} else {
    isPointA = true;
}

// Initialize FingerprintJS
async function initFingerprint() {
    try {
        const fp = await FingerprintJS.load({ monitoring: false });
        const result = await fp.get();
        visitorId = result.visitorId;
        console.log('Fingerprint:', visitorId);
        return true;
    } catch (err) {
        console.error('Fingerprint error:', err);
        return false;
    }
}

// API helper
async function apiCall(endpoint, data) {
    const response = await fetch(`${API_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

// Show message
function showMsg(text, type = 'info') {
    const msgEl = document.getElementById('msg');
    if (msgEl) {
        msgEl.textContent = text;
        msgEl.className = type;
        msgEl.classList.remove('hidden');
    }
}

// ===== PUNTO A LOGIC =====
async function initPuntoA() {
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const codeEl = document.getElementById('code');
    const copyBtn = document.getElementById('copyBtn');
    const linkB = document.getElementById('linkB');
    const fpStatus = document.getElementById('fingerprint-status');

    // Init fingerprint
    const fpOk = await initFingerprint();
    if (!fpOk) {
        fpStatus.innerHTML = 'Error al identificar navegador';
        return;
    }

    fpStatus.innerHTML = 'Identificado: ' + visitorId.substring(0, 16) + '...';
    generateBtn.disabled = false;

    // Generate code
    generateBtn.addEventListener('click', async () => {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generando...';

        try {
            const data = await apiCall('generate-code', { visitorId });

            if (data.error) {
                showMsg(data.error, 'error');
            } else {
                codeEl.textContent = data.codeA;
                linkB.href = `b.html#pag=${data.paginaB_id}`;
                resultDiv.classList.remove('hidden');
                showMsg('Código generado!', 'success');
            }
        } catch (err) {
            console.error('Generate error:', err);
            showMsg('Error al generar código.', 'error');
        }

        generateBtn.textContent = 'Generar Código';
        generateBtn.disabled = false;
    });

    // Copy code
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(codeEl.textContent)
            .then(() => showMsg('Código copiado.', 'success'))
            .catch(() => showMsg('Error al copiar.', 'error'));
    });
}

// ===== PUNTO B LOGIC =====
async function initPuntoB() {
    const loading = document.getElementById('loading');
    const accessDenied = document.getElementById('access-denied');
    const validationForm = document.getElementById('validation-form');
    const reward = document.getElementById('reward');
    const rewardCode = document.getElementById('rewardCode');
    const codeForm = document.getElementById('codeForm');
    const codeInput = document.getElementById('codeInput');
    const copyRewardBtn = document.getElementById('copyRewardBtn');
    const linkA = document.getElementById('linkA');

    // Get page from hash
    const hash = window.location.hash;
    const match = hash.match(/pag=(\d+)/);
    
    if (!match) {
        loading.classList.add('hidden');
        accessDenied.classList.remove('hidden');
        showMsg('URL inválida. Falta el número de página.', 'error');
        return;
    }

    const paginaB_id = match[1];
    linkA.href = 'index.html';

    // Init fingerprint
    const fpOk = await initFingerprint();
    if (!fpOk) {
        loading.innerHTML = 'Error al identificar navegador';
        return;
    }

    // Check access
    try {
        const data = await apiCall('check-access', { visitorId, paginaB_id });

        loading.classList.add('hidden');

        if (!data.hasAccess) {
            accessDenied.classList.remove('hidden');
            return;
        }

        // User has access - show validation form
        validationForm.classList.remove('hidden');

        // Handle code validation
        codeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = codeInput.value.trim();

            if (code.length !== 3) {
                showMsg('El código debe tener 3 dígitos.', 'error');
                return;
            }

            try {
                const result = await apiCall('validate-code', {
                    codigoA: code,
                    visitorId,
                    paginaB_id
                });

                if (result.error) {
                    showMsg(result.error, 'error');
                } else {
                    validationForm.classList.add('hidden');
                    reward.classList.remove('hidden');
                    rewardCode.textContent = result.rewardCode;
                    showMsg('Código validado!', 'success');
                }
            } catch (err) {
                console.error('Validate error:', err);
                showMsg('Error al validar.', 'error');
            }
        });

        // Copy reward
        copyRewardBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(rewardCode.textContent)
                .then(() => showMsg('Código copiado.', 'success'))
                .catch(() => showMsg('Error al copiar.', 'error'));
        });

    } catch (err) {
        console.error('Check access error:', err);
        loading.innerHTML = 'Error de conexión';
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    if (isPointA) {
        initPuntoA();
    } else if (isPointB) {
        initPuntoB();
    }
});
