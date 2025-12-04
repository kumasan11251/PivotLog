import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, textBase } from '../../theme';

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
  // 現在の年齢（整数部分）
  const completedYears = Math.floor(currentAge);
  // 現在進行中の年の進捗（0-1）
  const currentYearProgress = currentAge - completedYears;

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
        {blocks.map((block) => (
          <View
            key={block.year}
            style={[
              styles.block,
              { width: blockSize, height: blockSize },
              block.status === 'completed' && styles.blockCompleted,
              block.status === 'current' && styles.blockCurrent,
              block.status === 'remaining' && styles.blockRemaining,
            ]}
          >
            {block.status === 'current' && (
              <View
                style={[
                  styles.blockCurrentFill,
                  { height: `${currentYearProgress * 100}%` }
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* 統計情報 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.legendDot, styles.legendCompleted]} />
          <Text style={styles.statLabel}>経過</Text>
          <Text style={styles.statValue}>{completedYears}年</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.legendDot, styles.legendRemaining]} />
          <Text style={styles.statLabel}>残り</Text>
          <Text style={styles.statValue}>{remainingYears}年</Text>
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
  blockCompleted: {
    backgroundColor: colors.primary,
  },
  blockCurrent: {
    backgroundColor: colors.progress.background,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'flex-end',
  },
  blockCurrentFill: {
    backgroundColor: colors.primary,
    opacity: 0.6,
    width: '100%',
  },
  blockRemaining: {
    backgroundColor: colors.progress.background,
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
  legendCompleted: {
    backgroundColor: colors.primary,
  },
  legendRemaining: {
    backgroundColor: colors.progress.background,
  },
  statLabel: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  statValue: {
    fontSize: fonts.size.label,
    color: colors.text.primary,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
});

export default GridProgress;
