// backend/scripts/setClaims.ts
import { admin, firestore } from "../lib/firebase.js";

const email = String(process.argv[2] || "").trim();
if (!email) {
  console.error("Usage: node backend/scripts/setClaims.js <email>");
  process.exit(1);
}

const authUser = await admin.auth().getUserByEmail(email);
const uid = authUser.uid;

const before = await admin.auth().getUser(uid);
console.log("BEFORE customClaims:", before.customClaims || null);

const snap = await firestore.collection("users").doc(uid).get();
if (!snap.exists) {
  console.error(
    `No Firestore doc users/${uid}. Aborting (would set empty perms).`
  );
  process.exit(2);
}

const perms = Array.isArray(snap.data()?.permissions)
  ? (snap.data()?.permissions as string[])
  : [];

const prev = before.customClaims || {};
const claims = {
  ...prev,
  permissions: perms,
  superadmin: perms.includes("superadmin:all"),
  claimsVersion: Date.now(),
};

await admin.auth().setCustomUserClaims(uid, claims);

const after = await admin.auth().getUser(uid);
console.log("AFTER customClaims:", after.customClaims || null);

console.log("OK claims set for", email, "uid:", uid, "claims:", claims);
process.exit(0);
