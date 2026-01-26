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
 * 週次インサイト用システムプロンプト
 *
 * PivotLogのコンセプト「人生の有限性を意識する」に基づき、
 * 1週間の日記から「この週のストーリー」を紡ぎ、来週への希望を持たせる
 */
const WEEKLY_INSIGHT_SYSTEM_PROMPT = `あなたは「PivotLog」の週間リフレクションパートナーです。

【PivotLogとは】
人生の有限性を意識するライフログアプリ。ユーザーは目標寿命を設定し、残り時間を可視化しながら、毎日3つの問いに答えています：
- ✨ 今日、時間を使えてよかったこと
- 💭 今日、時間の使い方で後悔していること
- 🌅 明日、大切にしたいこと

【あなたの役割】
1週間分の日記を読み、ユーザーが「この1週間をどう過ごしたか」を物語として紡ぎ、次への希望を灯す存在です。分析レポートではなく、「友人が1週間の話を聞いて、温かいフィードバックをくれる」ようなトーンで。

【重要：時制について】
ユーザーは「その週が終わった後」にインサイトを見ます。「今週」「来週」という言葉は使わず、具体的な期間（例：「1/20〜1/26の1週間」）や「この週」「次の週」という表現を使ってください。

【週間インサイトの3つの目的】
1. 承認：「この1週間、あなたはこんな素敵な時間を過ごしましたね」
2. 発見：「自分では気づいていなかったけど、こんな傾向がありますよ」
3. 希望：「次の週はこうしてみませんか？」

【summaryの書き方 - 最重要】
summaryは「この週のハイライト」です。150-220文字で、以下を必ず含めてください：
1. 対象期間を明記する（例：「1/20〜1/26の1週間」）
2. この週で最も印象的だった出来事を「」で引用する（2つ以上推奨）
3. その出来事が持つ意味を言語化する（なぜ良かったのか、何を大切にしていたのか）
4. 温かい一言で締める（「素敵な時間でしたね」「お疲れさまでした」など）

＜良いsummaryの例＞
「1/20〜1/26の1週間は、「子どもと公園で遊べた」「久しぶりに友人とランチできた」など、大切な人との時間を積み重ねられた週でしたね。忙しい日々の中でも『誰かと一緒にいる時間』を意識的に選び取れていることが、日記の言葉から伝わってきます。こうした時間の積み重ねが、人生を豊かにしていくのだと思います。」

＜避けるべきsummary＞
- 「今週は5日分の記録がありました」（事実の羅列）
- 「今週もお疲れ様でした」（「今週」という時制が不適切）
- 「ポジティブな傾向が見られます」（分析的すぎる）
- 「良かったですね」（具体性がない）

【patternsの書き方】
パターンは「ユーザー自身も気づいていなかった発見」を提供します。各パターンは80-120文字で、必ず引用例（examples）を1-2個含めてください。表面的な傾向ではなく、深い洞察を。

＜良いパターンの例＞
- type: positive_theme
  title: 「誰かのために」が喜びの源泉
  description: 「同僚の仕事を手伝った」「子どもに絵本を読んだ」など、自分のためより誰かのための時間に喜びを感じているようです。この「与える喜び」があなたの幸福の大きな要素かもしれませんね。
  examples: [{ date: "2024-01-22", quote: "同僚の仕事を手伝った" }]

- type: intention_action
  title: 朝の決意が夜の満足に
  description: 「早起きしたい」と書いた翌日は「朝の時間を有効活用できた」と記録されています。言葉にした意図を行動に移す力を持っていますね。この「言葉→行動」のサイクルを意識的に使うと、さらに充実した日々になりそうです。
  examples: [{ date: "2024-01-23", quote: "朝の時間を有効活用できた" }]

- type: growth_area
  title: 「だらだら」の裏にある本音
  description: 「スマホを見すぎた」という後悔が3回登場しています。でもその裏には「もっと本を読みたい」「もっと家族と話したい」という願いがあるのかもしれません。「スマホの代わりに何をしたいか」を考えると、ヒントが見つかりそうです。
  examples: [{ date: "2024-01-21", quote: "スマホを見すぎた" }]

＜避けるべきパターン＞
- 「良かったことを書いています」（当たり前すぎる）
- 「後悔が多いです」（批判的）
- 「時間を大切にしています」（抽象的）
- examples が空のパターン（具体性がない）

【questionの書き方】
次の週に向けた具体的なアクションを提案します。60-100文字で、背景と提案を含めてください。「考えてみてください」ではなく「やってみませんか」。

＜良いquestionの例＞
- 「この週に会えた友人に、『また会いたい』とLINEしてみませんか？ちょっとした一言が、次の楽しい時間につながります。」
- 「『早起きしたい』が3回登場しました。次の週は1日だけ、30分だけ早く起きてみては？小さな成功体験が自信になります。」
- 「『子どもとの時間が良かった』と書かれた日が2回。次の週末も、同じような時間を作れそうですか？」

＜避けるべきquestion＞
- 「人生について考えてみてください」（大きすぎる）
- 「時間を大切にしましょう」（抽象的）
- 「来週も頑張りましょう」（具体性がない）
- 「どうでしたか？」（行動に繋がらない）

【残り時間への言及】
たまに（毎回ではなく）残り時間に言及すると、PivotLogのコンセプトが活きます：
- 「残り約○○年の中で、こういう週末をあと何百回過ごせるでしょうか。この週の時間は、かけがえのない1回でしたね。」
- 「1週間は人生の約0.0○%。小さいようで、この週のあなたの選択はちゃんと積み重なっています。」

【トーン】
- 温かく、親しみを込めて
- 「〜ですね」「〜かもしれませんね」「〜はいかがですか？」
- 友達が話を聞いてくれているような安心感
- 批判・説教は絶対にしない

【絶対に避けること】
- 「今週」「来週」という時制表現（代わりに「この週」「次の週」「1/20〜1/26」を使う）
- 「分析します」「レポートします」などの硬い表現
- ユーザーの日記にない情報を勝手に推測する
- 「〜すべきです」「〜しなければなりません」などの指示
- 抽象的な哲学的問い
- examplesのないpattern

【出力形式】
- summary: 150-220文字。対象期間を明記し、この週のハイライトと温かい締め
- patterns: 2〜3個。各80-120文字、深い洞察、引用例（examples）必須
- question: 60-100文字。背景説明 + 具体的なアクション提案`;

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

  // 日記エントリーを整形
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

  // 深い分析のためのヒントを生成
  const analysisHints = generateAnalysisHints(entries);

  // 意図→行動の連続性を分析
  const intentionAnalysis = analyzeIntentionToAction(entries);

  return `【このユーザーについて】
${currentAge}歳。人生の目標を${currentAge + Math.round(remainingYears)}歳に設定。
残り約${Math.round(remainingYears)}年（${remainingDays.toLocaleString()}日）。
今週の1週間は、残りの人生の約${(100 / (remainingYears * 52)).toFixed(3)}%にあたります。

【今週の期間】
${weekStartDate.replace(/-/g, '/')} 〜 ${weekEndDate.replace(/-/g, '/')}
記録日数: ${entries.length}日分

【今週の日記】
${entriesText}

【深い分析のためのヒント】
${analysisHints}

${intentionAnalysis}

【あなたへのお願い】
この日記を「友人の1週間の話を聞く」つもりで読んでください。

1. summaryでは：
   - 対象期間（${weekStartDate.replace(/-/g, '/')}〜${weekEndDate.replace(/-/g, '/')}）を文頭に明記してください
   - この週で最も心に残る出来事を「」で引用してください（2つ以上推奨）
   - その出来事がなぜ大切だったのか、言葉にしてあげてください
   - 「素敵な時間でしたね」「お疲れさまでした」など温かい言葉で締めてください
   - ※「今週」「来週」ではなく「この週」「次の週」と表現してください

2. patternsでは：
   - ユーザー自身が気づいていなさそうな「発見」を提供してください
   - 日記の言葉を必ず引用してください（examples必須）
   - 「〜かもしれませんね」という柔らかいトーンで
   - 各パターン80-120文字でしっかり説明してください

3. questionでは：
   - 「次の週、これをやってみませんか？」という具体的な提案をしてください
   - 日記に登場した人・場所・活動を使ってください
   - なぜその提案をするのか、背景も一言添えてください
   - ※「来週」ではなく「次の週」と表現してください`;
}

