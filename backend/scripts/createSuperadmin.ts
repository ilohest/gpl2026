// backend/scripts/createSuperadmin.ts
import { admin, firestore } from "../lib/firebase.js";

const email = (process.argv[2] || "").trim().toLowerCase();
const password = process.argv[3] || ""; // optionnel

if (!email) {
  console.error(
    "Usage:\n  node backend/scripts/createSuperadmin.js <email> [password]"
  );
  process.exit(1);
}

async function main() {
  let user: import("firebase-admin/auth").UserRecord;

  // 1) Get or create Auth user
  try {
    user = await admin.auth().getUserByEmail(email);
    console.log("Auth user exists:", { uid: user.uid, email });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code !== "auth/user-not-found") throw e;

    if (!password) {
      console.error(
        "User not found. Provide a password to create:\n  node backend/scripts/createSuperadmin.js <email> <password>"
      );
      process.exit(1);
    }

    user = await admin.auth().createUser({
      email,
      password,
      emailVerified: true, // optionnel
    });
    console.log("Auth user created:", { uid: user.uid, email });
  }

  // 2) Set custom claims
  await admin.auth().setCustomUserClaims(user.uid, {
    superadmin: true,
    admin: true,
  });
  console.log("Custom claims set:", {
    uid: user.uid,
    superadmin: true,
    admin: true,
  });

  // 3) Write Firestore user doc
  await firestore
    .collection("users")
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        emailLower: email,
        email: user.email || email,
        permissions: ["superadmin:all"],
        updatedAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );

  console.log("Firestore user updated:", {
    uid: user.uid,
    permissions: ["superadmin:all"],
  });

  console.log("DONE");
}

main().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
