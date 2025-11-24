import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './src/screens/SplashScreen';
import InitialSetupScreen from './src/screens/InitialSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiaryEntryScreen from './src/screens/DiaryEntryScreen';
import DiaryListScreen from './src/screens/DiaryListScreen';
import DiaryDetailScreen from './src/screens/DiaryDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import EditBirthdayScreen from './src/screens/EditBirthdayScreen';
import EditLifespanScreen from './src/screens/EditLifespanScreen';
import { loadUserSettings } from './src/utils/storage';
import { useFonts, NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { colors } from './src/theme';

type Screen = 'home' | 'diaryEntry' | 'diaryList' | 'diaryDetail' | 'settings' | 'editBirthday' | 'editLifespan';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedDiaryDate, setSelectedDiaryDate] = useState<string | undefined>(undefined);
  const [fontsLoaded] = useFonts({
    NotoSansJP_400Regular,
    NotoSansJP_700Bold,
  });

  useEffect(() => {
    const checkUserSettings = async () => {
      const settings = await loadUserSettings();
      setIsSetupComplete(settings !== null);
      setIsLoading(false);
    };

    checkUserSettings();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  const handleNavigateToDiary = (date?: string) => {
    setSelectedDiaryDate(date);
    setCurrentScreen('diaryEntry');
  };

  const handleNavigateToDetail = (date: string) => {
    setSelectedDiaryDate(date);
    setCurrentScreen('diaryDetail');
  };

  const handleNavigateToList = () => {
    setCurrentScreen('diaryList');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  const handleBackToList = () => {
    setCurrentScreen('diaryList');
  };

  const handleEditDiary = (date: string) => {
    setSelectedDiaryDate(date);
    setCurrentScreen('diaryEntry');
  };

  const handleNavigateToSettings = () => {
    setCurrentScreen('settings');
  };

  const handleEditBirthday = () => {
    setCurrentScreen('editBirthday');
  };

  const handleEditLifespan = () => {
    setCurrentScreen('editLifespan');
  };

  const handleBackToSettings = () => {
    setCurrentScreen('settings');
  };

  if (!fontsLoaded || isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onComplete={handleSplashComplete} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  if (!isSetupComplete) {
    return (
      <SafeAreaProvider>
        <InitialSetupScreen onComplete={handleSetupComplete} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {currentScreen === 'home' && (
        <HomeScreen
          onNavigateToDiary={handleNavigateToDiary}
          onNavigateToList={handleNavigateToList}
          onNavigateToSettings={handleNavigateToSettings}
        />
      )}
      {currentScreen === 'diaryEntry' && (
        <DiaryEntryScreen
          onComplete={handleBackToHome}
          initialDate={selectedDiaryDate}
        />
      )}
      {currentScreen === 'diaryList' && (
        <DiaryListScreen
          onNavigateToDetail={handleNavigateToDetail}
          onNavigateToHome={handleBackToHome}
          onNavigateToSettings={handleNavigateToSettings}
        />
      )}
      {currentScreen === 'diaryDetail' && selectedDiaryDate && (
        <DiaryDetailScreen
          date={selectedDiaryDate}
          onBack={handleBackToList}
          onEdit={handleEditDiary}
        />
      )}
      {currentScreen === 'settings' && (
        <SettingsScreen
          onNavigateToHome={handleBackToHome}
          onNavigateToList={handleNavigateToList}
          onEditBirthday={handleEditBirthday}
          onEditLifespan={handleEditLifespan}
        />
      )}
      {currentScreen === 'editBirthday' && (
        <EditBirthdayScreen
          onComplete={handleBackToSettings}
          onBack={handleBackToSettings}
        />
      )}
      {currentScreen === 'editLifespan' && (
        <EditLifespanScreen
          onComplete={handleBackToSettings}
          onBack={handleBackToSettings}
        />
      )}
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
});
