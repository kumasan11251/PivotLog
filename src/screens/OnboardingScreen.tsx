import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { OnboardingScreenNavigationProp } from '../types/navigation';
import { setOnboardingComplete, loadUserSettings } from '../utils/storage';
import { colors, fonts, spacing } from '../theme';
import {
  AnimatedHourglassIcon,
  AnimatedCountdownTimerIcon,
  AnimatedNotebookIcon,
  AnimatedSparkleIcon,
} from '../components/icons/AnimatedOnboardingIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  icon: 'hourglass' | 'countdown' | 'notebook' | 'sparkle';
  title: string;
  subtitle: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    icon: 'hourglass',
    title: 'PivotLogへようこそ',
    subtitle: '「いつか」を「今日」に変える',
    description: '人生は思っているより短い\nだからこそ、一日一日を\n自分らしく輝かせよう',
  },
  {
    id: 2,
    icon: 'countdown',
    title: '時間を見える化する',
    subtitle: '残り時間をリアルタイムで表示',
    description: '刻一刻と過ぎていく時間\nそれを意識した瞬間から\n「本当にやりたいこと」が見えてくる',
  },
  {
    id: 3,
    icon: 'notebook',
    title: '1日3分、自分と向き合う',
    subtitle: '書くことで、明日が変わる',
    description: '今日、良かったこと\n今日、少し後悔していること\n明日、大切にしたいこと\nシンプルな習慣が人生を変える',
  },
  {
    id: 4,
    icon: 'sparkle',
    title: '今日は、二度と来ない',
    subtitle: 'だから、今この瞬間から',
    description: 'あなたの人生の主人公は、あなた自身\nさあ、最高の一日を\n積み重ねていこう',
  },
];

// アイコンをレンダリングするヘルパー関数
const renderIcon = (iconType: OnboardingSlide['icon'], isActive: boolean) => {
  const iconSize = 64;
  switch (iconType) {
    case 'hourglass':
      return <AnimatedHourglassIcon size={iconSize} isActive={isActive} />;
    case 'countdown':
      return <AnimatedCountdownTimerIcon size={iconSize} isActive={isActive} />;
    case 'notebook':
      return <AnimatedNotebookIcon size={iconSize} isActive={isActive} />;
    case 'sparkle':
      return <AnimatedSparkleIcon size={iconSize} isActive={isActive} />;
    default:
      return <AnimatedHourglassIcon size={iconSize} isActive={isActive} />;
  }
};

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // アニメーション用の値
  const fadeAnim = useMemo(() => new Animated.Value(1), []);
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  // 設定が完了しているかチェック
  useEffect(() => {
    const checkSetup = async () => {
      const settings = await loadUserSettings();
      setIsSetupComplete(settings !== null);
    };
    checkSetup();
  }, []);

  // スライド切り替えアニメーション
  const animateSlideChange = (toIndex: number) => {
    // フェードアウト & スケールダウン
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(toIndex);
      scrollViewRef.current?.scrollTo({
        x: toIndex * SCREEN_WIDTH,
        animated: true,
      });

      // フェードイン & スケールアップ
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      animateSlideChange(currentIndex + 1);
    }
  };

  // 戻るボタンのハンドラ
  const handleBack = () => {
    if (currentIndex > 0) {
      animateSlideChange(currentIndex - 1);
    }
  };

  // スワイプでスクロールした時のハンドラ
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < slides.length) {
      setCurrentIndex(newIndex);
    }
  };

  // インジケータータップ時のハンドラ
  const handleIndicatorPress = (index: number) => {
    if (index !== currentIndex) {
      animateSlideChange(index);
    }
  };

  // 遷移先を決定するヘルパー関数
  const getNextRoute = () => {
    return isSetupComplete ? 'Home' : 'InitialSetup';
  };

  const handleStart = async () => {
    try {
      await setOnboardingComplete();
      navigation.reset({
        index: 0,
        routes: [{ name: getNextRoute() }],
      });
    } catch (error) {
      console.error('オンボーディング完了フラグの保存に失敗:', error);
      // エラーが発生しても進む
      navigation.reset({
        index: 0,
        routes: [{ name: getNextRoute() }],
      });
    }
  };

  const handleSkip = async () => {
    try {
      await setOnboardingComplete();
      navigation.reset({
        index: 0,
        routes: [{ name: getNextRoute() }],
      });
    } catch (error) {
      console.error('オンボーディング完了フラグの保存に失敗:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: getNextRoute() }],
      });
    }
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* スキップボタン */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>スキップ</Text>
        </TouchableOpacity>
      )}

      {/* メインコンテンツ - スワイプ可能なScrollView */}
      <View style={styles.content}>
        <Animated.View style={[styles.animatedContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
          >
            {slides.map((slide, index) => (
              <View key={slide.id} style={styles.slideContainer}>
                {/* SVGアイコン */}
                <View style={styles.iconContainer}>
                  {renderIcon(slide.icon, index === currentIndex)}
                </View>

                {/* タイトル */}
                <Text style={styles.title}>{slide.title}</Text>

                {/* サブタイトル */}
                <Text style={styles.subtitle}>{slide.subtitle}</Text>

                {/* 説明文 */}
                <Text style={styles.description}>{slide.description}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>

      {/* インジケーター */}
      <View style={styles.indicatorContainer}>
        {slides.map((slide, index) => (
          <TouchableOpacity
            key={slide.id}
            onPress={() => handleIndicatorPress(index)}
            style={styles.indicatorTouchable}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.indicator,
                index === currentIndex && styles.indicatorActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* ボタン */}
      <View style={styles.buttonContainer}>
        {isLastSlide ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>戻る</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.startButton, styles.buttonFlex]} onPress={handleStart}>
              <Text style={styles.startButtonText}>はじめる</Text>
            </TouchableOpacity>
          </View>
        ) : currentIndex > 0 ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>戻る</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.nextButton, styles.buttonFlex]} onPress={handleNext}>
              <Text style={styles.nextButtonText}>次へ</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>次へ</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  animatedContent: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.primaryDark,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 15,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  indicatorTouchable: {
    padding: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  buttonContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  buttonFlex: {
    flex: 1,
  },
  backButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  nextButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.primary,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.inverse,
  },
});

export default OnboardingScreen;
