import {
  GoogleAuthProvider,
  type User,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { isNativeApp } from './nativePlatform';

export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return user;
}

export async function signInWithGoogle() {
  if (isNativeApp()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    const credential = GoogleAuthProvider.credential(
      result.credential?.idToken,
      result.credential?.accessToken,
    );
    return signInWithCredential(auth, credential);
  }
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  if (isNativeApp()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    await FirebaseAuthentication.signOut();
  }
  return signOut(auth);
}
