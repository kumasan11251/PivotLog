import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Rect, G } from 'react-native-svg';
import { colors } from '../../theme';

// Animated版のSVGコンポーネント
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

interface IconProps {
  size?: number;
  color?: string;
  isActive?: boolean;
}

// 砂時計アイコン - 砂が連続して落ちるアニメーション
export const AnimatedHourglassIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary,
  isActive = true,
}) => {
  // 複数の砂粒を独立してアニメーション
  const sand1Anim = useMemo(() => new Animated.Value(0), []);
  const sand2Anim = useMemo(() => new Animated.Value(0), []);
  const sand3Anim = useMemo(() => new Animated.Value(0), []);
  const sandTopOpacity = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (!isActive) {
      sand1Anim.setValue(0);
      sand2Anim.setValue(0);
      sand3Anim.setValue(0);
      sandTopOpacity.setValue(1);
      return;
    }

    // 各砂粒が順番に落ち続けるアニメーション
    const createSandAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      );
    };

    createSandAnimation(sand1Anim, 0).start();
    createSandAnimation(sand2Anim, 450).start();
    createSandAnimation(sand3Anim, 900).start();

    // 上部の砂が徐々に減る演出（パルス）
    Animated.loop(
      Animated.sequence([
        Animated.timing(sandTopOpacity, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(sandTopOpacity, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    return () => {
      sand1Anim.stopAnimation();
      sand2Anim.stopAnimation();
      sand3Anim.stopAnimation();
      sandTopOpacity.stopAnimation();
    };
  }, [isActive, sand1Anim, sand2Anim, sand3Anim, sandTopOpacity]);

  // 砂粒1の位置とopacity
  const sand1Y = sand1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 42],
  });
  const sand1Opacity = sand1Anim.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  // 砂粒2の位置とopacity
  const sand2Y = sand2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 42],
  });
  const sand2Opacity = sand2Anim.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  // 砂粒3の位置とopacity
  const sand3Y = sand3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 42],
  });
  const sand3Opacity = sand3Anim.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path d="M16 8H48" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M16 56H48" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path
        d="M18 8V16C18 20 22 28 32 32C22 36 18 44 18 48V56"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M46 8V16C46 20 42 28 32 32C42 36 46 44 46 48V56"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M24 16C24 16 28 22 32 24C36 22 40 16 40 16"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={sandTopOpacity as unknown as number}
      />
      {/* 落ちる砂粒たち */}
      <AnimatedCircle
        cx="32"
        cy={sand1Y as unknown as number}
        r="1.5"
        fill={color}
        opacity={sand1Opacity as unknown as number}
      />
      <AnimatedCircle
        cx="31"
        cy={sand2Y as unknown as number}
        r="1"
        fill={color}
        opacity={sand2Opacity as unknown as number}
      />
      <AnimatedCircle
        cx="33"
        cy={sand3Y as unknown as number}
        r="1"
        fill={color}
        opacity={sand3Opacity as unknown as number}
      />
      {/* 下部にたまった砂 */}
      <Path
        d="M22 50C22 46 26 42 32 42C38 42 42 46 42 50"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill={color}
        fillOpacity={0.15}
      />
    </Svg>
  );
};

