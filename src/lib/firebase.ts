import { initializeApp, getApp, getApps } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'caltrackr-demo.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'caltrackr-demo',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'caltrackr-demo.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:caltrackr',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const emulatorHost =
  process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const authPort = Number(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || 9099);
const firestorePort = Number(process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT || 8080);
const useEmulators = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

declare global {
  var __caltrackrEmulatorsConnected: boolean | undefined;
}

if (useEmulators && !globalThis.__caltrackrEmulatorsConnected) {
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:${authPort}`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, firestorePort);
    globalThis.__caltrackrEmulatorsConnected = true;
  } catch {
    globalThis.__caltrackrEmulatorsConnected = true;
  }
}
