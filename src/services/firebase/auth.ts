/**
 * Firebase Authentication サービス
 * ユーザー認証関連の機能を提供
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type User = FirebaseAuthTypes.User;

/**
 * 現在のユーザーを取得
 */
export const getCurrentUser = (): User | null => {
  return auth().currentUser;
};

/**
 * メールアドレスとパスワードでユーザー登録
 */
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    throw error;
  }
};

/**
 * メールアドレスとパスワードでログイン
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    console.error('ログインエラー:', error);
    throw error;
  }
};

/**
 * 匿名ログイン（アカウント作成なしで使い始められる）
 */
export const signInAnonymously = async (): Promise<User> => {
  try {
    const userCredential = await auth().signInAnonymously();
    return userCredential.user;
  } catch (error) {
    console.error('匿名ログインエラー:', error);
    throw error;
  }
};

/**
 * ログアウト
 */
export const signOut = async (): Promise<void> => {
  try {
    await auth().signOut();
  } catch (error) {
    console.error('ログアウトエラー:', error);
    throw error;
  }
};

/**
 * パスワードリセットメールを送信
 */
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    await auth().sendPasswordResetEmail(email);
  } catch (error) {
    console.error('パスワードリセットメール送信エラー:', error);
    throw error;
  }
};

/**
 * 認証状態の変更を監視
 * @param callback ユーザー状態が変わった時に呼ばれる関数
 * @returns 購読解除関数
 */
export const onAuthStateChanged = (
  callback: (user: User | null) => void
): (() => void) => {
  return auth().onAuthStateChanged(callback);
};

/**
 * 匿名アカウントをメールアカウントにアップグレード
 */
export const linkAnonymousAccountWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const credential = auth.EmailAuthProvider.credential(email, password);
    const currentUser = auth().currentUser;

    if (!currentUser) {
      throw new Error('ログインしていません');
    }

    const userCredential = await currentUser.linkWithCredential(credential);
    return userCredential.user;
  } catch (error) {
    console.error('アカウントリンクエラー:', error);
    throw error;
  }
};

/**
 * Firebaseエラーメッセージを日本語に変換
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const errorCode = (error as FirebaseAuthTypes.NativeFirebaseAuthError).code;

    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています';
      case 'auth/invalid-email':
        return 'メールアドレスの形式が正しくありません';
      case 'auth/operation-not-allowed':
        return 'この操作は許可されていません';
      case 'auth/weak-password':
        return 'パスワードが弱すぎます（6文字以上必要です）';
      case 'auth/user-disabled':
        return 'このアカウントは無効になっています';
      case 'auth/user-not-found':
        return 'アカウントが見つかりません';
      case 'auth/wrong-password':
        return 'パスワードが正しくありません';
      case 'auth/invalid-credential':
        return 'メールアドレスまたはパスワードが正しくありません';
      case 'auth/too-many-requests':
        return 'リクエストが多すぎます。しばらく待ってから再試行してください';
      case 'auth/network-request-failed':
        return 'ネットワークエラーが発生しました';
      default:
        return error.message || '予期せぬエラーが発生しました';
    }
  }
  return '予期せぬエラーが発生しました';
};
