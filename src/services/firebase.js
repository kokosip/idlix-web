import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';

// Environment variables configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase configuration is provided
export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'your_api_key'
  );
};

let app = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('[Firebase] Firestore initialized successfully.');
  } catch (error) {
    console.warn('[Firebase] Initialization error:', error.message);
  }
} else {
  console.info('[Firebase] Config not found or incomplete. Falling back to localStorage mode.');
}

/**
 * Clean username for document ID (lowercase and stripped)
 */
const getCleanUsername = (username) => {
  if (!username) return 'guest';
  return username.toString().trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
};

/**
 * Save user watchlist to Cloud Firestore
 * Document Path: watchlists/{username}
 */
export const saveWatchlistToCloud = async (username, watchlist) => {
  if (!db || !username || username === 'guest') return false;
  try {
    const cleanUser = getCleanUsername(username);
    const docRef = doc(db, 'watchlists', cleanUser);
    await setDoc(docRef, {
      username,
      items: watchlist,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to save watchlist to cloud:', error);
    return false;
  }
};

/**
 * Fetch user watchlist from Cloud Firestore
 */
export const getWatchlistFromCloud = async (username) => {
  if (!db || !username || username === 'guest') return null;
  try {
    const cleanUser = getCleanUsername(username);
    const docRef = doc(db, 'watchlists', cleanUser);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return Array.isArray(data.items) ? data.items : [];
    }
    return [];
  } catch (error) {
    console.error('[Firebase] Failed to fetch watchlist from cloud:', error);
    return null;
  }
};

/**
 * Save user watch history to Cloud Firestore
 * Document Path: watch_histories/{username}
 */
export const saveHistoryToCloud = async (username, watchHistory) => {
  if (!db || !username || username === 'guest') return false;
  try {
    const cleanUser = getCleanUsername(username);
    const docRef = doc(db, 'watch_histories', cleanUser);
    await setDoc(docRef, {
      username,
      items: watchHistory,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to save watch history to cloud:', error);
    return false;
  }
};

/**
 * Fetch user watch history from Cloud Firestore
 */
export const getHistoryFromCloud = async (username) => {
  if (!db || !username || username === 'guest') return null;
  try {
    const cleanUser = getCleanUsername(username);
    const docRef = doc(db, 'watch_histories', cleanUser);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return Array.isArray(data.items) ? data.items : [];
    }
    return [];
  } catch (error) {
    console.error('[Firebase] Failed to fetch watch history from cloud:', error);
    return null;
  }
};
