// スペーシング（余白・サイズ）定義
export const spacing = {
  // 基本余白
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 48,

  // ボーダー半径
  borderRadius: {
    small: 6,
    medium: 8,
  },

  // パディング
  padding: {
    screen: 24, // 画面全体のパディング
    button: 18, // ボタン内パディング
    input: 16, // 入力フィールド内パディング
  },

  // ボーダー幅
  borderWidth: 1,

  // プログレスバー
  progressBar: {
    height: 12,
  },

  // シャドウ
  shadow: {
    offset: {
      width: 0,
      height: 2,
    },
    opacity: 0.1,
    radius: 4,
    elevation: 3, // Android用
  },

  // カウントダウン固定幅
  countdown: {
    blockWidthLarge: 50, // 年・月・日
    blockWidthSmall: 38, // 時・分・秒
  },
} as const;

export type Spacing = typeof spacing;
