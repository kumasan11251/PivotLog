import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { HomeScreenNavigationProp } from '../types/navigation';
import { loadUserSettings, loadHomeDisplaySettings, saveHomeDisplaySettings } from '../utils/storage';
import { colors, fonts, spacing } from '../theme';
import Button from './common/Button';
import Header from './common/Header';
import Svg, { Circle } from 'react-native-svg';

// AnimatedCircleの作成
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number; // 日のみ表示用(小数点以下含む)
  totalYears: number; // 年のみ表示用(小数点以下含む)
}

type CountdownMode = 'detailed' | 'daysOnly' | 'yearsOnly';
type ProgressMode = 'bar' | 'circle';

const HomeContent: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalDays: 0,
    totalYears: 0,
  });
  const [lifeProgress, setLifeProgress] = useState(0); // 0-100の進捗率
  const [targetLifespan, setTargetLifespan] = useState(0);
  const [countdownMode, setCountdownMode] = useState<CountdownMode>('detailed');
  const [progressMode, setProgressMode] = useState<ProgressMode>('bar');

  // アニメーション用の値
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [hasAnimated, setHasAnimated] = useState(false);

  // 初回マウント時に表示設定を読み込む
  useEffect(() => {
    const loadDisplaySettings = async () => {
      const settings = await loadHomeDisplaySettings();
      if (settings) {
        setCountdownMode(settings.countdownMode);
        setProgressMode(settings.progressMode);
      }
    };
    loadDisplaySettings();
  }, []);

  useEffect(() => {
    const calculateTimeLeft = async () => {
      const settings = await loadUserSettings();
      if (!settings) return;

      setTargetLifespan(settings.targetLifespan);

      const now = new Date();
      // タイムゾーンの影響を受けないように、年月日を個別に取得
      const [year, month, day] = settings.birthday.split('-').map(Number);
      const birthday = new Date(year, month - 1, day, 0, 0, 0, 0);
      const targetDate = new Date(year + settings.targetLifespan, month - 1, day, 0, 0, 0, 0);

      // 残り時間の計算
      const diffMs = targetDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        // 目標寿命を超えた場合
        setTimeLeft({
          years: 0,
          months: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalDays: 0,
          totalYears: 0,
        });
        setLifeProgress(100);
        return;
      }

      // ミリ秒から各単位に変換
      const totalSeconds = Math.floor(diffMs / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);

      // 年と月の計算（正確な日数を考慮）
      let years = 0;
      let months = 0;
      let tempDate = new Date(now);

      while (tempDate.getFullYear() < targetDate.getFullYear() ||
             (tempDate.getFullYear() === targetDate.getFullYear() &&
              tempDate.getMonth() < targetDate.getMonth())) {
        tempDate.setMonth(tempDate.getMonth() + 1);
        if (tempDate <= targetDate) {
          months++;
        }
      }

      years = Math.floor(months / 12);
      months = months % 12;

      // 残りの日数を計算
      tempDate = new Date(now);
      tempDate.setFullYear(tempDate.getFullYear() + years);
      tempDate.setMonth(tempDate.getMonth() + months);
      const remainingMs = targetDate.getTime() - tempDate.getTime();
      const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));

      // 総日数の計算(日のみ表示用、小数点以下も含む)
      const totalDays = diffMs / (1000 * 60 * 60 * 24);

      // 総年数の計算(年のみ表示用、小数点以下も含む)
      const totalYears = totalDays / 365.25;

      setTimeLeft({
        years,
        months,
        days: remainingDays,
        hours: totalHours % 24,
        minutes: totalMinutes % 60,
        seconds: totalSeconds % 60,
        totalDays,
        totalYears,
      });

      // 進捗率の計算
      const totalLifeMs = targetDate.getTime() - birthday.getTime();
      const livedMs = now.getTime() - birthday.getTime();
      const progress = (livedMs / totalLifeMs) * 100;
      const finalProgress = Math.min(progress, 100);
      setLifeProgress(finalProgress);

      // 初回のみアニメーションを実行
      if (!hasAnimated) {
        setHasAnimated(true);
        Animated.timing(progressAnim, {
          toValue: finalProgress,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    };

    // 初回計算
    calculateTimeLeft();

    // 1秒ごとに更新
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [progressAnim, hasAnimated]);

  const handleRecordToday = () => {
    navigation.navigate('DiaryEntry', {});
  };

  const toggleCountdownMode = async () => {
    const newMode = countdownMode === 'detailed' ? 'yearsOnly' : countdownMode === 'yearsOnly' ? 'daysOnly' : 'detailed';
    setCountdownMode(newMode);
    await saveHomeDisplaySettings({
      countdownMode: newMode,
      progressMode,
    });
  };

  const toggleProgressMode = async () => {
    // モード切り替え時にアニメーションをリセットして再実行
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: lifeProgress,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const newMode = progressMode === 'bar' ? 'circle' : 'bar';
    setProgressMode(newMode);
    await saveHomeDisplaySettings({
      countdownMode,
      progressMode: newMode,
    });
  };

  // アニメーション用の幅とストローク計算
  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const animatedStrokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [2 * Math.PI * 90, 0],
  });

  return (
    <View style={styles.container}>
      <Header title="ホーム" />

      <View style={styles.content}>
        {/* 上部セクション：タイトルとカウントダウン */}
        <View style={styles.topSection}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>残りの時間</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleCountdownMode}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleButtonText}>切替</Text>
            </TouchableOpacity>
          </View>

          {/* カウントダウン表示 */}
          <View style={styles.countdownContainer}>
            {countdownMode === 'detailed' ? (
              <>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeValue}>{String(timeLeft.years).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>年</Text>
                </View>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeValue}>{String(timeLeft.months).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>月</Text>
                </View>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeValue}>{String(timeLeft.days).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>日</Text>
                </View>
                <View style={styles.timeBlockSmall}>
                  <Text style={styles.timeValueSmall}>{String(timeLeft.hours).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabelSmall}>時</Text>
                </View>
                <View style={styles.timeBlockSmall}>
                  <Text style={styles.timeValueSmall}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabelSmall}>分</Text>
                </View>
                <View style={styles.timeBlockSmall}>
                  <Text style={styles.timeValueSmall}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabelSmall}>秒</Text>
                </View>
              </>
            ) : countdownMode === 'yearsOnly' ? (
              <View style={styles.timeBlock}>
                <Text style={styles.timeValue}>
                  {Math.floor(timeLeft.totalYears)}
                  <Text style={styles.decimalPart}>
                    {(timeLeft.totalYears % 1).toFixed(8).substring(1)}
                  </Text>
                </Text>
                <Text style={styles.timeLabel}>年</Text>
              </View>
            ) : (
              <View style={styles.timeBlock}>
                <Text style={styles.timeValue}>
                  {Math.floor(timeLeft.totalDays).toLocaleString('ja-JP')}
                  <Text style={styles.decimalPart}>
                    {(timeLeft.totalDays % 1).toFixed(5).substring(1)}
                  </Text>
                </Text>
                <Text style={styles.timeLabel}>日</Text>
              </View>
            )}
          </View>
        </View>

        {/* 中央セクション:プログレスバーエリア(今後切り替え可能) */}
        <View style={styles.centerSection}>
          {/* プログレス表示タイトルと切り替えボタン */}
          <View style={styles.progressTitleContainer}>
            <Text style={styles.progressTitle}>人生の進捗</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleProgressMode}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleButtonText}>切替</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressContentContainer}>
            {progressMode === 'bar' ? (
              /* 進捗バー */
              <View style={styles.progressSection}>
                <View style={styles.progressLabelContainer}>
                  <Text style={styles.progressLabel}>誕生</Text>
                  <Text style={styles.progressLabel}>{targetLifespan}歳</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <Animated.View
                    style={[
                      styles.progressBar,
                      { width: animatedWidth },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{lifeProgress.toFixed(1)}%</Text>
              </View>
            ) : (
              /* 円形プログレス */
              <View style={styles.circleProgressSection}>
                <View style={styles.circleProgressContainer}>
                  <Svg width="200" height="200" style={styles.circleSvg}>
                    {/* 背景円 */}
                    <Circle
                      cx="100"
                      cy="100"
                      r="90"
                      stroke={colors.progress.background}
                      strokeWidth="12"
                      fill="none"
                    />
                    {/* プログレス円 */}
                    <AnimatedCircle
                      cx="100"
                      cy="100"
                      r="90"
                      stroke={colors.progress.bar}
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 90}`}
                      strokeDashoffset={animatedStrokeDashoffset}
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                    />
                  </Svg>
                  <View style={styles.circleProgressTextContainer}>
                    <Text style={styles.circleProgressText}>
                      {lifeProgress.toFixed(1)}%
                    </Text>
                    <Text style={styles.circleProgressSubText}>
                      {targetLifespan}歳まで
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 下部セクション：ボタン */}
        <View style={styles.bottomSection}>
          <Button title="今日を記録する" onPress={handleRecordToday} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.padding.screen,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
  },
  centerSection: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    width: '100%',
  },
  titleContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  title: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.medium,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: fonts.family.regular,
  },
  toggleButton: {
    position: 'absolute',
    right: 0,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(139, 157, 131, 0.1)',
    borderRadius: spacing.borderRadius.small,
  },
  toggleButtonText: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    letterSpacing: 0.5,
  },
  countdownContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeBlock: {
    alignItems: 'center',
    marginHorizontal: 2,
    minWidth: spacing.countdown.blockWidthLarge,
  },
  timeValue: {
    fontSize: fonts.size.countdownLarge,
    fontWeight: fonts.weight.light,
    color: colors.text.primary,
    marginBottom: 2,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthLarge,
    textAlign: 'center',
    lineHeight: fonts.lineHeight.countdownLarge,
  },
  timeLabel: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
  },
  decimalPart: {
    fontSize: fonts.size.countdownSmall,
    fontWeight: fonts.weight.light,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  timeBlockSmall: {
    alignItems: 'center',
    marginHorizontal: 2,
    minWidth: spacing.countdown.blockWidthSmall,
  },
  timeValueSmall: {
    fontSize: fonts.size.countdownSmall,
    fontWeight: fonts.weight.light,
    color: colors.text.primary,
    marginBottom: 2,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthSmall,
    textAlign: 'center',
    lineHeight: fonts.lineHeight.countdownSmall,
  },
  timeLabelSmall: {
    fontSize: fonts.size.labelSmall,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    fontFamily: fonts.family.regular,
  },
  progressTitleContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  progressTitle: {
    fontSize: fonts.size.body,
    fontWeight: fonts.weight.medium,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: fonts.family.regular,
  },
  progressContentContainer: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    width: '100%',
    maxWidth: 320,
    justifyContent: 'center',
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  progressLabel: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    fontFamily: fonts.family.regular,
  },
  progressBarContainer: {
    height: spacing.progressBar.height,
    backgroundColor: colors.progress.background,
    borderRadius: spacing.borderRadius.small,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.progress.bar,
    borderRadius: spacing.borderRadius.small,
  },
  progressText: {
    fontSize: fonts.size.body,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: fonts.weight.regular,
    fontFamily: fonts.family.regular,
  },
  circleProgressSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleProgressContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSvg: {
    position: 'absolute',
  },
  circleProgressTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleProgressText: {
    fontSize: fonts.size.countdownLarge,
    fontWeight: fonts.weight.light,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    marginBottom: spacing.xs,
  },
  circleProgressSubText: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    letterSpacing: 1,
  },
});

export default HomeContent;
