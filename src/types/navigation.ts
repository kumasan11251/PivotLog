import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ルートナビゲーションのパラメータ定義
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  InitialSetup: undefined;
  Home: { initialTab?: 'home' | 'diaryList' } | undefined;
  DiaryEntry: { initialDate?: string };
  Settings: undefined;
  EditBirthday: undefined;
  EditLifespan: undefined;
  LinkAccount: undefined;
  Feedback: undefined;
  WidgetSettings: undefined;
  ReminderSettings: undefined;
  WeeklyInsight: { weekKey?: string } | undefined;
  MonthlyInsight: { monthKey?: string } | undefined;
};

// 各画面のナビゲーションプロップの型定義
export type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;
export type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
export type InitialSetupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InitialSetup'>;
export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
export type DiaryEntryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryEntry'>;
export type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;
export type EditBirthdayScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditBirthday'>;
export type EditLifespanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditLifespan'>;
export type LinkAccountScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LinkAccount'>;
export type FeedbackScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Feedback'>;
export type WidgetSettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WidgetSettings'>;
export type ReminderSettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReminderSettings'>;
export type WeeklyInsightScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WeeklyInsight'>;
export type MonthlyInsightScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MonthlyInsight'>;
