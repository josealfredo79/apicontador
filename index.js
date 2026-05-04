/* =============================================================================
 * 📡 API CONTADOR SOROBAN - EXPLICADO PARA ESTUDIANTES
 * =============================================================================
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        📚 QUÉ ES UNA API                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * Una API (Application Programming Interface) es como un "mesero" en un 
 * restaurant. Tu (el cliente) le pides algo al mesero, el mesero va a la 
 * cocina (el servidor), prepara tu comida (procesa la solicitud), y te 
 * la trae (te responde).
 * 
 * En nuestro caso:
 * - Tú = Tu navegador o app
 * - Mesero = Este servidor (Express)
 * - Cocina = Stellar Blockchain (Contrato Inteligente)
 * - Comida = El valor del contador
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    🔍 QUÉ ES UN ENDPOINT                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * Un endpoint es como una DIRECCIÓN específica dentro de la API. Es como 
 * las habitaciones de un hotel:
 * 
 *   /recepcion    → Preguntar por una habitación
 *   /habitacion/101 → Ir a la habitación 101
 *   /restaurante  → Ir a comer
 *   /spa          → Ir al spa
 * 
 * Cada endpoint hace algo diferente:
 * 
 *   GET    /contador           → Leer el valor actual
 *   POST   /contador/increment → Sumar 1 al contador
 *   POST   /contador/decrement → Restar 1 al contador
 *   POST   /contador/reset     → Reiniciar a 0
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                   🏗️ ESTRUCTURA DE UNA API REST                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * Una API REST tiene esta estructura:
 * 
 *   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
 *   │   CLIENTE    │ ───▶ │    SERVIDOR  │ ───▶ │  BLOCKCHAIN  │
 *   │ (Tu navegador)│      │   (Express)  │      │  (Soroban)   │
 *   └──────────────┘      └──────────────┘      └──────────────┘
 *         │                      │                      │
 *         │  1. Request         │                      │
 *         │  (GET /contador)    │                      │
 *         ▼                     │                      │
 *         │                     ▼                      │
 *         │              ┌──────────────┐              │
 *         │              │   RUTAS      │              │
 *         │              │ (Endpoints)  │              │
 *         │              └──────────────┘              │
 *         │                     │                      │
 *         │                     ▼                      │
 *         │              ┌──────────────┐              │
 *         │              │  CONTROLADORES│             │
 *         │              │ (Funciones)  │              │
 *         │              └──────────────┘              │
 *         │                     │                      │
 *         │                     ▼                      │
 *         │              ┌──────────────┐              │
 *         │              │   SERVICIOS  │              │
 *         │              │ (Stellar SDK)│              │
 *         │              └──────────────┘              │
 *         │                     │                      │
 *         │  2. Response        │                      │
 *         │  { valor: 5 }        │                      │
 *         ▼                     │                      │
 *   ┌──────────────┐            │                      ▼
 *   │   PANTALLA   │ ◀──────────┴──────────────────────┘
 *   │  (Resultado) │
 *   └──────────────┘
 * 
 * Partes de una URL de API:
 * 
 *   https://servidor:puerto/endpoint
 *   │          │       │        │
 *   │          │       │        └── La "puerta" específica (qué acción)
 *   │          │       └────────── El puerto (3000)
 *   │          └──────────────── El servidor (localhost)
 *   └─────────────────────────── El protocolo (https)
 * 
 * Métodos HTTP más comunes:
 * 
 *   GET    → LEER datos (como ver el contador)
 *   POST   → CREAR datos (como incrementar)
 *   PUT    → ACTUALIZAR datos (como cambiar todo el valor)
 *   DELETE → BORRAR datos (como eliminar el contador)
 * 
 * ============================================================================= */

require('dotenv').config(); // Carga configuración desde archivo .env

const express = require('express');       // Framework para crear servidores web
const cors = require('cors');             // Permite que otras páginas accedan a nuestra API
const crypto = require('crypto');         // Módulo nativo de Node.js para criptografía
const { Keypair, Networks, rpc, TransactionBuilder, BASE_FEE, Contract, scValToNative } = require('@stellar/stellar-sdk');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');    // Librería WebAuthn para Passkeys

