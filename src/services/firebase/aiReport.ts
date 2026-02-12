/**
 * AI生成コンテンツのレポート機能
 * Google Play必須要件対応
 */
import firestore from '@react-native-firebase/firestore';
import { getCurrentUser } from './auth';
import type { AIContentReport, CreateAIReportInput } from '../../types/aiReport';

// レポート用コレクション名
const AI_REPORTS_COLLECTION = 'aiReports';

/**
 * ユーザーIDを取得
 */
const getUserId = (): string => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('ユーザーがログインしていません');
  }
  return user.uid;
};

/**
 * UUIDを生成（簡易版）
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * AIコンテンツレポートを送信
 */
export const submitAIContentReport = async (
  input: CreateAIReportInput
): Promise<string> => {
  const userId = getUserId();
  const reportId = generateId();

  const report: AIContentReport = {
    id: reportId,
    userId,
    diaryDate: input.diaryDate,
    reportedAt: new Date().toISOString(),
    reportType: input.reportType,
    reportDetail: input.reportDetail,
    reflectionContent: input.reflectionContent,
    status: 'pending',
  };

  try {
    // users/{userId}/aiReports/{reportId} に保存
    await firestore()
      .collection('users')
      .doc(userId)
      .collection(AI_REPORTS_COLLECTION)
      .doc(reportId)
      .set(report);

    console.log('[AIReport] レポートを送信しました:', reportId);
    return reportId;
  } catch (error) {
    console.error('[AIReport] レポート送信に失敗しました:', error);
    throw error;
  }
};

/**
 * ユーザーのレポート履歴を取得
 */
export const getAIReportHistory = async (): Promise<AIContentReport[]> => {
  const userId = getUserId();

  try {
    const snapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection(AI_REPORTS_COLLECTION)
      .orderBy('reportedAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => doc.data() as AIContentReport);
  } catch (error) {
    console.error('[AIReport] レポート履歴の取得に失敗しました:', error);
    return [];
  }
};
