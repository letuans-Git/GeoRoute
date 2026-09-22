import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  doc, 
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database with high-performance IndexedDB persistent cache
// and experimentalAutoDetectLongPolling for instant mobile network resilience
let firestoreDb: ReturnType<typeof getFirestore>;

try {
  firestoreDb = initializeFirestore(
    firebaseApp,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
      experimentalAutoDetectLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId || undefined
  );
} catch {
  // If already initialized (e.g. during dev hot reloading)
  firestoreDb = getFirestore(
    firebaseApp,
    firebaseConfig.firestoreDatabaseId || undefined
  );
}

export const db = firestoreDb;

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