// =============================================================================
// 🎯 INICIALIZACIÓN DEL SERVIDOR
// =============================================================================
const app = express();                    // Crea el servidor
const PORT = process.env.PORT || 3000;   // Puerto donde escuchará el servidor

// =============================================================================
// � SMART WALLET — ALMACENAMIENTO EN MEMORIA (demo académico)
// =============================================================================
// En producción esto viviría en una base de datos (PostgreSQL, MongoDB, etc.)
//
// Estructura de cada usuario:
//   { id, username, walletId, credentials: [{ id, publicKey, counter, transports }] }
//
// walletId simula la dirección del Smart Wallet Contract en Soroban.
// En una DApp real se desplegaría el contrato Stellar passkey-kit.

const walletUsers    = new Map(); // username → usuario registrado
const authChallenges = new Map(); // username → challenge activo (expira en 5 min)
const activeSessions = new Map(); // token   → { username, walletId, exp }

const RP_NAME = 'DApp Contador Soroban';
// RP_ID debe coincidir con el hostname del navegador (sin puerto)
const RP_ID   = process.env.RP_ID || 'localhost';

/* generateToken()
 * Genera un token de sesión aleatorio de 256 bits.
 */
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/* requireAuth(req, res, next)
 * --------------------------
 * Middleware que protege endpoints de escritura.
 * Valida el token Bearer enviado en el header Authorization.
 */
function requireAuth(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: 'No autorizado. Autentícate con tu Passkey.', success: false });
    }
    const session = activeSessions.get(token);
    if (!session || session.exp < Date.now()) {
        activeSessions.delete(token);
        return res.status(401).json({ error: 'Sesión expirada. Vuelve a autenticarte.', success: false });
    }
    req.session = session;
    next();
}

// =============================================================================
// �📡 CONEXIÓN A STELLAR SOROBAN
// =============================================================================
// RPC (Remote Procedure Call) es como una conexión a la blockchain
const server = new rpc.Server(process.env.RPC_URL || 'https://soroban-testnet.stellar.org');

// Claves y datos del contrato (configurados en archivo .env)
const contractId = process.env.CONTRACT_ID;
const publicKey = process.env.PUBLIC_KEY;
const secretKey = process.env.SECRET_KEY;

// =============================================================================
// 🔧 MIDDLEWARES (Configuración intermedia)
// =============================================================================
app.use(cors());              // Permite que cualquier página web puede usar esta API
app.use(express.json());     // Permite leer datos JSON en las peticiones

// Servir archivo estático (index.html)
app.use(express.static(__dirname));

// =============================================================================
// 📥 FUNCIONES AUXILIARES (Herramientas reutilizables)
// =============================================================================

/* getAccount()
 * ----------
 * Obtiene los datos de nuestra cuenta en la blockchain.
 * Es como verificar nuestro saldo en el banco.
 */
async function getAccount() {
    return await server.getAccount(publicKey);
}

/* leerContrato(funcionNombre)
 * -----------------------
 * Lee datos del contrato sin cambiar nada.
 * Es como mirar el valor de un contador sin tocarlo.
 * 
 * Parámetros:
 * - funcionNombre: qué función del contrato ejecutar ('get')
 */
async function leerContrato(funcionNombre) {
    // Paso 1: Obtener nuestra cuenta
    const cuenta = await getAccount();
    
    // Paso 2: Crear el contrato
    const contrato = new Contract(contractId);
    
    // Paso 3: Crear una transacción de lectura
    const transaccion = new TransactionBuilder(cuenta, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
    })
    .addOperation(contrato.call(funcionNombre))  // Llama a la función 'get'
    .setTimeout(30)                              // Timeout de 30 segundos
    .build();

    // Paso 4: Simular la transacción (para ver qué would pass)
    const respuesta = await server.simulateTransaction(transaccion);
    
    // Paso 5: Convertir el resultado a formato entendible
    if (respuesta.result && respuesta.result.retval) {
        const valor = scValToNative(respuesta.result.retval);
        return { success: true, valor };
    }
    throw new Error('No se pudo leer el contrato');
}

/* ejecutarContrato(funcionNombre)
 * ---------------------------
 * Ejecuta una operación que CAMBIA el contrato.
 * Es como presionar el botón +1 o -1 del contador.
 * 
 * Diferencia con leerContrato():
 * - leerContrato() = Solo mira, no cambia nada
 * - ejecutarContrato() = Cambia el valor en la blockchain
 * 
 * Parámetros:
 * - funcionNombre: 'increment', 'decrement', o 'reset'
 */
