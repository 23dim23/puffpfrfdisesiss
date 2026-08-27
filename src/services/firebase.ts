import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);

// Firestore instance connected to our provisioned database
export const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Anonymous sign in to ensure stable Firestore security access
signInAnonymously(auth).catch((err) => {
  console.warn('Firebase anonymous sign in notice:', err);
});
