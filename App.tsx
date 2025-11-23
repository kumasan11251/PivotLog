import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import InitialSetupScreen from './src/screens/InitialSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiaryEntryScreen from './src/screens/DiaryEntryScreen';
import DiaryListScreen from './src/screens/DiaryListScreen';
import { loadUserSettings } from './src/utils/storage';
import { useFonts, NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { colors } from './src/theme';

type Screen = 'home' | 'diaryEntry' | 'diaryList';

export default function App() {
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

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  const handleNavigateToDiary = (date?: string) => {
    setSelectedDiaryDate(date);
    setCurrentScreen('diaryEntry');
  };

  const handleNavigateToList = () => {
    setCurrentScreen('diaryList');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
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
          onNavigateToDiary={handleNavigateToDiary}
          onBack={handleBackToHome}
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
