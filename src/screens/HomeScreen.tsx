import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { loadUserSettings } from '../utils/storage';
import { colors, fonts, spacing } from '../theme';
import Button from '../components/common/Button';

interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const HomeScreen: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [lifeProgress, setLifeProgress] = useState(0); // 0-100の進捗率
  const [targetLifespan, setTargetLifespan] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = async () => {
      const settings = await loadUserSettings();
      if (!settings) return;

      setTargetLifespan(settings.targetLifespan);

      const now = new Date();
      const birthday = new Date(settings.birthday);
      const targetDate = new Date(birthday);
      targetDate.setFullYear(birthday.getFullYear() + settings.targetLifespan);

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

      setTimeLeft({
        years,
        months,
        days: remainingDays,
        hours: totalHours % 24,
        minutes: totalMinutes % 60,
        seconds: totalSeconds % 60,
      });

      // 進捗率の計算
      const totalLifeMs = targetDate.getTime() - birthday.getTime();
      const livedMs = now.getTime() - birthday.getTime();
      const progress = (livedMs / totalLifeMs) * 100;
      setLifeProgress(Math.min(progress, 100));
    };

    // 初回計算
    calculateTimeLeft();

    // 1秒ごとに更新
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRecordToday = () => {
    // TODO: 日記入力画面への遷移
    console.log('今日を記録する');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>残りの時間</Text>

      {/* カウントダウン表示 */}
      <View style={styles.countdownContainer}>
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
          <Text style={styles.timeLabelSmall}>時間</Text>
        </View>
        <View style={styles.timeBlockSmall}>
          <Text style={styles.timeValueSmall}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
          <Text style={styles.timeLabelSmall}>分</Text>
        </View>
        <View style={styles.timeBlockSmall}>
          <Text style={styles.timeValueSmall}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
          <Text style={styles.timeLabelSmall}>秒</Text>
        </View>
      </View>

      {/* 進捗バー */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelContainer}>
          <Text style={styles.progressLabel}>誕生</Text>
          <Text style={styles.progressLabel}>{targetLifespan}歳</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${lifeProgress}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{lifeProgress.toFixed(1)}%</Text>
      </View>

      {/* 今日を記録するボタン */}
      <Button title="記録する" onPress={handleRecordToday} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.padding.screen,
    justifyContent: 'center',
  },
  title: {
    fontSize: fonts.size.title,
    fontWeight: fonts.weight.regular,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    letterSpacing: 2,
    fontFamily: fonts.family.regular,
  },
  countdownContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: spacing.xxl,
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
  progressSection: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
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
});

export default HomeScreen;
