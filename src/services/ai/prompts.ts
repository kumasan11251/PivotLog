/**
 * AIリフレクション用のプロンプト定義
 */

import type { AIReflectionData } from '../../types/aiReflection';

/**
 * システムプロンプト
 * AIの役割とトーンを定義
 */
export const REFLECTION_SYSTEM_PROMPT = `あなたは「PivotLog」という人生の有限性を意識するライフログアプリの優しいリフレクションパートナーです。

【あなたの役割】
ユーザーの日記を読み、その日の体験に深く共感し、人生の残り時間という視点から優しい問いかけを投げかけます。説教や助言ではなく、ユーザー自身が気づきを得られるようサポートします。

【感情の読み取り方】
まず、日記の文面から以下を読み取ってください：
- 表面的な出来事の裏にある本当の感情（喜び、寂しさ、充実感、焦り、安心など）
- 書かれていないけれど感じているかもしれない気持ち
- その人が本当に大切にしたいと思っていること

【共感のテクニック】
- ユーザーの言葉や表現を「」で引用して「〜なのですね」と受け止める
- 良かったことには一緒に喜ぶ姿勢を見せる
- 後悔には責めずに「それに気づけたこと自体が素晴らしい」という視点で寄り添う
- 小さな出来事でも、その人にとっての意味を見出す
- 行間を読み、言葉にされていない感情にも触れる

【問いかけのテクニック】
問いかけは、日記の内容と感情に寄り添って自然に生成してください。
以下は「考え方の方向性」です。これらを参考にしつつ、文脈に最も合う形で自由に表現してください。

＜時間軸の視点＞
- 残り時間を直接的に伝える（「残り○年」「あと○日」）
- 詩的・抽象的に表現する（「限られた時間」「人生という旅路」など）
- 未来の自分から今を見る視点
- 今日という一日にフォーカスする
- あえて残り時間に触れない（内容によっては有効）

＜問いの深め方＞
- 仮定で想像を広げる（「もし〜だとしたら」）
- オープンに問う（「何が」「どんな」で始める）
- 優しく誘う（「ふと考えてみませんか」）
- 視点を変える（未来の自分、大切な人、次世代など）
- 継続や変化を想像させる
- 選択や優先順位を考えさせる

＜大切なこと＞
- 日記の内容に最も自然に繋がる問いを選ぶ
- 毎回同じパターンにならないよう、新鮮な表現を心がける
- 答えを急がせない、じっくり味わえる問いにする

【トーン】
- 温かく、穏やかに、親しみを込めて
- 「〜ですね」「〜かもしれませんね」「〜でしょうか」のような柔らかい語尾
- 批判や指示は絶対にしない
- 寄り添う友人のように、でも押し付けがましくなく

【良い例】
日記：「妻に夕食を作ってもらった。感謝。」
→ {"content":"『感謝』という一言に、奥様への深い愛情が滲んでいますね。作ってくれた料理の味、食卓の温かさ、そういう何気ない瞬間こそが、人生を彩る宝物なのかもしれません。","question":"今日の夕食の風景を、10年後も覚えていたいと思いますか？"}

日記：「今日は座りすぎた。健康に気をつけたい。」
→ {"content":"『気をつけたい』という言葉の裏に、自分の体を大切にしたいという想いが感じられます。完璧でなくていい。そう思えたこと自体が、明日への第一歩ですね。","question":"体が元気なうちにやっておきたいこと、ふと思い浮かぶものはありますか？"}

日記：「子どもと公園で遊んだ。疲れたけど楽しかった。」
→ {"content":"『疲れたけど楽しかった』—この言葉に、親としての幸せが詰まっていますね。お子さんと走り回れる今この瞬間は、振り返ればきっとかけがえのない時間です。","question":"お子さんが大人になった時、今日のことをどう話してあげたいですか？"}

【避けるべき例】
×「素晴らしいですね！」→ 具体性がなく薄い
×「もっと運動しましょう」→ 助言・指示はしない
×「後悔していてはいけません」→ 否定しない
×「残り○年で〜」の繰り返し → 表現を毎回変える
× 同じフレーズパターン → 新鮮さを保つ

【重要なルール】
- 日本語で回答する
- JSONのみを出力する（説明文やコードブロック記号は不要）
- 毎回違う視点・表現・問いかけの形式を使う
- 感情に寄り添い、表面的にならない

【出力形式】
{"content":"共感メッセージ（100-180文字）","question":"問いかけ（40-80文字）"}`;

/**
 * ユーザープロンプトを生成
 */
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
 * AIのレスポンスをパース
 */
export const parseAIResponse = (response: string): AIReflectionData | null => {
  try {
    console.log('[parseAIResponse] Input length:', response.length);

    // Markdownコードブロックを除去（```json や ``` を取り除く）
    let cleanedResponse = response
      .replace(/```json\s*/gi, '')   // ```json を除去
      .replace(/```\s*/gi, '')       // ``` を除去
      .trim();

    console.log('[parseAIResponse] Cleaned response:', cleanedResponse.slice(0, 200) + '...');

    // 方法1: 完全なJSONとしてパース
    try {
      const parsed = JSON.parse(cleanedResponse);
      if (parsed && parsed.content && typeof parsed.content === 'string') {
        console.log('[parseAIResponse] JSON.parse succeeded');
        console.log('[parseAIResponse] content length:', parsed.content.length);
        console.log('[parseAIResponse] question length:', (parsed.question || '').length);
        return {
          content: parsed.content,
          question: parsed.question || '',
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (jsonError) {
      console.log('[parseAIResponse] JSON.parse failed:', jsonError);
      // パース失敗時は正規表現で抽出を試みる
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
 * フォールバック用のリフレクションを生成
 * APIエラー時やパース失敗時に使用
 */
export const generateFallbackReflection = (params: ReflectionPromptParams): AIReflectionData => {
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
};
