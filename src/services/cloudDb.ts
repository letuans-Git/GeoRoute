import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserAccount, RouteItem, LocationPoint } from '../types';
import { INITIAL_USERS, INITIAL_ROUTES, INITIAL_POINTS } from '../data/mockData';
import { safeStorage } from '../utils/storage';

const USERS_COL = 'users';
const ROUTES_COL = 'routes';
const POINTS_COL = 'points';

/**
 * Clean data before sending to Firestore
 * Eliminates undefined values which Firestore throws errors on
 */
function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = val;
    }
  });
  return result;
}

/**
 * Seed initial data to cloud Firestore if collections are empty.
 * Guarantees that any device (iPhone, PC, Mac, Tablet) anywhere on the internet
 * will immediately see the full dataset upon first load.
 */
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    const usersSnap = await getDocs(collection(db, USERS_COL));
    if (usersSnap.empty) {
      console.log('[Firestore] Seeding initial users into Cloud Firestore...');
      const batch = writeBatch(db);
      INITIAL_USERS.forEach((u) => {
        const userRef = doc(db, USERS_COL, u.id);
        batch.set(userRef, cleanFirestoreData(u));
      });
      await batch.commit();
    }

    const routesSnap = await getDocs(collection(db, ROUTES_COL));
    if (routesSnap.empty) {
      console.log('[Firestore] Seeding initial routes into Cloud Firestore...');
      const batch = writeBatch(db);
      INITIAL_ROUTES.forEach((r) => {
        const routeRef = doc(db, ROUTES_COL, r.id);
        batch.set(routeRef, cleanFirestoreData(r));
      });
      await batch.commit();
    }

    const pointsSnap = await getDocs(collection(db, POINTS_COL));
    if (pointsSnap.empty) {
      console.log('[Firestore] Seeding initial points into Cloud Firestore...');
      const batch = writeBatch(db);
      INITIAL_POINTS.forEach((p) => {
        const ptRef = doc(db, POINTS_COL, p.id);
        batch.set(ptRef, cleanFirestoreData(p));
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('[Firestore] Error while checking/seeding Cloud database:', err);
  }
}

/**
 * Subscribe to real-time Cloud Users collection
 */
export function subscribeCloudUsers(
  onUpdate: (users: UserAccount[]) => void,
  onError?: (err: any) => void
): () => void {
  const unsub = onSnapshot(
    collection(db, USERS_COL),
    (snap) => {
      if (!snap.empty) {
        const cloudUsers = snap.docs.map((d) => d.data() as UserAccount);
        // Cache to localStorage for offline access
        safeStorage.setItem('georoute_users', JSON.stringify(cloudUsers));
        onUpdate(cloudUsers);
      } else {
        // Fallback to initial
        onUpdate(INITIAL_USERS);
      }
    },
    (err) => {
      console.warn('[Firestore] Cloud users subscription error:', err);
      if (onError) onError(err);
    }
  );
  return unsub;
}

/**
 * Save or update user in Cloud Firestore
 */
export async function saveCloudUser(user: UserAccount): Promise<void> {
  try {
    await setDoc(doc(db, USERS_COL, user.id), cleanFirestoreData(user), { merge: true });
  } catch (e) {
    console.warn('[Firestore] saveCloudUser error:', e);
  }
}

/**
 * Delete user in Cloud Firestore
 */
export async function deleteCloudUser(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, USERS_COL, userId));
  } catch (e) {
    console.warn('[Firestore] deleteCloudUser error:', e);
  }
}

/**
 * Fetch all users directly from Cloud Firestore once
 */
export async function fetchCloudUsersOnce(): Promise<UserAccount[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COL));
    if (!snap.empty) {
      const cloudUsers = snap.docs.map((d) => d.data() as UserAccount);
      safeStorage.setItem('georoute_users', JSON.stringify(cloudUsers));
      return cloudUsers;
    }
  } catch (err) {
    console.warn('[Firestore] fetchCloudUsersOnce error:', err);
  }
  return INITIAL_USERS;
}

/**
 * Update user password directly in Cloud Firestore and local storage
 */
export async function updateCloudUserPassword(userId: string, newPass: string): Promise<boolean> {
  try {
    const userRef = doc(db, USERS_COL, userId);
    await setDoc(userRef, { password: newPass, updatedAt: new Date().toISOString() }, { merge: true });
    
    // Also update cached users
    const cached = safeStorage.getItem('georoute_users');
    if (cached) {
      try {
        const users = JSON.parse(cached);
        if (Array.isArray(users)) {
          const updated = users.map((u: UserAccount) => u.id === userId ? { ...u, password: newPass } : u);
          safeStorage.setItem('georoute_users', JSON.stringify(updated));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return true;
  } catch (err) {
    console.warn('[Firestore] updateCloudUserPassword error:', err);
    return false;
  }
}

/**
 * Subscribe to real-time Cloud Routes collection
 */
export function subscribeCloudRoutes(
  onUpdate: (routes: RouteItem[]) => void,
  onError?: (err: any) => void
): () => void {
  const unsub = onSnapshot(
    collection(db, ROUTES_COL),
    (snap) => {
      if (!snap.empty) {
        const cloudRoutes = snap.docs.map((d) => d.data() as RouteItem);
        safeStorage.setItem('georoute_routes', JSON.stringify(cloudRoutes));
        onUpdate(cloudRoutes);
      }
    },
    (err) => {
      console.warn('[Firestore] Cloud routes subscription error:', err);
      if (onError) onError(err);
    }
  );
  return unsub;
}

/**
 * Save or update route in Cloud Firestore
 */
export async function saveCloudRoute(route: RouteItem): Promise<void> {
  try {
    await setDoc(doc(db, ROUTES_COL, route.id), cleanFirestoreData(route), { merge: true });
  } catch (e) {
    console.warn('[Firestore] saveCloudRoute error:', e);
  }
}

/**
 * Delete route in Cloud Firestore
 */
export async function deleteCloudRoute(routeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ROUTES_COL, routeId));
  } catch (e) {
    console.warn('[Firestore] deleteCloudRoute error:', e);
  }
}

/**
 * Subscribe to real-time Cloud Points collection
 */
export function subscribeCloudPoints(
  onUpdate: (points: LocationPoint[]) => void,
  onError?: (err: any) => void
): () => void {
  const unsub = onSnapshot(
    collection(db, POINTS_COL),
    (snap) => {
      if (!snap.empty) {
        const cloudPoints = snap.docs.map((d) => d.data() as LocationPoint);
        safeStorage.setItem('georoute_points', JSON.stringify(cloudPoints));
        onUpdate(cloudPoints);
      }
    },
    (err) => {
      console.warn('[Firestore] Cloud points subscription error:', err);
      if (onError) onError(err);
    }
  );
  return unsub;
}

/**
 * Save or update point in Cloud Firestore
 */
export async function saveCloudPoint(point: LocationPoint): Promise<void> {
  try {
    await setDoc(doc(db, POINTS_COL, point.id), cleanFirestoreData(point), { merge: true });
  } catch (e) {
    console.warn('[Firestore] saveCloudPoint error:', e);
  }
}

/**
 * Delete point in Cloud Firestore
 */
export async function deleteCloudPoint(pointId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, POINTS_COL, pointId));
  } catch (e) {
    console.warn('[Firestore] deleteCloudPoint error:', e);
  }
}
