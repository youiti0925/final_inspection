import PocketBase from 'pocketbase';
const client = new PocketBase('http://127.0.0.1:8090');

const ADMIN_EMAIL = process.argv[2];
const ADMIN_PASSWORD = process.argv[3];

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log("Usage: node setup_db_v3.mjs <admin_email> <admin_password>");
    process.exit(1);
}

async function setup() {
    // 1. Authenticate as admin
    console.log("1. Authenticating as admin...");
    await client.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("   OK");

    const collections = ['lots', 'workers', 'settings', 'target_time_history'];

    for (const name of collections) {
        console.log(`\n--- ${name} ---`);

        // Delete existing
        try {
            const existing = await client.collections.getOne(name);
            console.log(`   Deleting existing '${name}'...`);
            await client.collections.delete(existing.id);
        } catch (e) {
            console.log(`   '${name}' does not exist yet.`);
        }

        // Create with fields (PocketBase v0.23+ API)
        console.log(`   Creating '${name}' with appData JSON field...`);
        await client.collections.create({
            name: name,
            type: 'base',
            fields: [
                {
                    name: 'appData',
                    type: 'json',
                    required: false,
                    options: { maxSize: 5000000 }
                }
            ],
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: ""
        });
        console.log(`   ✅ '${name}' created!`);
    }

    // 2. Verify round-trip
    console.log("\n=== Verification ===");
    const testData = { model: 'VERIFY-MODEL', orderNo: 'VERIFY-ORDER' };
    const created = await client.collection('lots').create({ appData: testData });
    const readBack = await client.collection('lots').getOne(created.id);

    if (readBack.appData && readBack.appData.model === 'VERIFY-MODEL') {
        console.log("✅ Round-trip test PASSED! appData is correctly stored and returned.");
    } else {
        console.log("❌ Round-trip test FAILED. appData:", readBack.appData);
    }
    await client.collection('lots').delete(created.id);

    console.log("\n🎉 Setup complete! Refresh your React app.");
}

setup().catch(e => {
    console.error("❌ Setup failed:", e.response || e.message || e);
});
