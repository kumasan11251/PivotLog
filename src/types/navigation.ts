import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ルートナビゲーションのパラメータ定義
export type RootStackParamList = {
  Splash: undefined;
  InitialSetup: undefined;
  Home: undefined;
  DiaryEntry: { initialDate?: string };
  DiaryList: undefined;
  DiaryDetail: { date: string };
  Settings: undefined;
  EditBirthday: undefined;
  EditLifespan: undefined;
};

// 各画面のナビゲーションプロップの型定義
export type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;
export type InitialSetupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InitialSetup'>;
export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
export type DiaryEntryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryEntry'>;
export type DiaryListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryList'>;
export type DiaryDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryDetail'>;
export type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;
export type EditBirthdayScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditBirthday'>;
export type EditLifespanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditLifespan'>;
