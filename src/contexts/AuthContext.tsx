/**
 * 認証コンテキスト
 * アプリ全体で認証状態を共有するためのContext
 * 初回起動時は自動的に匿名ログインを実行
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, User } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 認証状態の変更を監視
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // 既にログイン済み
        setUser(firebaseUser);
        setIsLoading(false);
      } else {
        // 未ログインの場合は自動的に匿名ログイン
        try {
          await signInAnonymously();
          // onAuthStateChangedが再度呼ばれるので、ここでは何もしない
        } catch (error) {
          console.error('自動匿名ログインエラー:', error);
          setIsLoading(false);
        }
      }
    });

    // クリーンアップ
    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
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
