import React, { useMemo } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface AIReflectionButtonProps {
  onPress: () => void;
  disabled?: boolean;
  /** 今月の残り回数（無制限の場合はnull） */
  remainingThisMonth?: number | null;
  /** プレミアムユーザーかどうか */
  isPremium?: boolean;
  /** 利用制限に達しているかどうか */
  isLimitReached?: boolean;
  /** 機能がロックされているか（プレミアム専用） */
  isFeatureLocked?: boolean;
}

/**
 * AIリフレクション取得ボタン
 * 日記入力後にPivotLogからの気づきを受け取るためのボタン
 */
const AIReflectionButton: React.FC<AIReflectionButtonProps> = ({
  onPress,
  disabled = false,
  remainingThisMonth,
  isPremium = false,
  isLimitReached = false,
  isFeatureLocked = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  // ボタンの無効状態を決定（isFeatureLocked時はタップ可能にする）
  const isButtonDisabled = isFeatureLocked
    ? disabled
    : disabled || isLimitReached;

  // ボタンテキスト（初回生成のみ表示されるので、再生成関連のテキストは不要）
  const buttonText = useMemo(() => {
    if (isFeatureLocked) {
      return '気づきを受け取る';
    }
    if (isLimitReached) {
      return '利用上限に達しました';
    }
    return '気づきを受け取る';
  }, [isLimitReached, isFeatureLocked]);

  const buttonBackgroundColor = isButtonDisabled
    ? themeColors.border
    : `${themeColors.primary}20`;

  const buttonBorderColor = isButtonDisabled
    ? themeColors.border
    : themeColors.primary;

  // ヒントテキストを決定
  const hintText = useMemo(() => {
    if (isFeatureLocked) {
      return 'プレミアムプランで利用できます';
    }

    if (disabled && !isLimitReached) {
      return '日記を入力すると気づきを受け取れます';
    }

    // 残り回数の表示（無料ユーザーのみ）
    if (!isPremium && remainingThisMonth !== null && remainingThisMonth !== undefined) {
      if (remainingThisMonth <= 0) {
        return 'プレミアムプランで無制限に利用できます ✨';
      }
      return `今月の残り: ${remainingThisMonth}回`;
    }

    return null;
  }, [disabled, isPremium, remainingThisMonth, isLimitReached, isFeatureLocked]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: buttonBackgroundColor,
            borderColor: buttonBorderColor,
          },
        ]}
        onPress={onPress}
        disabled={isButtonDisabled}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>✨</Text>
        <Text
          style={[
            styles.buttonText,
            { color: themeColors.primary },
            isButtonDisabled && { color: themeColors.text.secondary },
          ]}
        >
          {buttonText}
        </Text>
        {isFeatureLocked && (
          <View style={[styles.proBadge, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        )}
      </TouchableOpacity>

      {hintText && (
        <Text style={[styles.hintText, { color: themeColors.text.secondary }]}>
          {hintText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.padding.screen,
  },
  button: {
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  buttonText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  proBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  hintText: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
    ...textBase,
  },
});

export default AIReflectionButton;