// カウントダウンタイマーアイコン - 針が時計回りに動くアニメーション
export const AnimatedCountdownTimerIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary,
  isActive = true,
}) => {
  const secondHandRotation = useMemo(() => new Animated.Value(0), []);
  const minuteHandRotation = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!isActive) {
      secondHandRotation.setValue(0);
      minuteHandRotation.setValue(0);
      return;
    }

    // 秒針: 時計回り（正の値）
    Animated.loop(
      Animated.timing(secondHandRotation, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 分針: 時計回り（ゆっくり）
    Animated.loop(
      Animated.timing(minuteHandRotation, {
        toValue: 1,
        duration: 36000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    return () => {
      secondHandRotation.stopAnimation();
      minuteHandRotation.stopAnimation();
    };
  }, [isActive, secondHandRotation, minuteHandRotation]);

  const secondRotation = secondHandRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const minuteRotation = minuteHandRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // 時計の中心位置（viewBox 0 0 64 64で、中心は32,32に統一）
  const clockCenterY = 32;
  const clockCenterX = 32;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Circle cx={clockCenterX} cy={clockCenterY} r="24" stroke={color} strokeWidth={2.5} fill="none" />
        <Rect x="28" y="2" width="8" height="6" rx="2" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.1} />
        <Line x1="32" y1="12" x2="32" y2="16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <Line x1="52" y1="32" x2="48" y2="32" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <Line x1="32" y1="52" x2="32" y2="48" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <Line x1="12" y1="32" x2="16" y2="32" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <Circle cx={clockCenterX} cy={clockCenterY} r="2.5" fill={color} />
      </Svg>
      {/* 分針（長い針）- 中心から上に伸びる */}
      <Animated.View
        style={[
          styles.clockHandContainer,
          {
            width: size,
            height: size,
            transform: [{ rotate: minuteRotation }],
          }
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <Line
            x1={clockCenterX}
            y1={clockCenterY}
            x2={clockCenterX}
            y2={clockCenterY - 16}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      {/* 秒針（細い針）- 中心から上に伸びる */}
      <Animated.View
        style={[
          styles.clockHandContainer,
          {
            width: size,
            height: size,
            transform: [{ rotate: secondRotation }],
          }
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <Line
            x1={clockCenterX}
            y1={clockCenterY}
            x2={clockCenterX}
            y2={clockCenterY - 20}
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

// ノートアイコン - ペンが書くアニメーション
export const AnimatedNotebookIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary,
  isActive = true,
}) => {
  const penPosition = useMemo(() => new Animated.Value(0), []);
  const line1Width = useMemo(() => new Animated.Value(0), []);
  const line2Width = useMemo(() => new Animated.Value(0), []);
  const line3Width = useMemo(() => new Animated.Value(0), []);
  const line4Width = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!isActive) {
      penPosition.setValue(0);
      line1Width.setValue(0);
      line2Width.setValue(0);
      line3Width.setValue(0);
      line4Width.setValue(0);
      return;
    }

    const animateWriting = () => {
      penPosition.setValue(0);
      line1Width.setValue(0);
      line2Width.setValue(0);
      line3Width.setValue(0);
      line4Width.setValue(0);

      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(penPosition, { toValue: 0.25, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: false }),
            Animated.timing(line1Width, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          ]),
          Animated.parallel([
            Animated.timing(penPosition, { toValue: 0.5, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: false }),
            Animated.timing(line2Width, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          ]),
          Animated.parallel([
            Animated.timing(penPosition, { toValue: 0.75, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: false }),
            Animated.timing(line3Width, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          ]),
          Animated.parallel([
            Animated.timing(penPosition, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: false }),
            Animated.timing(line4Width, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          ]),
          Animated.delay(1000),
          Animated.parallel([
            Animated.timing(line1Width, { toValue: 0, duration: 200, useNativeDriver: false }),
            Animated.timing(line2Width, { toValue: 0, duration: 200, useNativeDriver: false }),
            Animated.timing(line3Width, { toValue: 0, duration: 200, useNativeDriver: false }),
            Animated.timing(line4Width, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
          Animated.delay(500),
        ])
      ).start();
    };

    animateWriting();

    return () => {
      penPosition.stopAnimation();
      line1Width.stopAnimation();
      line2Width.stopAnimation();
      line3Width.stopAnimation();
      line4Width.stopAnimation();
    };
  }, [isActive, penPosition, line1Width, line2Width, line3Width, line4Width]);

  const penY = penPosition.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [18, 18, 26, 34, 42],
  });

  const penX = penPosition.interpolate({
    inputRange: [0, 0.25, 0.26, 0.5, 0.51, 0.75, 0.76, 1],
    outputRange: [26, 44, 26, 44, 26, 44, 26, 38],
  });

  const line1End = line1Width.interpolate({ inputRange: [0, 1], outputRange: [26, 44] });
  const line2End = line2Width.interpolate({ inputRange: [0, 1], outputRange: [26, 44] });
  const line3End = line3Width.interpolate({ inputRange: [0, 1], outputRange: [26, 44] });
  const line4End = line4Width.interpolate({ inputRange: [0, 1], outputRange: [26, 38] });

  const penTranslateX = penX.interpolate({
    inputRange: [26, 44],
    outputRange: [size * (26 / 64) - 8, size * (44 / 64) - 8],
  });

  const penTranslateY = penY.interpolate({
    inputRange: [18, 42],
    outputRange: [size * (18 / 64) - 16, size * (42 / 64) - 16],
  });

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Rect x="12" y="6" width="40" height="52" rx="3" stroke={color} strokeWidth={2} />
        <Line x1="20" y1="6" x2="20" y2="58" stroke={color} strokeWidth={1.5} opacity={0.5} />
        <AnimatedLine x1="26" y1="18" x2={line1End as unknown as number} y2="18" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        <AnimatedLine x1="26" y1="26" x2={line2End as unknown as number} y2="26" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        <AnimatedLine x1="26" y1="34" x2={line3End as unknown as number} y2="34" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        <AnimatedLine x1="26" y1="42" x2={line4End as unknown as number} y2="42" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      </Svg>
      <Animated.View style={[styles.penContainer, { transform: [{ translateX: penTranslateX }, { translateY: penTranslateY }] }]}>
        <Svg width={24} height={32} viewBox="0 0 24 32" fill="none">
          <G transform="rotate(-45, 12, 16)">
            <Rect x="10" y="2" width="4" height="18" rx="1" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.2} />
            <Path d="M10 20L12 24L14 20" stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill={color} fillOpacity={0.3} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

