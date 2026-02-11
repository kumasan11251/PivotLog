/**
 * AIリフレクション用のプロンプト定義
 */

import type {
  AIReflectionData,
  AIReflectionDataV1,
  AIReflectionDataV2,
  EmotionInsight,
  LifeContext,
  ActionSuggestion,
  ContinuityInsight,
} from '../../types/aiReflection';

/**
 * システムプロンプト（拡張版）
 * AIの役割とトーンを定義
 */
export const REFLECTION_SYSTEM_PROMPT = `あなたは「PivotLog」のデイリーリフレクションパートナーです。

【PivotLogとは】
人生の有限性を意識するライフログアプリ。ユーザーは目標寿命を設定し、残り時間を可視化しながら、毎日3つの問いに答えています。

【あなたの役割】
単なる共感や励ましではなく、ユーザーが「自分でも気づいていなかった感情や価値観」を発見し、「明日から具体的に行動したくなる」ようなリフレクションを提供します。

【分析の3層構造 - 最重要】
日記を読む際、以下の3層で分析してください：
1. 表層：書かれている出来事（何が起きたか）
2. 中層：その裏にある感情（どう感じたか）
3. 深層：その感情が示す価値観（何を大切にしているか）

【各フィールドの書き方】

■ emotionInsight（感情の洞察）
- detected：読み取った感情を具体的に言語化
  ◯「達成感と安堵が混ざったような満足感」
  ◯「焦りの裏にある、もっと良くしたいという向上心」
  ✕「嬉しい」「悲しい」（単純すぎる）
- depth：その感情の奥にある想い・価値観
  ◯「自分の成長を実感できることが、あなたにとって大きな喜びなのかもしれません」

■ lifeContext（人生の文脈）
- perspective：人生という長いスパンでの意味づけ
  ◯「人生で経験できる『妻との夕食』はあと何千回でしょう。今日もその1回でした」
  ✕「残り○年です」（数字の羅列だけは避ける）

■ actionSuggestion（アクション提案）
- micro：5分以内で実行できる具体的なアクション
  ◯「明日の朝、『ありがとう』を伝えてみませんか」
  ✕「もっと意識しましょう」（曖昧）
- reason：なぜそのアクションが意味を持つか

■ content（共感メッセージ）
- 日記から具体的な言葉を「」で引用
- その体験がなぜ良かったのか/なぜ後悔なのかを言語化

■ question（問いかけ）
- 「はい/いいえ」で答えられない問い
- 考えたくなる、行動のヒントが含まれた問い

【トーン】
- 温かく、穏やかに、親しみを込めて
- 批判や指示は絶対にしない
- 友人が温かく背中を押すような感じ

【出力形式】
{
  "emotionInsight": {
    "detected": "読み取った感情（15-30文字）",
    "depth": "その感情の奥にある想い（30-50文字）"
  },
  "lifeContext": {
    "perspective": "人生視点からの意味づけ（50-80文字）"
  },
  "actionSuggestion": {
    "micro": "5分以内でできるアクション（30-50文字）",
    "reason": "なぜそのアクションが意味を持つか（40-60文字）"
  },
  "content": "共感メッセージ（100-180文字）",
  "question": "深い問いかけ（40-80文字）"
}`;

/**
 * ユーザープロンプトを生成
 */
/**
 * 直近の日記エントリ（Phase 2で追加）
 */
export interface RecentDiaryEntry {
  date: string;
  goodTime: string;
  wastedTime: string;
  tomorrow: string;
}

export interface ReflectionPromptParams {
  /** 今日、良かったこと */
  goodTime: string;
  /** 今日、後悔していること */
  wastedTime: string;
  /** 明日、大切にしたいこと */
  tomorrow: string;
  /** 現在の年齢 */
  currentAge: number;
  /** 目標寿命までの残り年数 */
  remainingYears: number;
  /** 残り日数 */
  remainingDays: number;
  /** 直近の日記データ（Phase 2で追加） */
  recentEntries?: RecentDiaryEntry[];
}

