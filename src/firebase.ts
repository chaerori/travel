import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const OWNER_EMAIL = 'leechaeyun95@gmail.com';

// Firebase 웹 설정값은 비밀값이 아니며 Firestore 보안 규칙으로 접근을 제어한다.
const firebaseConfig = {
  apiKey: 'AIzaSyDFKTcjnPLsZMiR7oJXx3MgffUmEcQO-2c',
  authDomain: 'travel-app-a3c30.firebaseapp.com',
  projectId: 'travel-app-a3c30',
  storageBucket: 'travel-app-a3c30.firebasestorage.app',
  messagingSenderId: '78143970834',
  appId: '1:78143970834:web:6a263afb74ac23890d02cb',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
