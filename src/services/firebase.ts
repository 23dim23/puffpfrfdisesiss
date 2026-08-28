import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Set Firestore log level to error to avoid noisy connection probing warnings in console
setLogLevel('error');

// Auth
export const auth = getAuth(app);

// Firestore instance connected to our provisioned database with robust long-polling & persistent cache
export const firestore = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// Anonymous sign in to ensure stable Firestore security access
signInAnonymously(auth).catch(() => {
  // Silent fallback - offline local cache ensures full functionality
});

