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
