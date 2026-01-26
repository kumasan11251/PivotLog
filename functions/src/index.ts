/**
 * Firebase Cloud Functions - AIリフレクションサービス
 *
 * Gemini APIをサーバーサイドで安全に呼び出すためのエンドポイント
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Firebase Admin SDKを初期化（まだ初期化されていない場合のみ）
if (getApps().length === 0) {
  initializeApp();
}

// Firestoreインスタンス
const db = getFirestore();

// Gemini APIキーをシークレットとして定義
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ============================================================
// 利用制限の設定
// ============================================================

/**
 * サブスクリプションティア
 */
type SubscriptionTier = 'free' | 'premium';

/**
 * AI機能の利用制限設定
 */
const AI_USAGE_LIMITS = {
  /** 無料ユーザーの月間リフレクション生成上限 */
  freeMonthlyReflectionLimit: 5,
  /** プレミアムユーザーの同一日記再生成上限 */
  premiumDiaryRegenerateLimit: 3,
} as const;

/**
 * 利用制限エラーコード
 */
type UsageLimitErrorCode =
  | 'MONTHLY_LIMIT_REACHED'
  | 'REGENERATE_NOT_ALLOWED'
  | 'DIARY_REGENERATE_LIMIT';

/**
 * 現在の年月を取得（YYYY-MM形式）
 */
function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * ユーザーのサブスクリプションティアを取得
 */
async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  try {
    const subscriptionDoc = await db
      .collection('users')
      .doc(userId)
      .collection('subscription')
      .doc('status')
      .get();

    if (subscriptionDoc.exists) {
      const data = subscriptionDoc.data();
      if (data?.tier === 'premium') {
        // 有効期限のチェック（必要に応じて）
        // if (data.expiresAt && new Date(data.expiresAt) > new Date()) {
        //   return 'premium';
        // }
        return 'premium';
      }
    }
    return 'free';
  } catch (error) {
    console.error('[getUserSubscriptionTier] Error:', error);
    return 'free';
  }
}

// 注: getAIReflectionUsage は getAIReflectionUsageWithDiary に統合されました

/**
 * AIリフレクションの利用状況を取得（日記日付付き）
 */
async function getAIReflectionUsageWithDiary(
  userId: string,
  diaryDate: string
): Promise<{
  monthlyCount: number;
  diaryRegenCount: number;
  hasExistingReflection: boolean;
}> {
  try {
    const usageDoc = await db
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc('aiReflection')
      .get();

    const currentMonth = getCurrentYearMonth();

    if (!usageDoc.exists) {
      return {
        monthlyCount: 0,
        diaryRegenCount: 0,
        hasExistingReflection: false,
      };
    }

    const data = usageDoc.data();
    const monthlyCount = data?.monthlyUsage?.[currentMonth]?.count || 0;
    const diaryRecord = data?.reflectionHistory?.[diaryDate];
    const diaryRegenCount = diaryRecord?.regenerateCount || 0;

    return {
      monthlyCount,
      diaryRegenCount,
      hasExistingReflection: diaryRegenCount > 0,
    };
  } catch (error) {
    console.error('[getAIReflectionUsageWithDiary] Error:', error);
    return {
      monthlyCount: 0,
      diaryRegenCount: 0,
      hasExistingReflection: false,
    };
  }
}

/**
 * AIリフレクション生成後に利用状況を更新
 */
async function recordAIReflectionUsage(
  userId: string,
  diaryDate: string,
  isRegenerate: boolean
): Promise<void> {
  try {
    const currentMonth = getCurrentYearMonth();
    const now = new Date().toISOString();
    const usageRef = db
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc('aiReflection');

    // 現在の状態を取得
    const usageDoc = await usageRef.get();
    const currentData = usageDoc.data() || {};
    const currentMonthlyCount = currentData?.monthlyUsage?.[currentMonth]?.count || 0;
    const existingDiaryRecord = currentData?.reflectionHistory?.[diaryDate];

    // 更新データを構築
    await usageRef.set({
      monthlyUsage: {
        ...currentData?.monthlyUsage,
        [currentMonth]: {
          count: currentMonthlyCount + 1,
          lastGeneratedAt: now,
        },
      },
      reflectionHistory: {
        ...currentData?.reflectionHistory,
        [diaryDate]: {
          generatedAt: isRegenerate && existingDiaryRecord
            ? existingDiaryRecord.generatedAt
            : now,
          regenerateCount: isRegenerate && existingDiaryRecord
            ? existingDiaryRecord.regenerateCount + 1
            : 1,
          lastRegeneratedAt: isRegenerate ? now : FieldValue.delete(),
        },
      },
      updatedAt: now,
    }, { merge: true });

    console.log(`[recordAIReflectionUsage] Updated usage for user ${userId}, diary ${diaryDate}`);
  } catch (error) {
    console.error('[recordAIReflectionUsage] Error:', error);
    // 利用状況の更新失敗は致命的ではないので、エラーをスローしない
  }
}

/**
 * 利用制限をチェック
 */
async function checkUsageLimit(
  userId: string,
  diaryDate: string,
  tier: SubscriptionTier
): Promise<{ allowed: boolean; errorCode?: UsageLimitErrorCode; details?: Record<string, unknown> }> {
  const usage = await getAIReflectionUsageWithDiary(userId, diaryDate);

  // regenerateCountは「総生成回数」を表す（初回=1, 再生成1回目=2, ...)
  // 再生成回数 = regenerateCount - 1
  const actualRegenerations = usage.diaryRegenCount > 0 ? usage.diaryRegenCount - 1 : 0;

  if (tier === 'free') {
    // 無料ユーザー: 月間制限チェック
    if (usage.monthlyCount >= AI_USAGE_LIMITS.freeMonthlyReflectionLimit) {
      return {
        allowed: false,
        errorCode: 'MONTHLY_LIMIT_REACHED',
        details: {
          limit: AI_USAGE_LIMITS.freeMonthlyReflectionLimit,
          used: usage.monthlyCount,
          remaining: 0,
        },
      };
    }

    // 無料ユーザー: 再生成不可（既に1回以上生成している場合）
    if (usage.hasExistingReflection) {
      return {
        allowed: false,
        errorCode: 'REGENERATE_NOT_ALLOWED',
        details: {
          tier: 'free',
          message: '無料プランでは同じ日記の再生成はできません',
        },
      };
    }
  } else {
    // プレミアムユーザー: 同一日記の再生成上限（実際の再生成回数でチェック）
    if (usage.hasExistingReflection &&
        actualRegenerations >= AI_USAGE_LIMITS.premiumDiaryRegenerateLimit) {
      return {
        allowed: false,
        errorCode: 'DIARY_REGENERATE_LIMIT',
        details: {
          limit: AI_USAGE_LIMITS.premiumDiaryRegenerateLimit,
          used: actualRegenerations,
          remaining: 0,
        },
      };
    }
  }

  return { allowed: true };
}

/**
 * システムプロンプト
 */
