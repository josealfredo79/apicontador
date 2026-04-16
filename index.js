/* =============================================================================
 * 📡 API CONTADOR SOROBAN - EXPLICADO PARA ESTUDIANTES
 * =============================================================================
 * 
 * ¿Qué es una API?
 * ---------------
 * Una API (Application Programming Interface) es como un "mesero" en un restaurant.
 * Tu (el cliente) le pides algo al mesero, el mesero va a la cocina (el servidor),
 * prepara tu comida (procesa la solicitud), y te la trae (te responde).
 * 
 * En nuestro caso:
 * - Tú = Tu navegador o app
 * - Mesero = Este servidor (Express)
 * - Cocina = Stellar Blockchain (Contrato Inteligente)
 * - Comida = El valor del contador
 * 
 * ¿Cómo funciona este código?
 * --------------------------
 * 1. El usuario hace una petición (request) desde su navegador
 * 2. Express recibe la petición y la "entiende"
 * 3. Express usa el SDK de Stellar para hablar con la blockchain
 * 4. El contrato inteligente procesa la operación
 * 5. Express te devuelve el resultado (response)
 * 
 * Conceptos clave:
 * - GET  = Pedir información (leer)
 * - POST = Enviar información (escribir/cambiar)
 * - JSON = Formato para enviar datos (como un objeto de JavaScript)
 * ============================================================================= */

require('dotenv').config(); // Carga configuración desde archivo .env

const express = require('express');       // Framework para crear servidores web
const cors = require('cors');             // Permite que otras páginas accedan a nuestra API
const { Keypair, Networks, rpc, TransactionBuilder, BASE_FEE, Contract, scValToNative } = require('@stellar/stellar-sdk');

// =============================================================================
// 🎯 INICIALIZACIÓN DEL SERVIDOR
// =============================================================================
const app = express();                    // Crea el servidor
const PORT = process.env.PORT || 3000;   // Puerto donde escuchará el servidor

// =============================================================================
// 📡 CONEXIÓN A STELLAR SOROBAN
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
    const transaccion = new TransactionBuilder(cuenta, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
    })
    .addOperation(contrato.call(funcionNombre))
    .setTimeout(30)
    .build();

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
            const resultado = respuestaTx.resultValue();
            const valor = scValToNative(resultado);
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
 * Raíz: Muestra información sobre la API
 */
app.get('/', (req, res) => {
    res.json({
        nombre: 'API Contador Soroban',
        version: '1.0.0',
        descripcion: 'API educativa para aprender sobre blockchain y smart contracts',
        contrato: contractId,
        como_usar: {
            obtener_valor: 'GET http://localhost:3000/contador',
            incrementar: 'POST http://localhost:3000/contador/increment',
            decrementar: 'POST http://localhost:3000/contador/decrement',
            reiniciar: 'POST http://localhost:3000/contador/reset'
        }
    });
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
app.post('/contador/increment', async (req, res) => {
    try {
        console.log('➕ Incrementando contador...');
        const resultado = await ejecutarContrato('increment');
        res.json({ 
            valor: resultado.valor, 
            txHash: resultado.txHash, 
            success: true,
            mensaje: 'Contador incrementado (+1)'
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
app.post('/contador/decrement', async (req, res) => {
    try {
        console.log('➖ Decrementando contador...');
        const resultado = await ejecutarContrato('decrement');
        res.json({ 
            valor: resultado.valor, 
            txHash: resultado.txHash, 
            success: true,
            mensaje: 'Contador decrementado (-1)'
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
app.post('/contador/reset', async (req, res) => {
    try {
        console.log('🔄 Reiniciando contador a 0...');
        await ejecutarContrato('reset');
        res.json({ 
            success: true, 
            mensaje: 'Contador reiniciado a 0' 
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message, success: false });
    }
});

// =============================================================================
// 🚀 INICIAR EL SERVIDOR
// =============================================================================

// Verifica que esté configurado el CONTRACT_ID
if (!contractId) {
    console.warn('⚠️  CONTRACT_ID no configurado en .env');
}

// Inicia el servidor
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🎉 API Contador Soroban iniciada');
    console.log('📡 Servidor en: http://localhost:' + PORT);
    console.log('📋 Documentación: http://localhost:' + PORT + '/');
    console.log('='.repeat(50));
});
