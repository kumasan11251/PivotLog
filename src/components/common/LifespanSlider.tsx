import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getColors, fonts, spacing, textBase } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_PADDING = spacing.xl;
const SLIDER_WIDTH = SCREEN_WIDTH - SLIDER_PADDING * 2 - 48;
const THUMB_SIZE = 32;
const TRACK_HEIGHT = 8;

interface LifespanSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  currentAge: number;
  forceLightMode?: boolean;
}

// プリセット値を動的に生成する関数
const generatePresetValues = (minValue: number, maxValue: number): number[] => {
  // 10刻みで、minValue以上maxValue以下の値を生成
  const presets: number[] = [];

  // 基本のプリセット候補（10刻み）
  const baseCandidates = [80, 90, 100, 110, 120];

  for (const candidate of baseCandidates) {
    if (candidate >= minValue && candidate <= maxValue) {
      presets.push(candidate);
    }
  }

  // プリセットが3つ未満の場合、minValueから10刻みで追加
  if (presets.length < 3) {
    const startValue = Math.ceil(minValue / 10) * 10;
    for (let v = startValue; v <= maxValue && presets.length < 3; v += 10) {
      if (!presets.includes(v)) {
        presets.push(v);
      }
    }
    presets.sort((a, b) => a - b);
  }

  // 最大3つまで
  return presets.slice(0, 3);
};