const REFLECTION_SYSTEM_PROMPT = `あなたは「PivotLog」という人生の有限性を意識するライフログアプリの優しいリフレクションパートナーです。

【あなたの役割】
ユーザーの日記を読み、その日の体験に深く共感し、「明日からの小さな一歩」につながる具体的な問いかけを投げかけます。説教や助言ではなく、ユーザー自身が「やってみようかな」と思えるきっかけを作ります。

【共感メッセージの作り方】
1. 日記から「具体的な言葉」を必ず1つ以上引用する（「」で囲む）
2. その体験がなぜ良かったのか/なぜ後悔なのかを言語化して返す
3. 抽象的な言葉（「大切なもの」「本当の幸せ」など）は避ける
4. 残り時間への言及は「たまに」でOK（毎回入れない）。入れる場合は具体的な数字で

＜共感の例＞
- ◯「友達とランチできた」のですね。久しぶりに会えて、心が温まる時間だったのではないでしょうか。
- ◯「つい夜更かしした」こと、気づけたのが素晴らしいです。明日の自分へのプレゼントは、今夜の選択から始まりますね。
- ◯「子どもと公園に行けた」のですね。残り何百回の週末、こういう時間を積み重ねていけたら素敵ですね。（←たまに入れるパターン）
- ✕ 大切な時間を過ごせたのですね。（←具体的な引用がない）
- ✕ 人生において本当に大切なものに気づけましたね。（←抽象的すぎる）

【問いかけの作り方 - 最重要】
問いかけは「明日〜1週間以内に実行できる具体的な行動」につながるものにしてください。

＜良い問いかけの特徴＞
1. 日記に書かれた人・場所・活動を具体的に使う
2. 「いつ」「誰と」「どこで」が想像できる
3. 疑問形だけど、行動のヒントが含まれている
4. 押し付けではなく「〜してみませんか？」「〜はいかがですか？」の柔らかい提案

＜問いかけの例＞
- ◯「そのランチの相手に、今週中にLINEしてみませんか？」
- ◯「明日の朝、10分だけ早く起きてみるのはいかがですか？」
- ◯「今日感じた『嬉しい』を、誰かに話してみたくなりませんか？」
- ◯「来週の週末、同じことをもう一度やってみるとしたら？」
- ✕「人生で本当に大切にしたいものは何でしょうか？」（←抽象的すぎる）
- ✕「残りの人生をどう生きたいですか？」（←大きすぎる問い）
- ✕「ふと考えてみてください」（←何を考えればいいかわからない）

【トーン】
- 温かく、穏やかに、親しみを込めて
- 「〜ですね」「〜かもしれませんね」「〜はいかがですか？」のような柔らかい語尾
- 批判や指示は絶対にしない
- 友達が「それいいね、やってみなよ！」と軽く背中を押す感じ

【絶対に避けること】
- 「人生とは」「本当の幸せとは」などの哲学的な問い
- 「ふと考えてみてください」だけで終わる曖昧な問い
- ユーザーの日記に書かれていないことを勝手に推測する
- 説教臭いアドバイス

【出力形式】
{"content":"共感メッセージ（80-150文字）","question":"具体的な問いかけ（30-60文字）"}`;

/**
 * リクエストデータの型
 */
/**
 * サポートするAIモデルの型
 */
type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

/**
 * リクエストデータの型
 */
interface GenerateReflectionRequest {
  goodTime: string;
  wastedTime: string;
  tomorrow: string;
  currentAge: number;
  remainingYears: number;
  remainingDays: number;
  /** 使用するAIモデル（デフォルト: gemini-2.5-pro） */
  model?: GeminiModel;
  /** 日記の日付（YYYY-MM-DD形式）- 利用制限チェック用 */
  diaryDate?: string;
  /** 利用制限チェックをスキップするか（開発用） */
  skipUsageCheck?: boolean;
}

/**
 * レスポンスデータの型
 */
interface ReflectionResponse {
  content: string;
  question: string;
  generatedAt: string;
  modelVersion: string;
}

/**
 * ユーザープロンプトを生成
 */
function generateUserPrompt(params: GenerateReflectionRequest): string {
  const {
    goodTime,
    wastedTime,
    tomorrow,
    currentAge,
    remainingYears,
    remainingDays,
  } = params;

  let focusHint = '';
  if (goodTime && goodTime.trim()) {
    focusHint = '良かったことに共感し、その喜びを一緒に味わってください。';
  } else if (wastedTime && wastedTime.trim()) {
    focusHint = '後悔に寄り添いつつ、それに気づけた勇気を認めてください。';
  } else if (tomorrow && tomorrow.trim()) {
    focusHint = '明日への想いを応援し、その意識を持てていることを肯定してください。';
  }

  return `【ユーザー情報】
${currentAge}歳。目標寿命まで残り約${remainingYears}年（${remainingDays.toLocaleString()}日）。

【今日の振り返り】
✨ 良かったこと: ${goodTime || '（記入なし）'}
💭 後悔していること: ${wastedTime || '（記入なし）'}
🌅 明日大切にしたいこと: ${tomorrow || '（記入なし）'}

【リフレクションのポイント】
${focusHint}
残り${remainingDays.toLocaleString()}日という時間の中で、今日の体験がどんな意味を持つか考えさせる問いかけを添えてください。`;
}

/**
 * AIのレスポンスをパース
 */
function parseAIResponse(response: string): { content: string; question: string } | null {
  try {
    console.log('[parseAIResponse] Input length:', response.length);

    // Markdownコードブロックを除去
    const cleanedResponse = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    console.log('[parseAIResponse] Cleaned response:', cleanedResponse.slice(0, 200) + '...');

    // 方法1: JSONとしてパース
    try {
      const parsed = JSON.parse(cleanedResponse);
      if (parsed && parsed.content && typeof parsed.content === 'string') {
        console.log('[parseAIResponse] JSON.parse succeeded');
        console.log('[parseAIResponse] content length:', parsed.content.length);
        console.log('[parseAIResponse] question length:', (parsed.question || '').length);
        return {
          content: parsed.content,
          question: parsed.question || '',
        };
      }
    } catch (jsonError) {
      console.log('[parseAIResponse] JSON.parse failed:', jsonError);
      // パース失敗時は正規表現で抽出
    }

    // 方法2: より柔軟な正規表現でcontentとquestionを抽出
    // content の抽出（複数行対応）
    let contentMatch = cleanedResponse.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/s);

    // contentが見つからない場合、より緩い方法を試す
    if (!contentMatch) {
      const contentStartIndex = cleanedResponse.indexOf('"content"');
      if (contentStartIndex !== -1) {
        const colonIndex = cleanedResponse.indexOf(':', contentStartIndex);
        if (colonIndex !== -1) {
          const quoteStart = cleanedResponse.indexOf('"', colonIndex);
          if (quoteStart !== -1) {
            let quoteEnd = quoteStart + 1;
            let escaped = false;
            while (quoteEnd < cleanedResponse.length) {
              const char = cleanedResponse[quoteEnd];
              if (escaped) {
                escaped = false;
              } else if (char === '\\') {
                escaped = true;
              } else if (char === '"') {
                break;
              }
              quoteEnd++;
            }
            if (quoteEnd < cleanedResponse.length) {
              const extractedContent = cleanedResponse.slice(quoteStart + 1, quoteEnd);
              contentMatch = [null, extractedContent] as unknown as RegExpMatchArray;
            }
          }
        }
      }
    }

    // question の抽出
    let questionMatch = cleanedResponse.match(/"question"\s*:\s*"((?:[^"\\]|\\.)*)"/s);

    if (!questionMatch) {
      const questionStartIndex = cleanedResponse.indexOf('"question"');
      if (questionStartIndex !== -1) {
        const colonIndex = cleanedResponse.indexOf(':', questionStartIndex);
        if (colonIndex !== -1) {
          const quoteStart = cleanedResponse.indexOf('"', colonIndex);
          if (quoteStart !== -1) {
            let quoteEnd = quoteStart + 1;
            let escaped = false;
            while (quoteEnd < cleanedResponse.length) {
              const char = cleanedResponse[quoteEnd];
              if (escaped) {
                escaped = false;
              } else if (char === '\\') {
                escaped = true;
              } else if (char === '"') {
                break;
              }
              quoteEnd++;
            }
            if (quoteEnd < cleanedResponse.length) {
              const extractedQuestion = cleanedResponse.slice(quoteStart + 1, quoteEnd);
              questionMatch = [null, extractedQuestion] as unknown as RegExpMatchArray;
            }
          }
        }
      }
    }

    if (contentMatch && contentMatch[1]) {
      const content = contentMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');

      const question = questionMatch && questionMatch[1]
        ? questionMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
        : '';

      console.log('[parseAIResponse] Regex extraction succeeded');
      console.log('[parseAIResponse] content length:', content.length);
      console.log('[parseAIResponse] question length:', question.length);

      return { content, question };
    }

    console.log('[parseAIResponse] All parsing methods failed');
    return null;
  } catch (error) {
    console.error('[parseAIResponse] Unexpected error:', error);
    return null;
  }
}

