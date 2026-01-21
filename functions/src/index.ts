/**
 * Firebase Cloud Functions - AIリフレクションサービス
 *
 * Gemini APIをサーバーサイドで安全に呼び出すためのエンドポイント
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// Gemini APIキーをシークレットとして定義
const geminiApiKey = defineSecret('GEMINI_API_KEY');

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
interface GenerateReflectionRequest {
  goodTime: string;
  wastedTime: string;
  tomorrow: string;
  currentAge: number;
  remainingYears: number;
  remainingDays: number;
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
    // Markdownコードブロックを除去
    const cleanedResponse = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // JSONとしてパース
    try {
      const parsed = JSON.parse(cleanedResponse);
      if (parsed && parsed.content) {
        return {
          content: parsed.content,
          question: parsed.question || '',
        };
      }
    } catch {
      // パース失敗時は正規表現で抽出
    }

    // 正規表現でcontentとquestionを抽出
    const contentMatch = cleanedResponse.match(/"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    const questionMatch = cleanedResponse.match(/"question"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);

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

      return { content, question };
    }

    return null;
  } catch {
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

    const apiKey = geminiApiKey.value();

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      // APIキーがない場合はフォールバックを返す
      return generateFallbackReflection(data);
    }

    try {
      const userPrompt = generateUserPrompt(data);
      const combinedPrompt = `${REFLECTION_SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;

      console.log('[generateReflection] Calling Gemini API...');

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
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'object',
                properties: {
                  content: { type: 'string' },
                  question: { type: 'string' },
                },
                required: ['content', 'question'],
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[generateReflection] Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const responseData = await response.json();
      const content = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        console.error('[generateReflection] Empty response from Gemini');
        return generateFallbackReflection(data);
      }

      const parsed = parseAIResponse(content);

      if (!parsed) {
        console.error('[generateReflection] Failed to parse response:', content);
        return generateFallbackReflection(data);
      }

      const result: ReflectionResponse = {
        content: parsed.content,
        question: parsed.question,
        generatedAt: new Date().toISOString(),
        modelVersion: 'gemini-2.5-flash',
      };

      console.log('[generateReflection] Success');
      return result;
    } catch (error) {
      console.error('[generateReflection] Error:', error);

      // エラー時はフォールバックを返す（ユーザー体験を損なわないため）
      return generateFallbackReflection(data);
    }
  }
);
