import React from 'react';
import Svg, { Path, Circle, Line, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme';

interface IconProps {
  size?: number;
  color?: string;
}

// 砂時計アイコン - 時間の可視化
export const HourglassIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* 外枠 - 上部 */}
    <Path
      d="M16 8H48"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    {/* 外枠 - 下部 */}
    <Path
      d="M16 56H48"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    {/* 砂時計の形 */}
    <Path
      d="M18 8V16C18 20 22 28 32 32C22 36 18 44 18 48V56"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M46 8V16C46 20 42 28 32 32C42 36 46 44 46 48V56"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* 上部の砂 */}
    <Path
      d="M24 16C24 16 28 22 32 24C36 22 40 16 40 16"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.6}
    />
    {/* 下部の砂（たまっている） */}
    <Path
      d="M22 50C22 46 26 42 32 42C38 42 42 46 42 50"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      fill={color}
      fillOpacity={0.15}
    />
    {/* 落ちている砂の線 */}
    <Line
      x1="32"
      y1="32"
      x2="32"
      y2="40"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeDasharray="2 3"
      opacity={0.5}
    />
  </Svg>
);

// ターゲット・目標アイコン
export const TargetIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* 外側の円 */}
    <Circle
      cx="32"
      cy="32"
      r="26"
      stroke={color}
      strokeWidth={2}
    />
    {/* 中間の円 */}
    <Circle
      cx="32"
      cy="32"
      r="17"
      stroke={color}
      strokeWidth={1.5}
      opacity={0.7}
    />
    {/* 内側の円 */}
    <Circle
      cx="32"
      cy="32"
      r="8"
      stroke={color}
      strokeWidth={1.5}
      opacity={0.5}
    />
    {/* 中心点 */}
    <Circle
      cx="32"
      cy="32"
      r="3"
      fill={color}
    />
    {/* 十字線 */}
    <Line
      x1="32"
      y1="4"
      x2="32"
      y2="12"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Line
      x1="32"
      y1="52"
      x2="32"
      y2="60"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Line
      x1="4"
      y1="32"
      x2="12"
      y2="32"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Line
      x1="52"
      y1="32"
      x2="60"
      y2="32"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

// 円形プログレス・残り時間の可視化アイコン
export const ProgressCircleIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary
}) => {
  // 円周の計算 (r=24の円)
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.65; // 65%の進捗を表示
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
        </LinearGradient>
      </Defs>

      {/* 背景の円 */}
      <Circle
        cx="32"
        cy="32"
        r={radius}
        stroke={color}
        strokeWidth={5}
        opacity={0.15}
        fill="none"
      />

      {/* プログレスの円 */}
      <Circle
        cx="32"
        cy="32"
        r={radius}
        stroke="url(#progressGradient)"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform="rotate(-90 32 32)"
      />

      {/* 中央のパーセント表示 */}
      <G>
        {/* 数字「65」を表現するパス */}
        <Path
          d="M24 28V36M24 28H28M24 32H27"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M33 28H38C38 28 39 28 39 29.5V30.5C39 32 38 32 38 32H34C34 32 33 32 33 33.5V34.5C33 36 34 36 34 36H39"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>

      {/* %マーク */}
      <Circle
        cx="26"
        cy="42"
        r="1.5"
        fill={color}
        opacity={0.7}
      />
      <Circle
        cx="34"
        cy="46"
        r="1.5"
        fill={color}
        opacity={0.7}
      />
      <Line
        x1="25"
        y1="47"
        x2="35"
        y2="41"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.7}
      />

      {/* 装飾的な小さなドット */}
      <Circle
        cx="32"
        cy="5"
        r="2"
        fill={color}
        opacity={0.4}
      />
    </Svg>
  );
};

