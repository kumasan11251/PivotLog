import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { getDisplayMoonPhase, getMoonLitPath, isNightTime } from '../../utils/moonPhase';
import { spacing } from '../../theme';

interface NightMoonProps {
  /** ダークモードかどうか */
  isDark: boolean;
}

/** 月の描画半径 */
const MOON_RADIUS = 15;

/** 夜間帯への出入りと月相の変化を拾うための再評価間隔 */
const REFRESH_INTERVAL_MS = 60 * 1000;

/**
 * ホーム画面の右上に、今夜の月をそっと浮かべる装飾。
 * 夜間帯（19時〜翌5時）のみ表示し、月相は端末内で計算する。
 * 季節の背景と同じく、触れず・読み上げず・主張しない。
 */
const NightMoon: React.FC<NightMoonProps> = ({ isDark }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!isNightTime(now)) return null;

  const phase = getDisplayMoonPhase(now);
  const size = MOON_RADIUS * 2;
  // ライトモードでは影の円がかえって「白い満月」に見えてしまうため、
  // ほぼ消して墨絵のような三日月の線だけを残す
  const moonColor = isDark ? '#E9E3CF' : '#AFA78D';
  const litOpacity = isDark ? 0.4 : 0.38;
  const shadowOpacity = isDark ? 0.13 : 0.04;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 影の側もうっすら見せて、新月の夜も気配だけ残す */}
        <Circle cx={MOON_RADIUS} cy={MOON_RADIUS} r={MOON_RADIUS} fill={moonColor} opacity={shadowOpacity} />
        <Path d={getMoonLitPath(phase, MOON_RADIUS)} fill={moonColor} opacity={litOpacity} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // ヘッダー（高さ50・不透明）下端〜残りの時間カード上端の帯の
    // 垂直中央に配置。右端はカードの右端（画面パディング）に揃える
    position: 'absolute',
    top: 68,
    right: spacing.padding.screen,
  },
});

export default memo(NightMoon);
