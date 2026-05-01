// backend/scripts/seedCouple.ts
import { seedCoupleRsvpIfNeeded } from "../services/seedCoupleRsvp.js";

async function main() {
  await seedCoupleRsvpIfNeeded();
  console.log("✅ Couple seed terminé (créé ou déjà existant).");
}

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error("❌ Couple seed error:", err);
    process.exitCode = 1;
  });