/**
 * フォールバック用のリフレクションを生成
 */
function generateFallbackReflection(params: GenerateReflectionRequest): ReflectionResponse {
  const { goodTime, wastedTime, remainingYears } = params;

  let content: string;
  let question: string;

  if (goodTime) {
    content = `「${goodTime.slice(0, 15)}${goodTime.length > 15 ? '...' : ''}」という体験を大切にされていますね。日々の小さな喜びに気づけることは、とても素敵なことです。`;
  } else if (wastedTime) {
    content = '今日を振り返り、反省点を見つけられたことは、明日への一歩ですね。自分に正直に向き合う姿勢が素晴らしいです。';
  } else {
    content = '今日も一日を振り返る時間を取られていますね。この習慣が、あなたの人生をより豊かにしていくでしょう。';
  }

  if (wastedTime) {
    question = '今日の後悔を、明日への学びに変えるとしたら、何を意識しますか？';
  } else {
    question = `残り約${remainingYears}年の中で、今日のような時間をあと何回過ごせるでしょうか。`;
  }

  return {
    content,
    question,
    generatedAt: new Date().toISOString(),
    modelVersion: 'fallback',
  };
}

/**
 * AIリフレクション生成エンドポイント
 *
 * Firebase Callable Function として実装
 * 認証されたユーザーのみがアクセス可能
 */
export const generateReflection = onCall(
  {
    secrets: [geminiApiKey],
    region: 'asia-northeast1', // 東京リージョン
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    // 認証チェック
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        '認証が必要です。ログインしてから再度お試しください。'
      );
    }

    const data = request.data as GenerateReflectionRequest;

    // 入力バリデーション
    if (!data || typeof data !== 'object') {
      throw new HttpsError('invalid-argument', '無効なリクエストデータです。');
    }

    const { goodTime, wastedTime, tomorrow, currentAge, remainingYears, remainingDays } = data;

    // 必須フィールドのチェック
    if (
      typeof currentAge !== 'number' ||
      typeof remainingYears !== 'number' ||
      typeof remainingDays !== 'number'
    ) {
      throw new HttpsError(
        'invalid-argument',
        '年齢情報が不正です。'
      );
    }

    // 少なくとも1つの日記入力が必要
    if (!goodTime?.trim() && !wastedTime?.trim() && !tomorrow?.trim()) {
      throw new HttpsError(
        'invalid-argument',
        '日記の内容を入力してください。'
      );
    }

    const userId = request.auth.uid;
    const diaryDate = data.diaryDate || new Date().toISOString().split('T')[0];

    // ============================================================
    // 利用制限チェック
    // ============================================================
    if (!data.skipUsageCheck) {
      // ユーザーのサブスクリプションティアを取得
      const tier = await getUserSubscriptionTier(userId);
      console.log(`[generateReflection] User ${userId} tier: ${tier}`);

      // 利用制限をチェック
      const limitCheck = await checkUsageLimit(userId, diaryDate, tier);

      if (!limitCheck.allowed) {
        console.log(`[generateReflection] Usage limit reached: ${limitCheck.errorCode}`, limitCheck.details);

        // エラーコードに応じたエラーメッセージを設定
        let errorMessage = '利用制限に達しました。';
        switch (limitCheck.errorCode) {
          case 'MONTHLY_LIMIT_REACHED':
            errorMessage = '今月のAIリフレクション利用上限に達しました。プレミアムプランで無制限にご利用いただけます。';
            break;
          case 'REGENERATE_NOT_ALLOWED':
            errorMessage = '無料プランでは同じ日記の再生成はできません。プレミアムプランにアップグレードすると再生成が可能になります。';
            break;
          case 'DIARY_REGENERATE_LIMIT':
            errorMessage = 'この日記のAIリフレクションは3回まで生成できます。';
            break;
        }

        throw new HttpsError('resource-exhausted', errorMessage, {
          code: limitCheck.errorCode,
          ...limitCheck.details,
        });
      }
    } else {
      console.log('[generateReflection] Skipping usage check (development mode)');
    }

    const apiKey = geminiApiKey.value();

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      // APIキーがない場合はフォールバックを返す
      return generateFallbackReflection(data);
    }

    try {
      const userPrompt = generateUserPrompt(data);
      const combinedPrompt = `${REFLECTION_SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;

      // 使用するモデルを決定（デフォルト: gemini-2.5-pro）
      const selectedModel: GeminiModel = data.model || 'gemini-2.5-pro';
      console.log('[generateReflection] Selected model:', selectedModel);
      console.log('[generateReflection] Calling Gemini API...');

      // Gemini APIにリクエストを送信（リトライ機能付き）
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [{ text: combinedPrompt }],
                  },
                ],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 2048,
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: 'object',
                    properties: {
                      content: {
                        type: 'string',
                        description: '共感メッセージ（100-180文字）',
                      },
                      question: {
                        type: 'string',
                        description: '問いかけ（40-80文字）',
                      },
                    },
                    required: ['content', 'question'],
                  },
                },
                // Safety settingsを緩和して、日常的な日記内容がブロックされないようにする
                safetySettings: [
                  {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_ONLY_HIGH',
                  },
                  {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_ONLY_HIGH',
                  },
                  {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_ONLY_HIGH',
                  },
                  {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_ONLY_HIGH',
                  },
                ],
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[generateReflection] Gemini API error (attempt ${attempt}):`, response.status, errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
          }

          const responseData = await response.json();

          // デバッグ: レスポンス全体をログ出力
          console.log('[generateReflection] Full response:', JSON.stringify(responseData, null, 2));

          // finishReasonをチェック
          const candidate = responseData.candidates?.[0];
          const finishReason = candidate?.finishReason;

          if (finishReason && finishReason !== 'STOP') {
            console.warn(`[generateReflection] Unexpected finishReason: ${finishReason}`);
            // SAFETY, MAX_TOKENS, RECITATIONなどの場合はリトライ
            if (finishReason === 'SAFETY' || finishReason === 'MAX_TOKENS') {
              throw new Error(`Generation stopped: ${finishReason}`);
            }
          }

          const content = candidate?.content?.parts?.[0]?.text;

          if (!content) {
            console.error(`[generateReflection] Empty response from Gemini (attempt ${attempt})`);
            throw new Error('Empty response from Gemini');
          }

          console.log('[generateReflection] Raw content:', content);
          console.log('[generateReflection] Content length:', content.length);

          const parsed = parseAIResponse(content);

          if (!parsed) {
            console.error(`[generateReflection] Failed to parse response (attempt ${attempt}):`, content);
            throw new Error('Failed to parse response');
          }

          // 回答が途中で切れていないかチェック（最低限の文字数チェック）
          if (parsed.content.length < 30 || parsed.question.length < 10) {
            console.warn('[generateReflection] Response seems too short, retrying...');
            console.warn('  content length:', parsed.content.length);
            console.warn('  question length:', parsed.question.length);
            throw new Error('Response too short');
          }

          const result: ReflectionResponse = {
            content: parsed.content,
            question: parsed.question,
            generatedAt: new Date().toISOString(),
            modelVersion: selectedModel,
          };

          // 生成成功時に利用状況を記録
          if (!data.skipUsageCheck) {
            const usage = await getAIReflectionUsageWithDiary(userId, diaryDate);
            await recordAIReflectionUsage(userId, diaryDate, usage.hasExistingReflection);
          }

          console.log('[generateReflection] Success');
          return result;
        } catch (retryError) {
          lastError = retryError instanceof Error ? retryError : new Error(String(retryError));
          console.error(`[generateReflection] Attempt ${attempt} failed:`, lastError.message);

          // 最後の試行でなければ少し待ってリトライ
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // 指数バックオフ
          }
        }
      }

      // すべてのリトライが失敗した場合
      console.error('[generateReflection] All retries failed:', lastError?.message);
      throw lastError || new Error('All retries failed');
    } catch (error) {
      console.error('[generateReflection] Error:', error);

      // エラー時はフォールバックを返す（ユーザー体験を損なわないため）
      return generateFallbackReflection(data);
    }
  }
);

