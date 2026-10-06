import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { isNativeApp } from './utils/nativePlatform';

export const OWNER_EMAIL = 'leechaeyun95@gmail.com';

// 소유자 외에 모든 여행에 예외적으로 전체 접근 권한을 갖는 계정.
const EXTRA_ACCESS_EMAILS = ['jebjebh@gmail.com'];

export function hasFullAccess(email: string): boolean {
  return email === OWNER_EMAIL || EXTRA_ACCESS_EMAILS.includes(email);
}

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
// 네이티브 앱의 capacitor:// 출처에서는 팝업/리다이렉트용 iframe 로딩이 막혀 인증 초기화가 멈추므로 resolver 없이 초기화한다.
export const auth = isNativeApp() ? initializeAuth(app, { persistence: indexedDBLocalPersistence }) : getAuth(app);
export const googleProvider = new GoogleAuthProvider();
