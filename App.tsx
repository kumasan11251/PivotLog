import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, getStateFromPath as defaultGetStateFromPath, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import InitialSetupScreen from './src/screens/InitialSetupScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MainTabScreen from './src/screens/MainTabScreen';
import DiaryEntryScreen from './src/screens/DiaryEntryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import EditBirthdayScreen from './src/screens/EditBirthdayScreen';
import EditLifespanScreen from './src/screens/EditLifespanScreen';
import LinkAccountScreen from './src/screens/LinkAccountScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import AuthScreen from './src/screens/AuthScreen';
import WidgetSettingsScreen from './src/screens/WidgetSettingsScreen';
import ReminderSettingsScreen from './src/screens/ReminderSettingsScreen';
import WeeklyInsightScreen from './src/screens/WeeklyInsightScreen';
import MonthlyInsightScreen from './src/screens/MonthlyInsightScreen';
import { initializeReminder, clearBadge } from './src/services/notification';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { WeeklyInsightProvider } from './src/contexts/WeeklyInsightContext';
import { MonthlyInsightProvider } from './src/contexts/MonthlyInsightContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { AIReflectionProvider } from './src/contexts/AIReflectionContext';
import { loadUserSettings, migrateDataToFirestore, hasLocalData, isMigrationComplete, isOnboardingComplete } from './src/utils/storage';
import { useFonts, NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { colors, fonts, getColors } from './src/theme';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ナビゲーションref（通知タップ時のナビゲーション用）
const navigationRef = createNavigationContainerRef<RootStackParamList>();

// 今日の日付を取得（YYYY-MM-DD形式）
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ディープリンク設定
const linkingConfig = {
  screens: {
    Home: 'home',
    DiaryEntry: 'diary/:initialDate',
  },
};

const linking = {
  prefixes: ['pivotlog://'],
  config: linkingConfig,
  getStateFromPath: (path: string, options: Parameters<typeof defaultGetStateFromPath>[1]) => {
    // Expo development client のURLを除外
    if (path.includes('expo-development-client')) {
      return undefined;
    }
    const state = defaultGetStateFromPath(path, options);
    // DiaryEntryへのディープリンク時、Homeをスタック下部に挿入
    if (state?.routes?.length === 1 && state.routes[0].name === 'DiaryEntry') {
      return {
        ...state,
        routes: [{ name: 'Home' as const }, ...state.routes],
        index: 1,
      };
    }
    return state;
  },
};

// メインナビゲーション（認証済みユーザー用）
function MainNavigator() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // オンボーディングが完了しているかチェック
        const onboardingDone = await isOnboardingComplete();

        // ローカルデータがあり、まだ移行されていない場合は移行を実行
        const hasLocal = await hasLocalData();
        const migrationDone = await isMigrationComplete();

        if (hasLocal && !migrationDone) {
          setIsMigrating(true);
          const result = await migrateDataToFirestore();
          console.log('移行結果:', result);
          setIsMigrating(false);
        }

        // 設定を読み込み（Firestoreから）
        const settings = await loadUserSettings();
        setIsSetupComplete(settings !== null);

        // オンボーディングが完了していない場合は表示（設定の有無に関係なく）
        if (!onboardingDone) {
          setShowOnboarding(true);
        }

        // リマインダー通知を初期化（設定済みの場合は再スケジュール）
        await initializeReminder();
      } catch (error) {
        console.error('初期化エラー:', error);
        setIsSetupComplete(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading || isMigrating) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        {isMigrating && (
          <Text style={[styles.migratingText, { color: themeColors.text.secondary }]}>データを同期中...</Text>
        )}
      </View>
    );
  }

  // ルーティングの決定: 設定完了 → Home、オンボーディング未完了 → Onboarding、それ以外 → InitialSetup
  const initialRouteName = isSetupComplete ? 'Home' : showOnboarding ? 'Onboarding' : 'InitialSetup';

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="InitialSetup" component={InitialSetupScreen} />
      <Stack.Screen name="Home" component={MainTabScreen} />
      <Stack.Screen name="DiaryEntry" component={DiaryEntryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditBirthday" component={EditBirthdayScreen} />
      <Stack.Screen name="EditLifespan" component={EditLifespanScreen} />
      <Stack.Screen name="LinkAccount" component={LinkAccountScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="WidgetSettings" component={WidgetSettingsScreen} />
      <Stack.Screen name="ReminderSettings" component={ReminderSettingsScreen} />
      <Stack.Screen
        name="WeeklyInsight"
        component={WeeklyInsightScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="MonthlyInsight"
        component={MonthlyInsightScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}

// ルートナビゲーション（認証状態に応じて切り替え）
function RootNavigator() {
  const { isAuthenticated, isLoading, showAuthScreen } = useAuth();
  const { isDark } = useTheme();
  const themeColors = getColors(isDark);

  if (isLoading) {
    // 認証処理中
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  // ログアウト後は認証画面を表示
  if (showAuthScreen || !isAuthenticated) {
    return <AuthScreen />;
  }

  return <MainNavigator />;
}

// StatusBarをテーマに応じて切り替えるコンポーネント
function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    NotoSansJP_400Regular,
    NotoSansJP_700Bold,
  });

  // 通知レスポンスリスナーのref
  const notificationResponseListener = useRef<Notifications.Subscription | null>(null);

  // 通知タップ時のハンドリング
  useEffect(() => {
    // 通知をタップしたときのリスナー
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('通知がタップされました:', data);

      // リマインダー通知の場合は日記入力画面へ遷移
      if (data?.type === 'daily_reminder' || data?.type === 'test') {
        // バッジをクリア
        clearBadge();

        // ナビゲーションの準備ができるまで少し待つ
        setTimeout(() => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('DiaryEntry', { initialDate: getTodayDateString() });
          }
        }, 100);
      }
    });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
          <AIReflectionProvider>
            <WeeklyInsightProvider>
              <MonthlyInsightProvider>
                <NavigationContainer ref={navigationRef} linking={linking}>
                  <RootNavigator />
                </NavigationContainer>
              </MonthlyInsightProvider>
            </WeeklyInsightProvider>
          </AIReflectionProvider>
        </SubscriptionProvider>
        </AuthProvider>
        <ThemedStatusBar />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  migratingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
});
