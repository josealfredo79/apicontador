const { rpc } = require('@stellar/stellar-sdk');

async function testGetTx() {
    const server = new rpc.Server('https://soroban-testnet.stellar.org');
    const txHash = 'f4725b6b06e41e74033cdeb620b14796e54085500b583a8c40f97ca733c38186';
    const txResponse = await server.getTransaction(txHash);

    console.log(Object.keys(txResponse));
    console.log(typeof txResponse.resultValue);
    console.log(txResponse.resultMetaXdr ? "Has resultMetaXdr" : "No resultMetaXdr");
    // Also try to find return value getter
    console.log("returnValue:", typeof txResponse.returnValue === 'function' ? 'function' : txResponse.returnValue ? 'exists' : 'no');
    
    // In SDK v12, getTransaction returns GetTransactionResponse which has `returnValue` property.
    if (txResponse.returnValue) {
        console.log("returnValue is present as property");
    }
}

testGetTx();