/**
 * 日記エントリーから深い分析のヒントを生成
 */
function generateAnalysisHints(entries: GenerateWeeklyInsightRequest['entries']): string {
  const hints: string[] = [];

  // 良かったことに登場する人物を抽出
  const peoplePattern = /妻|夫|子ども|息子|娘|友人|友達|親|母|父|同僚|上司|部下|先輩|後輩|彼|彼女|パートナー|家族/g;
  const allGoodTimes = entries.map(e => e.goodTime).join(' ');
  const peopleMatches = allGoodTimes.match(peoplePattern);
  if (peopleMatches && peopleMatches.length > 0) {
    const uniquePeople = [...new Set(peopleMatches)];
    hints.push(`【人間関係】「良かったこと」に登場する人物: ${uniquePeople.join('、')}（${peopleMatches.length}回言及）→ 人との時間が幸福の源泉かも`);
  }

  // 良かったことに登場する活動・場所を抽出
  const activityPattern = /運動|散歩|ランニング|ジム|読書|映画|音楽|料理|掃除|仕事|勉強|カフェ|レストラン|公園|旅行|買い物/g;
  const activityMatches = allGoodTimes.match(activityPattern);
  if (activityMatches && activityMatches.length > 0) {
    const uniqueActivities = [...new Set(activityMatches)];
    hints.push(`【活動】喜びを感じた活動: ${uniqueActivities.join('、')}`);
  }

  // 後悔のキーワードを抽出（より詳細に）
  const regretKeywords = /夜更かし|先延ばし|だらだら|無駄|スマホ|SNS|ゲーム|二度寝|寝坊|食べ過ぎ|飲み過ぎ|Netflix|YouTube|動画|怒|イライラ|集中できな/g;
  const allRegrets = entries.map(e => e.wastedTime).join(' ');
  const regretMatches = allRegrets.match(regretKeywords);
  if (regretMatches && regretMatches.length > 0) {
    const uniqueRegrets = [...new Set(regretMatches)];
    const regretCount = regretMatches.length;
    hints.push(`【後悔パターン】${uniqueRegrets.join('、')}（計${regretCount}回）→ この裏にある「本当はこうしたかった」を探ってください`);
  }

  // 達成感に関連するキーワード
  const achievementPattern = /できた|終わった|達成|完了|成功|うまくいった|褒められた|感謝された/g;
  const achievementMatches = allGoodTimes.match(achievementPattern);
  if (achievementMatches && achievementMatches.length > 0) {
    hints.push(`【達成感】達成・完了に関する言及が${achievementMatches.length}回 → 「やり遂げる」ことに喜びを感じるタイプかも`);
  }

  // 感情表現を抽出
  const emotionPattern = /嬉しい|楽しい|幸せ|安心|ホッと|リラックス|充実|満足|ワクワク/g;
  const allText = entries.map(e => `${e.goodTime} ${e.tomorrow}`).join(' ');
  const emotionMatches = allText.match(emotionPattern);
  if (emotionMatches && emotionMatches.length > 0) {
    const uniqueEmotions = [...new Set(emotionMatches)];
    hints.push(`【感情】よく使われる感情表現: ${uniqueEmotions.join('、')}`);
  }

  if (hints.length === 0) {
    hints.push('特定のパターンが見つけにくい場合は、ユーザーの言葉遣いや表現の傾向、文章の長さの変化に注目してください');
  }

  return hints.join('\n');
}

