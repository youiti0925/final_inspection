import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function automatedDbSetup() {
    const adminEmail = process.argv[2];
    const adminPassword = process.argv[3];

    if (!adminEmail || !adminPassword) {
        console.log("Usage: node setup_db_v2.js <admin_email> <admin_password>");
        console.log("Example: node setup_db_v2.js admin@test.com pass123456");
        process.exit(1);
    }

    try {
        console.log("1. Authenticating...");
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const collections = ['lots', 'workers', 'settings'];

        for (const name of collections) {
            console.log(`\n--- Processing collection: ${name} ---`);
            let existingId = null;

            try {
                const existing = await pb.collections.getFirstListItem(`name="${name}"`);
                existingId = existing.id;
                console.log(`Collection '${name}' exists. Deleting it to recreate cleanly...`);
                await pb.collections.delete(existingId);
            } catch (err) {
                console.log(`Collection '${name}' does not exist yet.`);
            }

            console.log(`Creating collection '${name}' with appData JSON field...`);
            await pb.collections.create({
                name: name,
                type: 'base',
                schema: [
                    {
                        name: 'appData',
                        type: 'json',
                        required: false,
                        options: { maxSize: 2000000 }
                    }
                ],
                listRule: "",
                viewRule: "",
                createRule: "",
                updateRule: "",
                deleteRule: ""
            });
            console.log(`✅ Collection '${name}' created successfully!`);
        }

        console.log("\n🎉 All done! PocketBase is fully configured.");
        console.log("You can now refresh the React app.");

    } catch (error) {
        console.error("\n❌ Setup failed!");
        console.error(error?.response || error);
    }
}

automatedDbSetup();