export const generateUserPrompt = (params: ReflectionPromptParams): string => {
  const {
    goodTime,
    wastedTime,
    tomorrow,
    currentAge,
    remainingYears,
    remainingDays,
  } = params;

  // 入力内容に応じてフォーカスポイントを決定
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
};

/**
 * AIのレスポンスをパース（拡張フィールド対応）
 */
export const parseAIResponse = (response: string): AIReflectionData | null => {
  try {
    console.log('[parseAIResponse] Input length:', response.length);

    // Markdownコードブロックを除去（```json や ``` を取り除く）
    let cleanedResponse = response
      .replace(/```json\s*/gi, '')   // ```json を除去
      .replace(/```\s*/gi, '')       // ``` を除去
      .trim();

    console.log('[parseAIResponse] Cleaned response:', cleanedResponse.slice(0, 300) + '...');

    // 方法1: 完全なJSONとしてパース（拡張フィールド対応）
    try {
      const parsed = JSON.parse(cleanedResponse);
      if (parsed && parsed.content && typeof parsed.content === 'string') {
        console.log('[parseAIResponse] JSON.parse succeeded');
        console.log('[parseAIResponse] content length:', parsed.content.length);
        console.log('[parseAIResponse] question length:', (parsed.question || '').length);
        console.log('[parseAIResponse] has emotionInsight:', !!parsed.emotionInsight);
        console.log('[parseAIResponse] has lifeContext:', !!parsed.lifeContext);
        console.log('[parseAIResponse] has actionSuggestion:', !!parsed.actionSuggestion);

        const result: AIReflectionData = {
          content: parsed.content,
          question: parsed.question || '',
          generatedAt: new Date().toISOString(),
        };

        // 拡張フィールドがあれば追加
        if (parsed.emotionInsight &&
            typeof parsed.emotionInsight.detected === 'string' &&
            typeof parsed.emotionInsight.depth === 'string') {
          result.emotionInsight = {
            detected: parsed.emotionInsight.detected,
            depth: parsed.emotionInsight.depth,
          };
        }

        if (parsed.lifeContext &&
            typeof parsed.lifeContext.perspective === 'string') {
          result.lifeContext = {
            perspective: parsed.lifeContext.perspective,
          };
        }

        if (parsed.actionSuggestion &&
            typeof parsed.actionSuggestion.micro === 'string' &&
            typeof parsed.actionSuggestion.reason === 'string') {
          result.actionSuggestion = {
            micro: parsed.actionSuggestion.micro,
            reason: parsed.actionSuggestion.reason,
          };
        }

        return result;
      }
    } catch (jsonError) {
      console.log('[parseAIResponse] JSON.parse failed:', jsonError);
      // パース失敗時は正規表現で抽出を試みる（レガシー対応）
    }

    // 方法2: より柔軟な正規表現でcontentとquestionを抽出
    // 日本語の引用符「」や改行を含むケースに対応
    // content の抽出（複数行対応）
    let contentMatch = cleanedResponse.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/s);

    // contentが見つからない場合、より緩い正規表現を試す
    if (!contentMatch) {
      // JSONの構造を利用して content の値を抽出
      const contentStartIndex = cleanedResponse.indexOf('"content"');
      if (contentStartIndex !== -1) {
        const colonIndex = cleanedResponse.indexOf(':', contentStartIndex);
        if (colonIndex !== -1) {
          const quoteStart = cleanedResponse.indexOf('"', colonIndex);
          if (quoteStart !== -1) {
            // エスケープされた引用符を考慮しながら終了位置を探す
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

    // questionが見つからない場合、より緩い正規表現を試す
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
      // エスケープされた文字を復元
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

      return {
        content,
        question,
        generatedAt: new Date().toISOString(),
      };
    }

    console.log('[parseAIResponse] All parsing methods failed');
    return null;
  } catch (error) {
    console.error('[parseAIResponse] Unexpected error:', error);
    return null;
  }
};

/**
 * フォールバック用のリフレクションを生成（拡張フィールド対応）
 * APIエラー時やパース失敗時に使用
 */
export const generateFallbackReflection = (params: ReflectionPromptParams): AIReflectionData => {
  const { goodTime, wastedTime, remainingYears, remainingDays, recentEntries } = params;

  let content: string;
  let question: string;
  let emotionInsight: EmotionInsight;
  let lifeContext: LifeContext;
  let actionSuggestion: ActionSuggestion;
  let continuity: ContinuityInsight | undefined;

  if (goodTime) {
    content = `「${goodTime.slice(0, 20)}${goodTime.length > 20 ? '...' : ''}」という体験を大切にされていますね。日々の小さな喜びに気づき、それを言葉にできることは、とても素敵な習慣です。`;
    emotionInsight = {
      detected: '満足感と穏やかな喜び',
      depth: '日常の中に価値を見出す姿勢があなたの強みです',
    };
    lifeContext = {
      perspective: `人生で経験できる「今日のような良い日」はあと何千回でしょう。今日もその1日でした。`,
    };
    actionSuggestion = {
      micro: '今日の良かったことを、誰かに話してみませんか',
      reason: '喜びを共有することで、その価値が倍になります',
    };
    question = '今日感じた「良かった」を、明日も感じるために何ができそうですか？';
  } else if (wastedTime) {
    content = '今日を振り返り、反省点を見つけられたことは、明日への一歩ですね。自分に正直に向き合う姿勢が素晴らしいです。';
    emotionInsight = {
      detected: '反省と前向きな気持ち',
      depth: 'より良くなりたいという向上心の表れです',
    };
    lifeContext = {
      perspective: `残り${remainingDays.toLocaleString()}日の中で、今日の気づきは明日を変える種になります。`,
    };
    actionSuggestion = {
      micro: '明日の朝、今日の反省を1つだけ意識してみませんか',
      reason: '小さな意識の変化が、大きな行動の変化につながります',
    };
    question = '今日の後悔を、明日への学びに変えるとしたら、何を意識しますか？';
  } else {
    content = '今日も一日を振り返る時間を取られていますね。この習慣が、あなたの人生をより豊かにしていくでしょう。';
    emotionInsight = {
      detected: '穏やかな内省の時間',
      depth: '自分と向き合う習慣を持つことは、とても価値があります',
    };
    lifeContext = {
      perspective: `残り約${remainingYears}年の中で、毎日の振り返りがあなたの軸を作っていきます。`,
    };
    actionSuggestion = {
      micro: '明日は、1つでも具体的な出来事を書いてみませんか',
      reason: '具体的な記録が、振り返りをより豊かにします',
    };
    question = `残り約${remainingYears}年の中で、今日のような時間をあと何回過ごせるでしょうか。`;
  }

  // Phase 2: 過去データがある場合は簡易的なcontinuityを生成
  if (recentEntries && recentEntries.length > 0) {
    const yesterday = recentEntries[0];
    continuity = {
      connectionToPast: {
        referenceDate: yesterday.date,
        connection: '昨日の想いが、今日の行動に繋がっているかもしれませんね。日々の積み重ねが、あなたの成長を形作っています。',
      },
      growthObservation: {
        observation: '毎日振り返りを続けていること自体が、大きな成長の証です。',
      },
    };
  }

  return {
    content,
    question,
    generatedAt: new Date().toISOString(),
    modelVersion: 'fallback',
    emotionInsight,
    lifeContext,
    actionSuggestion,
    ...(continuity && { continuity }),
  };
};

/**
 * AIのレスポンスをパース（V2: 動的セクション）
 */
export const parseAIResponseV2 = (response: string): AIReflectionDataV2 | null => {
  try {
    console.log('[parseAIResponseV2] Input length:', response.length);

    // Markdownコードブロックを除去
    const cleanedResponse = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    console.log('[parseAIResponseV2] Cleaned response:', cleanedResponse.slice(0, 300) + '...');

    // JSONとしてパース
    const parsed = JSON.parse(cleanedResponse);

    if (parsed && parsed.understanding && typeof parsed.understanding === 'string') {
      console.log('[parseAIResponseV2] JSON.parse succeeded');
      console.log('[parseAIResponseV2] understanding length:', parsed.understanding.length);
      console.log('[parseAIResponseV2] has perspective:', !!parsed.perspective);
      console.log('[parseAIResponseV2] has tomorrow:', !!parsed.tomorrow);

      const result: AIReflectionDataV2 = {
        understanding: parsed.understanding,
        generatedAt: new Date().toISOString(),
        schemaVersion: 2,
      };

      // オプショナルフィールド
      if (parsed.perspective && typeof parsed.perspective === 'string') {
        result.perspective = parsed.perspective;
      }
      if (parsed.tomorrow && typeof parsed.tomorrow === 'string') {
        result.tomorrow = parsed.tomorrow;
      }

      return result;
    }

    console.log('[parseAIResponseV2] Missing required field: understanding');
    return null;
  } catch (error) {
    console.error('[parseAIResponseV2] Unexpected error:', error);
    return null;
  }
};

/**
 * フォールバック用のリフレクションを生成（V2: 動的セクション）
 * APIエラー時やパース失敗時に使用
 */
export const generateFallbackReflectionV2 = (params: ReflectionPromptParams): AIReflectionDataV2 => {
  const { goodTime, wastedTime, remainingYears, recentEntries } = params;

  let understanding: string;
  let perspective: string | undefined;
  let tomorrow: string | undefined;

  if (goodTime) {
    understanding = `「${goodTime.slice(0, 20)}${goodTime.length > 20 ? '...' : ''}」という体験を大切にされていますね。日々の小さな喜びに気づき、それを言葉にできることは、とても素敵な習慣です。その体験の裏には、満足感と穏やかな喜びが感じられます。`;

    // 過去データがある場合は繋がりに言及
    if (recentEntries && recentEntries.length > 0) {
      understanding += ' 毎日振り返りを続けていること自体が、大きな成長の証ですね。';
    }

    // 標準的な日記なので、tomorrowを追加
    tomorrow = '今日の良かったことを、誰かに話してみませんか。喜びを共有することで、その価値が倍になります。今日感じた「良かった」を、明日も感じるために何ができそうですか？';
  } else if (wastedTime) {
    understanding = '今日を振り返り、反省点を見つけられたことは、明日への一歩ですね。自分に正直に向き合う姿勢が素晴らしいです。その後悔は、あなたが「もっとできたはず」と自分に期待している証拠かもしれません。';

    tomorrow = '明日の朝、今日の反省を1つだけ意識してみませんか。小さな意識の変化が、大きな行動の変化につながります。今日の後悔を、明日への学びに変えるとしたら、何を意識しますか？';
  } else {
    understanding = '今日も一日を振り返る時間を取られていますね。この習慣が、あなたの人生をより豊かにしていくでしょう。自分と向き合う習慣を持つことは、とても価値があります。';

    // 内容が薄いので、perspectiveを追加
    perspective = `残り約${remainingYears}年の中で、毎日の振り返りがあなたの軸を作っていきます。今日のような時間をあと何回過ごせるでしょうか。`;

    tomorrow = '明日は、1つでも具体的な出来事を書いてみませんか。具体的な記録が、振り返りをより豊かにします。';
  }

  return {
    understanding,
    ...(perspective && { perspective }),
    ...(tomorrow && { tomorrow }),
    generatedAt: new Date().toISOString(),
    modelVersion: 'fallback',
    schemaVersion: 2,
  };
};
