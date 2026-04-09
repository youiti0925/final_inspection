import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function automateSetup() {
    const adminEmail = process.argv[2];
    const adminPassword = process.argv[3];

    if (!adminEmail || !adminPassword) {
        console.log("Usage: node setup_db.js <admin_email> <admin_password>");
        console.log("Example: node setup_db.js admin@example.com password1234");
        process.exit(1);
    }

    try {
        console.log("Authenticating as admin...");
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const collectionsToCreate = ['lots', 'workers', 'settings'];

        for (const name of collectionsToCreate) {
            console.log(`Setting up collection: ${name}...`);
            try {
                // Check if exists
                const existing = await pb.collections.getFirstListItem(`name="${name}"`);
                console.log(`Collection ${name} exists, updating rules...`);
                await pb.collections.update(existing.id, {
                    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: ""
                });
            } catch (err) {
                // Create new
                console.log(`Creating collection ${name}...`);
                await pb.collections.create({
                    name: name,
                    type: 'base',
                    schema: [],
                    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: ""
                });
            }
        }

        console.log("\n✅ PocketBase database setup is complete!");
        console.log("You can now refresh the React app.");
    } catch (error) {
        console.error("❌ Setup failed:");
        console.error(error?.response || error);
    }
}

automateSetup();