async function ejecutarContrato(funcionNombre) {
    // Paso 1: Obtener cuenta y claves
    const cuenta = await getAccount();
    const clave = Keypair.fromSecret(secretKey);
    const contrato = new Contract(contractId);
    
    // Paso 2: Crear transacción
    let transaccion = new TransactionBuilder(cuenta, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
    })
    .addOperation(contrato.call(funcionNombre))
    .setTimeout(30)
    .build();

    // IMPORTANTE: Antes de firmar, debemos "preparar" la transacción.
    // Esto simula la ejecución en la red de pruebas para calcular
    // exactamente qué recursos consumirá el contrato.
    transaccion = await server.prepareTransaction(transaccion);

    // Paso 3: Firmar con nuestra clave secreta
    transaccion.sign(clave);

    // Paso 4: Enviar a la blockchain
    const respuestaEnvio = await server.sendTransaction(transaccion);
    
    // Paso 5: Esperar a que se confirme (como esperar que se procese el pago)
    if (respuestaEnvio.status === 'PENDING') {
        let respuestaTx = await server.getTransaction(respuestaEnvio.hash);
        
        // Espera hasta que la transacción esté completa
        while (respuestaTx.status === 'NOT_FOUND') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            respuestaTx = await server.getTransaction(respuestaEnvio.hash);
        }

        if (respuestaTx.status === 'SUCCESS') {
            const resultado = respuestaTx.returnValue;
            const valor = resultado ? scValToNative(resultado) : null;
            return { success: true, valor, txHash: respuestaEnvio.hash };
        }
        throw new Error('Transacción fallida');
    }
    throw new Error('Error al enviar transacción');
}

// =============================================================================
// 🌐 ENDPOINTS (Rutas de la API - lo que el usuario puede pedir)
// =============================================================================

/* app.get('/', ...)
 * --------------
 * Sirve el archivo index.html (tutorial)
 */
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

/* app.get('/health', ...)
 * --------------------
 * Health: Verifica que el servidor esté vivo
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        mensaje: 'El servidor está funcionando correctamente',
        timestamp: new Date().toISOString() 
    });
});

/* app.get('/contador', ...)
 * ---------------------
 * GET /contador: Lee el valor actual del contador
 * 
 * Ejemplo de uso:
 * - Abre en tu navegador: http://localhost:3000/contador
 * - O en terminal: curl http://localhost:3000/contador
 */
app.get('/contador', async (req, res) => {
    try {
        console.log('📥 Solicitando valor del contador...');
        const resultado = await leerContrato('get');
        console.log('✅ Resultado:', resultado);
        res.json({ 
            valor: resultado.valor, 
            success: true,
            mensaje: 'Este es el valor actual del contador en la blockchain'
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message, success: false });
    }
});

/* app.post('/contador/increment', ...)
 * ---------------------------------
 * POST /contador/increment: Suma 1 al contador
 * 
 * Ejemplo de uso:
 * - Terminal: curl -X POST http://localhost:3000/count/increment
 */
app.post('/contador/increment', requireAuth, async (req, res) => {
    try {
        console.log(`➕ Incrementando contador... (wallet: ${req.session.walletId})`);
        const resultado = await ejecutarContrato('increment');
        res.json({ 
            valor: resultado.valor, 
            txHash: resultado.txHash, 
            success: true,
            mensaje: 'Contador incrementado (+1)',
            wallet: req.session.walletId,
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message, success: false });
    }
});

/* app.post('/contador/decrement', ...)
 * ---------------------------------
 * POST /contador/decrement: Resta 1 al contador
 */
app.post('/contador/decrement', requireAuth, async (req, res) => {
    try {
        console.log(`➖ Decrementando contador... (wallet: ${req.session.walletId})`);
        const resultado = await ejecutarContrato('decrement');
        res.json({ 
            valor: resultado.valor, 
            txHash: resultado.txHash, 
            success: true,
            mensaje: 'Contador decrementado (-1)',
            wallet: req.session.walletId,
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message, success: false });
    }
});

/* app.post('/contador/reset', ...)
 * ------------------------------
 * POST /contador/reset: Reinicia el contador a 0
 */