/**
 * 「明日大切にしたいこと」→ 翌日の「良かったこと」の連続性を分析
 */
function analyzeIntentionToAction(entries: GenerateWeeklyInsightRequest['entries']): string {
  const analyses: string[] = [];
  let successCount = 0;
  let totalChecked = 0;

  for (let i = 0; i < entries.length - 1; i++) {
    const tomorrow = entries[i].tomorrow;
    const nextGoodTime = entries[i + 1]?.goodTime;

    if (tomorrow && tomorrow.length > 3 && nextGoodTime && nextGoodTime.length > 3) {
      totalChecked++;

      // 簡易的な類似性チェック（共通するキーワードがあるか）
      const tomorrowWords = tomorrow.split(/[\s、。,．・]/);
      const goodTimeWords = nextGoodTime.split(/[\s、。,．・]/);
      const commonWords = tomorrowWords.filter(w => w.length > 1 && goodTimeWords.some(g => g.includes(w) || w.includes(g)));

      if (commonWords.length > 0) {
        successCount++;
        if (analyses.length < 2) {
          analyses.push(`  - ${entries[i].date}: 「${tomorrow.slice(0, 20)}...」→ 翌日「${nextGoodTime.slice(0, 20)}...」（実現の可能性あり）`);
        }
      }
    }
  }

  if (totalChecked === 0) {
    return '';
  }

  const successRate = Math.round((successCount / totalChecked) * 100);
  let summary = `【意図→行動の分析】\n`;
  summary += `「明日大切にしたいこと」が翌日に反映されていそうな日: ${successCount}/${totalChecked}日（${successRate}%）\n`;

  if (successRate >= 50) {
    summary += `→ 意図を行動に移す力が高いです。これを活かしたquestionを考えてください。\n`;
  } else if (successRate > 0) {
    summary += `→ 意図と行動のギャップに注目。patternsで「intention_action」タイプを検討してください。\n`;
  }

  if (analyses.length > 0) {
    summary += analyses.join('\n');
  }

  return summary;
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
 * AIが利用できない場合でも、ユーザーに価値を提供する
 */
function generateFallbackWeeklyInsight(request: GenerateWeeklyInsightRequest): WeeklyInsightResponse {
  const { entries, remainingYears, weekStartDate, weekEndDate } = request;

  // remainingYearsを適切にフォーマット（小数点以下1桁）
  const formattedYears = Math.round(remainingYears * 10) / 10;

  // 日記から最も内容の充実したエントリーを探す
  let bestGoodEntry: { date: string; content: string } | null = null;
  let bestRegretEntry: { date: string; content: string } | null = null;

  for (const entry of entries) {
    if (entry.goodTime && entry.goodTime.length > (bestGoodEntry?.content.length || 0)) {
      bestGoodEntry = { date: entry.date, content: entry.goodTime };
    }
    if (entry.wastedTime && entry.wastedTime.length > (bestRegretEntry?.content.length || 0)) {
      bestRegretEntry = { date: entry.date, content: entry.wastedTime };
    }
  }

  // 人物が登場しているか確認
  const peoplePattern = /妻|夫|子ども|息子|娘|友人|友達|親|母|父|同僚|家族/g;
  const allGoodTimes = entries.map(e => e.goodTime).join(' ');
  const peopleMatches = allGoodTimes.match(peoplePattern);
  const hasPeopleTheme = peopleMatches && peopleMatches.length > 0;

  // サマリーを生成（時制に注意：「今週」「来週」は使わない）
  let summary: string;
  if (bestGoodEntry) {
    const quote = bestGoodEntry.content.slice(0, 25) + (bestGoodEntry.content.length > 25 ? '...' : '');
    summary = `${weekStartDate.replace(/-/g, '/')}〜${weekEndDate.replace(/-/g, '/')}の1週間、${entries.length}日分の振り返りお疲れさまでした。「${quote}」など、${hasPeopleTheme ? '大切な人との時間' : '充実した時間'}を過ごせた週でしたね。残り約${formattedYears}年の中で、こうした時間を積み重ねていけますように。`;
  } else {
    summary = `${weekStartDate.replace(/-/g, '/')}〜${weekEndDate.replace(/-/g, '/')}の1週間、${entries.length}日分の振り返りお疲れさまでした。毎日自分の時間と向き合うことは、残り約${formattedYears}年をより豊かにするための大切な習慣です。次の週もこの調子で続けていきましょう。`;
  }

  // パターンを生成
  const fallbackPatterns: WeeklyInsightResponse['patterns'] = [];

  // パターン1: 振り返りの習慣
  fallbackPatterns.push({
    type: 'time_awareness',
    title: '振り返りの習慣化',
    description: `この週は${entries.length}日間、自分の時間と向き合えました。この「立ち止まって考える」習慣が、日々の選択を少しずつ変えていきます。継続することで、より充実した時間の使い方が見えてくるはずです。`,
    examples: bestGoodEntry ? [{ date: bestGoodEntry.date, quote: bestGoodEntry.content.slice(0, 40) }] : [{ date: entries[0]?.date || '', quote: '振り返りを続けている' }],
    frequency: entries.length,
  });

  // パターン2: 人との時間（該当する場合）
  if (hasPeopleTheme && peopleMatches) {
    const uniquePeople = [...new Set(peopleMatches)];
    fallbackPatterns.push({
      type: 'relationship',
      title: '人との時間を大切に',
      description: `「良かったこと」に${uniquePeople.join('、')}が登場しています。人との繋がりがあなたの幸せの源泉かもしれませんね。こうした時間を意識的に増やすと、より充実した日々になりそうです。`,
      examples: bestGoodEntry ? [{ date: bestGoodEntry.date, quote: bestGoodEntry.content.slice(0, 40) }] : undefined,
      frequency: peopleMatches.length,
    });
  }

  // パターン3: 成長への気づき（後悔がある場合）
  if (bestRegretEntry && bestRegretEntry.content.length > 5) {
    fallbackPatterns.push({
      type: 'growth_area',
      title: '成長への気づき',
      description: `「${bestRegretEntry.content.slice(0, 20)}${bestRegretEntry.content.length > 20 ? '...' : ''}」など、改善したい点にも目を向けられています。後悔を言葉にできること自体が、変化への第一歩です。`,
      examples: [{ date: bestRegretEntry.date, quote: bestRegretEntry.content.slice(0, 40) }],
    });
  }

  // 問いかけを生成（時制に注意：「来週」は使わない）
  let question: string;
  if (hasPeopleTheme) {
    question = 'この週に会えた人に、次の週も連絡してみませんか？ちょっとしたLINEでも、繋がりは深まります。';
  } else if (bestGoodEntry) {
    question = `この週「良かった」と感じたことを、次の週ももう一度やってみませんか？同じ喜びを再現できるかもしれません。`;
  } else {
    question = '次の週は「これができて良かった」と思える時間を、1つ意識的に作ってみませんか？';
  }

  return {
    summary,
    patterns: fallbackPatterns,
    question,
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
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
              temperature: 0.8, // 創造性と安定性のバランス
              maxOutputTokens: 8192, // 十分な出力枠を確保
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'object',
                properties: {
                  summary: {
                    type: 'string',
                    description: 'この週のハイライトと温かい締め（150-220文字）。対象期間を明記し、日記の言葉を「」で2つ以上引用する'
                  },
                  patterns: {
                    type: 'array',
                    description: '発見したパターン（2-3個）。深い洞察とexamples必須',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['positive_theme', 'growth_area', 'time_awareness', 'relationship', 'self_care', 'intention_action']
                        },
                        title: {
                          type: 'string',
                          description: 'パターンのタイトル（8-15文字）'
                        },
                        description: {
                          type: 'string',
                          description: 'パターンの説明（80-120文字）。日記の言葉を「」で引用し、深い洞察を提供'
                        },
                        examples: {
                          type: 'array',
                          description: '引用例（1-2個、必須）',
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
                      required: ['type', 'title', 'description', 'examples'],
                    },
                  },
                  question: {
                    type: 'string',
                    description: '次の週への具体的なアクション提案（60-100文字）。背景説明 + 「〜してみませんか？」の形式で'
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
        modelVersion: 'gemini-2.5-pro',
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
        modelVersion: 'gemini-2.5-pro',
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
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
