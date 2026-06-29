/**
 * Firebase設定ファイル
 * @react-native-firebase/app は app.config.js のプラグイン設定で自動的に初期化されます
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
  APP_CONFIG: 'appConfig',
} as const;

// ユーザーのサブコレクション（アカウント削除時に全削除する対象）
// 注意: USERS / APP_CONFIG はユーザーのサブコレクションではないため含めない。
//       新しいユーザーサブコレクションを追加したら、この配列にも1行足すこと。
export const USER_SUBCOLLECTIONS = [
  COLLECTIONS.SETTINGS,
  COLLECTIONS.DIARIES,
  COLLECTIONS.WEEKLY_INSIGHTS,
  COLLECTIONS.MONTHLY_INSIGHTS,
  COLLECTIONS.USAGE,
  COLLECTIONS.SUBSCRIPTION,
] as const;

export default firebase;
