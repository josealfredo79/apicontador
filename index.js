require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Keypair, Networks, rpc, TransactionBuilder, BASE_FEE, Operation, Contract } = require('@stellar/stellar-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

const server = new rpc.Server(process.env.RPC_URL || 'https://soroban-testnet.stellar.org');

app.use(cors());
app.use(express.json());

const contractId = process.env.CONTRACT_ID;

async function getAccount(publicKey) {
    try {
        return await server.getAccount(publicKey);
    } catch (error) {
        if (error?.response?.data?.status === 404) {
            throw new Error(`Cuenta no encontrada: ${publicKey}. Asegurate de haber fondeado la cuenta en testnet.`);
        }
        throw error;
    }
}

async function invokeContract(functionName) {
    const publicKey = process.env.PUBLIC_KEY;
    const secretKey = process.env.SECRET_KEY;
    
    const account = await getAccount(publicKey);
    const keypair = Keypair.fromSecret(secretKey);
    
    const contract = new Contract(contractId);
    
    const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
    })
    .addOperation(contract.call(functionName))
    .setTimeout(30)
    .build();

    transaction.sign(keypair);

    try {
        const sendResponse = await server.sendTransaction(transaction);
        
        if (sendResponse.status === 'PENDING') {
            let getResponse = await server.getTransaction(sendResponse.hash);
            
            while (getResponse.status === 'NOT_FOUND') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                getResponse = await server.getTransaction(sendResponse.hash);
            }

            if (getResponse.status === 'SUCCESS') {
                const resultValue = getResponse.resultValue();
                let value = 0;
                if (resultValue) {
                    value = resultValue.u32 !== undefined ? resultValue.u32() : resultValue;
                }
                return {
                    success: true,
                    value: value,
                    txHash: sendResponse.hash
                };
            } else {
                throw new Error(`Transacción fallida`);
            }
        }
    } catch (error) {
        throw new Error(`Error al invocar contrato: ${error.message}`);
    }
}

async function readContract(functionName) {
    const publicKey = process.env.PUBLIC_KEY;
    const account = await getAccount(publicKey);
    const contract = new Contract(contractId);
    
    const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
    })
    .addOperation(contract.call(functionName))
    .setTimeout(30)
    .build();

    try {
        const response = await server.simulateTransaction(transaction);
        
        if (response.results && response.results.length > 0) {
            const result = response.results[0].value;
            const value = result.u32 !== undefined ? result.u32() : result;
            return {
                success: true,
                value: value
            };
        }
        throw new Error('Sin resultados');
    } catch (error) {
        if (error.message.includes('cuenta no encontrada')) {
            throw error;
        }
        throw new Error(`Error al leer contrato: ${error.message}`);
    }
}

app.get('/', (req, res) => {
    res.json({
        nombre: 'API Contador Soroban',
        version: '1.0.0',
        endpoints: [
            { method: 'GET', path: '/contador', description: 'Obtener valor actual' },
            { method: 'POST', path: '/contador/increment', description: 'Incrementar +1' },
            { method: 'POST', path: '/contador/decrement', description: 'Decrementar -1' },
            { method: 'POST', path: '/contador/reset', description: 'Reiniciar a 0' },
            { method: 'GET', path: '/health', description: 'Estado del servidor' }
        ]
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/contador', async (req, res) => {
    try {
        const result = await readContract('get');
        res.json({ valor: result.value, success: true });
    } catch (error) {
        console.error('Error GET /contador:', error.message);
        res.status(500).json({ error: error.message, success: false });
    }
});

app.post('/contador/increment', async (req, res) => {
    try {
        const result = await invokeContract('increment');
        res.json({ 
            valor: result.value, 
            txHash: result.txHash,
            success: true 
        });
    } catch (error) {
        console.error('Error POST /contador/increment:', error.message);
        res.status(500).json({ error: error.message, success: false });
    }
});

app.post('/contador/decrement', async (req, res) => {
    try {
        const result = await invokeContract('decrement');
        res.json({ 
            valor: result.value, 
            txHash: result.txHash,
            success: true 
        });
    } catch (error) {
        console.error('Error POST /contador/decrement:', error.message);
        res.status(500).json({ error: error.message, success: false });
    }
});

app.post('/contador/reset', async (req, res) => {
    try {
        await invokeContract('reset');
        res.json({ success: true, mensaje: 'Contador reiniciado a 0' });
    } catch (error) {
        console.error('Error POST /contador/reset:', error.message);
        res.status(500).json({ error: error.message, success: false });
    }
});

app.use((err, req, res, next) => {
    console.error('Error global:', err.message);
    res.status(500).json({ error: err.message, success: false });
});

if (!contractId) {
    console.warn('⚠️  AVISO: CONTRACT_ID no está configurado en .env');
    console.warn('   Copia .env.example a .env y configura los valores');
}

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║     API Contador Soroban                             ║
╠══════════════════════════════════════════════════════╣
║  Servidor corriendo en http://localhost:${PORT}           ║
║  Contract ID: ${contractId || 'NO CONFIGURADO'}       ║
╚══════════════════════════════════════════════════════╝
    `);
});
