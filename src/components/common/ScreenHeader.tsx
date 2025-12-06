import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase } from '../../theme';

interface LeftAction {
  type: 'back' | 'backIcon' | 'close' | 'custom';
  label?: string;
  onPress: () => void;
}

interface RightAction {
  type: 'settings' | 'text' | 'icon';
  label?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
}

interface ScreenHeaderProps {
  /** 左側のアクション（戻るボタンなど） */
  leftAction?: LeftAction;
  /** 中央のタイトル */
  title?: string;
  /** 右側のアクション（編集、設定アイコンなど） - 単一のアクション */
  rightAction?: RightAction;
  /** 右側のアクション（複数対応） - rightAction より優先される */
  rightActions?: RightAction[];
  /** 下線を表示するか（デフォルト: true） */
  showBorder?: boolean;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  leftAction,
  title,
  rightAction,
  rightActions,
  showBorder = true,
}) => {
  const renderLeftAction = () => {
    if (!leftAction) {
      return <View style={styles.placeholder} />;
    }

    let content: React.ReactNode;
    switch (leftAction.type) {
      case 'back':
        content = (
          <Text style={styles.backText}>
            {leftAction.label ?? '← 戻る'}
          </Text>
        );
        break;
      case 'backIcon':
        content = (
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        );
        break;
      case 'close':
        content = (
          <Ionicons name="close" size={24} color={colors.text.primary} />
        );
        break;
      case 'custom':
        content = (
          <Text style={styles.actionText}>{leftAction.label}</Text>
        );
        break;
    }

    return (
      <TouchableOpacity
        style={[styles.actionButton, styles.leftActionButton]}
        onPress={leftAction.onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  };

  const renderRightAction = () => {
    // rightActions が指定されている場合は複数のアクションを表示
    const actions = rightActions ?? (rightAction ? [rightAction] : []);

    if (actions.length === 0) {
      return <View style={styles.placeholder} />;
    }

    return (
      <View style={styles.rightActionsContainer}>
        {actions.map((action, index) => {
          let content: React.ReactNode;
          switch (action.type) {
            case 'settings':
              content = (
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color={action.color ?? colors.text.primary}
                />
              );
              break;
            case 'icon':
              content = (
                <Ionicons
                  name={action.iconName ?? 'ellipsis-horizontal'}
                  size={20}
                  color={action.color ?? colors.text.primary}
                />
              );
              break;
            case 'text':
              content = (
                <Text style={[styles.actionText, action.color ? { color: action.color } : null]}>
                  {action.label}
                </Text>
              );
              break;
          }

          return (
            <TouchableOpacity
              key={index}
              style={[styles.actionButton, index > 0 && styles.actionButtonWithMargin]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              {content}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.header, showBorder && styles.headerBorder]}>
      {renderLeftAction()}
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titlePlaceholder} />
      )}
      {renderRightAction()}
    </View>
  );
};

const HEADER_HEIGHT = 50;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.padding.screen,
    height: HEADER_HEIGHT,
    backgroundColor: colors.background,
  },
  headerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  placeholder: {
    width: 44,
  },
  titlePlaceholder: {
    flex: 1,
  },
  title: {
    flex: 1,
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.regular,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    ...textBase,
  },
  actionButton: {
    paddingVertical: spacing.xs,
  },
  actionButtonWithMargin: {
    marginLeft: spacing.md,
  },
  leftActionButton: {
    alignItems: 'flex-start',
    minWidth: 80,
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 44,
  },
  backText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  actionText: {
    fontSize: fonts.size.body,
    color: colors.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default ScreenHeader;
