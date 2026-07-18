/**
 * 月相計算ユーティリティ
 * ホーム画面の夜間の月表示に使用する
 */

/** 朔望月（新月から次の新月までの平均日数） */
const SYNODIC_MONTH_DAYS = 29.530588853;

/** 基準とする新月の時刻（2000-01-06 18:14 UTC） */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** 月を表示する夜間帯の開始時刻 */
export const NIGHT_START_HOUR = 19;

/** 月を表示する夜間帯の終了時刻（この時刻になったら非表示） */
export const NIGHT_END_HOUR = 5;

/**
 * 月相を0〜1で返す（0=新月、0.25=上弦、0.5=満月、0.75=下弦）
 */
export const getMoonPhase = (date: Date): number => {
  const daysSinceNewMoon = (date.getTime() - REFERENCE_NEW_MOON_MS) / MS_PER_DAY;
  const phase = (daysSinceNewMoon / SYNODIC_MONTH_DAYS) % 1;
  return phase < 0 ? phase + 1 : phase;
};

/**
 * 平均朔望月による誤差は最大で半日程度あり、満月の夜に僅かに欠けて
 * 見えると実際の空との違いに気づかれやすい。新月・満月の前後だけ
 * 値を丸めて、見た目を実際の空に寄せる。
 */
const SNAP_RANGE = 0.02;

/** 表示用の月相（新月・満月付近を丸めた値）を0〜1で返す */
export const getDisplayMoonPhase = (date: Date): number => {
  const phase = getMoonPhase(date);
  if (Math.abs(phase - 0.5) < SNAP_RANGE) return 0.5;
  if (phase < SNAP_RANGE || phase > 1 - SNAP_RANGE) return 0;
  return phase;
};

/**
 * 月を表示する夜間帯（19時〜翌5時）かどうか
 */
export const isNightTime = (date: Date): boolean => {
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
};

/**
 * 月の光っている部分を描くSVGパスを返す（北半球での見え方）。
 * 座標系は (radius, radius) を中心に直径いっぱいの正方形。
 * 外周の半円と、明暗境界線（楕円弧）で光る領域を囲む。
 */
export const getMoonLitPath = (phase: number, radius: number): string => {
  const r = radius;
  let terminatorRx: number;
  let terminatorSweep: 0 | 1;
  let edgeSweep: 0 | 1;

  if (phase <= 0.25) {
    // 新月 → 上弦：右側に細い三日月が育つ
    terminatorRx = r * (1 - phase * 4);
    terminatorSweep = 1;
    edgeSweep = 0;
  } else if (phase <= 0.5) {
    // 上弦 → 満月：境界線が左へ膨らむ
    terminatorRx = r * (phase * 4 - 1);
    terminatorSweep = 0;
    edgeSweep = 0;
  } else if (phase <= 0.75) {
    // 満月 → 下弦：右側から欠けていく
    terminatorRx = r * (3 - phase * 4);
    terminatorSweep = 1;
    edgeSweep = 1;
  } else {
    // 下弦 → 新月：左側の三日月が細くなる
    terminatorRx = r * (phase * 4 - 3);
    terminatorSweep = 0;
    edgeSweep = 1;
  }

  return (
    `M ${r} 0 ` +
    `A ${terminatorRx} ${r} 0 1 ${terminatorSweep} ${r} ${r * 2} ` +
    `A ${r} ${r} 0 1 ${edgeSweep} ${r} 0 Z`
  );
};
