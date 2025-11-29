import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fonts, textBase } from '../theme/fonts';
import { spacing } from '../theme/spacing';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    // 2秒後に自動で次の画面に遷移
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.container}>
      {/* アプリロゴ/アイコン */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Pivot Log</Text>
      </View>

      {/* キャッチコピー */}
      <View style={styles.conceptContainer}>
        <Text style={styles.conceptText}>
          残りの時間と今日の記録を見つめることで、{'\n'}
          「自分にとって本当に大切なもの」を{'\n'}
          発見する旅のパートナー
        </Text>
      </View>

      {/* 下部の余白（ボタンを削除） */}
      <View style={styles.bottomSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    letterSpacing: 2,
    ...textBase,
  },
  conceptContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  conceptText: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    ...textBase,
  },
  bottomSpacer: {
    flex: 1,
  },
});