app.post('/contador/reset', requireAuth, async (req, res) => {
    try {
        console.log(`🔄 Reiniciando contador a 0... (wallet: ${req.session.walletId})`);
        await ejecutarContrato('reset');
        res.json({ 
            success: true, 
            mensaje: 'Contador reiniciado a 0',
            wallet: req.session.walletId,
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message, success: false });
    }
});

// =============================================================================
// � ENDPOINTS DE AUTENTICACIÓN — SMART WALLET CON PASSKEYS (WebAuthn)
// =============================================================================

/* POST /auth/register/begin
 * -------------------------
 * Paso 1 del registro: genera un challenge y opciones para crear la Passkey.
 * El navegador usará esto para pedirle al usuario que use biometría.
 */
app.post('/auth/register/begin', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username?.trim()) {
            return res.status(400).json({ error: 'El campo "username" es requerido' });
        }

        // Crear usuario si no existe, asignándole un walletId único (simula la
        // dirección del Smart Wallet Contract en Soroban)
        if (!walletUsers.has(username)) {
            walletUsers.set(username, {
                id: username,
                username,
                credentials: [],
                walletId: 'GW' + crypto.randomBytes(10).toString('hex').toUpperCase(),
            });
        }
        const user = walletUsers.get(username);

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID:   RP_ID,
            userID: Buffer.from(username),
            userName: username,
            attestationType: 'none',
            excludeCredentials: user.credentials.map(c => ({
                id:         Buffer.from(c.id, 'base64url'),
                type:       'public-key',
                transports: c.transports,
            })),
            authenticatorSelection: {
                residentKey:          'preferred',
                userVerification:     'preferred',
                requireResidentKey:   false,
            },
        });

        // Guardamos el challenge temporalmente (5 minutos)
        authChallenges.set(username, options.challenge);
        setTimeout(() => authChallenges.delete(username), 5 * 60 * 1000);

        res.json(options);
    } catch (err) {
        console.error('❌ register/begin error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/* POST /auth/register/complete
 * ----------------------------
 * Paso 2 del registro: verifica la respuesta biométrica del dispositivo
 * y guarda la credencial pública en el Smart Wallet del usuario.
 */
app.post('/auth/register/complete', async (req, res) => {
    try {
        const { username, attestation } = req.body;
        if (!username || !attestation) {
            return res.status(400).json({ error: 'Faltan campos: username, attestation' });
        }

        const expectedChallenge = authChallenges.get(username);
        if (!expectedChallenge) {
            return res.status(400).json({ error: 'Challenge expirado o no encontrado. Vuelve a intentarlo.' });
        }

        const origin = req.headers.origin || `http://localhost:${PORT}`;
        const verification = await verifyRegistrationResponse({
            response:           attestation,
            expectedChallenge,
            expectedOrigin:     origin,
            expectedRPID:       RP_ID,
        });

        if (!verification.verified) {
            return res.status(400).json({ error: 'Verificación de Passkey fallida' });
        }

        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
        const user = walletUsers.get(username);

        user.credentials.push({
            id:        Buffer.from(credentialID).toString('base64url'),
            publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
            counter,
            transports: attestation.response?.transports || [],
        });

        authChallenges.delete(username);

        // Crear sesión de 24 horas
        const token = generateToken();
        activeSessions.set(token, {
            username,
            walletId: user.walletId,
            exp: Date.now() + 24 * 60 * 60 * 1000,
        });

        console.log(`✅ Smart Wallet registrado: ${username} → ${user.walletId}`);
        res.json({ verified: true, token, walletId: user.walletId, username });
    } catch (err) {
        console.error('❌ register/complete error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/* POST /auth/login/begin
 * ----------------------
 * Paso 1 del login: genera un challenge para que el dispositivo
 * demuestre que controla la clave privada de la Passkey.
 */
app.post('/auth/login/begin', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username?.trim()) {
            return res.status(400).json({ error: 'El campo "username" es requerido' });
        }

        const user = walletUsers.get(username);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado. Regístrate primero.' });
        }
        if (user.credentials.length === 0) {
            return res.status(400).json({ error: 'Sin Passkeys registradas para este usuario.' });
        }

        const options = await generateAuthenticationOptions({
            rpID:             RP_ID,
            userVerification: 'preferred',
            allowCredentials: user.credentials.map(c => ({
                id:         Buffer.from(c.id, 'base64url'),
                type:       'public-key',
                transports: c.transports,
            })),
        });

        authChallenges.set(username, options.challenge);
        setTimeout(() => authChallenges.delete(username), 5 * 60 * 1000);

        res.json(options);
    } catch (err) {
        console.error('❌ login/begin error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/* POST /auth/login/complete
 * -------------------------
 * Paso 2 del login: verifica la firma biométrica y emite un token de sesión.
 * El token permite al usuario firmar transacciones en Soroban.
 */
app.post('/auth/login/complete', async (req, res) => {
    try {
        const { username, assertion } = req.body;
        if (!username || !assertion) {
            return res.status(400).json({ error: 'Faltan campos: username, assertion' });
        }

        const user = walletUsers.get(username);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const expectedChallenge = authChallenges.get(username);
        if (!expectedChallenge) {
            return res.status(400).json({ error: 'Challenge expirado. Intenta de nuevo.' });
        }

        // Buscar la credencial que firmó la respuesta
        const credential = user.credentials.find(c => c.id === assertion.id);
        if (!credential) {
            return res.status(400).json({ error: 'Credencial no reconocida en este Smart Wallet.' });
        }

        const origin = req.headers.origin || `http://localhost:${PORT}`;
        const verification = await verifyAuthenticationResponse({
            response:           assertion,
            expectedChallenge,
            expectedOrigin:     origin,
            expectedRPID:       RP_ID,
            authenticator: {
                credentialID:        Buffer.from(credential.id, 'base64url'),
                credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
                counter:             credential.counter,
                transports:          credential.transports,
            },
        });

        if (!verification.verified) {
            return res.status(400).json({ error: 'Autenticación biométrica fallida.' });
        }

        // Actualizar counter anti-replay
        credential.counter = verification.authenticationInfo.newCounter;
        authChallenges.delete(username);

        const token = generateToken();
        activeSessions.set(token, {
            username,
            walletId: user.walletId,
            exp: Date.now() + 24 * 60 * 60 * 1000,
        });

        console.log(`🔓 Login Passkey: ${username} → ${user.walletId}`);
        res.json({ verified: true, token, walletId: user.walletId, username });
    } catch (err) {
        console.error('❌ login/complete error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/* GET /auth/status
 * ----------------
 * Verifica si el token de sesión actual sigue siendo válido.
 */
app.get('/auth/status', (req, res) => {
    const header = req.headers['authorization'] || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.json({ authenticated: false });

    const session = activeSessions.get(token);
    if (!session || session.exp < Date.now()) {
        activeSessions.delete(token);
        return res.json({ authenticated: false });
    }
    res.json({ authenticated: true, username: session.username, walletId: session.walletId });
});

/* POST /auth/logout
 * -----------------
 * Cierra la sesión invalidando el token.
 */
app.post('/auth/logout', (req, res) => {
    const header = req.headers['authorization'] || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) activeSessions.delete(token);
    res.json({ success: true, mensaje: 'Sesión cerrada correctamente.' });
});

/* GET /auth/users (solo para demo académico — eliminar en producción)
 * ------------------------------------------------------------------
 * Lista los usuarios registrados y sus walletIds.
 */
app.get('/auth/users', (req, res) => {
    const users = Array.from(walletUsers.values()).map(u => ({
        username:         u.username,
        walletId:         u.walletId,
        totalCredenciales: u.credentials.length,
    }));
    res.json({ users, total: users.length });
});

// =============================================================================
// 🚀 INICIAR EL SERVIDOR
// =============================================================================

// Verifica que esté configurado el CONTRACT_ID
if (!contractId) {
    console.warn('⚠️  CONTRACT_ID no configurado en .env');
}

// Inicia el servidor (0.0.0.0 requerido en Railway/Docker)
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🎉 API Contador Soroban + Smart Wallet iniciada');
    console.log('📡 Servidor en: http://localhost:' + PORT);
    console.log('📋 Documentación: http://localhost:' + PORT + '/');
    console.log('🔐 DApp + Passkeys: http://localhost:' + PORT + '/dapp.html');
    console.log('='.repeat(50));
});
