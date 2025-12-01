import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from './src/screens/AuthScreen';
import InitialSetupScreen from './src/screens/InitialSetupScreen';
import MainTabScreen from './src/screens/MainTabScreen';
import DiaryEntryScreen from './src/screens/DiaryEntryScreen';
import DiaryDetailScreen from './src/screens/DiaryDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import EditBirthdayScreen from './src/screens/EditBirthdayScreen';
import EditLifespanScreen from './src/screens/EditLifespanScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { loadUserSettings, migrateDataToFirestore, hasLocalData, isMigrationComplete } from './src/utils/storage';
import { useFonts, NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { colors, fonts } from './src/theme';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// メインナビゲーション（認証済みユーザー用）
function MainNavigator() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        {isMigrating && (
          <Text style={styles.migratingText}>データを同期中...</Text>
        )}
      </View>
    );
  }

  const initialRouteName = isSetupComplete ? 'Home' : 'InitialSetup';

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="InitialSetup" component={InitialSetupScreen} />
      <Stack.Screen name="Home" component={MainTabScreen} />
      <Stack.Screen name="DiaryEntry" component={DiaryEntryScreen} />
      <Stack.Screen
        name="DiaryDetail"
        component={DiaryDetailScreen}
        options={({ route }) => ({
          animation: route.params?.direction === 'prev' ? 'slide_from_left' : 'slide_from_right',
        })}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditBirthday" component={EditBirthdayScreen} />
      <Stack.Screen name="EditLifespan" component={EditLifespanScreen} />
    </Stack.Navigator>
  );
}

// 認証ナビゲーション（未認証ユーザー用）
function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

// ルートナビゲーション（認証状態に応じて切り替え）
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
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
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
      <StatusBar style="auto" />
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
