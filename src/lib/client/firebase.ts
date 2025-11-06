import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

let clientApp: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase client configuration values: ${missing.join(", ")}`
    );
  }

  return config as Record<string, string>;
}

export function getClientFirebaseApp(): FirebaseApp {
  if (clientApp) {
    return clientApp;
  }

  const existing = getApps();
  if (existing.length > 0) {
    clientApp = existing[0]!;
    return clientApp;
  }

  clientApp = initializeApp(getFirebaseConfig());
  return clientApp;
}

export function getClientFirestore(): Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }
  const app = getClientFirebaseApp();
  firestoreInstance = getFirestore(app);
  return firestoreInstance;
}