// ============================================================
// 週次インサイト生成
// ============================================================

/**
 * 週次インサイト用システムプロンプト（簡潔版）
 */
const WEEKLY_INSIGHT_SYSTEM_PROMPT = `あなたは「PivotLog」の週次レポートアナリストです。1週間の日記から時間の使い方のパターンを発見し、自己理解を深めるインサイトを提供します。

【必須ルール】
1. 日記の具体的な言葉を「」で引用する（各パターンに最低1つ）
2. 2〜3個のパターンを抽出する
3. 批判せず「気づき」として提示する
4. 「〜ですね」「〜かもしれません」の柔らかい語尾を使う

【分析観点】
- 喜びの源泉：「良かったこと」の共通テーマ（人・活動・達成感など）
- 後悔のパターン：繰り返される後悔、その裏にある「本当はこうしたかった」
- 意図と行動：「明日大切にしたいこと」が翌日に反映されているか

【出力形式の注意】
- summary: 100-150文字。最も顕著な傾向を指摘し、温かく労う
- patterns: 2〜3個。各patternのdescriptionは50-80文字、具体的引用を含める
- question: 40-60文字。来週できる具体的なアクションを提案

【パターンタイプ】
positive_theme / growth_area / time_awareness / relationship / self_care / intention_action`;

/**
 * 週次インサイト生成リクエストの型
 */
interface GenerateWeeklyInsightRequest {
  entries: Array<{
    date: string;
    goodTime: string;
    wastedTime: string;
    tomorrow: string;
  }>;
  currentAge: number;
  remainingYears: number;
  remainingDays: number;
  weekStartDate: string;
  weekEndDate: string;
}

/**
 * 週次インサイトレスポンスの型
 */
interface WeeklyInsightResponse {
  summary: string;
  patterns: Array<{
    type: string;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
    frequency?: number;
  }>;
  question: string;
  generatedAt: string;
  modelVersion: string;
}

/**
 * 週次インサイト用ユーザープロンプトを生成
 */
function generateWeeklyInsightUserPrompt(request: GenerateWeeklyInsightRequest): string {
  const { entries, currentAge, remainingYears, remainingDays, weekStartDate, weekEndDate } = request;

  // 日記エントリーを整形（より分析しやすい形式に）
  const entriesText = entries
    .map((entry, index) => {
      const date = new Date(entry.date);
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
      return `【${entry.date}（${dayOfWeek}）】Day ${index + 1}
✨ 良かったこと: ${entry.goodTime || '（記入なし）'}
💭 後悔していること: ${entry.wastedTime || '（記入なし）'}
🌅 明日大切にしたいこと: ${entry.tomorrow || '（記入なし）'}`;
    })
    .join('\n\n');

  // 分析のヒントを生成
  const analysisHints = generateAnalysisHints(entries);

  return `【ユーザー情報】
${currentAge}歳。目標寿命まで残り約${remainingYears}年（${remainingDays.toLocaleString()}日）。
1週間は人生の約${(100 / (remainingYears * 52)).toFixed(3)}%に相当。

【分析期間】
${weekStartDate} 〜 ${weekEndDate}（${entries.length}日分の記録）

【この週の日記】
${entriesText}

【分析のヒント】
${analysisHints}

【依頼事項】
1. 上記の日記を深く読み込み、ユーザー自身も気づいていないパターンを発見してください
2. 「良かったこと」に共通する要素（人・活動・場所など）を探してください
3. 「後悔」に繰り返し現れるテーマがあれば指摘してください
4. 「明日大切にしたいこと」が実際の行動に反映されているか確認してください
5. 必ず日記の具体的な言葉を引用してください
6. 分析結果から自然に導かれる、来週への具体的な問いかけを1つ提案してください`;
}

/**
 * 日記エントリーから分析のヒントを生成
 */
