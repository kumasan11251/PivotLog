/**
 * テーマコンテキスト
 * アプリ全体でテーマ（ライト/ダーク/システム）設定を共有するためのContext
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { loadThemeSettings, saveThemeSettings } from '../utils/storage';
import { syncWidgetData } from '../utils/widgetStorage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  /** 現在のテーマ設定（light/dark/system） */
  themeMode: ThemeMode;
  /** 実際に適用されるカラースキーム（light/dark） */
  colorScheme: ColorScheme;
  /** ダークモードかどうか */
  isDark: boolean;
  /** テーマを変更する */
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  /** テーマ読み込み中かどうか */
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  colorScheme: 'light',
  isDark: false,
  setThemeMode: async () => {},
  isLoading: true,
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);
  const prevSystemColorScheme = useRef(systemColorScheme);

  // テーマ設定を読み込む
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await loadThemeSettings();
        if (settings?.themeMode) {
          setThemeModeState(settings.themeMode);
        }
      } catch (error) {
        console.error('テーマ設定の読み込みに失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // 実際に適用するカラースキームを計算
  const colorScheme: ColorScheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const isDark = colorScheme === 'dark';

  // システムテーマ変更時にウィジェットを再同期（themeMode === 'system' の場合のみ）
  useEffect(() => {
    // ローディング中や初回レンダリング時はスキップ
    if (isLoading) return;

    // themeMode が 'system' の場合のみ
    if (themeMode !== 'system') return;

    // システムカラースキームが変わった場合
    if (prevSystemColorScheme.current !== systemColorScheme) {
      prevSystemColorScheme.current = systemColorScheme;
      // ウィジェットを再同期（非同期で実行）
      syncWidgetData().catch((error) => {
        console.error('[ThemeContext] ウィジェット再同期エラー:', error);
      });
    }
  }, [systemColorScheme, themeMode, isLoading]);

  // テーマを変更して保存
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await saveThemeSettings({ themeMode: mode });
      // ウィジェットにテーマ変更を反映
      await syncWidgetData();
    } catch (error) {
      console.error('テーマ設定の保存に失敗:', error);
    }
  }, []);

  const value: ThemeContextType = useMemo(() => ({
    themeMode,
    colorScheme,
    isDark,
    setThemeMode,
    isLoading,
  }), [themeMode, colorScheme, isDark, setThemeMode, isLoading]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * テーマ設定を取得するカスタムフック
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
