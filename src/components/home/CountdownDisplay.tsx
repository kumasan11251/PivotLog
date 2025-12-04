import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase } from '../../theme';
import type { TimeLeft } from '../../utils/timeCalculations';

// アイコンのProps型
interface IconProps {
  size?: number;
  color?: string;
}

// 春アイコン（花）
const SpringIcon: React.FC<IconProps> = ({ size = 28, color = colors.text.secondary }) => (
  <MaterialCommunityIcons name="flower" size={size} color={color} />
);

// 夏アイコン（太陽）
const SummerIcon: React.FC<IconProps> = ({ size = 28, color = colors.text.secondary }) => (
  <MaterialCommunityIcons name="white-balance-sunny" size={size} color={color} />
);

// 秋アイコン（紅葉）
const AutumnIcon: React.FC<IconProps> = ({ size = 28, color = colors.text.secondary }) => (
  <MaterialCommunityIcons name="leaf-maple" size={size} color={color} />
);

// 冬アイコン（雪の結晶）
const WinterIcon: React.FC<IconProps> = ({ size = 28, color = colors.text.secondary }) => (
  <MaterialCommunityIcons name="snowflake" size={size} color={color} />
);

// お正月アイコン（パーティー）
const NewYearIcon: React.FC<IconProps> = ({ size = 28, color = colors.text.secondary }) => (
  <MaterialCommunityIcons name="party-popper" size={size} color={color} />
);

// 誕生日アイコン（ギフト）
const BirthdayIcon: React.FC<IconProps> = ({ size = 28, color = colors.text.secondary }) => (
  <MaterialCommunityIcons name="gift" size={size} color={color} />
);

// 季節キーとアイコンのマッピング
const SeasonIcons: Record<string, React.FC<IconProps>> = {
  spring: SpringIcon,
  summer: SummerIcon,
  autumn: AutumnIcon,
  winter: WinterIcon,
};

// 季節の定義（月ベース）
// 春: 3-5月, 夏: 6-8月, 秋: 9-11月, 冬: 12-2月
const SEASONS = [
  { key: 'spring', label: '春', startMonth: 3, endMonth: 5 },
  { key: 'summer', label: '夏', startMonth: 6, endMonth: 8 },
  { key: 'autumn', label: '秋', startMonth: 9, endMonth: 11 },
  { key: 'winter', label: '冬', startMonth: 12, endMonth: 2 },
] as const;

// 今の季節を取得
const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return SEASONS[0]; // 春
  if (month >= 6 && month <= 8) return SEASONS[1]; // 夏
  if (month >= 9 && month <= 11) return SEASONS[2]; // 秋
  return SEASONS[3]; // 冬 (12, 1, 2)
};

