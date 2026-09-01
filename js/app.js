// js/app.js
const API_URL = 'https://gratis-sorteos-rifas.vercel.app';
const WALLET_ADDRESS = '0xA985Fac65c391b7685BB25D0aEF80EE228d8aD1D';
const QR_API = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(WALLET_ADDRESS)}`;

const DONATION_PHRASES = [
    'Pequeñas donaciones generan grandes cambios. Tu apoyo nos mantiene en pie.',
    'Gracias a donantes como tú, este proyecto sigue vivo y mejorando cada día.',
    'No importa el monto, cada contribución hace la diferencia.',
    'Este proyecto es gratuito y funciona gracias a tu generosidad.',
    'Entre todos construimos algo mejor. ¡Tu donación cuenta!',
    'La comunidad nos hace fuertes. Tu apoyo es el motor de este proyecto.',
    'Cada moneda que donas se convierte en mejoras para todos.',
    'Mantener esto funcionando tiene costos. ¡Ayúdanos a seguir adelante!',
    'Tu generosidad permite que otros también disfruten de este proyecto.',
    'Un proyecto sostenido por la comunidad, para la comunidad.',
    'Si este proyecto te sirvió, considera devolver un poco de lo que recibiste.',
    'El cambio empieza contigo. Una donación pequeña puede hacer una gran diferencia.',
    'Gracias por tomarte el tiempo de leer esto. Tu apoyo lo es todo.',
    'Invertimos tiempo y esfuerzo para que tú solo tengas que disfrutar.',
    'Cada día trabajamos para mejorar. Tu donación nos ayuda a llegar más lejos.'
];

let visitorId = null;
let isPointA = false;
let isPointB = false;

if (window.location.pathname.endsWith('b.html') || window.location.hash.includes('pag=')) {
    isPointB = true;
} else {
    isPointA = true;
}

async function initFingerprint() {
    try {
        const fp = await FingerprintJS.load({ monitoring: false });
        const result = await fp.get();
        visitorId = result.visitorId;
        return true;
    } catch (err) {
        return false;
    }
}

async function apiCall(endpoint, data) {
    const response = await fetch(`${API_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

async function getConfig(name) {
    try {
        const response = await fetch(`${API_URL}/api/get-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        return data.value || null;
    } catch (err) {
        return null;
    }
}

function showMsg(text, type = 'info') {
    const msgEl = document.getElementById('msg');
    if (msgEl) {
        msgEl.textContent = text;
        msgEl.className = type;
        msgEl.classList.remove('hidden');
    }
}

function hideMsg() {
    const msgEl = document.getElementById('msg');
    if (msgEl) msgEl.classList.add('hidden');
}

// ===== PUNTO A =====
async function initPuntoA() {
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const codeEl = document.getElementById('code');
    const copyBtn = document.getElementById('copyBtn');
    const linkB = document.getElementById('linkB');
    const fpStatus = document.getElementById('fingerprint-status');
    const qrImg = document.getElementById('donation-qr');
    const walletEl = document.getElementById('wallet-address');
    const copyWalletBtn = document.getElementById('copyWalletBtn');
    const phraseEl = document.getElementById('donation-phrase');

    // Random phrase
    phraseEl.textContent = DONATION_PHRASES[Math.floor(Math.random() * DONATION_PHRASES.length)];

    // QR + Wallet
    qrImg.src = QR_API;
    walletEl.textContent = WALLET_ADDRESS;

    copyWalletBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(WALLET_ADDRESS)
            .then(() => showMsg('Dirección copiada.', 'success'))
            .catch(() => showMsg('Error al copiar.', 'error'));
    });

    // Fingerprint
    const fpOk = await initFingerprint();
    if (!fpOk) {
        fpStatus.innerHTML = 'Error al identificar navegador';
        return;
    }
    fpStatus.innerHTML = 'Identificado: ' + visitorId.substring(0, 16) + '...';
    generateBtn.disabled = false;

    // Generate code
    generateBtn.addEventListener('click', async () => {
        hideMsg();
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generando...';

        try {
            const data = await apiCall('generate-code', { visitorId });

            if (data.error) {
                showMsg(data.error, 'error');
            } else {
                codeEl.textContent = data.codeA;
                linkB.href = data.linkAcortado;
                resultDiv.classList.remove('hidden');
                showMsg('Código generado!', 'success');
            }
        } catch (err) {
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

// ===== PUNTO B =====
async function initPuntoB() {
    const loading = document.getElementById('loading');
    const accessDenied = document.getElementById('access-denied');
    const validationForm = document.getElementById('validation-form');
    const reward = document.getElementById('reward');
    const rewardCode = document.getElementById('rewardCode');
    const codeForm = document.getElementById('codeForm');
    const codeInput = document.getElementById('codeInput');
    const copyRewardBtn = document.getElementById('copyRewardBtn');
    const tiktokBtn = document.getElementById('tiktokBtn');

    const hash = window.location.hash;
    const match = hash.match(/pag=(\d+)/);

    if (!match) {
        loading.classList.add('hidden');
        accessDenied.classList.remove('hidden');
        showMsg('URL inválida.', 'error');
        return;
    }

    const paginaB_id = match[1];

    // Load TikTok URL
    const tiktokUrl = await getConfig('tiktok_url');
    if (tiktokUrl) {
        tiktokBtn.href = tiktokUrl;
    } else {
        tiktokBtn.href = '#';
        tiktokBtn.style.opacity = '0.5';
        tiktokBtn.style.pointerEvents = 'none';
    }

    // Fingerprint
    const fpOk = await initFingerprint();
    if (!fpOk) {
        loading.innerHTML = 'Error al identificar navegador';
        return;
    }

    try {
        const data = await apiCall('check-access', { visitorId, paginaB_id });

        loading.classList.add('hidden');

        if (!data.hasAccess) {
            accessDenied.classList.remove('hidden');
            return;
        }

        validationForm.classList.remove('hidden');

        codeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideMsg();
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
                showMsg('Error al validar.', 'error');
            }
        });

        copyRewardBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(rewardCode.textContent)
                .then(() => showMsg('Código copiado.', 'success'))
                .catch(() => showMsg('Error al copiar.', 'error'));
        });

    } catch (err) {
        loading.innerHTML = 'Error de conexión';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (isPointA) {
        initPuntoA();
    } else if (isPointB) {
        initPuntoB();
    }
});
