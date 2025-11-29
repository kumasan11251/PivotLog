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
}

interface ScreenHeaderProps {
  /** 左側のアクション（戻るボタンなど） */
  leftAction?: LeftAction;
  /** 中央のタイトル */
  title?: string;
  /** 右側のアクション（編集、設定アイコンなど） */
  rightAction?: RightAction;
  /** 下線を表示するか（デフォルト: true） */
  showBorder?: boolean;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  leftAction,
  title,
  rightAction,
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
    if (!rightAction) {
      return <View style={styles.placeholder} />;
    }

    let content: React.ReactNode;
    switch (rightAction.type) {
      case 'settings':
        content = (
          <Ionicons
            name="settings-outline"
            size={20}
            color={colors.text.primary}
          />
        );
        break;
      case 'icon':
        content = (
          <Ionicons
            name={rightAction.iconName ?? 'ellipsis-horizontal'}
            size={20}
            color={colors.text.primary}
          />
        );
        break;
      case 'text':
        content = (
          <Text style={styles.actionText}>{rightAction.label}</Text>
        );
        break;
    }

    return (
      <TouchableOpacity
        style={[styles.actionButton, styles.rightActionButton]}
        onPress={rightAction.onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
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
  leftActionButton: {
    alignItems: 'flex-start',
    minWidth: 80,
  },
  rightActionButton: {
    alignItems: 'flex-end',
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
