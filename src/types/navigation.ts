import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ルートナビゲーションのパラメータ定義
export type RootStackParamList = {
  Auth: undefined;
  Splash: undefined;
  InitialSetup: undefined;
  Home: { initialTab?: 'home' | 'diaryList' } | undefined;
  DiaryEntry: { initialDate?: string };
  DiaryDetail: { date: string; direction?: 'prev' | 'next' };
  Settings: undefined;
  EditBirthday: undefined;
  EditLifespan: undefined;
};

// 各画面のナビゲーションプロップの型定義
export type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;
export type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;
export type InitialSetupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InitialSetup'>;
export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
export type DiaryEntryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryEntry'>;
export type DiaryDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryDetail'>;
export type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;
export type EditBirthdayScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditBirthday'>;
export type EditLifespanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditLifespan'>;
