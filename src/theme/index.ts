// テーマ全体をまとめてエクスポート
export { colors } from './colors';
export { fonts, textBase } from './fonts';
export { spacing } from './spacing';

// まとめたthemeオブジェクト
import { colors } from './colors';
import { fonts } from './fonts';
import { spacing } from './spacing';

export const theme = {
  colors,
  fonts,
  spacing,
} as const;

export type Theme = typeof theme;
