import React, { useMemo } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface AIReflectionButtonProps {
  onPress: () => void;
  disabled?: boolean;
  hasReflection?: boolean;
  /** 今月の残り回数（無制限の場合はnull） */
  remainingThisMonth?: number | null;
  /** プレミアムユーザーかどうか */
  isPremium?: boolean;
  /** 再生成可能かどうか */
  canRegenerate?: boolean;
  /** この日記の再生成残り回数 */
  remainingRegenerations?: number | null;
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
  hasReflection = false,
  remainingThisMonth,
  isPremium = false,
  canRegenerate = true,
  remainingRegenerations,
  isLimitReached = false,
  isFeatureLocked = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);

  // ボタンの無効状態を決定（isFeatureLocked時はタップ可能にする）
  const isButtonDisabled = isFeatureLocked
    ? disabled
    : disabled || isLimitReached || (hasReflection && !canRegenerate);

  // 既にリフレクションがある場合は「もう一度受け取る」表示
  const buttonText = useMemo(() => {
    if (isFeatureLocked && !hasReflection) {
      return 'PivotLogからの気づきを受け取る';
    }
    if (isLimitReached && !hasReflection) {
      return '今月の利用上限に達しました';
    }
    if (hasReflection) {
      if (!canRegenerate) {
        return isPremium
          ? '再生成の上限に達しました'
          : '再生成はプレミアム機能です';
      }
      return 'もう一度気づきを受け取る';
    }
    return 'PivotLogからの気づきを受け取る';
  }, [hasReflection, canRegenerate, isPremium, isLimitReached, isFeatureLocked]);

  const buttonBackgroundColor = isButtonDisabled
    ? themeColors.border
    : hasReflection
    ? 'transparent'
    : `${themeColors.primary}20`;

  const buttonBorderColor = isButtonDisabled ? themeColors.border : themeColors.primary;

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

    // プレミアムユーザーの再生成残り回数
    if (isPremium && hasReflection && remainingRegenerations !== null && remainingRegenerations !== undefined) {
      if (remainingRegenerations <= 0) {
        return 'この日記の再生成上限に達しました';
      }
      return `この日記の残り再生成: ${remainingRegenerations}回`;
    }

    return null;
  }, [disabled, isPremium, remainingThisMonth, hasReflection, remainingRegenerations, isLimitReached, isFeatureLocked]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: buttonBackgroundColor,
            borderColor: buttonBorderColor,
          },
          hasReflection && styles.buttonSecondary,
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
            hasReflection && styles.buttonTextSecondary,
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
  buttonSecondary: {
    borderStyle: 'dashed',
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
  buttonTextSecondary: {
    fontFamily: fonts.family.regular,
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
