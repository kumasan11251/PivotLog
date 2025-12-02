import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { OnboardingScreenNavigationProp } from '../types/navigation';
import { setOnboardingComplete, loadUserSettings } from '../utils/storage';
import { colors, fonts, spacing } from '../theme';
import {
  HourglassIcon,
  TargetIcon,
  NotebookIcon,
  SparkleIcon,
} from '../components/icons/OnboardingIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  icon: 'hourglass' | 'target' | 'notebook' | 'sparkle';
  title: string;
  subtitle: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    icon: 'hourglass',
    title: 'PivotLogへようこそ',
    subtitle: '残りの時間を、大切に生きる',
    description: 'このアプリは、あなたの人生の\n「今」を見つめ直すきっかけを作ります',
  },
  {
    id: 2,
    icon: 'target',
    title: '人生の残り時間を可視化',
    subtitle: 'カウントダウンで実感する',
    description: '目標年齢までの残り時間を\nリアルタイムで表示します\n今日という日の価値を感じてください',
  },
  {
    id: 3,
    icon: 'notebook',
    title: '毎日の振り返り',
    subtitle: '3つの質問で、自分を知る',
    description: '時間を有効に使えたこと\n無駄にしたこと\n明日への意気込み\nシンプルな記録で成長を実感',
  },
  {
    id: 4,
    icon: 'sparkle',
    title: 'さあ、はじめましょう',
    subtitle: 'あなただけの人生の時間',
    description: '毎日を意識的に過ごすことで\n人生はもっと豊かになります',
  },
];

// アイコンをレンダリングするヘルパー関数
const renderIcon = (iconType: OnboardingSlide['icon']) => {
  const iconSize = 64;
  switch (iconType) {
    case 'hourglass':
      return <HourglassIcon size={iconSize} />;
    case 'target':
      return <TargetIcon size={iconSize} />;
    case 'notebook':
      return <NotebookIcon size={iconSize} />;
    case 'sparkle':
      return <SparkleIcon size={iconSize} />;
    default:
      return <HourglassIcon size={iconSize} />;
  }
};

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // 設定が完了しているかチェック
  useEffect(() => {
    const checkSetup = async () => {
      const settings = await loadUserSettings();
      setIsSetupComplete(settings !== null);
    };
    checkSetup();
  }, []);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
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

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* スキップボタン */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>スキップ</Text>
        </TouchableOpacity>
      )}

      {/* メインコンテンツ */}
      <View style={styles.content}>
        <View style={styles.slideContainer}>
          {/* SVGアイコン */}
          <View style={styles.iconContainer}>
            {renderIcon(currentSlide.icon)}
          </View>

          {/* タイトル */}
          <Text style={styles.title}>{currentSlide.title}</Text>

          {/* サブタイトル */}
          <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>

          {/* 説明文 */}
          <Text style={styles.description}>{currentSlide.description}</Text>
        </View>
      </View>

      {/* インジケーター */}
      <View style={styles.indicatorContainer}>
        {slides.map((slide, index) => (
          <View
            key={slide.id}
            style={[
              styles.indicator,
              index === currentIndex && styles.indicatorActive,
            ]}
          />
        ))}
      </View>

      {/* ボタン */}
      <View style={styles.buttonContainer}>
        {isLastSlide ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>はじめる</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  slideContainer: {
    alignItems: 'center',
    width: SCREEN_WIDTH - spacing.xl * 2,
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
    fontFamily: fonts.family.regular,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
  nextButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
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
    paddingVertical: 16,
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
