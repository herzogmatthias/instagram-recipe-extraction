import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

let clientApp: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let configPromise: Promise<Record<string, string>> | null = null;

async function fetchFirebaseConfig(): Promise<Record<string, string>> {
  try {
    const response = await fetch("/api/preferences/clientConfig");

    if (response.ok) {
      const data = await response.json();

      if (data.clientConfig) {
        const {
          apiKey,
          authDomain,
          projectId,
          storageBucket,
          messagingSenderId,
          appId,
          measurementId,
        } = data.clientConfig;

        const config: Record<string, string> = {
          apiKey,
          authDomain,
          projectId,
          storageBucket,
          messagingSenderId,
          appId,
        };

        if (measurementId) {
          config.measurementId = measurementId;
        }

        return config;
      }
    }
  } catch (error) {
    console.warn(
      "Failed to fetch Firebase config from API, using env fallback:",
      error
    );
  }

  // Fallback to env variables
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "measurementId" && !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Firebase Client SDK not configured. Please add configuration in Settings: ${missing.join(
        ", "
      )}`
    );
  }

  return config as Record<string, string>;
}

async function getFirebaseConfig(): Promise<Record<string, string>> {
  if (!configPromise) {
    configPromise = fetchFirebaseConfig();
  }
  return configPromise;
}

export async function initializeClientFirebase(): Promise<FirebaseApp> {
  if (clientApp) {
    return clientApp;
  }

  const existing = getApps();
  if (existing.length > 0) {
    clientApp = existing[0]!;
    return clientApp;
  }

  const config = await getFirebaseConfig();
  clientApp = initializeApp(config);
  return clientApp;
}

export async function getClientFirestore(): Promise<Firestore> {
  if (firestoreInstance) {
    return firestoreInstance;
  }
  const app = await initializeClientFirebase();
  firestoreInstance = getFirestore(app);
  return firestoreInstance;
}
