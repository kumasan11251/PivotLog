// カラーパレット定義
export const colors = {
  // プライマリカラー
  primary: '#8B9D83', // セージグリーン（メインアクセント）

  // 背景色
  background: '#FAFAFA', // メイン背景
  surface: '#FFFFFF', // カード・入力フィールド背景

  // テキストカラー
  text: {
    primary: '#2C2C2C', // メインテキスト
    secondary: '#999', // サブテキスト・ラベル
    inverse: '#FFFFFF', // ボタン内のテキストなど
  },

  // ボーダー・区切り線
  border: '#E0E0E0',

  // プログレスバー
  progress: {
    bar: '#8B9D83', // 進捗バー（プライマリと同じ）
    background: '#E0E0E0', // 進捗バー背景
  },

  // シャドウ
  shadow: '#000',
} as const;

export type Colors = typeof colors;
