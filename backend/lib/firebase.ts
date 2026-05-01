import admin from "firebase-admin";
import "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ServiceAccount } from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const serviceAccountPath = path.resolve(__dirname, "..", "firebase-adminsdk.json");

type ServiceAccountJson = {
  project_id?: unknown;
  projectId?: unknown;
  client_email?: unknown;
  clientEmail?: unknown;
  private_key?: unknown;
  privateKey?: unknown;
};

type FirebaseState = {
  admin: typeof admin;
  firestore: FirebaseFirestore.Firestore;
  bucket: ReturnType<ReturnType<typeof admin.storage>["bucket"]>;
};

let firebaseState: FirebaseState | null = null;

function normalizeServiceAccount(input: ServiceAccountJson): ServiceAccount {
  const projectId = String(input.projectId ?? input.project_id ?? "").trim();
  const clientEmail = String(input.clientEmail ?? input.client_email ?? "").trim();
  const privateKey = String(input.privateKey ?? input.private_key ?? "").trim();

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function bindValue<T>(source: object, value: T): T {
  if (typeof value === "function") {
    return (value as unknown as (...args: unknown[]) => unknown).bind(source) as T;
  }
  return value;
}

function createLazyProxy<T extends object>(getValue: () => T): T {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const source = getValue();
        return bindValue(source, Reflect.get(source, prop));
      },
      set(_target, prop, value) {
        const source = getValue();
        Reflect.set(source, prop, value);
        return true;
      },
      has(_target, prop) {
        return prop in getValue();
      },
      ownKeys() {
        return Reflect.ownKeys(getValue());
      },
      getOwnPropertyDescriptor(_target, prop) {
        return Object.getOwnPropertyDescriptor(getValue(), prop);
      },
    },
  ) as T;
}

export function ensureFirebaseAdminInitialized(): FirebaseState {
  if (firebaseState) return firebaseState;

  let serviceAccount: ServiceAccount;
  try {
    const raw = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8")) as ServiceAccountJson;
    serviceAccount = normalizeServiceAccount(raw);
  } catch (e: unknown) {
    console.error("❌ Impossible de lire backend/firebase-adminsdk.json");
    throw e;
  }

  console.log("[admin] serviceAccount", {
    projectId: serviceAccount.projectId,
    clientEmail: serviceAccount.clientEmail,
  });

  const envProjectId = process.env.FIREBASE_PROJECT_ID;
  const saProjectId = String(serviceAccount.projectId || "").trim();
  if (!saProjectId) {
    throw new Error("❌ service account sans project_id/projectId");
  }

  if (envProjectId && envProjectId !== saProjectId) {
    throw new Error(
      `❌ Mismatch projet Firebase: env FIREBASE_PROJECT_ID=${envProjectId} != serviceAccount.project_id=${saProjectId}`,
    );
  }

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new Error("❌ FIREBASE_STORAGE_BUCKET manquant dans backend/.env");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: saProjectId,
      storageBucket,
    });

    console.log("✅ Firebase Admin initialisé");
    console.log("[admin] projectId", admin.app().options.projectId);
    console.log("[admin] storageBucket", admin.app().options.storageBucket);
  }

  firebaseState = {
    admin,
    firestore: getFirestore(admin.app()),
    bucket: admin.storage().bucket(storageBucket),
  };

  return firebaseState;
}

export const firestore = createLazyProxy(() => ensureFirebaseAdminInitialized().firestore);
export const bucket = createLazyProxy(() => ensureFirebaseAdminInitialized().bucket);
export { admin };
