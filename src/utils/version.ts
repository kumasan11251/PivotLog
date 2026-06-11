/**
 * バージョン文字列の比較ユーティリティ
 * セマンティックバージョン形式（例: "1.0.3"）を数値部分ごとに比較する
 */

/**
 * バージョン文字列として妥当かチェック（例: "1", "1.0", "1.0.3", "1.0.3.1"）
 */
export const isValidVersion = (v: string): boolean => {
  return /^\d+(\.\d+){0,3}$/.test(v);
};

/**
 * バージョン文字列を比較する
 * @returns a < b なら -1、a === b なら 0、a > b なら 1
 *
 * 桁数差は 0 埋めで揃える（"1.0.10" > "1.0.9" を正しく判定）
 */
export const compareVersions = (a: string, b: string): -1 | 0 | 1 => {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    // 桁が足りない側と NaN は 0 扱い（防御）
    const numA = Number.isNaN(partsA[i]) || partsA[i] === undefined ? 0 : partsA[i];
    const numB = Number.isNaN(partsB[i]) || partsB[i] === undefined ? 0 : partsB[i];
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
};
