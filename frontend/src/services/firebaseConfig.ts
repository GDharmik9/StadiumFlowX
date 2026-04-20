/**
 * Firebase Configuration for StadiumFlow
 *
 * Initializes Firebase services (Auth, Firestore) for the frontend application.
 * Uses environment variables when available, with fallback to build-time config.
 *
 * @module services/firebaseConfig
 * @see https://firebase.google.com/docs/web/setup
 */
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase project configuration.
 * In production, sensitive values should be provided via environment variables.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCOIRtz8h9h4u2AJ7kEeINGnV9XCk6xup4',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'disco-dispatch-493610-i4.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'disco-dispatch-493610-i4',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'disco-dispatch-493610-i4.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '669710233968',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:669710233968:web:9c2b7ac88fe813da559fb5',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-1LXXVM5BRP',
};

/** Firebase application instance */
export const app: FirebaseApp = initializeApp(firebaseConfig);

/** Firestore database instance for real-time crowd data */
export const db: Firestore = getFirestore(app);

/** Firebase Auth instance for anonymous fan authentication */
export const auth: Auth = getAuth(app);