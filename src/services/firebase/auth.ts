/**
 * Firebase Authentication サービス
 * ユーザー認証関連の機能を提供
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

// Apple認証はiOSのみでインポート
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appleAuth = Platform.OS === 'ios' ? require('@invertase/react-native-apple-authentication').appleAuth : null;

export type User = FirebaseAuthTypes.User;

// 認証プロバイダーの種類
export type AuthProvider = 'password' | 'google.com' | 'apple.com' | 'anonymous';

/**
 * 現在のユーザーの連携済みプロバイダーを取得
 */
export const getLinkedProviders = (): AuthProvider[] => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    return [];
  }
  return currentUser.providerData.map(provider => provider.providerId as AuthProvider);
};

/**
 * 指定したプロバイダーで連携済みかどうかを確認
 */
export const isLinkedWithProvider = (providerId: AuthProvider): boolean => {
  const providers = getLinkedProviders();
  return providers.includes(providerId);
};

/**
 * 匿名ユーザーかどうかを確認
 */
export const isAnonymousUser = (): boolean => {
  const currentUser = auth().currentUser;
  return currentUser?.isAnonymous ?? false;
};

// Google Sign-In の設定
GoogleSignin.configure({
  webClientId: '882479887406-fu7bih5n3ddlppr1du8qqecrcf0dstnf.apps.googleusercontent.com',
  iosClientId: '882479887406-e4u4v0e8e63lepdlgcc5oqa0jcc7sh7v.apps.googleusercontent.com',
  offlineAccess: true,
});

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
 * 現在のアカウントにメール認証を追加（匿名・既存アカウント両対応）
 */
export const linkAccountWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const credential = auth.EmailAuthProvider.credential(email, password);
    const currentUser = auth().currentUser;

    if (!currentUser) {
      throw new Error('ログインしていません');
    }

    // 既にメール認証で連携済みの場合はエラー
    if (isLinkedWithProvider('password')) {
      throw new Error('既にメールアドレスで連携済みです');
    }

    const userCredential = await currentUser.linkWithCredential(credential);
    return userCredential.user;
  } catch (error) {
    console.error('メールアカウントリンクエラー:', error);
    throw error;
  }
};

/**
 * 匿名アカウントをメールアカウントにアップグレード（後方互換性のため残す）
 */
export const linkAnonymousAccountWithEmail = linkAccountWithEmail;

/**
 * Googleでサインイン
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    // Google Play Servicesが利用可能か確認
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // 既存のサインインセッションをクリア
    try {
      await GoogleSignin.signOut();
    } catch {
      // サインアウトエラーは無視（サインインしていない場合など）
    }

    // Googleサインインフローを開始
    const signInResult = await GoogleSignin.signIn();

    // IDトークンを取得
    const idToken = signInResult.data?.idToken;
    if (!idToken) {
      throw new Error('Google認証に失敗しました（IDトークンが取得できません）');
    }

    // Firebase認証情報を作成
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Firebaseでサインイン
    const userCredential = await auth().signInWithCredential(googleCredential);
    return userCredential.user;
  } catch (error) {
    console.error('Googleサインインエラー:', error);
    throw error;
  }
};

/**
 * 現在のアカウントにGoogle認証を追加（匿名・既存アカウント両対応）
 */
export const linkAccountWithGoogle = async (): Promise<User> => {
  try {
    // 既にGoogle認証で連携済みの場合はエラー
    if (isLinkedWithProvider('google.com')) {
      throw new Error('既にGoogleアカウントで連携済みです');
    }

    // Google Play Servicesが利用可能か確認
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // 既存のサインインセッションをクリア
    try {
      await GoogleSignin.signOut();
    } catch {
      // サインアウトエラーは無視（サインインしていない場合など）
    }

    // Googleサインインフローを開始
    const signInResult = await GoogleSignin.signIn();

    // IDトークンを取得
    const idToken = signInResult.data?.idToken;
    if (!idToken) {
      throw new Error('Google認証に失敗しました（IDトークンが取得できません）');
    }

    // Firebase認証情報を作成
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('ログインしていません');
    }

    // 現在のアカウントにGoogleアカウントをリンク
    const userCredential = await currentUser.linkWithCredential(googleCredential);
    return userCredential.user;
  } catch (error) {
    console.error('Googleアカウントリンクエラー:', error);
    throw error;
  }
};

/**
 * 匿名アカウントをGoogleアカウントにアップグレード（後方互換性のため残す）
 */
export const linkAnonymousAccountWithGoogle = linkAccountWithGoogle;

/**
 * Apple でサインイン（iOS のみ）
 */
export const signInWithApple = async (): Promise<User> => {
  if (Platform.OS !== 'ios' || !appleAuth) {
    throw new Error('AppleサインインはiOSのみ対応しています');
  }

  try {
    // Appleサインインリクエストを実行
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    // 認証状態を確認
    const credentialState = await appleAuth.getCredentialStateForUser(
      appleAuthRequestResponse.user
    );

    if (credentialState !== appleAuth.State.AUTHORIZED) {
      throw new Error('Apple認証が承認されませんでした');
    }

    const { identityToken, nonce } = appleAuthRequestResponse;
    if (!identityToken) {
      throw new Error('Apple認証に失敗しました（IDトークンが取得できません）');
    }

    // Firebase認証情報を作成
    const appleCredential = auth.AppleAuthProvider.credential(
      identityToken,
      nonce
    );

    // Firebaseでサインイン
    const userCredential = await auth().signInWithCredential(appleCredential);
    return userCredential.user;
  } catch (error) {
    console.error('Appleサインインエラー:', error);
    throw error;
  }
};

