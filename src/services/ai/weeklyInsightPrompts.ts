/**
 * 週次インサイト用AIプロンプト
 */

import type { GenerateWeeklyInsightRequest, InsightPatternType } from '../../types/weeklyInsight';

/**
 * 週次インサイト生成用システムプロンプト
 * ※実際のAI呼び出しはCloud Functionsで行うため、このファイルは参照用
 */
export const WEEKLY_INSIGHT_SYSTEM_PROMPT = `あなたは「PivotLog」という人生の有限性を意識するライフログアプリの週次レポートアナリストです。

【あなたの役割】
1週間分の日記を深く読み込み、ユーザー自身も気づいていない「時間の使い方のパターン」を発見し、自己理解を深めるインサイトを提供します。
表面的な要約ではなく、「なぜその時間が良かったのか」「何が繰り返されているか」を掘り下げてください。

【分析の視点】
1. 喜びの源泉を特定する（人・活動・場所・達成感など）
2. 後悔のパターンを発見する（繰り返される後悔、その裏にある本当の願い）
3. 意図と行動のギャップを見つける
4. 時間の質への気づき
5. 人間関係の傾向

【分析のルール】
- 日記の具体的な言葉を「」で必ず引用する
- 最低2つ、最大4つのパターンを抽出
- 1回しか出てこないものはパターンとしない
- 批判は絶対にしない。すべては「気づき」として提示

【サマリーの書き方】
- 最も顕著な傾向を指摘
- その傾向から見える意味や価値に言及
- ユーザーの1週間を温かく労う

【問いかけの書き方】
- 分析から自然に導かれる問い
- 1週間以内に実行できる具体的なアクション
- 「〜してみませんか？」の柔らかい提案

【パターンタイプ】
- positive_theme: ポジティブなテーマ
- growth_area: 成長の機会
- time_awareness: 時間の使い方への気づき
- relationship: 人間関係に関する気づき
- self_care: セルフケアに関する気づき
- work_life: 仕事・ライフバランス
- intention_action: 意図と行動の関係

【出力形式】
{
  "summary": "週全体のサマリー（100-200文字）",
  "patterns": [
    {
      "type": "パターンタイプ",
      "title": "タイトル（10-15文字）",
      "description": "説明（50-100文字）具体的な引用を含める",
      "examples": [{"date": "YYYY-MM-DD", "quote": "引用"}],
      "frequency": 出現回数
    }
  ],
  "question": "来週への問いかけ（40-80文字）"
}`;

/**
 * 週次インサイト用ユーザープロンプトを生成
 */
export function generateWeeklyInsightUserPrompt(request: GenerateWeeklyInsightRequest): string {
  const { entries, currentAge, remainingYears, remainingDays, weekStartDate, weekEndDate } = request;

  // 日記エントリーを整形
  const entriesText = entries
    .map((entry) => {
      return `【${entry.date}】
✨ 良かったこと: ${entry.goodTime || '（記入なし）'}
💭 後悔していること: ${entry.wastedTime || '（記入なし）'}
🌅 明日大切にしたいこと: ${entry.tomorrow || '（記入なし）'}`;
    })
    .join('\n\n');

  return `【ユーザー情報】
${currentAge}歳。目標寿命まで残り約${remainingYears}年（${remainingDays.toLocaleString()}日）。

【分析期間】
${weekStartDate} 〜 ${weekEndDate}（${entries.length}日分の記録）

【この週の日記】
${entriesText}

【分析してください】
上記の1週間分の日記から、ユーザーの時間の使い方の傾向を分析し、自己理解を深めるインサイトを提供してください。
残り${remainingYears}年という人生の文脈で、この1週間がどんな意味を持つか考慮してください。`;
}

/**
 * AIレスポンスをパース
 */
export function parseWeeklyInsightResponse(response: string): {
  summary: string;
  patterns: Array<{
    type: InsightPatternType;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
    frequency?: number;
  }>;
  question: string;
} | null {
  try {
    // Markdownコードブロックを除去
    const cleanedResponse = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    if (parsed && parsed.summary && Array.isArray(parsed.patterns)) {
      return {
        summary: parsed.summary,
        patterns: parsed.patterns.map((p: Record<string, unknown>) => ({
          type: p.type as InsightPatternType || 'positive_theme',
          title: String(p.title || ''),
          description: String(p.description || ''),
          examples: Array.isArray(p.examples) ? p.examples : undefined,
          frequency: typeof p.frequency === 'number' ? p.frequency : undefined,
        })),
        question: parsed.question || '',
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * フォールバック用の週次インサイトを生成
 */
export function generateFallbackWeeklyInsight(request: GenerateWeeklyInsightRequest): {
  summary: string;
  patterns: Array<{
    type: InsightPatternType;
    title: string;
    description: string;
  }>;
  question: string;
} {
  const { entries, remainingYears } = request;

  return {
    summary: `今週は${entries.length}日分の記録がありました。日々の振り返りを続けていることは、残り${remainingYears}年をより豊かに過ごすための大切な習慣ですね。`,
    patterns: [
      {
        type: 'time_awareness',
        title: '振り返りの習慣',
        description: `${entries.length}日間、自分の時間と向き合う時間を取れていますね。この継続が未来を変えていきます。`,
      },
    ],
    question: '来週は、どんな時間を増やしたいですか？',
  };
}
