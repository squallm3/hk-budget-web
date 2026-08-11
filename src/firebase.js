import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
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

// Login por redirect (no por popup).
// El popup se cuelga en Chrome/Edge cuando Google necesita mostrar el selector
// de cuentas ya logueadas, porque depende de cookies de Google en contexto de
// terceros, que los navegadores ahora particionan. El redirect navega en la
// misma pestana, sin ese problema.
export function loginConGoogle() {
  return signInWithRedirect(auth, googleProvider);
}

// Al volver del redirect, Firebase necesita procesar el resultado.
// Si hubo un error en el proceso, lo devolvemos para poder mostrarlo.
export function procesarResultadoRedirect() {
  return getRedirectResult(auth);
}

export function logout() {
  return signOut(auth);
}

export function suscribirseAUsuario(callback) {
  return onAuthStateChanged(auth, callback);
}