function generateAnalysisHints(entries: GenerateWeeklyInsightRequest['entries']): string {
  const hints: string[] = [];

  // 良かったことに登場する人物を抽出
  const peoplePattern = /妻|夫|子ども|息子|娘|友人|友達|親|母|父|同僚|上司|部下|先輩|後輩/g;
  const allGoodTimes = entries.map(e => e.goodTime).join(' ');
  const peopleMatches = allGoodTimes.match(peoplePattern);
  if (peopleMatches && peopleMatches.length > 0) {
    const uniquePeople = [...new Set(peopleMatches)];
    hints.push(`・「良かったこと」に登場する人物: ${uniquePeople.join('、')}（${peopleMatches.length}回言及）`);
  }

  // 後悔のキーワードを抽出
  const regretKeywords = /夜更かし|先延ばし|だらだら|無駄|スマホ|SNS|ゲーム|二度寝|寝坊|食べ過ぎ|飲み過ぎ/g;
  const allRegrets = entries.map(e => e.wastedTime).join(' ');
  const regretMatches = allRegrets.match(regretKeywords);
  if (regretMatches && regretMatches.length > 0) {
    const uniqueRegrets = [...new Set(regretMatches)];
    hints.push(`・「後悔」に登場するキーワード: ${uniqueRegrets.join('、')}`);
  }

  // 意図と行動の連続性をチェック
  for (let i = 0; i < entries.length - 1; i++) {
    const tomorrow = entries[i].tomorrow;
    const nextGoodTime = entries[i + 1]?.goodTime;
    if (tomorrow && nextGoodTime && tomorrow.length > 5 && nextGoodTime.length > 5) {
      hints.push(`・${entries[i].date}の「明日の意図」→ ${entries[i + 1].date}の「良かったこと」の関連性を確認してください`);
      break; // 1つだけヒントとして出す
    }
  }

  if (hints.length === 0) {
    hints.push('・特定のパターンが見つけにくい場合は、ユーザーの言葉遣いや表現の傾向に注目してください');
  }

  return hints.join('\n');
}

/**
 * 週次インサイトのAIレスポンスをパース
 * 不完全なJSONでも可能な限りデータを抽出する
 */
function parseWeeklyInsightResponse(response: string): {
  summary: string;
  patterns: Array<{
    type: string;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
    frequency?: number;
  }>;
  question: string;
} | null {
  try {
    const cleanedResponse = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // まず完全なJSONとしてパースを試みる
    try {
      const parsed = JSON.parse(cleanedResponse);
      if (parsed && parsed.summary && Array.isArray(parsed.patterns)) {
        return {
          summary: parsed.summary,
          patterns: parsed.patterns.map((p: Record<string, unknown>) => ({
            type: String(p.type || 'positive_theme'),
            title: String(p.title || ''),
            description: String(p.description || ''),
            examples: Array.isArray(p.examples) ? p.examples : undefined,
            frequency: typeof p.frequency === 'number' ? p.frequency : undefined,
          })),
          question: parsed.question || '',
        };
      }
    } catch {
      // 完全なJSONパースに失敗した場合、部分的にデータを抽出
      console.log('[parseWeeklyInsightResponse] Full JSON parse failed, attempting partial extraction...');
    }

    // 不完全なJSONからデータを部分的に抽出する
    return extractPartialInsightData(cleanedResponse);
  } catch (error) {
    console.error('[parseWeeklyInsightResponse] Extraction failed:', error);
    return null;
  }
}

/**
 * 不完全なJSONから部分的にデータを抽出
 */