const LifespanSlider: React.FC<LifespanSliderProps> = ({
  value,
  onValueChange,
  minValue = 50,
  maxValue = 120,
  currentAge,
  forceLightMode = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(forceLightMode ? false : isDark), [isDark, forceLightMode]);
  const [sliderWidth, setSliderWidth] = useState(SLIDER_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const animatedValue = useMemo(() => new Animated.Value(0), []);
  const startXRef = useRef(0);
  const startValueRef = useRef(value);

  // スライダーの位置を値に変換
  const positionToValue = useCallback(
    (position: number) => {
      const effectiveWidth = sliderWidth - THUMB_SIZE;
      const clampedPosition = Math.max(0, Math.min(effectiveWidth, position));
      const ratio = clampedPosition / effectiveWidth;
      const rawValue = minValue + ratio * (maxValue - minValue);
      return Math.round(rawValue);
    },
    [sliderWidth, minValue, maxValue]
  );

  // 値をスライダーの位置に変換
  const valueToPosition = useCallback(
    (val: number) => {
      const effectiveWidth = sliderWidth - THUMB_SIZE;
      const ratio = (val - minValue) / (maxValue - minValue);
      return ratio * effectiveWidth;
    },
    [sliderWidth, minValue, maxValue]
  );

  // アニメーション値を更新
  React.useEffect(() => {
    if (!isDragging) {
      Animated.spring(animatedValue, {
        toValue: valueToPosition(value),
        useNativeDriver: false,
        friction: 8,
        tension: 100,
      }).start();
    }
  }, [value, valueToPosition, animatedValue, isDragging]);

  // タッチ開始
  const handleTouchStart = useCallback((event: { nativeEvent: { pageX: number } }) => {
    setIsDragging(true);
    startXRef.current = event.nativeEvent.pageX;
    startValueRef.current = value;
  }, [value]);

  // タッチ移動
  const handleTouchMove = useCallback((event: { nativeEvent: { pageX: number } }) => {
    if (!isDragging) return;

    const deltaX = event.nativeEvent.pageX - startXRef.current;
    const startPosition = valueToPosition(startValueRef.current);
    const newPosition = startPosition + deltaX;
    const newValue = positionToValue(newPosition);

    animatedValue.setValue(valueToPosition(newValue));
    onValueChange(newValue);
  }, [isDragging, valueToPosition, positionToValue, animatedValue, onValueChange]);

  // タッチ終了
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePresetPress = (presetValue: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onValueChange(presetValue);
  };

  // 動的にプリセット値を生成
  const presetValues = useMemo(
    () => generatePresetValues(minValue, maxValue),
    [minValue, maxValue]
  );

  const remainingYears = value - currentAge;

  return (
    <View style={styles.container}>
      {/* 現在の値表示 */}
      <View style={styles.valueContainer}>
        <Text style={[styles.valueNumber, { color: themeColors.primary }]}>{value}</Text>
        <Text style={[styles.valueUnit, { color: themeColors.text.secondary }]}>歳</Text>
      </View>

      {/* 残り年数表示 */}
      <View style={[styles.remainingContainer, { backgroundColor: `${themeColors.primary}1a` }]}>
        <Text style={[styles.remainingLabel, { color: themeColors.text.secondary }]}>残り約</Text>
        <Text style={[styles.remainingValue, { color: themeColors.primary }]}>{remainingYears}</Text>
        <Text style={[styles.remainingUnit, { color: themeColors.text.secondary }]}>年</Text>
      </View>

      {/* スライダー */}
      <View
        style={styles.sliderContainer}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
      >
        {/* タッチ領域を広げたスライダー */}
        <View
          style={styles.touchArea}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminate={handleTouchEnd}
        >
          <View style={[styles.track, { backgroundColor: themeColors.border }]}>
            <Animated.View
              style={[
                styles.filledTrack,
                {
                  width: Animated.add(animatedValue, THUMB_SIZE / 2),
                  backgroundColor: themeColors.primary,
                },
              ]}
            />
          </View>

          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: themeColors.surface, shadowColor: themeColors.shadow },
              isDragging && styles.thumbActive,
              {
                transform: [{ translateX: animatedValue }],
              },
            ]}
          >
            <View style={[styles.thumbInner, { backgroundColor: themeColors.primary }, isDragging && { backgroundColor: themeColors.primary }]} />
          </Animated.View>
        </View>
      </View>

      {/* 最小・最大値ラベル */}
      <View style={styles.rangeLabels}>
        <Text style={[styles.rangeLabel, { color: themeColors.text.secondary }]}>{minValue}歳</Text>
        <Text style={[styles.rangeLabel, { color: themeColors.text.secondary }]}>{maxValue}歳</Text>
      </View>

      {/* プリセットボタン */}
      <View style={styles.presetContainer}>
        {presetValues.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              { backgroundColor: themeColors.surface, borderColor: themeColors.border },
              value === preset && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
            ]}
            onPress={() => handlePresetPress(preset)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.presetText,
                { color: themeColors.text.secondary },
                value === preset && { color: themeColors.text.inverse, fontFamily: fonts.family.bold },
              ]}
            >
              {preset}歳
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  valueNumber: {
    ...textBase,
    fontSize: 56,
    fontFamily: fonts.family.bold,
  },
  valueUnit: {
    ...textBase,
    fontSize: 24,
    fontFamily: fonts.family.regular,
    marginLeft: 4,
  },
  remainingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  remainingLabel: {
    ...textBase,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginRight: 4,
  },
  remainingValue: {
    ...textBase,
    fontSize: 20,
    fontFamily: fonts.family.bold,
  },
  remainingUnit: {
    ...textBase,
    fontSize: 14,
    fontFamily: fonts.family.regular,
    marginLeft: 2,
  },
  sliderContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
  },
  touchArea: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIZE / 2,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  filledTrack: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  thumbActive: {
    transform: [{ scale: 1.15 }],
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  thumbInner: {
    width: THUMB_SIZE - 8,
    height: THUMB_SIZE - 8,
    borderRadius: (THUMB_SIZE - 8) / 2,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.sm,
    paddingHorizontal: 4,
  },
  rangeLabel: {
    ...textBase,
    fontSize: 12,
    fontFamily: fonts.family.regular,
  },
  presetContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  presetButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetText: {
    ...textBase,
    fontSize: 14,
    fontFamily: fonts.family.regular,
  },
});

export default LifespanSlider;
