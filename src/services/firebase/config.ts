/**
 * Firebase設定ファイル
 * @react-native-firebase/app は app.json のプラグイン設定で自動的に初期化されます
 */
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Firebaseが初期化されているか確認
export const isFirebaseInitialized = (): boolean => {
  return firebase.apps.length > 0;
};

// Firebase Auth インスタンス
export const firebaseAuth = auth;

// Firestore インスタンス
export const db = firestore();

// Firestoreのコレクション名
export const COLLECTIONS = {
  USERS: 'users',
  SETTINGS: 'settings',
  DIARIES: 'diaries',
  WEEKLY_INSIGHTS: 'weeklyInsights',
  MONTHLY_INSIGHTS: 'monthlyInsights',
  USAGE: 'usage',
  SUBSCRIPTION: 'subscription',
} as const;

export default firebase;
