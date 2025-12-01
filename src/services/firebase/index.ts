/**
 * Firebase サービスのエクスポート
 */

// Firebase設定
export { default as firebase, db, COLLECTIONS, isFirebaseInitialized } from './config';

// 認証サービス
export {
  getCurrentUser,
  signUpWithEmail,
  signInWithEmail,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  linkAnonymousAccountWithEmail,
  deleteAccount,
  getErrorMessage,
} from './auth';
export type { User } from './auth';

// Firestoreサービス
export {
  saveUserSettingsToFirestore,
  loadUserSettingsFromFirestore,
  saveHomeDisplaySettingsToFirestore,
  loadHomeDisplaySettingsFromFirestore,
  saveDiaryEntryToFirestore,
  loadDiaryEntriesFromFirestore,
  getDiaryByDateFromFirestore,
  deleteDiaryEntryFromFirestore,
  getDiariesByMonthFromFirestore,
} from './firestore';
export type { UserSettings, DiaryEntry, HomeDisplaySettings } from './firestore';
