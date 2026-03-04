/**
 * AIリフレクションサービス
 * 日記に対するPivotLogからの気づきを生成
 */

import type { AIReflectionData, AIReflectionDataV1 } from '../../types/aiReflection';
import { isV2Reflection } from '../../types/aiReflection';
import { getAIConfig, AIProvider } from './config';
import {
  REFLECTION_SYSTEM_PROMPT,
  generateUserPrompt,
  parseAIResponse,
  ReflectionPromptParams,
} from './prompts';
import { generateReflectionViaCloudFunctions } from '../firebase/functions';

/**
 * リフレクション生成のリクエストパラメータ
 */
export interface GenerateReflectionRequest {
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
  /** 日記の日付（YYYY-MM-DD形式）- 利用制限チェック用 */
  diaryDate?: string;
  /** 直近の日記データ（Phase 2で追加） */
  recentEntries?: Array<{
    date: string;
    goodTime: string;
    wastedTime: string;
    tomorrow: string;
  }>;
}

/**
 * モックのリフレクション生成（開発用）
 */
const generateMockReflection = async (
  params: ReflectionPromptParams
): Promise<AIReflectionData> => {
  // 本物のAPIっぽく遅延を入れる
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  const { goodTime, wastedTime, tomorrow, remainingYears, remainingDays } = params;

  // 入力内容に基づいてパーソナライズされたレスポンスを生成
  let content: string;
  let question: string;

  // goodTimeが入力されている場合
  if (goodTime.trim()) {
    const keywords = extractKeywords(goodTime);
    if (keywords.includes('家族') || keywords.includes('母') || keywords.includes('父') || keywords.includes('子')) {
      content = `家族との時間を大切にされていますね。「${goodTime.slice(0, 20)}${goodTime.length > 20 ? '...' : ''}」という体験は、かけがえのない思い出になるでしょう。`;
      question = `残り${remainingYears}年の中で、家族と過ごせる時間はどれくらいあるでしょうか。今日の時間を、どう宝物にしますか？`;
    } else if (keywords.includes('仕事') || keywords.includes('会議') || keywords.includes('プロジェクト')) {
      content = `仕事での充実感を感じられたのですね。日々の積み重ねが、あなたのキャリアを形作っています。`;
      question = `その仕事は、あなたの残り${remainingDays.toLocaleString()}日をどう豊かにしてくれていますか？`;
    } else {
      content = `「${goodTime.slice(0, 25)}${goodTime.length > 25 ? '...' : ''}」という体験を大切にされていますね。小さな喜びに気づける心が素敵です。`;
      question = `今日感じたこの喜びを、明日も見つけられるとしたら、どこに目を向けますか？`;
    }
  }
  // wastedTimeが入力されている場合
  else if (wastedTime.trim()) {
    content = `今日の振り返りで、改善したい点に気づかれたのですね。自分に正直に向き合う姿勢が、明日のあなたを変えていきます。`;
    question = `もし今日をもう一度やり直せるとしたら、その時間をどう使いたいですか？`;
  }
  // tomorrowのみ入力されている場合
  else if (tomorrow.trim()) {
    content = `明日への意識を持って今日を終えることは、とても前向きな姿勢ですね。その想いが明日を変えていきます。`;
    question = `明日大切にしたいことを、今日の自分に伝えるとしたら、どんな言葉をかけますか？`;
  }
  // 何も入力されていない場合（通常は到達しない）
  else {
    content = '今日も一日を振り返る時間を取られていますね。この習慣が、あなたの人生をより豊かにしていくでしょう。';
    question = `残り約${remainingYears}年、どんな一日を積み重ねていきたいですか？`;
  }

  return {
    content,
    question,
    generatedAt: new Date().toISOString(),
    modelVersion: 'mock-v1',
  };
};

/**
 * テキストからキーワードを抽出（簡易実装）
 */
const extractKeywords = (text: string): string[] => {
  const keywords = [
    '家族', '母', '父', '子ども', '子', '妻', '夫', '親',
    '仕事', '会議', 'プロジェクト', '上司', '同僚',
    '友人', '友達',
    '健康', '運動', '散歩',
    '読書', '本', '勉強', '学び',
  ];
  return keywords.filter(keyword => text.includes(keyword));
};

/**
 * OpenAI APIを使用してリフレクションを生成
 */
