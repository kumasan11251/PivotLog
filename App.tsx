import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InitialSetupScreen from './src/screens/InitialSetupScreen';
import MainTabScreen from './src/screens/MainTabScreen';
import DiaryEntryScreen from './src/screens/DiaryEntryScreen';
import DiaryDetailScreen from './src/screens/DiaryDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import EditBirthdayScreen from './src/screens/EditBirthdayScreen';
import EditLifespanScreen from './src/screens/EditLifespanScreen';
import { loadUserSettings } from './src/utils/storage';
import { useFonts, NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { colors } from './src/theme';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);
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

  if (!fontsLoaded || isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  const initialRouteName = isSetupComplete ? 'Home' : 'InitialSetup';

  return (
    <SafeAreaProvider>
      <NavigationContainer>
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
      </NavigationContainer>
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
