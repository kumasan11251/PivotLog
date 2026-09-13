import React, { memo, useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect, Use } from 'react-native-svg';

interface SeasonalBackdropProps {
  /** 1日の開始時刻を考慮した基準日（YYYY-MM-DD形式） */
  date: string;
  /** ダークモードかどうか */
  isDark: boolean;
}

export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonTheme {
  gradient: readonly [string, string, string];
  primary: string;
  secondary: string;
  accent: string;
  line: string;
  glow: string;
}

export const getBackdropMonth = (date: string): Month | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const month = Number(date.slice(5, 7));
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month as Month : null;
};

export const getSeason = (date: string): Season | null => {
  const month = getBackdropMonth(date);
  if (month === null) return null;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

export const getSeasonTheme = (season: Season, isDark: boolean): SeasonTheme => {
  const themes: Record<Season, { light: SeasonTheme; dark: SeasonTheme }> = {
    spring: {
      light: {
        gradient: ['#F8F3F1', '#EFF5ED', '#F5F3E9'],
        primary: '#D7AAB1',
        secondary: '#E7C5C9',
        accent: '#A6B99A',
        line: '#A0AC91',
        glow: '#F0D5B1',
      },
      dark: {
        gradient: ['#1A171A', '#17201C', '#1B1B18'],
        primary: '#C38F9A',
        secondary: '#D4AAB1',
        accent: '#7F9B7E',
        line: '#778A72',
        glow: '#D4B486',
      },
    },
    summer: {
      light: {
        gradient: ['#F4F6ED', '#EAF3F0', '#F4F1E7'],
        primary: '#89A98D',
        secondary: '#A8BE9E',
        accent: '#C4D4A8',
        line: '#9FC8C5',
        glow: '#E5E9C9',
      },
      dark: {
        gradient: ['#12191A', '#132326', '#191D1A'],
        primary: '#789A7E',
        secondary: '#9AB39B',
        accent: '#A8B990',
        line: '#8FB9B6',
        glow: '#B9C59D',
      },
    },
    autumn: {
      light: {
        gradient: ['#F6F1E8', '#F2E9DC', '#EEF0E7'],
        primary: '#C38E70',
        secondary: '#D0AA78',
        accent: '#9EA07A',
        line: '#A18A78',
        glow: '#E4D3B5',
      },
      dark: {
        gradient: ['#1C1816', '#241E19', '#191D19'],
        primary: '#A97962',
        secondary: '#B18E66',
        accent: '#7F896C',
        line: '#887263',
        glow: '#B69A76',
      },
    },
    winter: {
      light: {
        gradient: ['#F3F6F7', '#E8EFF2', '#F1F2EF'],
        primary: '#B4C9D1',
        secondary: '#D2DFE3',
        accent: '#9FB5BF',
        line: '#98ACB4',
        glow: '#DCE8EA',
      },
      dark: {
        gradient: ['#12171C', '#162028', '#191C21'],
        primary: '#86A5B2',
        secondary: '#A9BEC6',
        accent: '#D2DEE2',
        line: '#78939E',
        glow: '#B8CDD4',
      },
    },
  };

  return themes[season][isDark ? 'dark' : 'light'];
};

// ホームと設定プレビューで共有する月別の名前・基準日。
export const MONTH_BACKDROPS: ReadonlyArray<{ month: Month; label: string; date: string }> = [
  { month: 1, label: '静かな雪', date: '2000-01-01' },
  { month: 2, label: '梅のつぼみ', date: '2000-02-01' },
  { month: 3, label: '芽吹き', date: '2000-03-01' },
  { month: 4, label: '桜', date: '2000-04-01' },
  { month: 5, label: '新緑', date: '2000-05-01' },
  { month: 6, label: '雨と紫陽花', date: '2000-06-01' },
  { month: 7, label: '水辺の波紋', date: '2000-07-01' },
  { month: 8, label: '夏の葉', date: '2000-08-01' },
  { month: 9, label: 'すすき', date: '2000-09-01' },
  { month: 10, label: '色づくもみじ', date: '2000-10-01' },
  { month: 11, label: '紅葉', date: '2000-11-01' },
  { month: 12, label: '霜のきらめき', date: '2000-12-01' },
];

type ThemePair = { light: SeasonTheme; dark: SeasonTheme };

// 季節の基調を残し、月ごとの色温度と装飾色を調整する。
const MONTH_THEME_OVERRIDES: Partial<Record<Month, ThemePair>> = {
  2: {
    light: { gradient: ['#F7F1F2', '#F1EEF0', '#F4F3ED'], primary: '#C794A4', secondary: '#DBB5BE', accent: '#B1AD96', line: '#AC969A', glow: '#E8D4B5' },
    dark: { gradient: ['#20181D', '#1C1B23', '#1D1E1B'], primary: '#B58496', secondary: '#CC9FAC', accent: '#96967C', line: '#917D86', glow: '#C7B18E' },
  },
  6: {
    light: { gradient: ['#F1EFF7', '#EBF1F6', '#EEF3F0'], primary: '#A69FC4', secondary: '#B2BFD8', accent: '#95B5A9', line: '#A0B3C5', glow: '#D8DDEE' },
    dark: { gradient: ['#1B1925', '#17202A', '#18221F'], primary: '#9A90BB', secondary: '#96A9C7', accent: '#789E91', line: '#7F9CB4', glow: '#B5BBDD' },
  },
  7: {
    light: { gradient: ['#EFF6F7', '#E7F2F4', '#EEF4EF'], primary: '#89B5C3', secondary: '#ACCCD2', accent: '#9BBDAE', line: '#91B7C6', glow: '#DBE9E7' },
    dark: { gradient: ['#131D24', '#13252B', '#17221F'], primary: '#78A6B9', secondary: '#99BEC8', accent: '#80A596', line: '#709DAE', glow: '#AACACD' },
  },
  9: {
    light: { gradient: ['#F7F3E9', '#F2EFE2', '#F0F2E9'], primary: '#BCA574', secondary: '#D0BC8F', accent: '#A9B08B', line: '#A99D80', glow: '#E8DFC1' },
    dark: { gradient: ['#201D17', '#242218', '#1C211A'], primary: '#AB966A', secondary: '#BFAA7E', accent: '#939C78', line: '#90866C', glow: '#C7B88D' },
  },
  10: {
    light: { gradient: ['#F8F2E8', '#F5EBDD', '#F3F0E6'], primary: '#C77845', secondary: '#D3A04E', accent: '#BD6254', line: '#AA9278', glow: '#E8D6B5' },
    dark: { gradient: ['#211B17', '#272018', '#201E18'], primary: '#C58D61', secondary: '#CCAA68', accent: '#C27D6E', line: '#917D67', glow: '#C2AA80' },
  },
  12: {
    light: { gradient: ['#F0F3F7', '#E9EEF5', '#F1F2F5'], primary: '#ACBED5', secondary: '#CDD8E7', accent: '#B8C9DA', line: '#9DAFC4', glow: '#E1E7F2' },
    dark: { gradient: ['#161A24', '#192131', '#1C1F29'], primary: '#92A9C5', secondary: '#B3C2D7', accent: '#C1CFDF', line: '#8096B2', glow: '#C8D5E8' },
  },
};

/** 日付から月別テーマを取得。1・4・8・11月は従来の四季の基調。 */
export const getBackdropTheme = (date: string, isDark: boolean): SeasonTheme | null => {
  const season = getSeason(date);
  if (season === null) return null;
  const base = getSeasonTheme(season, isDark);
  const month = getBackdropMonth(date);
  if (month === null) return null;
  const override = MONTH_THEME_OVERRIDES[month];
  if (override) return override[isDark ? 'dark' : 'light'];
  if (month === 3) {
    return isDark ? {
      ...base,
      gradient: ['#171D19', '#19211C', '#1C1E18'],
      primary: '#9CAD82', secondary: '#B3BE96', accent: '#8EA782',
      line: '#829076', glow: '#C8C399',
    } : {
      ...base,
      gradient: ['#F2F5EC', '#EDF3E8', '#F6F3E9'],
      primary: '#A4B58C', secondary: '#C3CDA8', accent: '#97AF89',
      line: '#99A58A', glow: '#E4DEC0',
    };
  }
  if (month === 5) {
    return isDark ? {
      ...base,
      gradient: ['#131D19', '#16231C', '#1B2018'],
      primary: '#7FA984', secondary: '#A1BB91', accent: '#B0C18C',
      line: '#7D9878', glow: '#C8C897',
    } : {
      ...base,
      gradient: ['#EEF5EC', '#E8F2E9', '#F4F4E7'],
      primary: '#8FB095', secondary: '#ADC69A', accent: '#BDCDA0',
      line: '#96AE8B', glow: '#E4E6BC',
    };
  }
  return base;
};

interface PositionedMotifProps {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  color: string;
  detailColor: string;
  opacity: number;
}

const SakuraBloom: React.FC<PositionedMotifProps> = ({
  x,
  y,
  scale = 1,
  rotation = 0,
  color,
  detailColor,
  opacity,
}) => (
  <G transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`} opacity={opacity}>
    {[0, 72, 144, 216, 288].map(angle => (
      <Path
        key={angle}
        d="M0 -3 C-10 -8 -14 -20 -5 -28 C-2 -30 0 -25 0 -21 C0 -25 2 -30 5 -28 C14 -20 10 -8 0 -3 Z"
        fill={color}
        transform={`rotate(${angle})`}
      />
    ))}
    <Circle cx="0" cy="0" r="5" fill={detailColor} />
  </G>
);

const MapleLeaf: React.FC<PositionedMotifProps> = ({
  x,
  y,
  scale = 1,
  rotation = 0,
  color,
  detailColor,
  opacity,
}) => (
  <G transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`} opacity={opacity}>
    <Path
      d="M0 -31 L7 -17 L17 -23 L14 -9 L30 -12 L21 1 L31 7 L14 11 L17 26 L4 17 L0 34 L-4 17 L-17 26 L-14 11 L-31 7 L-21 1 L-30 -12 L-14 -9 L-17 -23 L-7 -17 Z"
      fill={color}
    />
    <Path d="M0 -21 L0 38 M0 7 L15 -3 M0 12 L-14 3" fill="none" stroke={detailColor} strokeWidth="1.4" strokeLinecap="round" />
  </G>
);