const generateOpenAIReflection = async (
  params: ReflectionPromptParams,
  apiKey: string
): Promise<AIReflectionData> => {
  const userPrompt = generateUserPrompt(params);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: REFLECTION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenAI API returned empty response');
  }

  const parsed = parseAIResponse(content);
  if (!parsed) {
    throw new Error('Failed to parse OpenAI response');
  }

  return {
    ...parsed,
    modelVersion: 'gpt-4o-mini',
  };
};

/**
 * Anthropic (Claude) APIを使用してリフレクションを生成
 */
const generateAnthropicReflection = async (
  params: ReflectionPromptParams,
  apiKey: string
): Promise<AIReflectionData> => {
  const userPrompt = generateUserPrompt(params);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: REFLECTION_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('Anthropic API returned empty response');
  }

  const parsed = parseAIResponse(content);
  if (!parsed) {
    throw new Error('Failed to parse Anthropic response');
  }

  return {
    ...parsed,
    modelVersion: 'claude-3-haiku',
  };
};

/**
 * Google Gemini APIを使用してリフレクションを生成
 */
const generateGeminiReflection = async (
  params: ReflectionPromptParams,
  apiKey: string
): Promise<AIReflectionData> => {
  const userPrompt = generateUserPrompt(params);

  // Gemini用のプロンプト（システムプロンプトとユーザープロンプトを結合）
  const combinedPrompt = `${REFLECTION_SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;

  console.log('[Gemini] Sending request...');
  console.log('[Gemini] API Key exists:', !!apiKey);
  console.log('[Gemini] API Key length:', apiKey?.length);

  // リトライ機能付きでリクエストを送信
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

      console.log(`[Gemini] Response status (attempt ${attempt}):`, response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error(`[Gemini] Error response (attempt ${attempt}):`, error);
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      console.log('[Gemini] Response data:', JSON.stringify(data, null, 2));

      // finishReasonをチェック
      const candidate = data.candidates?.[0];
      const finishReason = candidate?.finishReason;

      if (finishReason && finishReason !== 'STOP') {
        console.warn(`[Gemini] Unexpected finishReason: ${finishReason}`);
        if (finishReason === 'SAFETY' || finishReason === 'MAX_TOKENS') {
          throw new Error(`Generation stopped: ${finishReason}`);
        }
      }

      const content = candidate?.content?.parts?.[0]?.text;

      if (!content) {
        console.error(`[Gemini] Empty content (attempt ${attempt}). Full response:`, data);
        throw new Error('Gemini API returned empty response');
      }

      console.log('[Gemini] Full content received:', content);
      console.log('[Gemini] Content length:', content.length);

      const parsed = parseAIResponse(content);
      console.log('[Gemini] Parsed result:', parsed);

      if (!parsed) {
        console.log('[Gemini] Failed to parse response, using raw content');
        // パース失敗時は、AIの生テキストをそのまま使用してみる
        const displayContent = content
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/gi, '')
          .replace(/^\s*\{\s*"content"\s*:\s*"/i, '')
          .replace(/"\s*,\s*"question"[\s\S]*/i, '')
          .slice(0, 200);

        return {
          content: displayContent || content.slice(0, 200),
          question: '今日の日記を振り返って、何か気づいたことはありますか？',
          generatedAt: new Date().toISOString(),
          modelVersion: 'gemini-2.0-flash-raw',
        };
      }

      // 回答が途中で切れていないかチェック（V1形式の場合）
      if (!isV2Reflection(parsed)) {
        const v1Parsed = parsed as AIReflectionDataV1;
        if (v1Parsed.content.length < 30 || v1Parsed.question.length < 10) {
          console.warn('[Gemini] Response seems too short, retrying...');
          console.warn('  content length:', v1Parsed.content.length);
          console.warn('  question length:', v1Parsed.question.length);
          throw new Error('Response too short');
        }
      }

      return {
        ...parsed,
        modelVersion: 'gemini-2.0-flash',
      };
    } catch (retryError) {
      lastError = retryError instanceof Error ? retryError : new Error(String(retryError));
      console.error(`[Gemini] Attempt ${attempt} failed:`, lastError.message);

      // 最後の試行でなければ少し待ってリトライ
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // すべてのリトライが失敗した場合
  throw lastError || new Error('All retries failed');
};

/**
 * Cloud Functions経由でリフレクションを生成
 * 本番環境で使用（APIキーはサーバーサイドで安全に管理）
 */
const generateCloudFunctionsReflection = async (
  params: ReflectionPromptParams & { diaryDate?: string }
): Promise<AIReflectionData> => {
  console.log('[Cloud Functions] Calling generateReflection');

  const response = await generateReflectionViaCloudFunctions({
    goodTime: params.goodTime,
    wastedTime: params.wastedTime,
    tomorrow: params.tomorrow,
    currentAge: params.currentAge,
    remainingYears: params.remainingYears,
    remainingDays: params.remainingDays,
    diaryDate: params.diaryDate,
    recentEntries: params.recentEntries, // Phase 2
  });

  // V2形式の場合（schemaVersion === 2 && understanding が存在）
  if (response.schemaVersion === 2 && response.understanding) {
    console.log('[Cloud Functions] V2 format detected');
    return {
      understanding: response.understanding,
      ...(response.perspective && { perspective: response.perspective }),
      ...(response.tomorrow && { tomorrow: response.tomorrow }),
      generatedAt: response.generatedAt,
      modelVersion: response.modelVersion,
      schemaVersion: 2,
    };
  }

  // V1形式の場合（後方互換）
  console.log('[Cloud Functions] V1 format detected');
  // undefinedの場合はFirestore保存時にエラーになるため、条件付きスプレッドを使用
  return {
    content: response.content || '',
    question: response.question || '',
    generatedAt: response.generatedAt,
    modelVersion: response.modelVersion,
    // 拡張フィールドを渡す（Phase 1）- undefinedの場合は含めない
    ...(response.emotionInsight && { emotionInsight: response.emotionInsight }),
    ...(response.lifeContext && { lifeContext: response.lifeContext }),
    ...(response.actionSuggestion && { actionSuggestion: response.actionSuggestion }),
    // Phase 2 - undefinedの場合は含めない
    ...(response.continuity && { continuity: response.continuity }),
  };
};

/**
 * プロバイダーに応じてリフレクションを生成
 */
const generateByProvider = async (
  provider: AIProvider,
  params: ReflectionPromptParams & { diaryDate?: string },
  apiKey?: string
): Promise<AIReflectionData> => {
  switch (provider) {
    case 'cloud-functions':
      return generateCloudFunctionsReflection(params);

    case 'openai':
      if (!apiKey) throw new Error('OpenAI API key is required');
      return generateOpenAIReflection(params, apiKey);

    case 'anthropic':
      if (!apiKey) throw new Error('Anthropic API key is required');
      return generateAnthropicReflection(params, apiKey);

    case 'gemini':
      if (!apiKey) throw new Error('Gemini API key is required');
      return generateGeminiReflection(params, apiKey);

    case 'mock':
    default:
      return generateMockReflection(params);
  }
};

/**
 * AIリフレクションを生成するメイン関数
 *
 * 本番環境: Cloud Functions経由でGemini APIを呼び出し
 * 開発環境: 設定に応じてCloud Functionsまたは直接APIを呼び出し
 */
export const generateReflection = async (
  request: GenerateReflectionRequest
): Promise<AIReflectionData> => {
  const config = getAIConfig();

  // デバッグ: 使用するプロバイダーをログ出力
  console.log('[AI Reflection] Provider:', config.provider);

  const params: ReflectionPromptParams & { diaryDate?: string } = {
    goodTime: request.goodTime,
    wastedTime: request.wastedTime,
    tomorrow: request.tomorrow,
    currentAge: request.currentAge,
    remainingYears: request.remainingYears,
    remainingDays: request.remainingDays,
    diaryDate: request.diaryDate,
    recentEntries: request.recentEntries, // Phase 2
  };

  try {
    let apiKey: string | undefined;

    switch (config.provider) {
      case 'openai':
        apiKey = config.openaiApiKey;
        break;
      case 'anthropic':
        apiKey = config.anthropicApiKey;
        break;
      case 'gemini':
        apiKey = config.geminiApiKey;
        break;
      // cloud-functions と mock は apiKey 不要
    }

    const result = await generateByProvider(config.provider, params, apiKey);
    console.log('[AI Reflection] Success! Model version:', result.modelVersion);
    return result;
  } catch (error) {
    console.error('AI reflection generation failed:', error);
    throw error; // すべてのエラーをそのままスロー（構造を保持）
  }
};