// 今の季節の残り日数を計算
const getDaysLeftInSeason = (): number => {
  const today = new Date();
  const currentSeason = getCurrentSeason();

  let endDate: Date;
  if (currentSeason.key === 'winter') {
    // 冬は年をまたぐので特別処理（2月末まで）
    const year = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    endDate = new Date(year, 2, 1); // 3月1日の0時 = 2月末
  } else {
    // 他の季節は終了月の末日
    endDate = new Date(today.getFullYear(), currentSeason.endMonth, 1); // 翌月1日の0時 = 当月末
  }

  const diffMs = endDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// 今日がお正月（1月1日）かどうか
const isNewYearDay = (): boolean => {
  const today = new Date();
  return today.getMonth() === 0 && today.getDate() === 1;
};

// 今日が誕生日かどうか
const isBirthdayToday = (birthday?: string): boolean => {
  if (!birthday) return false;
  const today = new Date();
  const [, birthMonth, birthDay] = birthday.split('-').map(Number);
  return today.getMonth() + 1 === birthMonth && today.getDate() === birthDay;
};

// 表示データの型定義
type SeasonDisplayData = {
  iconType: 'season' | 'newyear' | 'birthday';
  seasonKey?: string;
  count: number;
  message: string;
  subMessage: string;
};

// 表示データを取得
// - お正月: 1月1日のみ表示（人生であと何回）
// - 誕生日: 誕生日当日のみ表示（人生であと何回）
// - それ以外: 今の季節の残り日数
const getSeasonDisplay = (totalYears: number, birthday?: string): SeasonDisplayData => {
  // 残り年数（人生であと何回か）
  const remainingYears = Math.max(0, Math.floor(totalYears));

  // お正月（1月1日）の場合
  if (isNewYearDay()) {
    return {
      iconType: 'newyear',
      count: remainingYears,
      message: 'あと',
      subMessage: '回のお正月',
    };
  }

  // 誕生日当日の場合
  if (isBirthdayToday(birthday)) {
    return {
      iconType: 'birthday',
      count: remainingYears,
      message: 'あと',
      subMessage: '回の誕生日',
    };
  }

  // それ以外: 今の季節の残り日数
  const season = getCurrentSeason();
  const daysLeft = getDaysLeftInSeason();
  return {
    iconType: 'season',
    seasonKey: season.key,
    count: daysLeft,
    message: `${season.label}はあと`,
    subMessage: '日',
  };
};

export type CountdownMode = 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly' | 'seasons';

interface CountdownDisplayProps {
  timeLeft: TimeLeft;
  mode: CountdownMode;
  birthday?: string; // 誕生日（YYYY-MM-DD形式）- seasonsモードで誕生日当日表示に使用
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ timeLeft, mode, birthday }) => {
  if (mode === 'detailed') {
    return (
      <View style={styles.detailedContainer}>
        {/* 数字の行 */}
        <View style={styles.valuesRow}>
          <Text style={styles.timeValue}>{String(timeLeft.years).padStart(2, '0')}</Text>
          <Text style={styles.timeValue}>{String(timeLeft.months).padStart(2, '0')}</Text>
          <Text style={styles.timeValue}>{String(timeLeft.days).padStart(2, '0')}</Text>
          <Text style={styles.timeValueSmall}>{String(timeLeft.hours).padStart(2, '0')}</Text>
          <Text style={styles.timeValueSmall}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
          <Text style={styles.timeValueSmall}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
        </View>
        {/* ラベルの行 */}
        <View style={styles.labelsRow}>
          <Text style={styles.timeLabel}>年</Text>
          <Text style={styles.timeLabel}>月</Text>
          <Text style={styles.timeLabel}>日</Text>
          <Text style={styles.timeLabelSmall}>時</Text>
          <Text style={styles.timeLabelSmall}>分</Text>
          <Text style={styles.timeLabelSmall}>秒</Text>
        </View>
      </View>
    );
  }

  if (mode === 'yearsOnly') {
    return (
      <View style={styles.countdownContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>
            {Math.floor(timeLeft.totalYears)}
            <Text style={styles.decimalPart}>
              {(timeLeft.totalYears % 1).toFixed(8).substring(1)}
            </Text>
          </Text>
          <Text style={styles.timeLabel}>年</Text>
        </View>
      </View>
    );
  }

  if (mode === 'weeksOnly') {
    return (
      <View style={styles.countdownContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>
            {Math.floor(timeLeft.totalWeeks).toLocaleString('ja-JP')}
            <Text style={styles.decimalPart}>
              {(timeLeft.totalWeeks % 1).toFixed(6).substring(1)}
            </Text>
          </Text>
          <Text style={styles.timeLabel}>週</Text>
        </View>
      </View>
    );
  }

  if (mode === 'daysOnly') {
    return (
      <View style={styles.countdownContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>
            {Math.floor(timeLeft.totalDays).toLocaleString('ja-JP')}
            <Text style={styles.decimalPart}>
              {(timeLeft.totalDays % 1).toFixed(5).substring(1)}
            </Text>
          </Text>
          <Text style={styles.timeLabel}>日</Text>
        </View>
      </View>
    );
  }

  // seasons - 季節・イベントの意味付け表示
  const seasonData = getSeasonDisplay(timeLeft.totalYears, birthday);

  // アイコンの選択
  const renderIcon = () => {
    if (seasonData.iconType === 'newyear') {
      return <NewYearIcon size={28} color={colors.text.secondary} />;
    }
    if (seasonData.iconType === 'birthday') {
      return <BirthdayIcon size={28} color={colors.text.secondary} />;
    }
    // 季節アイコン
    const SeasonIcon = SeasonIcons[seasonData.seasonKey || 'spring'];
    return <SeasonIcon size={36} color={colors.text.secondary} />;
  };

  return (
    <View style={styles.seasonsContainer}>
      <View style={styles.seasonIconContainer}>
        {renderIcon()}
      </View>
      <View style={styles.seasonTextContainer}>
        <Text style={styles.seasonMessage}>{seasonData.message}</Text>
        <Text style={styles.seasonCount}>{seasonData.count}</Text>
        <Text style={styles.seasonMessage}>{seasonData.subMessage}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  countdownContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 4,
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
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthLarge,
    textAlign: 'center',
    ...textBase,
  },
  timeLabel: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthLarge,
    textAlign: 'center',
    ...textBase,
  },
  decimalPart: {
    fontSize: fonts.size.countdownSmall,
    fontWeight: fonts.weight.light,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  timeValueSmall: {
    fontSize: fonts.size.countdownSmall,
    fontWeight: fonts.weight.light,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthSmall,
    textAlign: 'center',
    ...textBase,
  },
  timeLabelSmall: {
    fontSize: fonts.size.label,
    color: colors.text.secondary,
    letterSpacing: 1,
    fontFamily: fonts.family.regular,
    minWidth: spacing.countdown.blockWidthSmall,
    textAlign: 'center',
    ...textBase,
  },
  // 季節表示用スタイル
  seasonsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  seasonIconContainer: {
    marginBottom: -8,
    marginTop: 8,
  },
  seasonTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  seasonMessage: {
    fontSize: fonts.size.body,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  seasonCount: {
    fontSize: fonts.size.countdownLarge,
    fontWeight: fonts.weight.light,
    color: colors.text.primary,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
});

export default CountdownDisplay;
