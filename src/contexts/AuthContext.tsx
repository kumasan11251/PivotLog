/**
 * 認証コンテキスト
 * アプリ全体で認証状態を共有するためのContext
 * 初回起動時・ログアウト後は認証画面を表示
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously, User, signOut as firebaseSignOut } from '../services/firebase';
import { syncWidgetSettingsFromCloud } from '../utils/widgetStorage';
import { logoutRevenueCat } from '../services/revenueCat';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** ログイン画面を表示すべきかどうか（初回起動時・ログアウト後） */
  showAuthScreen: boolean;
  /** ログアウト経由で認証画面に戻ったかどうか */
  isReturningUser: boolean;
  /** ログアウト処理（AuthContextが状態を管理） */
  logout: () => Promise<void>;
  /** 匿名ログインで始める */
  startAnonymously: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  showAuthScreen: false,
  isReturningUser: false,
  logout: async () => {},
  startAnonymously: async () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);

  useEffect(() => {
    // 認証状態の変更を監視
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // 既にログイン済み
        setUser(firebaseUser);
        setShowAuthScreen(false);
        setIsLoading(false);

        // ウィジェット設定をクラウドから同期
        syncWidgetSettingsFromCloud().catch((error) => {
          console.error('[AuthContext] ウィジェット設定の同期エラー:', error);
        });
      } else {
        // 未ログインの場合は認証画面を表示
        setUser(null);
        setShowAuthScreen(true);
        setIsLoading(false);
      }
    });

    // クリーンアップ
    return unsubscribe;
  }, []);

  // ログアウト処理
  const logout = useCallback(async () => {
    try {
      // RevenueCatリセットは失敗してもログアウトをブロックしない
      try {
        await logoutRevenueCat();
      } catch (rcError) {
        console.error('RevenueCat logout failed:', rcError);
      }
      // Firebaseからログアウト
      await firebaseSignOut();
      // 状態を更新（onAuthStateChangedでも更新されるが、即座に反映するため）
      setUser(null);
      setIsReturningUser(true);
      setShowAuthScreen(true);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  }, []);

  // 匿名ログインで始める
  const startAnonymously = useCallback(async () => {
    try {
      await signInAnonymously();
      // onAuthStateChangedが呼ばれて状態が更新される
    } catch (error) {
      console.error('匿名ログインエラー:', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    showAuthScreen,
    isReturningUser,
    logout,
    startAnonymously,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * 認証状態を取得するカスタムフック
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
