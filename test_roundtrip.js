const PocketBase = require('pocketbase/cjs');
const client = new PocketBase('http://127.0.0.1:8090');

async function test() {
    console.log("=== Round-trip Test ===");

    // 1. Create with appData
    const r = await client.collection('lots').create({
        appData: { model: 'TEST-MODEL', orderNo: 'TEST-ORDER' }
    });
    console.log("CREATED:", JSON.stringify(r, null, 2));

    // 2. Read back
    const r2 = await client.collection('lots').getOne(r.id);
    console.log("READ BACK:", JSON.stringify(r2, null, 2));

    // 3. Check if appData is present
    if (r2.appData && r2.appData.model === 'TEST-MODEL') {
        console.log("SUCCESS: appData round-trip works!");
    } else {
        console.log("FAILURE: appData is MISSING or EMPTY. PocketBase is NOT storing the field.");
        console.log("appData value:", r2.appData);
    }

    // Cleanup
    await client.collection('lots').delete(r.id);
}

test().catch(e => console.error("ERR:", e.response || e));
