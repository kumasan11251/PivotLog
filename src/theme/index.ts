// テーマ全体をまとめてエクスポート
export { colors, lightColors, darkColors } from './colors';
export type { Colors } from './colors';
export { fonts, textBase } from './fonts';
export { spacing } from './spacing';

// まとめたthemeオブジェクト
import { colors, lightColors, darkColors } from './colors';
import { fonts } from './fonts';
import { spacing } from './spacing';

export const theme = {
  colors,
  fonts,
  spacing,
} as const;

export type Theme = typeof theme;

/**
 * カラースキームに応じた色を取得する関数
 */
export const getColors = (isDark: boolean) => isDark ? darkColors : lightColors;
