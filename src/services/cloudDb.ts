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
import { UserAccount, RouteItem, LocationPoint, UserRole, RolePermissionConfig, DEFAULT_ROLE_PERMISSIONS } from '../types';
import { INITIAL_USERS, INITIAL_ROUTES, INITIAL_POINTS } from '../data/mockData';
import { safeStorage } from '../utils/storage';

const USERS_COL = 'users';
const ROUTES_COL = 'routes';
const POINTS_COL = 'points';
const CONFIG_COL = 'system_config';
const ROLE_PERMS_DOC = 'role_permissions';

/**
 * Clean data before sending to Firestore
 * Eliminates undefined values which Firestore throws errors on
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
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
 * Serialize RouteItem for Cloud Firestore.
 * Firestore strictly forbids nested arrays (e.g. [[lat, lng], [lat, lng]]).
 * We serialize multi-dimensional arrays into JSON strings to ensure 100% data fidelity without data loss.
 */
export function serializeRouteForFirestore(route: RouteItem): any {
  const cleaned = cleanFirestoreData(route);
  const copy: any = { ...cleaned };

  if (route.polyline) {
    copy.polylineJson = JSON.stringify(route.polyline);
    delete copy.polyline;
  }
  if (route.bounds) {
    copy.boundsJson = JSON.stringify(route.bounds);
    delete copy.bounds;
  }
  if (route.mapOverlay) {
    const ov = { ...route.mapOverlay };
    if (ov.bounds) {
      copy.mapOverlayBoundsJson = JSON.stringify(ov.bounds);
      delete (ov as any).bounds;
    }
    copy.mapOverlay = ov;
  }

  return cleanFirestoreData(copy);
}

/**
 * Deserialize RouteItem from Cloud Firestore back into runtime RouteItem.
 */
export function deserializeRouteFromFirestore(data: any): RouteItem {
  const res: any = { ...data };

  if (data.polylineJson) {
    try {
      res.polyline = JSON.parse(data.polylineJson);
    } catch (e) {
      console.error('Failed to parse polylineJson:', e);
      res.polyline = [];
    }
  } else if (!res.polyline) {
    res.polyline = [];
  }

  if (data.boundsJson) {
    try {
      res.bounds = JSON.parse(data.boundsJson);
    } catch (e) {
      console.error('Failed to parse boundsJson:', e);
      res.bounds = undefined;
    }
  }

  if (data.mapOverlay) {
    res.mapOverlay = { ...data.mapOverlay };
    if (data.mapOverlayBoundsJson) {
      try {
        res.mapOverlay.bounds = JSON.parse(data.mapOverlayBoundsJson);
      } catch (e) {
        console.error('Failed to parse mapOverlayBoundsJson:', e);
      }
    }
  }

  return res as RouteItem;
}

/**
 * Seed initial data to cloud Firestore if collections are empty or missing standard master records.
 * Guarantees that any device (iPhone, PC, Mac, Tablet) anywhere on the internet
 * will immediately see the full dataset upon first load.
 */
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    // 1. Ensure all standard users exist in Cloud Firestore
    const usersSnap = await getDocs(collection(db, USERS_COL));
    const existingUserIds = new Set(usersSnap.docs.map((d) => d.id));
    const missingUsers = INITIAL_USERS.filter((u) => !existingUserIds.has(u.id));

    if (missingUsers.length > 0) {
      console.log(`[Firestore] Seeding ${missingUsers.length} missing initial users into Cloud Firestore...`);
      for (const u of missingUsers) {
        await setDoc(doc(db, USERS_COL, u.id), cleanFirestoreData(u), { merge: true });
      }
    }

    // 2. Ensure all standard routes exist in Cloud Firestore
    const routesSnap = await getDocs(collection(db, ROUTES_COL));
    const existingRouteIds = new Set(routesSnap.docs.map((d) => d.id));
    const missingRoutes = INITIAL_ROUTES.filter((r) => !existingRouteIds.has(r.id));

    if (missingRoutes.length > 0) {
      console.log(`[Firestore] Seeding ${missingRoutes.length} missing initial routes into Cloud Firestore...`);
      for (const r of missingRoutes) {
        await setDoc(doc(db, ROUTES_COL, r.id), serializeRouteForFirestore(r), { merge: true });
      }
    }

    // 3. Ensure all standard points exist in Cloud Firestore
    const pointsSnap = await getDocs(collection(db, POINTS_COL));
    const existingPointIds = new Set(pointsSnap.docs.map((d) => d.id));
    const missingPoints = INITIAL_POINTS.filter((p) => !existingPointIds.has(p.id));

    if (missingPoints.length > 0) {
      console.log(`[Firestore] Seeding ${missingPoints.length} missing initial points into Cloud Firestore...`);
      for (const p of missingPoints) {
        await setDoc(doc(db, POINTS_COL, p.id), cleanFirestoreData(p), { merge: true });
      }
    }

    // 4. Ensure standard role permissions exist in Cloud Firestore
    const roleDocRef = doc(db, CONFIG_COL, ROLE_PERMS_DOC);
    await setDoc(roleDocRef, cleanFirestoreData(DEFAULT_ROLE_PERMISSIONS), { merge: true });

  } catch (err) {
    console.warn('[Firestore] Error while checking/seeding Cloud database:', err);
  }
}

