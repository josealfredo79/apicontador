const { Keypair, Networks, rpc, TransactionBuilder, BASE_FEE, Contract } = require('@stellar/stellar-sdk');
require('dotenv').config();

async function testSubmit() {
    const server = new rpc.Server('https://soroban-testnet.stellar.org');
    const publicKey = process.env.PUBLIC_KEY;
    const secretKey = process.env.SECRET_KEY;
    const contractId = process.env.CONTRACT_ID;

    const cuenta = await server.getAccount(publicKey);
    const clave = Keypair.fromSecret(secretKey);
    const contrato = new Contract(contractId);

    try {
        let transaccion = new TransactionBuilder(cuenta, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(contrato.call('increment'))
            .setTimeout(30)
            .build();

        console.log("Simulando...");
        transaccion = await server.prepareTransaction(transaccion);

        console.log("Firmando...");
        transaccion.sign(clave);

        console.log("Enviando...");
        const respuestaEnvio = await server.sendTransaction(transaccion);
        console.log("Respuesta envio:", JSON.stringify(respuestaEnvio, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error(e.response.data);
    }
}

testSubmit();