/**
 * 匿名アカウントをAppleアカウントにアップグレード（iOS のみ）
 */
export const linkAnonymousAccountWithApple = async (): Promise<User> => {
  if (Platform.OS !== 'ios' || !appleAuth) {
    throw new Error('AppleサインインはiOSのみ対応しています');
  }

  try {
    // Appleサインインリクエストを実行
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    // 認証状態を確認
    const credentialState = await appleAuth.getCredentialStateForUser(
      appleAuthRequestResponse.user
    );

    if (credentialState !== appleAuth.State.AUTHORIZED) {
      throw new Error('Apple認証が承認されませんでした');
    }

    const { identityToken, nonce } = appleAuthRequestResponse;
    if (!identityToken) {
      throw new Error('Apple認証に失敗しました（IDトークンが取得できません）');
    }

    // Firebase認証情報を作成
    const appleCredential = auth.AppleAuthProvider.credential(
      identityToken,
      nonce
    );

    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('ログインしていません');
    }

    // 匿名アカウントとAppleアカウントをリンク
    const userCredential = await currentUser.linkWithCredential(appleCredential);
    return userCredential.user;
  } catch (error) {
    console.error('Appleアカウントリンクエラー:', error);
    throw error;
  }
};

/**
 * アカウントを削除
 */
export const deleteAccount = async (): Promise<void> => {
  try {
    const currentUser = auth().currentUser;

    if (!currentUser) {
      throw new Error('ログインしていません');
    }

    await currentUser.delete();
  } catch (error) {
    console.error('アカウント削除エラー:', error);
    throw error;
  }
};

/**
 * Firebaseエラーメッセージを日本語に変換
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const errorCode = (error as FirebaseAuthTypes.NativeFirebaseAuthError).code;
    const errorMessage = error.message;

    // Google Sign-In エラー
    if (errorMessage?.includes('SIGN_IN_CANCELLED') || errorCode === String(statusCodes.SIGN_IN_CANCELLED)) {
      return 'サインインがキャンセルされました';
    }
    if (errorMessage?.includes('IN_PROGRESS') || errorCode === String(statusCodes.IN_PROGRESS)) {
      return 'サインイン処理中です';
    }
    if (errorMessage?.includes('PLAY_SERVICES_NOT_AVAILABLE') || errorCode === String(statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) {
      return 'Google Play Servicesが利用できません';
    }

    // Apple Sign-In エラー
    if (errorMessage?.includes('1001') || errorMessage?.includes('canceled')) {
      return 'サインインがキャンセルされました';
    }

    switch (errorCode) {
      // ユーザー登録関連
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています';
      case 'auth/invalid-email':
        return 'メールアドレスの形式が正しくありません';
      case 'auth/operation-not-allowed':
        return 'この操作は許可されていません';
      case 'auth/weak-password':
        return 'パスワードが弱すぎます（6文字以上必要です）';

      // ログイン関連
      case 'auth/user-disabled':
        return 'このアカウントは無効になっています';
      case 'auth/user-not-found':
        return 'アカウントが見つかりません';
      case 'auth/wrong-password':
        return 'パスワードが正しくありません';
      case 'auth/invalid-credential':
        return 'メールアドレスまたはパスワードが正しくありません';

      // レート制限・ネットワーク関連
      case 'auth/too-many-requests':
        return 'リクエストが多すぎます。しばらく待ってから再試行してください';
      case 'auth/network-request-failed':
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください';

      // 匿名認証関連
      case 'auth/admin-restricted-operation':
        return 'この操作は制限されています';

      // メール認証関連
      case 'auth/expired-action-code':
        return 'このリンクは有効期限が切れています';
      case 'auth/invalid-action-code':
        return 'このリンクは無効です';

      // アカウント関連
      case 'auth/requires-recent-login':
        return 'セキュリティのため、再度ログインしてください';
      case 'auth/credential-already-in-use':
        return 'この認証情報は既に別のアカウントで使用されています';
      case 'auth/email-change-needs-verification':
        return 'メールアドレスの変更には確認が必要です';

      // セッション関連
      case 'auth/user-token-expired':
        return 'セッションが期限切れです。再度ログインしてください';
      case 'auth/invalid-user-token':
        return 'セッションが無効です。再度ログインしてください';

      // その他
      case 'auth/internal-error':
        return 'サーバーエラーが発生しました。しばらく待ってから再試行してください';
      case 'auth/invalid-api-key':
        return 'アプリの設定に問題があります';
      case 'auth/app-not-authorized':
        return 'このアプリは認証サービスの使用を許可されていません';
      case 'auth/keychain-error':
        return 'キーチェーンへのアクセスに失敗しました';
      case 'auth/missing-email':
        return 'メールアドレスを入力してください';
      case 'auth/missing-password':
        return 'パスワードを入力してください';

      default:
        console.warn('未対応のFirebaseエラーコード:', errorCode);
        return '認証エラーが発生しました。しばらく待ってから再試行してください';
    }
  }
  return '予期せぬエラーが発生しました';
};
