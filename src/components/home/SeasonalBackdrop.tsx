import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path } from 'react-native-svg';

interface SeasonalBackdropProps {
  /** 1日の開始時刻を考慮した基準日（YYYY-MM-DD形式） */
  date: string;
  /** ダークモードかどうか */
  isDark: boolean;
}

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface SeasonTheme {
  gradient: readonly [string, string, string];
  primary: string;
  secondary: string;
  accent: string;
  line: string;
  glow: string;
}

const getSeason = (date: string): Season | null => {
  const month = Number(date.slice(5, 7));
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

const getSeasonTheme = (season: Season, isDark: boolean): SeasonTheme => {
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

const renderMotif = (season: Season, theme: SeasonTheme, isDark: boolean): React.ReactNode => {
  switch (season) {
    case 'spring':
      return <SpringMotif theme={theme} isDark={isDark} />;
    case 'summer':
      return <SummerMotif theme={theme} isDark={isDark} />;
    case 'autumn':
      return <AutumnMotif theme={theme} isDark={isDark} />;
    case 'winter':
      return <WinterMotif theme={theme} isDark={isDark} />;
  }
};

/**
 * ホーム画面に季節の気配を添える背景。
 * 端末上の基準日に合わせ、春夏秋冬を3か月単位で自動切り替えする。
 */
const SeasonalBackdrop: React.FC<SeasonalBackdropProps> = ({ date, isDark }) => {
  const season = getSeason(date);
  if (season === null) return null;

  const theme = getSeasonTheme(season, isDark);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
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
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        {renderMotif(season, theme, isDark)}
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
