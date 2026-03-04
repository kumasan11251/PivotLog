// カラーパレット共通型定義
interface ColorPalette {
  primary: string;
  primaryDark: string;
  background: string;
  surface: string;
  card: string;
  text: {
    primary: string;
    secondary: string;
    placeholder: string;
    inverse: string;
  };
  border: string;
  progress: {
    bar: string;
    background: string;
  };
  error: string;
  shadow: string;
}

// ライトモード カラーパレット定義
export const lightColors: ColorPalette = {
  // プライマリカラー
  primary: '#8B9D83', // セージグリーン（メインアクセント）
  primaryDark: '#5A6B52', // セージグリーン（濃い・高コントラスト用）

  // 背景色
  background: '#F5F5F5', // メイン背景（少し暗く）
  surface: '#FFFFFF', // カード・入力フィールド背景
  card: '#FFFFFF', // カード背景

  // テキストカラー
  text: {
    primary: '#2C2C2C', // メインテキスト
    secondary: '#777777', // サブテキスト・ラベル（WCAG AAA準拠）
    placeholder: '#AAAAAA', // プレースホルダー
    inverse: '#FFFFFF', // ボタン内のテキストなど
  },

  // ボーダー・区切り線
  border: '#E0E0E0',

  // プログレスバー
  progress: {
    bar: '#8B9D83', // 進捗バー（プライマリと同じ）
    background: '#E0E0E0', // 進捗バー背景
  },

  // エラー・警告
  error: '#E57373', // エラー・削除アクション用

  // シャドウ
  shadow: '#000',
};

// ダークモード カラーパレット定義
export const darkColors: ColorPalette = {
  // プライマリカラー
  primary: '#A3B899', // セージグリーン（明るめ・ダーク背景用）
  primaryDark: '#8B9D83', // セージグリーン

  // 背景色
  background: '#121212', // メイン背景（ダーク）
  surface: '#1E1E1E', // カード・入力フィールド背景
  card: '#1E1E1E', // カード背景

  // テキストカラー
  text: {
    primary: '#F5F5F5', // メインテキスト
    secondary: '#B8B8B8', // サブテキスト・ラベル（WCAG AAA準拠）
    placeholder: '#707070', // プレースホルダー
    inverse: '#1E1E1E', // ボタン内のテキストなど
  },

  // ボーダー・区切り線
  border: '#333333',

  // プログレスバー
  progress: {
    bar: '#A3B899', // 進捗バー（プライマリと同じ）
    background: '#333333', // 進捗バー背景
  },

  // エラー・警告
  error: '#EF5350', // エラー・削除アクション用

  // シャドウ
  shadow: '#000',
};

// デフォルトエクスポート（後方互換性のため）
export const colors = lightColors;

export type Colors = ColorPalette;