function extractPartialInsightData(response: string): {
  summary: string;
  patterns: Array<{
    type: string;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
    frequency?: number;
  }>;
  question: string;
} | null {
  // summaryを抽出
  const summaryMatch = response.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const summary = summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';

  if (!summary) {
    console.error('[extractPartialInsightData] No summary found');
    return null;
  }

  // patternsを抽出（より堅牢な方法）
  const patterns: Array<{
    type: string;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
    frequency?: number;
  }> = [];

  // 各パターンブロックを正規表現で抽出
  const patternBlockRegex = /\{\s*"type"\s*:\s*"([^"]+)"\s*,\s*"title"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"description"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let patternMatch;

  while ((patternMatch = patternBlockRegex.exec(response)) !== null) {
    const type = patternMatch[1];
    const title = patternMatch[2].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const description = patternMatch[3].replace(/\\n/g, '\n').replace(/\\"/g, '"');

    // このパターンに対応するexamplesとfrequencyを抽出
    const afterPattern = response.slice(patternMatch.index + patternMatch[0].length);

    // examplesを抽出（次のパターンまたはpatternsの終わりまで）
    const examples: Array<{ date: string; quote: string }> = [];
    const exampleRegex = /"date"\s*:\s*"([^"]+)"\s*,\s*"quote"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    const examplesSection = afterPattern.split(/\{\s*"type"/)[0]; // 次のパターンまで
    let exampleMatch;

    while ((exampleMatch = exampleRegex.exec(examplesSection)) !== null) {
      examples.push({
        date: exampleMatch[1],
        quote: exampleMatch[2].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      });
    }

    // frequencyを抽出
    const frequencyMatch = examplesSection.match(/"frequency"\s*:\s*(\d+)/);
    const frequency = frequencyMatch ? parseInt(frequencyMatch[1], 10) : undefined;

    patterns.push({
      type,
      title,
      description,
      examples: examples.length > 0 ? examples : undefined,
      frequency,
    });
  }

  // questionを抽出（最後に出現するものを取得）
  const questionMatches = response.match(/"question"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  let question = '';
  if (questionMatches) {
    question = questionMatches[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }

  // 最低限の検証
  if (summary && patterns.length > 0) {
    console.log(`[extractPartialInsightData] Extracted: summary=${summary.length}chars, patterns=${patterns.length}, question=${question ? 'yes' : 'no'}`);
    return {
      summary,
      patterns,
      question: question || '今週発見したパターンを、来週どう活かしたいですか？',
    };
  }

  return null;
}

/**
 * フォールバック用の週次インサイトを生成
 */
function generateFallbackWeeklyInsight(request: GenerateWeeklyInsightRequest): WeeklyInsightResponse {
  const { entries, remainingYears } = request;

  // remainingYearsを適切にフォーマット（小数点以下1桁）
  const formattedYears = Math.round(remainingYears * 10) / 10;

  // 日記から最初の具体的な言葉を探す
  let firstQuote = '';
  let quoteDate = '';
  for (const entry of entries) {
    if (entry.goodTime && entry.goodTime.length > 10) {
      firstQuote = entry.goodTime.slice(0, 30) + (entry.goodTime.length > 30 ? '...' : '');
      quoteDate = entry.date;
      break;
    }
  }

  const summary = firstQuote
    ? `今週は${entries.length}日分の振り返りがありました。「${firstQuote}」など、日々の体験をしっかりと記録されていますね。こうして自分の時間と向き合う習慣は、残り約${formattedYears}年をより豊かにする大切な一歩です。`
    : `今週は${entries.length}日分の記録がありました。毎日の振り返りを続けていることは、残り約${formattedYears}年をより意識的に過ごすための大切な習慣ですね。`;

  // 複数のパターンを生成（フォールバックでも充実した内容に）
  const fallbackPatterns: WeeklyInsightResponse['patterns'] = [
    {
      type: 'time_awareness',
      title: '振り返りの習慣化',
      description: `${entries.length}日間、自分の時間と向き合う時間を取れています。この「立ち止まって考える」習慣が、日々の選択を変えていきます。`,
      examples: quoteDate && firstQuote ? [{ date: quoteDate, quote: firstQuote }] : undefined,
      frequency: entries.length,
    },
  ];

  // 後悔のパターンがあれば追加
  const regretEntry = entries.find(e => e.wastedTime && e.wastedTime.length > 10);
  if (regretEntry) {
    fallbackPatterns.push({
      type: 'growth_area',
      title: '成長への気づき',
      description: `「${regretEntry.wastedTime.slice(0, 20)}${regretEntry.wastedTime.length > 20 ? '...' : ''}」など、改善したい点にも目を向けられています。この自己認識が成長の第一歩です。`,
      examples: [{ date: regretEntry.date, quote: regretEntry.wastedTime.slice(0, 50) }],
      frequency: entries.filter(e => e.wastedTime && e.wastedTime.length > 5).length,
    });
  }

  return {
    summary,
    patterns: fallbackPatterns,
    question: '来週は「良かった」と思える時間を、どんな風に増やしてみたいですか？',
    generatedAt: new Date().toISOString(),
    modelVersion: 'fallback',
  };
}

/**
 * 週次インサイト生成エンドポイント
 */
export const generateWeeklyInsight = onCall(
  {
    secrets: [geminiApiKey],
    region: 'asia-northeast1',
    memory: '256MiB',
    timeoutSeconds: 120, // 週次分析は時間がかかる可能性があるため長めに
  },
  async (request) => {
    // 認証チェック
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        '認証が必要です。ログインしてから再度お試しください。'
      );
    }

    const data = request.data as GenerateWeeklyInsightRequest;

    // 入力バリデーション
    if (!data || typeof data !== 'object') {
      throw new HttpsError('invalid-argument', '無効なリクエストデータです。');
    }

    const { entries, currentAge, remainingYears, remainingDays } = data;

    // 必須フィールドのチェック
    if (
      !Array.isArray(entries) ||
      entries.length === 0 ||
      typeof currentAge !== 'number' ||
      typeof remainingYears !== 'number' ||
      typeof remainingDays !== 'number'
    ) {
      throw new HttpsError('invalid-argument', '必要な情報が不足しています。');
    }

    // 最低記録数のチェック（5日以上を推奨）
    if (entries.length < 3) {
      throw new HttpsError(
        'failed-precondition',
        '週次インサイトを生成するには、最低3日分の記録が必要です。'
      );
    }

    const apiKey = geminiApiKey.value();

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return generateFallbackWeeklyInsight(data);
    }

    try {
      const userPrompt = generateWeeklyInsightUserPrompt(data);
      const combinedPrompt = `${WEEKLY_INSIGHT_SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;

      console.log('[generateWeeklyInsight] Calling Gemini API...');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: combinedPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7, // 安定した出力のために調整
              maxOutputTokens: 8192, // 十分な出力枠を確保
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'object',
                properties: {
                  summary: {
                    type: 'string',
                    description: '週全体のサマリー（100-150文字）'
                  },
                  patterns: {
                    type: 'array',
                    description: '発見したパターン（2-3個）',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['positive_theme', 'growth_area', 'time_awareness', 'relationship', 'self_care', 'intention_action']
                        },
                        title: {
                          type: 'string',
                          description: 'パターンのタイトル（10-15文字）'
                        },
                        description: {
                          type: 'string',
                          description: 'パターンの説明（50-80文字）'
                        },
                        examples: {
                          type: 'array',
                          description: '引用例（1-2個）',
                          items: {
                            type: 'object',
                            properties: {
                              date: { type: 'string' },
                              quote: { type: 'string' },
                            },
                            required: ['date', 'quote'],
                          },
                        },
                        frequency: {
                          type: 'integer',
                          description: '出現回数'
                        },
                      },
                      required: ['type', 'title', 'description'],
                    },
                  },
                  question: {
                    type: 'string',
                    description: '来週への問いかけ（40-60文字）'
                  },
                },
                required: ['summary', 'patterns', 'question'],
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[generateWeeklyInsight] Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const responseData = await response.json();

      // レスポンスの詳細をログ出力（デバッグ用）
      const finishReason = responseData.candidates?.[0]?.finishReason;
      console.log('[generateWeeklyInsight] Finish reason:', finishReason);

      const content = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        console.error('[generateWeeklyInsight] Empty response from Gemini. Full response:', JSON.stringify(responseData));
        return generateFallbackWeeklyInsight(data);
      }

      console.log('[generateWeeklyInsight] Response length:', content.length, 'chars');

      const parsed = parseWeeklyInsightResponse(content);

      if (!parsed) {
        console.error('[generateWeeklyInsight] Failed to parse response:', content.substring(0, 500) + '...');
        return generateFallbackWeeklyInsight(data);
      }

      const result: WeeklyInsightResponse = {
        summary: parsed.summary,
        patterns: parsed.patterns,
        question: parsed.question,
        generatedAt: new Date().toISOString(),
        modelVersion: 'gemini-2.5-flash',
      };

      console.log('[generateWeeklyInsight] Success');
      return result;
    } catch (error) {
      console.error('[generateWeeklyInsight] Error:', error);
      return generateFallbackWeeklyInsight(data);
    }
  }
);

// ============================================================
// 月次インサイト生成
// ============================================================

/**
 * 月次インサイト用システムプロンプト
 */
const MONTHLY_INSIGHT_SYSTEM_PROMPT = `あなたは「PivotLog」の月次レポートアナリストです。1ヶ月の日記から長期的なパターンを発見し、ユーザーの自己理解を深めるインサイトを提供します。

【必須ルール】
1. 日記の具体的な言葉を「」で引用する（各テーマに最低1つ）
2. 2〜3個の月間テーマを抽出する
3. 月の前半と後半の変化に注目する
4. 批判せず「気づき」として提示する
5. 「〜ですね」「〜かもしれません」の柔らかい語尾を使う

【分析の視点 - 週次との違い】
週次インサイトが「その週の傾向」を見るのに対し、月次インサイトでは：
- 週をまたいで繰り返し現れるパターン
- 月の始めと終わりでの意識・行動の変化
- 特に印象的だった日（ハイライト）
- 1ヶ月を通じて成長した点、来月への課題

【ハイライト選出基準】
- achievement: 達成感を感じた日
- connection: 人との繋がりを感じた日
- discovery: 新しい気づきがあった日
- turning_point: 何かが変わるきっかけになった日

【テーマタイプ】
- recurring_joy: 繰り返し現れる喜び
- persistent_challenge: 継続的な課題
- evolving_priority: 変化する優先順位
- relationship_pattern: 人間関係のパターン
- self_discovery: 自己発見
- time_investment: 時間の投資先
- value_alignment: 価値観との整合性

【出力形式の注意】
- summary: 150-200文字。月全体を俯瞰し、温かく労う
- highlights: 2〜4個。特に印象的だった日
- themes: 2〜3個。月を通じたテーマ
- growth: 成長した点と来月の課題
- question: 50-70文字。来月に向けた具体的な問いかけ`;

/**
 * 月次インサイト生成リクエストの型
 */
interface GenerateMonthlyInsightRequest {
  entries: Array<{
    date: string;
    goodTime: string;
    wastedTime: string;
    tomorrow: string;
  }>;
  currentAge: number;
  remainingYears: number;
  remainingDays: number;
  monthStartDate: string;
  monthEndDate: string;
  yearMonth: string;
}

/**
 * 月次インサイトレスポンスの型
 */
interface MonthlyInsightResponse {
  summary: string;
  highlights: Array<{
    date: string;
    type: 'achievement' | 'connection' | 'discovery' | 'turning_point';
    title: string;
    description: string;
    quote?: string;
  }>;
  themes: Array<{
    type: string;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
  }>;
  growth: {
    improvements: string[];
    challenges: string[];
    transformation?: string;
  };
  question: string;
  generatedAt: string;
  modelVersion: string;
}

/**
 * 月次インサイト用ユーザープロンプトを生成
 */
function generateMonthlyInsightUserPrompt(request: GenerateMonthlyInsightRequest): string {
  const { entries, currentAge, remainingYears, remainingDays, monthStartDate, monthEndDate, yearMonth } = request;

  // 月の名前を取得
  const [year, month] = yearMonth.split('-').map(Number);
  const monthName = `${year}年${month}月`;

  // 日記エントリーを週ごとにグループ化
  const weeklyGroups: { week: number; entries: typeof entries }[] = [];
  let currentWeek = 1;
  let currentWeekEntries: typeof entries = [];

  entries.forEach((entry, index) => {
    currentWeekEntries.push(entry);
    // 7日ごと、または最後のエントリーで週を区切る
    if ((index + 1) % 7 === 0 || index === entries.length - 1) {
      weeklyGroups.push({ week: currentWeek, entries: currentWeekEntries });
      currentWeek++;
      currentWeekEntries = [];
    }
  });

  // 週ごとのサマリーを生成
  const weeklyText = weeklyGroups.map(group => {
    const weekEntries = group.entries
      .map(entry => {
        const date = new Date(entry.date);
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        return `  ${entry.date}（${dayOfWeek}）: ✨${entry.goodTime || '(なし)'} / 💭${entry.wastedTime || '(なし)'}`;
      })
      .join('\n');
    return `【第${group.week}週】\n${weekEntries}`;
  }).join('\n\n');

  // 分析のヒントを生成
  const analysisHints = generateMonthlyAnalysisHints(entries);

  return `【ユーザー情報】
${currentAge}歳。目標寿命まで残り約${remainingYears}年（${remainingDays.toLocaleString()}日）。
1ヶ月は人生の約${(100 / (remainingYears * 12)).toFixed(2)}%に相当。

【分析期間】
${monthName}（${monthStartDate} 〜 ${monthEndDate}）
記録日数: ${entries.length}日分

【この月の日記（週別）】
${weeklyText}

【分析のヒント】
${analysisHints}

【依頼事項】
1. 1ヶ月を俯瞰して、週をまたいで現れるパターンを発見してください
2. 特に印象的だった日（ハイライト）を2〜4日選んでください
3. 月の前半と後半で意識や行動に変化があったか確認してください
4. 成長した点と、来月に向けた課題を整理してください
5. 必ず日記の具体的な言葉を引用してください
6. 来月に向けた具体的な問いかけを1つ提案してください`;
}

/**
 * 月次分析のヒントを生成
 */
function generateMonthlyAnalysisHints(entries: GenerateMonthlyInsightRequest['entries']): string {
  const hints: string[] = [];

  // 良かったことの頻出キーワードを抽出
  const allGoodTimes = entries.map(e => e.goodTime).join(' ');
  const positiveKeywords = /達成|完了|できた|楽しかった|嬉しかった|充実|満足|成功|進んだ|続けられた/g;
  const positiveMatches = allGoodTimes.match(positiveKeywords);
  if (positiveMatches && positiveMatches.length > 0) {
    const uniquePositive = [...new Set(positiveMatches)];
    hints.push(`・「良かったこと」の頻出キーワード: ${uniquePositive.slice(0, 5).join('、')}`);
  }

  // 後悔の頻出キーワードを抽出
  const allRegrets = entries.map(e => e.wastedTime).join(' ');
  const negativeKeywords = /夜更かし|先延ばし|だらだら|無駄|スマホ|SNS|ゲーム|二度寝|寝坊|食べ過ぎ|飲み過ぎ|集中できなかった|怠けた/g;
  const negativeMatches = allRegrets.match(negativeKeywords);
  if (negativeMatches && negativeMatches.length > 0) {
    const uniqueNegative = [...new Set(negativeMatches)];
    const negativeCount = negativeMatches.length;
    hints.push(`・「後悔」の頻出キーワード: ${uniqueNegative.slice(0, 5).join('、')}（計${negativeCount}回）`);
  }

  // 人物への言及をカウント
  const peoplePattern = /妻|夫|子ども|息子|娘|友人|友達|親|母|父|同僚|上司|部下|先輩|後輩|家族/g;
  const allText = entries.map(e => `${e.goodTime} ${e.wastedTime} ${e.tomorrow}`).join(' ');
  const peopleMatches = allText.match(peoplePattern);
  if (peopleMatches && peopleMatches.length > 0) {
    const uniquePeople = [...new Set(peopleMatches)];
    hints.push(`・登場する人物: ${uniquePeople.join('、')}（${peopleMatches.length}回言及）`);
  }

  // 月の前半と後半の傾向比較
  const halfPoint = Math.floor(entries.length / 2);
  const firstHalf = entries.slice(0, halfPoint);
  const secondHalf = entries.slice(halfPoint);
  const firstHalfGoodCount = firstHalf.filter(e => e.goodTime && e.goodTime.length > 10).length;
  const secondHalfGoodCount = secondHalf.filter(e => e.goodTime && e.goodTime.length > 10).length;
  if (Math.abs(firstHalfGoodCount - secondHalfGoodCount) >= 2) {
    const trend = firstHalfGoodCount < secondHalfGoodCount ? '後半に向けて充実度が上がっている' : '前半のほうが充実していた';
    hints.push(`・月の前半/後半の傾向: ${trend}可能性`);
  }

  if (hints.length === 0) {
    hints.push('・特定のパターンが見つけにくい場合は、ユーザーの言葉遣いの変化に注目してください');
  }

  return hints.join('\n');
}

/**
 * 月次インサイトのAIレスポンスをパース
 */
function parseMonthlyInsightResponse(response: string): MonthlyInsightResponse | null {
  try {
    const cleanedResponse = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    if (parsed && parsed.summary && Array.isArray(parsed.highlights) && Array.isArray(parsed.themes)) {
      return {
        summary: parsed.summary,
        highlights: parsed.highlights.map((h: Record<string, unknown>) => ({
          date: String(h.date || ''),
          type: String(h.type || 'achievement') as MonthlyInsightResponse['highlights'][0]['type'],
          title: String(h.title || ''),
          description: String(h.description || ''),
          quote: h.quote ? String(h.quote) : undefined,
        })),
        themes: parsed.themes.map((t: Record<string, unknown>) => ({
          type: String(t.type || 'recurring_joy'),
          title: String(t.title || ''),
          description: String(t.description || ''),
          examples: Array.isArray(t.examples) ? t.examples : undefined,
        })),
        growth: {
          improvements: Array.isArray(parsed.growth?.improvements) ? parsed.growth.improvements : [],
          challenges: Array.isArray(parsed.growth?.challenges) ? parsed.growth.challenges : [],
          transformation: parsed.growth?.transformation ? String(parsed.growth.transformation) : undefined,
        },
        question: parsed.question || '',
        generatedAt: new Date().toISOString(),
        modelVersion: 'gemini-2.5-flash',
      };
    }

    return null;
  } catch (error) {
    console.error('[parseMonthlyInsightResponse] Parse failed:', error);
    return null;
  }
}

/**
 * フォールバック用の月次インサイトを生成
 */
function generateFallbackMonthlyInsight(request: GenerateMonthlyInsightRequest): MonthlyInsightResponse {
  const { entries, remainingYears, yearMonth } = request;
  const [year, month] = yearMonth.split('-').map(Number);
  const monthName = `${year}年${month}月`;

  // 最も長い「良かったこと」を見つける
  let bestEntry = entries[0];
  entries.forEach(entry => {
    if (entry.goodTime && entry.goodTime.length > (bestEntry?.goodTime?.length || 0)) {
      bestEntry = entry;
    }
  });

  const formattedYears = Math.round(remainingYears * 10) / 10;

  const summary = bestEntry?.goodTime
    ? `${monthName}は${entries.length}日分の振り返りがありました。「${bestEntry.goodTime.slice(0, 30)}${bestEntry.goodTime.length > 30 ? '...' : ''}」など、日々の体験をしっかりと記録されていますね。こうして自分の時間と向き合う習慣は、残り約${formattedYears}年をより豊かにする大切な一歩です。`
    : `${monthName}は${entries.length}日分の記録がありました。毎日の振り返りを続けていることは、残り約${formattedYears}年をより意識的に過ごすための大切な習慣ですね。`;

  return {
    summary,
    highlights: bestEntry ? [{
      date: bestEntry.date,
      type: 'achievement',
      title: '振り返りの継続',
      description: `この日の記録が印象的でした。日々の振り返りを${entries.length}日間続けられたことは素晴らしいです。`,
      quote: bestEntry.goodTime?.slice(0, 50),
    }] : [],
    themes: [{
      type: 'time_awareness',
      title: '振り返りの習慣化',
      description: `${entries.length}日間、自分の時間と向き合う時間を取れています。この「立ち止まって考える」習慣が、日々の選択を変えていきます。`,
    }],
    growth: {
      improvements: ['日々の振り返りを継続できている'],
      challenges: ['より具体的な記録を心がける'],
    },
    question: '来月は「良かった」と思える日を、どんな風に増やしてみたいですか？',
    generatedAt: new Date().toISOString(),
    modelVersion: 'fallback',
  };
}

/**
 * 月次インサイト生成エンドポイント
 */
export const generateMonthlyInsight = onCall(
  {
    secrets: [geminiApiKey],
    region: 'asia-northeast1',
    memory: '512MiB',
    timeoutSeconds: 180, // 月次分析は時間がかかる可能性があるため長めに
  },
  async (request) => {
    // 認証チェック
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        '認証が必要です。ログインしてから再度お試しください。'
      );
    }

    const data = request.data as GenerateMonthlyInsightRequest;

    // 入力バリデーション
    if (!data || typeof data !== 'object') {
      throw new HttpsError('invalid-argument', '無効なリクエストデータです。');
    }

    const { entries, currentAge, remainingYears, remainingDays, yearMonth } = data;

    // 必須フィールドのチェック
    if (
      !Array.isArray(entries) ||
      entries.length === 0 ||
      typeof currentAge !== 'number' ||
      typeof remainingYears !== 'number' ||
      typeof remainingDays !== 'number' ||
      typeof yearMonth !== 'string'
    ) {
      throw new HttpsError('invalid-argument', '必要な情報が不足しています。');
    }

    // 最低記録数のチェック（10日以上を推奨）
    if (entries.length < 10) {
      throw new HttpsError(
        'failed-precondition',
        '月次インサイトを生成するには、最低10日分の記録が必要です。'
      );
    }

    const apiKey = geminiApiKey.value();

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return generateFallbackMonthlyInsight(data);
    }

    try {
      const userPrompt = generateMonthlyInsightUserPrompt(data);
      const combinedPrompt = `${MONTHLY_INSIGHT_SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;

      console.log('[generateMonthlyInsight] Calling Gemini API...');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: combinedPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'object',
                properties: {
                  summary: {
                    type: 'string',
                    description: '月全体のサマリー（150-200文字）'
                  },
                  highlights: {
                    type: 'array',
                    description: '特に印象的だった日（2-4個）',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string', description: '日付（YYYY-MM-DD）' },
                        type: {
                          type: 'string',
                          enum: ['achievement', 'connection', 'discovery', 'turning_point']
                        },
                        title: { type: 'string', description: 'ハイライトのタイトル（10-20文字）' },
                        description: { type: 'string', description: '説明（30-50文字）' },
                        quote: { type: 'string', description: '日記からの引用（オプション）' },
                      },
                      required: ['date', 'type', 'title', 'description'],
                    },
                  },
                  themes: {
                    type: 'array',
                    description: '月間テーマ（2-3個）',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['recurring_joy', 'persistent_challenge', 'evolving_priority', 'relationship_pattern', 'self_discovery', 'time_investment', 'value_alignment']
                        },
                        title: { type: 'string', description: 'テーマのタイトル（10-20文字）' },
                        description: { type: 'string', description: 'テーマの説明（50-100文字）' },
                        examples: {
                          type: 'array',
                          description: '関連する引用例',
                          items: {
                            type: 'object',
                            properties: {
                              date: { type: 'string' },
                              quote: { type: 'string' },
                            },
                            required: ['date', 'quote'],
                          },
                        },
                      },
                      required: ['type', 'title', 'description'],
                    },
                  },
                  growth: {
                    type: 'object',
                    description: '成長と課題',
                    properties: {
                      improvements: {
                        type: 'array',
                        description: '成長した点（1-3個）',
                        items: { type: 'string' },
                      },
                      challenges: {
                        type: 'array',
                        description: '来月の課題（1-3個）',
                        items: { type: 'string' },
                      },
                      transformation: {
                        type: 'string',
                        description: '月初と月末の変化（オプション）',
                      },
                    },
                    required: ['improvements', 'challenges'],
                  },
                  question: {
                    type: 'string',
                    description: '来月への問いかけ（50-70文字）'
                  },
                },
                required: ['summary', 'highlights', 'themes', 'growth', 'question'],
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[generateMonthlyInsight] Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const responseData = await response.json();

      const finishReason = responseData.candidates?.[0]?.finishReason;
      console.log('[generateMonthlyInsight] Finish reason:', finishReason);

      const content = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        console.error('[generateMonthlyInsight] Empty response from Gemini');
        return generateFallbackMonthlyInsight(data);
      }

      console.log('[generateMonthlyInsight] Response length:', content.length, 'chars');

      const parsed = parseMonthlyInsightResponse(content);

      if (!parsed) {
        console.error('[generateMonthlyInsight] Failed to parse response');
        return generateFallbackMonthlyInsight(data);
      }

      console.log('[generateMonthlyInsight] Success');
      return parsed;
    } catch (error) {
      console.error('[generateMonthlyInsight] Error:', error);
      return generateFallbackMonthlyInsight(data);
    }
  }
);
