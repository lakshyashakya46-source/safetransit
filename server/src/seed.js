import { initDatabase } from "./db/connection.js";
import { resetAndSeedDatabase } from "./db/seedData.js";

console.log("=========================================");
console.log(" SafeTransit Seed Initialization Script");
console.log("=========================================");

await initDatabase();
await resetAndSeedDatabase();

console.log("\nDemo login credentials (5 Personas):");
console.log("- Transport Authority: authority@demo.com");
console.log("- Depot Officer:       officer@demo.com");
console.log("- Driver:              driver@demo.com");
console.log("- Conductor:           conductor@demo.com");
console.log("- Accounts Officer:    accounts@demo.com");
console.log("Password for all:      Demo@12345");
console.log("=========================================\n");

process.exit(0);
