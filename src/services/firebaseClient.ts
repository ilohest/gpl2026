// src/services/firebaseClient.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";

import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { api } from "@/services/api";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  [k: string]: unknown;
};

type FirebaseHandles = {
  app: FirebaseApp;
  auth: Auth;
  fs: Firestore;
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _fs: Firestore | null = null;
let _initPromise: Promise<FirebaseHandles> | null = null;

export async function ensureFirebase(): Promise<FirebaseHandles> {
  if (_app && _auth && _fs) return { app: _app, auth: _auth, fs: _fs };

  // ✅ anti-race: si une init est déjà en cours, on attend la même
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const cfg = (await api.firebaseConfig()) as FirebaseConfig;

    _app = initializeApp(cfg);
    _auth = getAuth(_app);
    _fs = getFirestore(_app);

    return { app: _app, auth: _auth, fs: _fs };
  })();

  try {
    return await _initPromise;
  } finally {
    // ✅ important: on libère la promesse, mais _app/_auth/_fs restent en cache
    _initPromise = null;
  }
}

export {
  // Auth
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyPasswordResetCode,
  confirmPasswordReset,

  // Firestore
  collection,
  collectionGroup,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
};