const Snowflake: React.FC<PositionedMotifProps> = ({
  x,
  y,
  scale = 1,
  rotation = 0,
  color,
  opacity,
}) => (
  <G
    transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    opacity={opacity}
  >
    <Path d="M0 -27 L0 27 M-24 -14 L24 14 M-24 14 L24 -14" />
    <Path d="M0 -18 L-6 -12 M0 -18 L6 -12 M0 18 L-6 12 M0 18 L6 12" />
    <Path d="M-16 -9 L-9 -9 M-16 -9 L-13 -3 M16 9 L9 9 M16 9 L13 3" />
    <Path d="M16 -9 L9 -9 M16 -9 L13 -3 M-16 9 L-9 9 M-16 9 L-13 3" />
  </G>
);

interface BotanicalLeafProps {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  color: string;
  veinColor: string;
  opacity: number;
}

/** 付け根から細く立ち上がり、先端が鋭く閉じる若葉。 */
const BotanicalLeaf: React.FC<BotanicalLeafProps> = ({
  x,
  y,
  scale = 1,
  rotation = 0,
  color,
  veinColor,
  opacity,
}) => (
  <G transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`} opacity={opacity}>
    <Path d="M0 0 C8 -13 21 -21 36 -22 C31 -8 18 1 0 0 Z" fill={color} />
    <Path d="M2 -1 C13 -7 24 -14 34 -21" fill="none" stroke={veinColor} strokeWidth="0.65" strokeLinecap="round" opacity="0.5" />
  </G>
);

const SpringMotif: React.FC<{ theme: SeasonTheme; isDark: boolean }> = ({ theme, isDark }) => {
  const bloomOpacity = isDark ? 0.24 : 0.32;
  const leafOpacity = isDark ? 0.16 : 0.23;

  return (
    <>
      {/* 上部は夏と同じ骨格で、左右から桜の枝を差し込む */}
      <G fill="none" stroke={theme.line} strokeLinecap="round" opacity={isDark ? 0.14 : 0.2}>
        <Path d="M-24 70 C17 83 42 106 67 136 C86 159 104 176 137 190" strokeWidth="1.1" />
        <Path d="M30 101 C46 94 59 84 70 72 M62 137 C77 128 90 118 101 105" strokeWidth="0.65" />
        <Path d="M414 69 C379 82 356 105 333 136 C313 162 292 179 260 193" strokeWidth="1.05" />
        <Path d="M374 102 C358 93 346 83 336 70 M344 137 C329 127 317 116 307 103" strokeWidth="0.62" />
      </G>

      <SakuraBloom x={24} y={121} scale={0.42} rotation={-8} color={theme.secondary} detailColor={theme.glow} opacity={bloomOpacity - 0.03} />
      <SakuraBloom x={67} y={143} scale={0.54} rotation={11} color={theme.primary} detailColor={theme.glow} opacity={bloomOpacity} />
      <SakuraBloom x={109} y={165} scale={0.36} rotation={-14} color={theme.secondary} detailColor={theme.glow} opacity={bloomOpacity - 0.05} />
      <BotanicalLeaf x={42} y={132} scale={0.42} rotation={-24} color={theme.accent} veinColor={theme.line} opacity={leafOpacity} />
      <BotanicalLeaf x={88} y={157} scale={0.38} rotation={52} color={theme.accent} veinColor={theme.line} opacity={leafOpacity - 0.03} />

      <SakuraBloom x={370} y={121} scale={0.45} rotation={9} color={theme.primary} detailColor={theme.glow} opacity={bloomOpacity} />
      <SakuraBloom x={329} y={145} scale={0.56} rotation={-12} color={theme.secondary} detailColor={theme.glow} opacity={bloomOpacity - 0.01} />
      <SakuraBloom x={287} y={167} scale={0.34} rotation={15} color={theme.primary} detailColor={theme.glow} opacity={bloomOpacity - 0.05} />
      <BotanicalLeaf x={351} y={134} scale={0.4} rotation={-145} color={theme.accent} veinColor={theme.line} opacity={leafOpacity} />
      <BotanicalLeaf x={308} y={159} scale={0.38} rotation={-91} color={theme.accent} veinColor={theme.line} opacity={leafOpacity - 0.03} />

      {/* 中段には花びらだけを疎らに置き、中央の余白は崩さない */}
      <G fill={theme.primary} opacity={isDark ? 0.1 : 0.15}>
        <Path d="M29 323 C21 317 22 307 30 304 C34 310 34 317 29 323 Z" transform="rotate(-21 29 313)" />
        <Path d="M363 407 C355 401 356 391 364 388 C368 394 368 401 363 407 Z" transform="rotate(27 363 397)" />
        <Path d="M38 536 C30 530 31 520 39 517 C43 523 43 530 38 536 Z" transform="rotate(16 38 526)" />
        <Path d="M351 611 C343 605 344 595 352 592 C356 598 356 605 351 611 Z" transform="rotate(-25 351 601)" />
      </G>

      {/* 下部は左右の桜枝で囲い、スクロール後も画像案の構図を保つ */}
      <G fill="none" stroke={theme.line} strokeLinecap="round" opacity={isDark ? 0.13 : 0.19}>
        <Path d="M-26 858 C9 819 30 778 57 738 C79 705 104 681 143 661" strokeWidth="1.15" />
        <Path d="M24 800 C42 794 57 785 70 774 M54 748 C70 743 84 736 98 724" strokeWidth="0.65" />
        <Path d="M418 858 C385 822 364 784 339 746 C318 714 294 690 255 669" strokeWidth="1.1" />
        <Path d="M389 810 C372 803 358 795 345 784 M359 763 C343 756 329 748 316 736" strokeWidth="0.62" />
      </G>
      <SakuraBloom x={29} y={789} scale={0.44} rotation={-11} color={theme.secondary} detailColor={theme.glow} opacity={bloomOpacity - 0.04} />
      <SakuraBloom x={72} y={727} scale={0.5} rotation={13} color={theme.primary} detailColor={theme.glow} opacity={bloomOpacity - 0.02} />
      <SakuraBloom x={111} y={680} scale={0.32} rotation={-8} color={theme.secondary} detailColor={theme.glow} opacity={bloomOpacity - 0.07} />
      <BotanicalLeaf x={48} y={758} scale={0.4} rotation={-47} color={theme.accent} veinColor={theme.line} opacity={leafOpacity - 0.02} />

      <SakuraBloom x={364} y={793} scale={0.44} rotation={10} color={theme.primary} detailColor={theme.glow} opacity={bloomOpacity - 0.04} />
      <SakuraBloom x={321} y={731} scale={0.52} rotation={-12} color={theme.secondary} detailColor={theme.glow} opacity={bloomOpacity - 0.02} />
      <SakuraBloom x={280} y={686} scale={0.32} rotation={14} color={theme.primary} detailColor={theme.glow} opacity={bloomOpacity - 0.07} />
      <BotanicalLeaf x={343} y={760} scale={0.4} rotation={-130} color={theme.accent} veinColor={theme.line} opacity={leafOpacity - 0.02} />
    </>
  );
};

/** 同じ枝の配置で、3月の芽吹きから5月の新緑への成長を表す。 */
const SpringFoliageMotif: React.FC<{ theme: SeasonTheme; isDark: boolean; budding: boolean }> = ({ theme, isDark, budding }) => {
  const leafOpacity = isDark ? 0.24 : 0.32;
  const leafScale = budding ? 0.36 : 0.76;
  const leaves = [
    { x: 26, y: 107, rotation: -26 },
    { x: 57, y: 138, rotation: 42 },
    { x: 92, y: 169, rotation: -21 },
    { x: 363, y: 107, rotation: -149 },
    { x: 332, y: 138, rotation: -88 },
    { x: 298, y: 169, rotation: -146 },
    { x: 24, y: 796, rotation: -49 },
    { x: 56, y: 746, rotation: 13 },
    { x: 97, y: 695, rotation: -42 },
    { x: 366, y: 796, rotation: -131 },
    { x: 334, y: 746, rotation: -73 },
    { x: 293, y: 695, rotation: -138 },
  ];
  return (
    <>
      <G fill="none" stroke={theme.line} strokeLinecap="round" opacity={isDark ? 0.15 : 0.2}>
        <Path d="M-24 70 C17 83 42 106 67 136 C86 159 104 176 137 190 M414 69 C379 82 356 105 333 136 C313 162 292 179 260 193" strokeWidth="1.1" />
        <Path d="M-26 858 C9 819 30 778 57 738 C79 705 104 681 143 661 M418 858 C385 822 364 784 339 746 C318 714 294 690 255 669" strokeWidth="1.15" />
      </G>
      {leaves.map((leaf, index) => (
        <G key={index}>
          <BotanicalLeaf {...leaf} scale={leafScale} color={index % 2 ? theme.secondary : theme.primary} veinColor={theme.line} opacity={leafOpacity} />
          <BotanicalLeaf {...leaf} rotation={leaf.rotation + 65} scale={leafScale * 0.7} color={theme.accent} veinColor={theme.line} opacity={leafOpacity - 0.05} />
        </G>
      ))}
      {!budding && (
        <G fill={theme.glow} opacity={isDark ? 0.06 : 0.16}>
          <Circle cx="23" cy="280" r="15" />
          <Circle cx="367" cy="374" r="11" />
          <Circle cx="27" cy="568" r="9" />
          <Circle cx="360" cy="666" r="17" />
        </G>
      )}
    </>
  );
};

const SummerMotif: React.FC<{ theme: SeasonTheme; isDark: boolean }> = ({ theme, isDark }) => {
  const strongOpacity = isDark ? 0.23 : 0.31;
  const softOpacity = isDark ? 0.1 : 0.16;
  const faintOpacity = isDark ? 0.07 : 0.11;

  return (
    <>
      {/* 上部：左右から細い枝葉が入り、日付周辺には十分な余白を残す */}
      <G fill="none" stroke={theme.primary} strokeLinecap="round" opacity={isDark ? 0.15 : 0.2}>
        <Path d="M-24 61 C15 76 42 103 68 137 C88 163 108 183 143 198" strokeWidth="1.1" />
        <Path d="M31 95 C48 88 61 80 72 67 M61 128 C75 119 87 108 96 95 M93 165 C108 156 122 147 135 135" strokeWidth="0.65" />
        <Path d="M414 70 C378 83 354 107 330 139 C309 166 290 184 258 199" strokeWidth="1.05" />
        <Path d="M375 100 C360 91 349 81 339 68 M346 128 C332 118 321 107 313 94 M315 165 C300 155 286 146 274 133" strokeWidth="0.6" />
      </G>

      <BotanicalLeaf x={3} y={115} scale={0.66} rotation={-17} color={theme.primary} veinColor={theme.line} opacity={strongOpacity} />
      <BotanicalLeaf x={25} y={128} scale={0.56} rotation={48} color={theme.secondary} veinColor={theme.line} opacity={strongOpacity - 0.03} />
      <BotanicalLeaf x={52} y={126} scale={0.78} rotation={-22} color={theme.accent} veinColor={theme.line} opacity={strongOpacity - 0.02} />
      <BotanicalLeaf x={76} y={153} scale={0.58} rotation={54} color={theme.primary} veinColor={theme.line} opacity={strongOpacity - 0.05} />
      <BotanicalLeaf x={104} y={166} scale={0.64} rotation={-19} color={theme.secondary} veinColor={theme.line} opacity={strongOpacity - 0.06} />

      <BotanicalLeaf x={387} y={116} scale={0.62} rotation={-148} color={theme.secondary} veinColor={theme.line} opacity={strongOpacity - 0.04} />
      <BotanicalLeaf x={368} y={127} scale={0.72} rotation={-91} color={theme.primary} veinColor={theme.line} opacity={strongOpacity} />
      <BotanicalLeaf x={341} y={134} scale={0.58} rotation={-146} color={theme.accent} veinColor={theme.line} opacity={strongOpacity - 0.03} />
      <BotanicalLeaf x={316} y={162} scale={0.72} rotation={-91} color={theme.secondary} veinColor={theme.line} opacity={strongOpacity - 0.04} />
      <BotanicalLeaf x={288} y={169} scale={0.56} rotation={-151} color={theme.primary} veinColor={theme.line} opacity={strongOpacity - 0.06} />

      {/* 中段：スクロール時だけ気づく程度の淡い小枝を左右へ置く */}
      <G fill="none" stroke={theme.line} strokeLinecap="round" opacity={faintOpacity}>
        <Path d="M-18 317 C13 326 32 347 52 377 C62 393 73 404 89 412" strokeWidth="1" />
        <Path d="M410 429 C383 438 367 457 351 482 C342 496 332 507 317 515" strokeWidth="0.9" />
      </G>
      <BotanicalLeaf x={7} y={327} scale={0.48} rotation={-15} color={theme.secondary} veinColor={theme.line} opacity={softOpacity} />
      <BotanicalLeaf x={29} y={354} scale={0.42} rotation={55} color={theme.primary} veinColor={theme.line} opacity={softOpacity - 0.02} />
      <BotanicalLeaf x={50} y={382} scale={0.5} rotation={-22} color={theme.accent} veinColor={theme.line} opacity={softOpacity - 0.03} />
      <BotanicalLeaf x={383} y={443} scale={0.44} rotation={-149} color={theme.primary} veinColor={theme.line} opacity={softOpacity - 0.02} />
      <BotanicalLeaf x={361} y={469} scale={0.5} rotation={-91} color={theme.secondary} veinColor={theme.line} opacity={softOpacity} />
      <BotanicalLeaf x={339} y={493} scale={0.4} rotation={-151} color={theme.accent} veinColor={theme.line} opacity={softOpacity - 0.03} />

      {/* 下部：承認案のように四隅から葉を重ね、中央は大きく空ける */}
      <G fill="none" stroke={theme.primary} strokeLinecap="round" opacity={isDark ? 0.17 : 0.23}>
        <Path d="M-28 858 C10 817 29 775 55 734 C76 702 101 678 142 658" strokeWidth="1.4" />
        <Path d="M21 799 C39 794 54 786 68 775 M49 748 C65 745 80 738 94 726 M84 703 C101 701 116 695 131 684" strokeWidth="0.8" />
        <Path d="M420 858 C385 822 365 784 340 746 C319 714 294 689 254 667" strokeWidth="1.35" />
        <Path d="M390 810 C374 803 359 795 346 784 M361 762 C345 756 331 748 317 736 M326 717 C310 711 295 704 281 691" strokeWidth="0.8" />
      </G>

      <BotanicalLeaf x={2} y={822} scale={0.78} rotation={-54} color={theme.primary} veinColor={theme.line} opacity={strongOpacity - 0.04} />
      <BotanicalLeaf x={25} y={790} scale={0.62} rotation={17} color={theme.secondary} veinColor={theme.line} opacity={strongOpacity - 0.06} />
      <BotanicalLeaf x={48} y={752} scale={0.82} rotation={-48} color={theme.accent} veinColor={theme.line} opacity={strongOpacity - 0.05} />
      <BotanicalLeaf x={77} y={711} scale={0.65} rotation={19} color={theme.primary} veinColor={theme.line} opacity={strongOpacity - 0.07} />
      <BotanicalLeaf x={109} y={678} scale={0.72} rotation={-44} color={theme.secondary} veinColor={theme.line} opacity={strongOpacity - 0.09} />

      <BotanicalLeaf x={390} y={824} scale={0.76} rotation={-126} color={theme.secondary} veinColor={theme.line} opacity={strongOpacity - 0.05} />
      <BotanicalLeaf x={368} y={792} scale={0.62} rotation={-72} color={theme.primary} veinColor={theme.line} opacity={strongOpacity - 0.05} />
      <BotanicalLeaf x={343} y={754} scale={0.8} rotation={-132} color={theme.accent} veinColor={theme.line} opacity={strongOpacity - 0.06} />
      <BotanicalLeaf x={315} y={718} scale={0.64} rotation={-72} color={theme.secondary} veinColor={theme.line} opacity={strongOpacity - 0.07} />
      <BotanicalLeaf x={283} y={685} scale={0.7} rotation={-135} color={theme.primary} veinColor={theme.line} opacity={strongOpacity - 0.09} />
    </>
  );
};

// 枝と葉の接続位置を同じ曲線から求め、葉柄も含めて一続きに描く。
const OCTOBER_BRANCHES = [
  { startX: -24, startY: 67, controlX: 55, controlY: 94, endX: 140, endY: 190 },
  { startX: 414, startY: 67, controlX: 335, controlY: 94, endX: 258, endY: 193 },
  { startX: -27, startY: 858, controlX: 39, controlY: 716, endX: 142, endY: 662 },
  { startX: 418, startY: 858, controlX: 352, controlY: 724, endX: 255, endY: 670 },
];

const EarlyAutumnMotif: React.FC<MonthlyMotifProps> = ({ theme, isDark }) => (
  <>
    {OCTOBER_BRANCHES.map(({ startX, startY, controlX, controlY, endX, endY }, i) => (
      <G key={i}>
        <Path
          d={`M${startX} ${startY} Q${controlX} ${controlY} ${endX} ${endY}`}
          fill="none" stroke={theme.line} strokeWidth="1.1" strokeLinecap="round" opacity={isDark ? 0.17 : 0.23}
        />
        {[0.2, 0.32, 0.48, 0.6, 0.74, 0.86].map((t, j) => {
          const u = 1 - t;
          const x = u * u * startX + 2 * u * t * controlX + t * t * endX;
          const y = u * u * startY + 2 * u * t * controlY + t * t * endY;
          const dx = u * (controlX - startX) + t * (endX - controlX);
          const dy = u * (controlY - startY) + t * (endY - controlY);
          // 枝の先へ向かいつつ、葉を左右交互に開く。
          const direction = Math.atan2(dy, dx) + (j % 2 ? -0.7 : 0.7);
          const baseX = x + 5 * Math.cos(direction);
          const baseY = y + 5 * Math.sin(direction);
          // MapleLeaf の葉柄の終点 (0, 38) を接続点に合わせる。
          const leafScale = j % 3 === 1 ? 0.56 : 0.46;
          const rotation = direction * 180 / Math.PI + 90;
          const leafX = baseX + 38 * leafScale * Math.cos(direction);
          const leafY = baseY + 38 * leafScale * Math.sin(direction);
          return (
            <G key={j}>
              <Path d={`M${x} ${y} L${baseX} ${baseY}`} fill="none" stroke={theme.line} strokeWidth="0.8" strokeLinecap="round" opacity={isDark ? 0.23 : 0.31} />
              <MapleLeaf
                x={leafX} y={leafY} scale={leafScale} rotation={rotation}
                color={[theme.primary, theme.secondary, theme.accent][j % 3]}
                detailColor={theme.line} opacity={isDark ? 0.32 : 0.42}
              />
            </G>
          );
        })}
      </G>
    ))}
    {/* 枝から離れた中段の2枚は、舞い落ちる葉。 */}
    <MapleLeaf x={28} y={319} scale={0.22} rotation={-29} color={theme.secondary} detailColor={theme.line} opacity={isDark ? 0.1 : 0.15} />
    <MapleLeaf x={362} y={407} scale={0.2} rotation={34} color={theme.primary} detailColor={theme.line} opacity={isDark ? 0.09 : 0.14} />
  </>
);

const AutumnMotif: React.FC<{ theme: SeasonTheme; isDark: boolean }> = ({ theme, isDark }) => {
  const leafOpacity = isDark ? 0.23 : 0.31;
  const softOpacity = isDark ? 0.1 : 0.15;

  return (
    <>
      {/* 上部：左右から細い枝と紅葉を入れ、中央は大きく空ける */}
      <G fill="none" stroke={theme.line} strokeLinecap="round" opacity={isDark ? 0.14 : 0.2}>
        <Path d="M-24 67 C14 80 40 102 65 132 C85 156 105 175 140 190" strokeWidth="1.1" />
        <Path d="M27 98 C44 91 57 82 68 69 M60 132 C75 123 88 112 98 99" strokeWidth="0.65" />
        <Path d="M414 67 C378 81 354 104 331 134 C311 160 291 178 258 193" strokeWidth="1.05" />
        <Path d="M374 99 C359 91 347 81 337 69 M344 133 C329 123 317 112 308 99" strokeWidth="0.62" />
      </G>
      <MapleLeaf x={22} y={119} scale={0.39} rotation={-24} color={theme.primary} detailColor={theme.line} opacity={leafOpacity - 0.03} />
      <MapleLeaf x={66} y={143} scale={0.5} rotation={13} color={theme.secondary} detailColor={theme.line} opacity={leafOpacity} />
      <MapleLeaf x={108} y={166} scale={0.34} rotation={-16} color={theme.accent} detailColor={theme.line} opacity={leafOpacity - 0.04} />
      <MapleLeaf x={370} y={120} scale={0.41} rotation={25} color={theme.secondary} detailColor={theme.line} opacity={leafOpacity - 0.02} />
      <MapleLeaf x={329} y={145} scale={0.53} rotation={-14} color={theme.primary} detailColor={theme.line} opacity={leafOpacity} />
      <MapleLeaf x={286} y={169} scale={0.33} rotation={18} color={theme.accent} detailColor={theme.line} opacity={leafOpacity - 0.05} />

      {/* 中段：風の線は使わず、少数の落ち葉だけで季節感を残す */}
      <MapleLeaf x={28} y={319} scale={0.22} rotation={-29} color={theme.secondary} detailColor={theme.line} opacity={softOpacity} />
      <MapleLeaf x={362} y={407} scale={0.2} rotation={34} color={theme.primary} detailColor={theme.line} opacity={softOpacity - 0.01} />
      <MapleLeaf x={38} y={529} scale={0.18} rotation={17} color={theme.accent} detailColor={theme.line} opacity={softOpacity - 0.02} />
      <MapleLeaf x={351} y={606} scale={0.19} rotation={-31} color={theme.secondary} detailColor={theme.line} opacity={softOpacity - 0.02} />

      {/* 下部：承認案と同じく、両隅から紅葉の枝を立ち上げる */}
      <G fill="none" stroke={theme.line} strokeLinecap="round" opacity={isDark ? 0.13 : 0.19}>
        <Path d="M-27 858 C8 820 29 779 56 739 C78 706 103 682 142 662" strokeWidth="1.15" />
        <Path d="M22 801 C41 795 56 786 69 775 M52 750 C69 744 83 737 97 725" strokeWidth="0.65" />
        <Path d="M418 858 C385 822 364 785 339 747 C318 715 294 691 255 670" strokeWidth="1.1" />
        <Path d="M389 810 C372 804 358 796 345 785 M359 764 C343 757 329 749 316 737" strokeWidth="0.62" />
      </G>
      <MapleLeaf x={28} y={793} scale={0.4} rotation={-21} color={theme.secondary} detailColor={theme.line} opacity={leafOpacity - 0.04} />
      <MapleLeaf x={70} y={731} scale={0.48} rotation={15} color={theme.primary} detailColor={theme.line} opacity={leafOpacity - 0.02} />
      <MapleLeaf x={110} y={685} scale={0.31} rotation={-13} color={theme.accent} detailColor={theme.line} opacity={leafOpacity - 0.06} />
      <MapleLeaf x={364} y={797} scale={0.4} rotation={22} color={theme.primary} detailColor={theme.line} opacity={leafOpacity - 0.04} />
      <MapleLeaf x={322} y={735} scale={0.49} rotation={-15} color={theme.secondary} detailColor={theme.line} opacity={leafOpacity - 0.02} />
      <MapleLeaf x={280} y={690} scale={0.31} rotation={17} color={theme.accent} detailColor={theme.line} opacity={leafOpacity - 0.06} />
    </>
  );
};

const WinterMotif: React.FC<{ theme: SeasonTheme; isDark: boolean }> = ({ theme, isDark }) => {
  const branchOpacity = isDark ? 0.15 : 0.21;
  const snowOpacity = isDark ? 0.16 : 0.23;

  return (
    <>
      {/* 上部：太い幹ではなく、左右から繊細な裸木の枝を伸ばす */}
      <G fill="none" stroke={theme.line} strokeLinecap="round" strokeLinejoin="round" opacity={branchOpacity}>
        <Path d="M-27 70 C14 83 40 105 66 136 C86 160 106 178 140 192" strokeWidth="1.15" />
        <Path d="M29 101 C45 94 58 84 69 71 M60 134 C75 125 88 114 98 101 M88 163 L112 143 M42 115 L25 89" strokeWidth="0.7" />
        <Path d="M417 70 C379 82 355 105 332 136 C312 162 292 180 258 194" strokeWidth="1.1" />
        <Path d="M374 102 C359 93 347 83 337 70 M344 135 C329 125 317 114 308 101 M316 164 L291 144 M360 116 L377 89" strokeWidth="0.68" />
      </G>

      <Snowflake x={31} y={128} scale={0.34} rotation={10} color={theme.primary} detailColor={theme.line} opacity={snowOpacity} />
      <Snowflake x={83} y={158} scale={0.22} rotation={-8} color={theme.accent} detailColor={theme.line} opacity={snowOpacity - 0.03} />
      <Snowflake x={361} y={126} scale={0.36} rotation={-11} color={theme.accent} detailColor={theme.line} opacity={snowOpacity} />
      <Snowflake x={310} y={160} scale={0.21} rotation={13} color={theme.primary} detailColor={theme.line} opacity={snowOpacity - 0.03} />

      {/* 中段：雪片と小さな雪粒を端に疎らに置く */}
      <Snowflake x={28} y={316} scale={0.2} rotation={-13} color={theme.primary} detailColor={theme.line} opacity={snowOpacity - 0.05} />
      <Snowflake x={362} y={405} scale={0.21} rotation={14} color={theme.accent} detailColor={theme.line} opacity={snowOpacity - 0.05} />
      <Snowflake x={37} y={526} scale={0.17} rotation={7} color={theme.accent} detailColor={theme.line} opacity={snowOpacity - 0.07} />
      <Snowflake x={352} y={605} scale={0.18} rotation={-15} color={theme.primary} detailColor={theme.line} opacity={snowOpacity - 0.07} />
      <G fill={theme.secondary} opacity={isDark ? 0.12 : 0.18}>
        <Circle cx="18" cy="406" r="2.1" />
        <Circle cx="371" cy="306" r="1.8" />
        <Circle cx="26" cy="614" r="1.7" />
        <Circle cx="367" cy="524" r="2" />
      </G>

      {/* 下部：両隅の裸木で画面全体を囲み、雪原の波線は置かない */}
      <G fill="none" stroke={theme.line} strokeLinecap="round" strokeLinejoin="round" opacity={branchOpacity - 0.01}>
        <Path d="M-28 858 C8 819 29 779 56 739 C78 706 103 682 142 662" strokeWidth="1.2" />
        <Path d="M22 801 C40 795 55 786 69 775 M52 750 C68 745 83 737 97 725 M81 706 L112 684 M37 774 L18 750" strokeWidth="0.72" />
        <Path d="M419 858 C385 822 364 785 339 747 C318 715 294 691 255 670" strokeWidth="1.16" />
        <Path d="M389 810 C372 804 358 796 345 785 M359 764 C343 757 329 749 316 737 M330 720 L280 690 M375 782 L394 758" strokeWidth="0.7" />
      </G>
      <Snowflake x={31} y={793} scale={0.32} rotation={-9} color={theme.accent} detailColor={theme.line} opacity={snowOpacity - 0.02} />
      <Snowflake x={81} y={727} scale={0.2} rotation={12} color={theme.primary} detailColor={theme.line} opacity={snowOpacity - 0.04} />
      <Snowflake x={362} y={797} scale={0.33} rotation={10} color={theme.primary} detailColor={theme.line} opacity={snowOpacity - 0.02} />
      <Snowflake x={312} y={733} scale={0.2} rotation={-12} color={theme.accent} detailColor={theme.line} opacity={snowOpacity - 0.04} />
    </>
  );
};

interface MonthlyMotifProps { theme: SeasonTheme; isDark: boolean }

/** 冬の枝先に、丸いつぼみと少数の梅の花。 */
const PlumMotif: React.FC<MonthlyMotifProps> = ({ theme, isDark }) => (
  <>
    <G fill="none" stroke={theme.line} strokeWidth="1.1" strokeLinecap="round" opacity={isDark ? 0.17 : 0.22}>
      <Path d="M-20 83 Q54 106 126 184 M410 83 Q336 106 264 184 M-20 860 Q48 742 127 680 M410 860 Q342 742 263 680" />
      <Path d="M48 123 L55 93 M342 123 L335 93 M47 765 L26 738 M343 765 L364 738" />
    </G>
    {[[28,108],[73,139],[109,167],[362,108],[317,139],[281,167],[29,795],[72,735],[111,694],[361,795],[318,735],[279,694]].map(([x,y], i) => (
      <G key={i} transform={`translate(${x} ${y})`} opacity={isDark ? 0.26 : 0.34}>
        {i % 3 === 1 ? <>
          {[0,72,144,216,288].map(angle => <Circle key={angle} cx="0" cy="-4.8" r="4" fill={theme.primary} transform={`rotate(${angle})`} />)}
          <Circle cx="0" cy="0" r="2" fill={theme.glow} />
        </> : <>
          <Path d="M-2 4 L0 7 L2 4" fill="none" stroke={theme.line} strokeWidth="1" />
          <Circle cx="0" cy="0" r={i % 2 ? 3.8 : 4.8} fill={theme.secondary} />
        </>}
      </G>
    ))}
  </>
);

const HydrangeaMotif: React.FC<MonthlyMotifProps> = ({ theme, isDark }) => (
  <>
    {[[32,125],[356,140],[40,762],[349,782]].map(([x,y], i) => (
      <G key={i} transform={`translate(${x} ${y})`}>
        <BotanicalLeaf x={0} y={22} scale={0.9} rotation={i % 2 ? -145 : -10} color={theme.accent} veinColor={theme.line} opacity={isDark ? 0.19 : 0.26} />
        <G opacity={isDark ? 0.25 : 0.32}>
          {[[0,0],[-12,-7],[11,-9],[-14,8],[0,15],[14,6],[0,-18]].map(([cx,cy], j) => (
            <G key={j} transform={`translate(${cx} ${cy})`} fill={j % 2 ? theme.primary : theme.secondary}>
              {[0,90,180,270].map(angle => <Path key={angle} d="M0 0 C-9 -2 -7 -10 -2 -7 C2 -7 4 -3 0 0 Z" transform={`rotate(${angle})`} />)}
              <Circle cx="0" cy="0" r="1.3" fill={theme.glow} />
            </G>
          ))}
        </G>
      </G>
    ))}
    <G fill="none" stroke={theme.line} strokeWidth="1" strokeLinecap="round" opacity={isDark ? 0.12 : 0.18}>
      <Path d="M20 304 L17 316 M369 358 L366 370 M31 489 L28 501 M359 590 L356 602 M69 190 L66 202 M325 220 L322 232" />
    </G>
  </>
);

const WaterMotif: React.FC<MonthlyMotifProps> = ({ theme, isDark }) => (
  <>
    {[[18,128,1],[369,167,0.8],[23,732,0.9],[368,801,1.1]].map(([x,y,scale], i) => (
      <G key={i} transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={theme.line} strokeWidth="1.2" opacity={isDark ? 0.23 : 0.3}>
        <Path d="M-28 0 C-28 -10 28 -10 28 0 C28 10 -28 10 -28 0 M-48 0 C-48 -18 48 -18 48 0 C48 18 -48 18 -48 0 M-68 0 C-68 -26 68 -26 68 0 C68 26 -68 26 -68 0" />
      </G>
    ))}
    <G fill={theme.primary} opacity={isDark ? 0.11 : 0.17}>
      <Circle cx="24" cy="340" r="3" /><Circle cx="365" cy="450" r="2" /><Circle cx="32" cy="565" r="2.5" />
    </G>
  </>
);

// 二次ベジェの終点と制御点を共有し、穂の軸を茎の接線方向にそろえる。
const GRASS_STEMS = [
  { startX: 0, startY: 0, controlX: -8, controlY: -82, tipX: 34, tipY: -135 },
  { startX: 12, startY: 5, controlX: 15, controlY: -62, tipX: 61, tipY: -98 },
  { startX: -5, startY: -2, controlX: -19, controlY: -68, tipX: 8, tipY: -108 },
];

const GrassMotif: React.FC<MonthlyMotifProps> = ({ theme, isDark }) => (
  <>
    {/* 左右反転せず、どの株も左から右への風に沿わせる。位置と大きさは少しずらす。 */}
    {[[0,220,0.9], [285,235,0.85], [1,856,1.05], [276,861,1]].map(([x,y,scale], i) => (
      <G key={i} transform={`translate(${x} ${y}) scale(${scale})`}>
        <Path d="M8 -20 Q25 -57 62 -49" fill="none" stroke={theme.line} strokeWidth="1" strokeLinecap="round" opacity={isDark ? 0.2 : 0.27} />
        {GRASS_STEMS.map(({ startX, startY, controlX, controlY, tipX, tipY }, j) => {
          const angle = Math.atan2(tipX - controlX, controlY - tipY) * 180 / Math.PI;
          return (
            <G key={j}>
              <Path
                d={`M${startX} ${startY} Q${controlX} ${controlY} ${tipX} ${tipY}`}
                fill="none" stroke={theme.line} strokeWidth="1" strokeLinecap="round" opacity={isDark ? 0.2 : 0.27}
              />
              <G transform={`translate(${tipX} ${tipY}) rotate(${angle})`} fill="none" stroke={j % 2 ? theme.secondary : theme.primary} strokeLinecap="round" opacity={isDark ? 0.29 : 0.36}>
                {/* 茎から滑らかに続く軸を風下へ曲げ、穂の細枝も非対称に流す。 */}
                <Path d="M0 0 C0 -16 9 -30 25 -32" strokeWidth="0.9" />
                <Path
                  d="M0 -3 Q-8 -18 7 -29 M1 -8 Q-4 -24 14 -33 M3 -13 Q1 -30 22 -35 M6 -18 Q9 -34 30 -34 M0 -4 Q10 -7 21 -19 M2 -10 Q15 -12 29 -24 M5 -16 Q20 -18 34 -28 M10 -23 Q26 -24 37 -31"
                  strokeWidth="0.75"
                />
              </G>
            </G>
          );
        })}
      </G>
    ))}
  </>
);

const FrostMotif: React.FC<MonthlyMotifProps> = ({ theme, isDark }) => (
  <>
    <G fill="none" stroke={theme.line} strokeWidth="1" strokeLinecap="round" opacity={isDark ? 0.18 : 0.24}>
      <Path d="M-12 87 L96 170 M15 108 L17 78 M39 126 L69 126 M61 144 L63 115 M402 87 L294 170 M375 108 L373 78 M351 126 L321 126 M329 144 L327 115 M-10 850 L102 703 M24 805 L17 773 M45 777 L77 766 M68 747 L64 715 M400 850 L288 703 M366 805 L373 773 M345 777 L313 766 M322 747 L326 715" />
    </G>
    {[[32,140],[356,117],[81,176],[312,187],[25,335],[366,449],[30,578],[355,622],[49,772],[342,799],[97,704],[294,718]].map(([x,y], i) => (
      <G key={i} transform={`translate(${x} ${y}) scale(${i % 3 === 0 ? 1 : 0.6})`} opacity={isDark ? 0.25 : 0.32}>
        <Path d="M0 -8 Q1 -1 6 0 Q1 1 0 8 Q-1 1 -6 0 Q-1 -1 0 -8 Z" fill={theme.accent} />
        <Circle cx="11" cy="-10" r="1.5" fill={theme.secondary} />
      </G>
    ))}
  </>
);

const renderMotif = (month: Month, theme: SeasonTheme, isDark: boolean): React.ReactNode => {
  switch (month) {
    case 1: return <WinterMotif theme={theme} isDark={isDark} />;
    case 2: return <PlumMotif theme={theme} isDark={isDark} />;
    case 3: return <SpringFoliageMotif theme={theme} isDark={isDark} budding />;
    case 4: return <SpringMotif theme={theme} isDark={isDark} />;
    case 5: return <SpringFoliageMotif theme={theme} isDark={isDark} budding={false} />;
    case 6: return <HydrangeaMotif theme={theme} isDark={isDark} />;
    case 7: return <WaterMotif theme={theme} isDark={isDark} />;
    case 8: return <SummerMotif theme={theme} isDark={isDark} />;
    case 9: return <GrassMotif theme={theme} isDark={isDark} />;
    case 10: return <EarlyAutumnMotif theme={theme} isDark={isDark} />;
    case 11: return <AutumnMotif theme={theme} isDark={isDark} />;
    case 12: return <FrostMotif theme={theme} isDark={isDark} />;
  }
};

/**
 * ホーム画面に季節の気配を添える背景。
 * 端末上の基準日に合わせて自動切り替えする。1〜12月の月別背景。
 */
const SeasonalBackdrop: React.FC<SeasonalBackdropProps> = ({ date, isDark }) => {
  const [size, setSize] = useState({ width: 390, height: 844 });
  const id = useId().replace(/:/g, '');
  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    if (layout.width <= 0 || layout.height <= 0) return;
    setSize(previous => previous.width === layout.width && previous.height === layout.height
      ? previous : { width: layout.width, height: layout.height });
  };
  // 葉の縦横比を保ち、短い画面でも上下の装飾が重ならない倍率にする。
  const scale = Math.min(size.width / 390, size.height / 534);
  const width = size.width / scale;
  const height = size.height / scale;
  const month = getBackdropMonth(date);
  if (month === null) return null;

  const theme = getBackdropTheme(date, isDark);
  if (theme === null) return null;

  const renderArtworkEdges = () => (
    <>
      <G clipPath={`url(#${id}-left)`}><Use href={`#${id}-art`} /></G>
      <G transform={`translate(${width - 390} 0)`}>
        <G clipPath={`url(#${id}-right)`}><Use href={`#${id}-art`} /></G>
      </G>
    </>
  );

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
      onLayout={onLayout}
    >
      <LinearGradient
        colors={theme.gradient}
        locations={[0, 0.52, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <G id={`${id}-art`}>{renderMotif(month, theme, isDark)}</G>
          <ClipPath id={`${id}-left`}><Rect x="0" y="0" width="195" height="844" /></ClipPath>
          <ClipPath id={`${id}-right`}><Rect x="195" y="0" width="195" height="844" /></ClipPath>
          <ClipPath id={`${id}-top`}><Rect x="0" y="0" width={width} height="250" /></ClipPath>
          <ClipPath id={`${id}-middle`}><Rect x="0" y="250" width={width} height="390" /></ClipPath>
          <ClipPath id={`${id}-bottom`}><Rect x="0" y="640" width={width} height="204" /></ClipPath>
          <ClipPath id={`${id}-middle-window`}><Rect x="0" y="250" width={width} height={height - 454} /></ClipPath>
        </Defs>
        {/* 上下は表示領域の端に固定し、中段の控えめな装飾だけを中央に追従させる。 */}
        <G>
          <G clipPath={`url(#${id}-top)`}>{renderArtworkEdges()}</G>
          <G clipPath={`url(#${id}-middle-window)`}>
            <G transform={`translate(0 ${(height - 844) / 2})`}>
              <G clipPath={`url(#${id}-middle)`}>{renderArtworkEdges()}</G>
            </G>
          </G>
          <G transform={`translate(0 ${height - 844})`}>
            <G clipPath={`url(#${id}-bottom)`}>{renderArtworkEdges()}</G>
          </G>
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});

export default memo(SeasonalBackdrop);
