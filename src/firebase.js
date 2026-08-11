import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Intentamos primero con popup (mas comodo: no recarga la app).
// Si el navegador lo bloquea o lo deja colgado -algo que Chrome hace cada vez
// mas por el particionamiento de almacenamiento- caemos automaticamente al
// metodo por redirect, que navega en la misma pestana y siempre funciona.
export async function loginConGoogle() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const codigosQueJustificanRedirect = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/web-storage-unsupported',
      'auth/operation-not-supported-in-this-environment',
      'auth/internal-error',
    ];
    if (codigosQueJustificanRedirect.includes(error?.code)) {
      return signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
}

export function logout() {
  return signOut(auth);
}

export function suscribirseAUsuario(callback) {
  return onAuthStateChanged(auth, callback);
}