/**
 * Full master synchronization: writes 100% of routes, points, and users into Cloud Firestore.
 * Used for one-click manual synchronization or after importing backups.
 */
export async function syncAllDataToFirestore(
  routes: RouteItem[],
  points: LocationPoint[],
  users: UserAccount[],
  rolePermissions?: Record<UserRole, RolePermissionConfig>
): Promise<{ success: boolean; routesCount: number; pointsCount: number; usersCount: number; error?: string }> {
  try {
    // 1. Sync routes
    for (const r of routes) {
      await setDoc(doc(db, ROUTES_COL, r.id), serializeRouteForFirestore(r), { merge: true });
    }

    // 2. Sync points
    for (const p of points) {
      await setDoc(doc(db, POINTS_COL, p.id), cleanFirestoreData(p), { merge: true });
    }

    // 3. Sync users
    for (const u of users) {
      await setDoc(doc(db, USERS_COL, u.id), cleanFirestoreData(u), { merge: true });
    }

    // 4. Sync role permissions if provided
    if (rolePermissions) {
      await setDoc(doc(db, CONFIG_COL, ROLE_PERMS_DOC), cleanFirestoreData(rolePermissions), { merge: true });
    }

    return {
      success: true,
      routesCount: routes.length,
      pointsCount: points.length,
      usersCount: users.length,
    };
  } catch (err: any) {
    console.error('[Firestore] syncAllDataToFirestore error:', err);
    return {
      success: false,
      routesCount: 0,
      pointsCount: 0,
      usersCount: 0,
      error: err?.message || 'Lỗi không xác định khi đồng bộ lên Cloud Firestore',
    };
  }
}

/**
 * Fetch total counts and health stats directly from Cloud Firestore
 */
export async function fetchCloudStatsOnce(): Promise<{
  isConnected: boolean;
  usersCount: number;
  routesCount: number;
  pointsCount: number;
}> {
  try {
    const [uSnap, rSnap, pSnap] = await Promise.all([
      getDocs(collection(db, USERS_COL)),
      getDocs(collection(db, ROUTES_COL)),
      getDocs(collection(db, POINTS_COL)),
    ]);
    return {
      isConnected: true,
      usersCount: uSnap.size,
      routesCount: rSnap.size,
      pointsCount: pSnap.size,
    };
  } catch (e) {
    console.warn('[Firestore] fetchCloudStatsOnce failed:', e);
    return {
      isConnected: false,
      usersCount: 0,
      routesCount: 0,
      pointsCount: 0,
    };
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
        safeStorage.setItem('georoute_users', JSON.stringify(cloudUsers));
        onUpdate(cloudUsers);
      } else {
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
        const cloudRoutes = snap.docs.map((d) => deserializeRouteFromFirestore(d.data()));
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
    const serialized = serializeRouteForFirestore(route);
    await setDoc(doc(db, ROUTES_COL, route.id), serialized, { merge: true });
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

/**
 * Subscribe to real-time Cloud Role Permissions
 */
export function subscribeCloudRolePermissions(
  onUpdate: (perms: Record<UserRole, RolePermissionConfig>) => void,
  onError?: (err: any) => void
): () => void {
  const unsub = onSnapshot(
    doc(db, CONFIG_COL, ROLE_PERMS_DOC),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Record<UserRole, RolePermissionConfig>;
        safeStorage.setItem('georoute_role_permissions', JSON.stringify(data));
        onUpdate(data);
      }
    },
    (err) => {
      console.warn('[Firestore] Role permissions subscription error:', err);
      if (onError) onError(err);
    }
  );
  return unsub;
}

/**
 * Save Role Permissions in Cloud Firestore
 */
export async function saveCloudRolePermissions(perms: Record<UserRole, RolePermissionConfig>): Promise<void> {
  try {
    await setDoc(doc(db, CONFIG_COL, ROLE_PERMS_DOC), cleanFirestoreData(perms), { merge: true });
  } catch (e) {
    console.warn('[Firestore] saveCloudRolePermissions error:', e);
  }
}