// カウントダウンタイマーアイコン
export const CountdownTimerIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* タイマーの外枠 */}
    <Circle
      cx="32"
      cy="34"
      r="24"
      stroke={color}
      strokeWidth={2.5}
      fill="none"
    />

    {/* 上部のボタン/つまみ */}
    <Rect
      x="28"
      y="4"
      width="8"
      height="6"
      rx="2"
      stroke={color}
      strokeWidth={2}
      fill={color}
      fillOpacity={0.1}
    />

    {/* タイマーと上部をつなぐ部分 */}
    <Line
      x1="32"
      y1="10"
      x2="32"
      y2="10"
      stroke={color}
      strokeWidth={2}
    />

    {/* 時間の目盛り - 12時 */}
    <Line
      x1="32"
      y1="14"
      x2="32"
      y2="18"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    {/* 3時 */}
    <Line
      x1="52"
      y1="34"
      x2="48"
      y2="34"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    {/* 6時 */}
    <Line
      x1="32"
      y1="54"
      x2="32"
      y2="50"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    {/* 9時 */}
    <Line
      x1="12"
      y1="34"
      x2="16"
      y2="34"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />

    {/* 中心点 */}
    <Circle
      cx="32"
      cy="34"
      r="2.5"
      fill={color}
    />

    {/* 時針（短い針） */}
    <Line
      x1="32"
      y1="34"
      x2="32"
      y2="24"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
    />

    {/* 分針（長い針）- 斜め方向 */}
    <Line
      x1="32"
      y1="34"
      x2="44"
      y2="28"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />

    {/* カウントダウンを示す矢印（反時計回り） */}
    <G opacity={0.6}>
      <Path
        d="M18 16C22 12 27 10 32 10"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M18 16L15 12M18 16L22 13"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

// ノート・日記アイコン
export const NotebookIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* ノートの外枠 */}
    <Rect
      x="12"
      y="6"
      width="40"
      height="52"
      rx="3"
      stroke={color}
      strokeWidth={2}
    />
    {/* 背表紙のライン */}
    <Line
      x1="20"
      y1="6"
      x2="20"
      y2="58"
      stroke={color}
      strokeWidth={1.5}
      opacity={0.5}
    />
    {/* 罫線 */}
    <Line
      x1="26"
      y1="18"
      x2="44"
      y2="18"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.4}
    />
    <Line
      x1="26"
      y1="26"
      x2="44"
      y2="26"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.4}
    />
    <Line
      x1="26"
      y1="34"
      x2="44"
      y2="34"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.4}
    />
    <Line
      x1="26"
      y1="42"
      x2="38"
      y2="42"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      opacity={0.4}
    />
    {/* ペン */}
    <G transform="translate(36, 44) rotate(-45)">
      <Rect
        x="0"
        y="0"
        width="4"
        height="18"
        rx="1"
        stroke={color}
        strokeWidth={1.5}
        fill={color}
        fillOpacity={0.1}
      />
      <Path
        d="M0 18L2 22L4 18"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

// スタート・はじまりアイコン（輝く星）
export const SparkleIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* メインの星形 */}
    <Path
      d="M32 8L36 24L52 24L40 34L44 50L32 40L20 50L24 34L12 24L28 24L32 8Z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.1}
    />
    {/* 小さな輝き - 右上 */}
    <G transform="translate(48, 10)">
      <Line
        x1="4"
        y1="0"
        x2="4"
        y2="8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      <Line
        x1="0"
        y1="4"
        x2="8"
        y2="4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
    </G>
    {/* 小さな輝き - 左上 */}
    <G transform="translate(6, 14)">
      <Line
        x1="3"
        y1="0"
        x2="3"
        y2="6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.5}
      />
      <Line
        x1="0"
        y1="3"
        x2="6"
        y2="3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.5}
      />
    </G>
    {/* 小さな輝き - 右下 */}
    <Circle
      cx="54"
      cy="46"
      r="2"
      fill={color}
      opacity={0.4}
    />
    {/* 小さな輝き - 左下 */}
    <Circle
      cx="10"
      cy="50"
      r="1.5"
      fill={color}
      opacity={0.3}
    />
  </Svg>
);
