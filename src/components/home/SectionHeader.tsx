import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, spacing, textBase } from '../../theme';

interface SectionHeaderProps {
  title: string;
  onToggle: () => void;
  /** モードインジケーター用: 現在のインデックス */
  currentModeIndex?: number;
  /** モードインジケーター用: 総モード数 */
  totalModes?: number;
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

const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  onToggle,
  currentModeIndex,
  totalModes,
}) => {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
      
      {/* モードインジケーター */}
      {totalModes !== undefined && currentModeIndex !== undefined && totalModes > 1 && (
        <View style={styles.indicatorContainer}>
          {Array.from({ length: totalModes }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentModeIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      )}
      
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
    marginBottom: spacing.xl,
    position: 'relative',
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
  indicatorContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -12,
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.progress.background,
  },
  indicatorActive: {
    backgroundColor: colors.primary,
    width: 18,
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
