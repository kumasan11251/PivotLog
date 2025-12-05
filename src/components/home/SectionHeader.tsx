import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, spacing, textBase } from '../../theme';

interface SectionHeaderProps {
  title: string;
  onToggle: () => void;
  icon?: 'hourglass' | 'sprout';
}

// 切替アイコン（矢印の循環）
const ToggleIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = colors.text.secondary
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 1L21 5L17 9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 11V9C3 7.93913 3.42143 6.92172 4.17157 6.17157C4.92172 5.42143 5.93913 5 7 5H21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 23L3 19L7 15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 13V15C21 16.0609 20.5786 17.0783 19.8284 17.8284C19.0783 18.5786 18.0609 19 17 19H3"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 砂時計アイコン
const HourglassIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = colors.primary
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 2H18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 22H18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 2V8L12 12L18 8V2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 22V16L12 12L18 16V22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 双葉アイコン（シンプルな芽）
const SproutIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = colors.primary
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* 茂 */}
    <Path
      d="M12 22V8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* 左の葉 */}
    <Path
      d="M12 12C8 12 5 9 5 5C9 5 12 8 12 12Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* 右の葉 */}
    <Path
      d="M12 8C16 8 19 5 19 1C15 1 12 4 12 8Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  onToggle,
  icon,
}) => {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const renderIcon = () => {
    switch (icon) {
      case 'hourglass':
        return <HourglassIcon />;
      case 'sprout':
        return <SproutIcon />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.titleContainer}>
      <View style={styles.titleWithIcon}>
        {icon && <View style={styles.iconContainer}>{renderIcon()}</View>}
        <Text style={styles.title}>{title}</Text>
        {/* アイコンと同じ幅のスペーサーで左右のバランスを取る */}
        {icon && <View style={styles.iconSpacer} />}
      </View>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={handleToggle}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ToggleIcon />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 20,
    marginRight: spacing.sm,
  },
  iconSpacer: {
    width: 20,
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: fonts.size.sectionTitle,
    fontWeight: fonts.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 3,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  toggleButton: {
    position: 'absolute',
    right: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(139, 157, 131, 0.1)',
    borderRadius: spacing.borderRadius.small,
  },
});

export default SectionHeader;
