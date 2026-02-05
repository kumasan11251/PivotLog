import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { ReminderSettingsScreenNavigationProp } from '../types/navigation';
import type { ReminderSettings } from '../types/reminder';
import { DEFAULT_REMINDER_SETTINGS } from '../types/reminder';
import { getColors, fonts, spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import ScreenHeader from '../components/common/ScreenHeader';
import {
  loadReminderSettings,
  saveReminderSettings,
  requestNotificationPermissions,
  checkNotificationPermissions,
  scheduleDailyReminder,
  cancelDailyReminder,
  sendTestNotification,
} from '../services/notification';

// 時間選択肢（0-23時）
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

// 分選択肢（0-59分）
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

const ReminderSettingsScreen: React.FC = () => {
  const navigation = useNavigation<ReminderSettingsScreenNavigationProp>();
  const { isDark } = useTheme();
  const themeColors = useMemo(() => getColors(isDark), [isDark]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // 設定値
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(DEFAULT_REMINDER_SETTINGS.hour);
  const [minute, setMinute] = useState(DEFAULT_REMINDER_SETTINGS.minute);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 元の値（変更検知用）
  const [originalValues, setOriginalValues] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await loadReminderSettings();
      const permission = await checkNotificationPermissions();
      setHasPermission(permission);
      setEnabled(settings.enabled);
      setHour(settings.hour);
      setMinute(settings.minute);
      setOriginalValues(settings);
    } catch (error) {
      console.error('リマインダー設定の読み込みに失敗:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // 権限チェック（アプリがフォアグラウンドに戻ったとき）
  useEffect(() => {
    const checkPermission = async () => {
      const permission = await checkNotificationPermissions();
      setHasPermission(permission);
    };
    checkPermission();
  }, []);

  const hasChanges =
    enabled !== originalValues.enabled ||
    hour !== originalValues.hour ||
    minute !== originalValues.minute;

  const handleSave = async () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newSettings: ReminderSettings = { enabled, hour, minute };
      await saveReminderSettings(newSettings);

      if (enabled) {
        await scheduleDailyReminder(hour, minute);
      } else {
        await cancelDailyReminder();
      }

      navigation.goBack();
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        '変更を破棄',
        '変更内容が保存されていません。破棄してもよろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '破棄', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleToggleEnabled = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value && !hasPermission) {
      // 権限をリクエスト
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          '通知の許可が必要です',
          'リマインダーを受け取るには、通知の許可が必要です。設定アプリから許可してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '設定を開く',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }
      setHasPermission(true);
    }

    setEnabled(value);
  };

  const handleTimeSelect = (selectedHour: number, selectedMinute: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHour(selectedHour);
    setMinute(selectedMinute);
  };

  const handleTestNotification = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await sendTestNotification();
      Alert.alert('テスト通知を送信しました', '通知が届くことを確認してください。');
    } catch (error) {
      Alert.alert('エラー', 'テスト通知の送信に失敗しました');
    }
  };

  const formatTime = (h: number, m: number): string => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
        <ScreenHeader
          title="リマインダー"
          leftAction={{
            type: 'backIcon',
            onPress: handleCancel,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="リマインダー"
        leftAction={{
          type: 'backIcon',
          onPress: handleCancel,
        }}
        rightAction={{
          type: 'text',
          label: isSaving ? '保存中...' : '保存',
          onPress: handleSave,
          color: hasChanges ? themeColors.primary : themeColors.text.secondary,
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* リマインダーON/OFF */}
        <View style={styles.section}>
          <View style={[styles.toggleCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.toggleItemSingle}>
              <View style={styles.toggleLabelContainer}>
                <View style={styles.toggleLabelRow}>
                  <Ionicons name="notifications-outline" size={22} color={themeColors.primary} />
                  <Text style={[styles.toggleLabel, { color: themeColors.text.primary }]}>
                    毎日のリマインダー
                  </Text>
                </View>
                <Text style={[styles.toggleDescription, { color: themeColors.text.secondary }]}>
                  設定した時刻に振り返りを促す通知を受け取る
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={handleToggleEnabled}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* 時刻設定（有効時のみ表示） */}
        {enabled && (
          <>
            {/* 現在の設定時刻 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>通知時刻</Text>
              <TouchableOpacity
                style={[styles.timeDisplayCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                onPress={() => setShowTimePicker(!showTimePicker)}
                activeOpacity={0.7}
              >
                <View style={styles.timeDisplayContent}>
                  <Text style={[styles.timeDisplayText, { color: themeColors.text.primary }]}>
                    {formatTime(hour, minute)}
                  </Text>
                  <Text style={[styles.timeDisplaySubtext, { color: themeColors.text.secondary }]}>
                    毎日この時刻に通知
                  </Text>
                </View>
                <Ionicons
                  name={showTimePicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={themeColors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            {/* 時刻ピッカー */}
            {showTimePicker && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: themeColors.text.secondary }]}>時刻を選択</Text>
                <View style={[styles.pickerContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  {/* 時間選択 */}
                  <View style={styles.pickerColumn}>
                    <Text style={[styles.pickerLabel, { color: themeColors.text.secondary }]}>時</Text>
                    <ScrollView
                      style={styles.pickerScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      {HOUR_OPTIONS.map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.pickerItem,
                            hour === h && [styles.pickerItemSelected, { backgroundColor: `${themeColors.primary}15` }],
                          ]}
                          onPress={() => handleTimeSelect(h, minute)}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              { color: hour === h ? themeColors.primary : themeColors.text.primary },
                              hour === h && styles.pickerItemTextSelected,
                            ]}
                          >
                            {h}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* 分選択 */}
                  <View style={styles.pickerColumn}>
                    <Text style={[styles.pickerLabel, { color: themeColors.text.secondary }]}>分</Text>
                    <ScrollView
                      style={styles.pickerScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      {MINUTE_OPTIONS.map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.pickerItem,
                            minute === m && [styles.pickerItemSelected, { backgroundColor: `${themeColors.primary}15` }],
                          ]}
                          onPress={() => handleTimeSelect(hour, m)}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              { color: minute === m ? themeColors.primary : themeColors.text.primary },
                              minute === m && styles.pickerItemTextSelected,
                            ]}
                          >
                            {m.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            )}

            {/* テスト通知 */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                onPress={handleTestNotification}
                activeOpacity={0.7}
              >
                <Ionicons name="paper-plane-outline" size={20} color={themeColors.primary} />
                <Text style={[styles.testButtonText, { color: themeColors.primary }]}>
                  テスト通知を送信
                </Text>
              </TouchableOpacity>
              <Text style={[styles.testButtonHint, { color: themeColors.text.secondary }]}>
                通知が正しく届くかテストできます
              </Text>
            </View>
          </>
        )}

        {/* 説明 */}
        <View style={styles.section}>
          <View style={[styles.infoCard, { backgroundColor: `${themeColors.primary}08`, borderColor: `${themeColors.primary}20` }]}>
            <Ionicons name="information-circle-outline" size={20} color={themeColors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: themeColors.text.primary }]}>習慣化のコツ</Text>
              <Text style={[styles.infoText, { color: themeColors.text.secondary }]}>
                毎日同じ時間にリマインダーを受け取ることで、振り返りが習慣になりやすくなります。
                就寝前や夕食後など、リラックスできる時間帯がおすすめです。
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.family.bold,
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // --- トグルカード ---
  toggleCard: {
    borderRadius: spacing.borderRadius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleItemSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
  },
  toggleDescription: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginTop: spacing.xs,
    marginLeft: 30,
  },

  // --- 時刻表示 ---
  timeDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: spacing.borderRadius.large,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  timeDisplayContent: {
    flex: 1,
  },
  timeDisplayText: {
    fontSize: 32,
    fontFamily: fonts.family.bold,
  },
  timeDisplaySubtext: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginTop: spacing.xs,
  },

  // --- ピッカー ---
  pickerContainer: {
    flexDirection: 'row',
    borderRadius: spacing.borderRadius.large,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.lg,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.sm,
  },
  pickerScroll: {
    maxHeight: 180,
    width: '100%',
  },
  pickerItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
  },
  pickerItemSelected: {
    borderRadius: spacing.borderRadius.medium,
  },
  pickerItemText: {
    fontSize: 18,
    fontFamily: fonts.family.regular,
  },
  pickerItemTextSelected: {
    fontFamily: fonts.family.bold,
  },

  // --- テストボタン ---
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: spacing.borderRadius.large,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  testButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
  },
  testButtonHint: {
    fontSize: 11,
    fontFamily: fonts.family.regular,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // --- 説明カード ---
  infoCard: {
    flexDirection: 'row',
    borderRadius: spacing.borderRadius.large,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: fonts.family.bold,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    lineHeight: 18,
  },

  bottomSpacer: {
    height: 40,
  },
});

export default ReminderSettingsScreen;