// スパークルアイコン - 星が輝くアニメーション
export const AnimatedSparkleIcon: React.FC<IconProps> = ({
  size = 80,
  color = colors.primary,
  isActive = true,
}) => {
  const mainStarScale = useMemo(() => new Animated.Value(1), []);
  const mainStarOpacity = useMemo(() => new Animated.Value(1), []);
  const sparkle1Opacity = useMemo(() => new Animated.Value(0), []);
  const sparkle2Opacity = useMemo(() => new Animated.Value(0), []);
  const sparkle3Opacity = useMemo(() => new Animated.Value(0), []);
  const sparkle4Opacity = useMemo(() => new Animated.Value(0), []);
  const sparkle1Scale = useMemo(() => new Animated.Value(0.5), []);
  const sparkle2Scale = useMemo(() => new Animated.Value(0.5), []);

  useEffect(() => {
    if (!isActive) {
      mainStarScale.setValue(1);
      mainStarOpacity.setValue(1);
      sparkle1Opacity.setValue(0);
      sparkle2Opacity.setValue(0);
      sparkle3Opacity.setValue(0);
      sparkle4Opacity.setValue(0);
      return;
    }

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(mainStarScale, { toValue: 1.08, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(mainStarOpacity, { toValue: 0.85, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(mainStarScale, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(mainStarOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();

    const sparkleAnimation = (opacityAnim: Animated.Value, scaleAnim: Animated.Value | null, delay: number, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(opacityAnim, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
              Animated.timing(opacityAnim, { toValue: 0, duration: duration / 2, useNativeDriver: true }),
            ]),
            ...(scaleAnim
              ? [
                  Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.2, duration: duration / 2, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 0.5, duration: duration / 2, useNativeDriver: true }),
                  ]),
                ]
              : []),
          ]),
          Animated.delay(delay * 0.5),
        ])
      ).start();
    };

    sparkleAnimation(sparkle1Opacity, sparkle1Scale, 0, 1200);
    sparkleAnimation(sparkle2Opacity, sparkle2Scale, 400, 1000);
    sparkleAnimation(sparkle3Opacity, null, 200, 800);
    sparkleAnimation(sparkle4Opacity, null, 600, 900);

    return () => {
      mainStarScale.stopAnimation();
      mainStarOpacity.stopAnimation();
      sparkle1Opacity.stopAnimation();
      sparkle2Opacity.stopAnimation();
      sparkle3Opacity.stopAnimation();
      sparkle4Opacity.stopAnimation();
      sparkle1Scale.stopAnimation();
      sparkle2Scale.stopAnimation();
    };
  }, [isActive, mainStarScale, mainStarOpacity, sparkle1Opacity, sparkle2Opacity, sparkle3Opacity, sparkle4Opacity, sparkle1Scale, sparkle2Scale]);

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      <Animated.View style={[styles.absoluteFill, { width: size, height: size, transform: [{ scale: mainStarScale }], opacity: mainStarOpacity }]}>
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <Path
            d="M32 8L36 24L52 24L40 34L44 50L32 40L20 50L24 34L12 24L28 24L32 8Z"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            fill={color}
            fillOpacity={0.15}
          />
        </Svg>
      </Animated.View>

      {/* 小さな星1 - 右上 */}
      <Animated.View style={[styles.sparkle, { left: size * (48 / 64), top: size * (8 / 64), opacity: sparkle1Opacity, transform: [{ scale: sparkle1Scale }] }]}>
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path
            d="M8 0L9.5 6L16 8L9.5 10L8 16L6.5 10L0 8L6.5 6L8 0Z"
            fill={color}
          />
        </Svg>
      </Animated.View>

      {/* 小さな星2 - 左上 */}
      <Animated.View style={[styles.sparkle, { left: size * (4 / 64), top: size * (12 / 64), opacity: sparkle2Opacity, transform: [{ scale: sparkle2Scale }] }]}>
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
          <Path
            d="M6 0L7 4.5L12 6L7 7.5L6 12L5 7.5L0 6L5 4.5L6 0Z"
            fill={color}
          />
        </Svg>
      </Animated.View>

      {/* 小さな星3 - 右下 */}
      <Animated.View style={[styles.sparkle, { left: size * (52 / 64) - 5, top: size * (44 / 64) - 5, opacity: sparkle3Opacity }]}>
        <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
          <Path
            d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4L5 0Z"
            fill={color}
          />
        </Svg>
      </Animated.View>

      {/* 小さな星4 - 左下 */}
      <Animated.View style={[styles.sparkle, { left: size * (8 / 64) - 4, top: size * (48 / 64) - 4, opacity: sparkle4Opacity }]}>
        <Svg width={8} height={8} viewBox="0 0 8 8" fill="none">
          <Path
            d="M4 0L5 3L8 4L5 5L4 8L3 5L0 4L3 3L4 0Z"
            fill={color}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  clockHandContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    // 時計の中心を基準に回転（viewBox: 64x64, 中心: 32,34）
    // React Nativeでは transformOrigin がないので、
    // SVG内で針が中心から伸びるように描画することで対応
  },
  penContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sparkle: {
    position: 'absolute',
  },
});
