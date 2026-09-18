import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database with explicit custom databaseId if configured
export const db = getFirestore(
  firebaseApp,
  firebaseConfig.firestoreDatabaseId || undefined
);

// Health check connection test to ensure Firestore is online
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt to probe Firestore server
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    return true;
  } catch (error) {
    // Permission denied or document not found means connection reached the server
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline. Using local fallback.');
      return false;
    }
    return true;
  }
}
