import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ルートナビゲーションのパラメータ定義
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  InitialSetup: undefined;
  Home: { initialTab?: 'home' | 'diaryList' } | undefined;
  DiaryEntry: { initialDate?: string };
  DiaryDetail: { date: string; direction?: 'prev' | 'next'; fromList?: boolean };
  Settings: undefined;
  EditBirthday: undefined;
  EditLifespan: undefined;
  LinkAccount: undefined;
  Feedback: undefined;
};

// 各画面のナビゲーションプロップの型定義
export type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;
export type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
export type InitialSetupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InitialSetup'>;
export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
export type DiaryEntryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryEntry'>;
export type DiaryDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryDetail'>;
export type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;
export type EditBirthdayScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditBirthday'>;
export type EditLifespanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditLifespan'>;
export type LinkAccountScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LinkAccount'>;
export type FeedbackScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Feedback'>;
