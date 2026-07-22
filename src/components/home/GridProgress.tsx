import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

// バー/円形（useProgressAnimation）と同じアニメーション設定
const ANIMATION_DURATION = 1200;

interface GridProgressProps {
  targetLifespan: number;
  /** 現在の年齢（小数点以下含む） */
  currentAge: number;
}

/**
 * グリッド/ブロック形式のプログレス表示
 * 人生の各年を1つのブロックとして可視化
 */
const GridProgress: React.FC<GridProgressProps> = ({
  targetLifespan,
  currentAge,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  // 現在の年齢（整数部分）
  const completedYears = Math.floor(currentAge);
  // 現在進行中の年の進捗（0-1）
  const currentYearProgress = currentAge - completedYears;

  // 入場アニメーション（0→1）。モード切替時は本コンポーネントが再マウントされるため、
  // 切替のたびにアニメーションする（バー/円形のtriggerAnimationと同等の挙動）
  const [animProgress] = useState(() => new Animated.Value(0));
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // 年齢の読み込み完了を待ってから一度だけアニメーション
    if (currentAge > 0 && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      Animated.timing(animProgress, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [currentAge, animProgress]);

  /**
   * 経過ブロックのフェードイン用opacity
   * アニメーションの進行（0→1）が年齢に対する各年の位置を通過するタイミングで表示される
   * （バーが左から埋まるのと同じく、左上から順に埋まっていく）
   * 経過ブロックでは常に year <= currentAge のため inputRange は単調増加かつ1以下に収まる
   */
  const getBlockFillOpacity = (year: number): Animated.AnimatedInterpolation<number> => {
    return animProgress.interpolate({
      inputRange: [(year - 1) / currentAge, year / currentAge],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  };

  /**
   * 進行中ブロックの部分フィル用height
   * 経過ブロックが埋まりきった後、残りの時間で現在の年の進捗まで伸びる
   */
  const getCurrentFillHeight = (): Animated.AnimatedInterpolation<string> | null => {
    if (currentAge <= 0) return null;
    const start = completedYears / currentAge;
    if (start >= 1) return null;
    return animProgress.interpolate({
      inputRange: [start, 1],
      outputRange: ['0%', `${currentYearProgress * 100}%`],
      extrapolate: 'clamp',
    });
  };

  // グリッドのサイズ計算（コンテナに収まるように調整）
  const { columns, blockSize, gap } = useMemo(() => {
    const maxWidth = 300; // グリッドの最大幅
    const maxHeight = 150; // グリッドの最大高さ
    const minBlockSize = 12; // 最小ブロックサイズ
    const gapSize = 3;

    // 目標寿命に応じて列数を決定（バランス重視）
    let cols = targetLifespan <= 50 ? 7 : targetLifespan <= 80 ? 9 : 12;
    const rows = Math.ceil(targetLifespan / cols);

    // 高さに収まるようにブロックサイズを計算
    let size = Math.floor((maxHeight - (rows - 1) * gapSize) / rows);
    // 幅にも収まるように調整
    const widthBasedSize = Math.floor((maxWidth - (cols - 1) * gapSize) / cols);
    size = Math.min(size, widthBasedSize);
    size = Math.max(size, minBlockSize);

    return { columns: cols, blockSize: size, gap: gapSize };
  }, [targetLifespan]);

  // 各年のブロックを生成
  const blocks = useMemo(() => {
    const result = [];
    for (let i = 0; i < targetLifespan; i++) {
      const year = i + 1;
      let status: 'completed' | 'current' | 'remaining';

      if (year <= completedYears) {
        status = 'completed';
      } else if (year === completedYears + 1) {
        status = 'current';
      } else {
        status = 'remaining';
      }

      result.push({ year, status });
    }
    return result;
  }, [targetLifespan, completedYears]);

  // 残り年数
  const remainingYears = Math.max(0, targetLifespan - completedYears);

  return (
    <View style={styles.container}>
      {/* グリッド表示 */}
      <View style={[styles.gridContainer, { width: columns * (blockSize + gap) - gap, gap }]}>
        {blocks.map((block) => {
          const fillOpacity = block.status === 'completed' ? getBlockFillOpacity(block.year) : null;
          const fillHeight = block.status === 'current' ? getCurrentFillHeight() : null;
          return (
            <View
              key={block.year}
              style={[
                styles.block,
                { width: blockSize, height: blockSize, backgroundColor: themeColors.progress.background },
                block.status === 'current' && [styles.blockCurrent, { borderColor: themeColors.primary }],
              ]}
            >
              {block.status === 'completed' && (
                <Animated.View
                  style={[
                    styles.blockCompletedFill,
                    { backgroundColor: themeColors.primary },
                    fillOpacity != null && { opacity: fillOpacity },
                  ]}
                />
              )}
              {block.status === 'current' && (
                <Animated.View
                  style={[
                    styles.blockCurrentFill,
                    { height: fillHeight ?? `${currentYearProgress * 100}%`, backgroundColor: themeColors.primary }
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* 統計情報 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.legendDot, { backgroundColor: themeColors.primary }]} />
          <Text style={[styles.statLabel, { color: themeColors.text.secondary }]}>経過</Text>
          <Text style={[styles.statValue, { color: themeColors.text.primary }]}>{completedYears}年</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
        <View style={styles.statItem}>
          <View style={[styles.legendDot, { backgroundColor: themeColors.progress.background }]} />
          <Text style={[styles.statLabel, { color: themeColors.text.secondary }]}>残り</Text>
          <Text style={[styles.statValue, { color: themeColors.text.primary }]}>{remainingYears}年</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
  },
  block: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  blockCurrent: {
    borderWidth: 1,
  },
  blockCompletedFill: {
    ...StyleSheet.absoluteFillObject,
  },
  blockCurrentFill: {
    position: 'absolute',
    bottom: 0,
    opacity: 0.6,
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  statLabel: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  statValue: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  statDivider: {
    width: 1,
    height: 16,
  },
});

export default GridProgress;
