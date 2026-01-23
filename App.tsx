import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import WeeklyInsightScreen from './src/screens/WeeklyInsightScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { WeeklyInsightProvider } from './src/contexts/WeeklyInsightContext';
import { loadUserSettings, migrateDataToFirestore, hasLocalData, isMigrationComplete, isOnboardingComplete } from './src/utils/storage';
import { useFonts, NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { colors, fonts, getColors } from './src/theme';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
      <Stack.Screen
        name="WeeklyInsight"
        component={WeeklyInsightScreen}
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
          <WeeklyInsightProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </WeeklyInsightProvider>
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
