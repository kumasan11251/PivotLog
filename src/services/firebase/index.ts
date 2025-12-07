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
  signInWithGoogle,
  signInWithApple,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  linkAnonymousAccountWithEmail,
  linkAnonymousAccountWithGoogle,
  linkAnonymousAccountWithApple,
  linkAccountWithEmail,
  linkAccountWithGoogle,
  getLinkedProviders,
  isLinkedWithProvider,
  isAnonymousUser,
  deleteAccount,
  getErrorMessage,
} from './auth';
export type { User, AuthProvider } from './auth';

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
