import { Platform } from 'react-native';

// Android用のフォントパディング無効化（iOSとの高さ差を解消）
export const textBase = Platform.select({
  android: {
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
  },
  ios: {},
  default: {},
});

// フォント定義
export const fonts = {
  // フォントファミリー
  family: {
    regular: 'NotoSansJP_400Regular',
    bold: 'NotoSansJP_700Bold',
  },

  // フォントサイズ
  size: {
    // カウントダウン数字
    countdownLarge: 38, // 年・月・日（少し大きく）
    countdownSmall: 26, // 時・分・秒（少し大きく）

    // セクションタイトル
    sectionTitle: 20, // 「残りの時間」「人生の進捗」

    // プログレス用（円グラフ中央のパーセンテージにも流用）
    progressLarge: 38, // プログレスのパーセンテージ（少し大きく）
    // タイトル・見出し
    title: 24,
    heading: 28,

    // 本文・ラベル
    body: 16,
    label: 14,
    labelSmall: 12,

    // 入力フィールド
    input: 18,
  },

  // 行の高さ
  lineHeight: {
    countdownLarge: 44, // フォントサイズ38より大きく
    countdownSmall: 32, // フォントサイズ26より大きく
  },

  // フォントウェイト
  weight: {
    light: '200' as const,
    regular: '300' as const,
    medium: '400' as const,
    semibold: '600' as const,
  },
} as const;

export type Fonts = typeof fonts;
