import { PERSPECTIVE_MESSAGES, type PerspectiveMessage } from '../constants/perspectives';

/**
 * メッセージ選択時に渡すコンテキスト情報
 */
export interface MessageContext {
  /** 曜日（0=日, 1=月, ..., 6=土）。未指定時は現在日時から自動計算 */
  dayOfWeek?: number;
  /** 連続記録日数 */
  streakDays?: number;
  /** 今日の日記を記入済みか */
  hasTodayEntry?: boolean;
}

/**
 * カテゴリ別の選択重み
 * action は毎日出ると圧迫感があるため低めに設定
 */
const CATEGORY_WEIGHTS: Record<string, number> = {
  countdown: 2,
  reframe: 2,
  reflection: 2,
  wisdom: 2,
  awareness: 2,
  gratitude: 2,
  action: 1,
};

/**
 * 日付ベースでシード値を生成（同じ日は同じ値）
 */
const getDailySeed = (): number => {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

/**
 * 任意の日付からシード値を生成
 */
const getSeedForDate = (date: Date): number => {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
};

/**
 * シード値から疑似乱数を生成（決定論的）
 * Mulberry32アルゴリズム（高品質な32bit PRNG）
 */
const seededRandom = (seed: number): number => {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

/**
 * シードからN番目の乱数を生成（連続呼び出し用）
 */
const seededRandomN = (seed: number, n: number): number => {
  return seededRandom(seed + n * 0x9E3779B9);
};

/**
 * メッセージが現在の条件で表示可能かチェック
 *
 * 条件が未指定のメッセージは通年表示。
 * contextが提供されない場合、streakRange/hasTodayEntry条件を持つメッセージは非表示。
 */
const isMessageDisplayable = (
  message: PerspectiveMessage,
  currentMonth: number,
  birthdayMonth?: number,
  context?: MessageContext
): boolean => {
  const condition = message.displayCondition;

  // 条件がなければ通年表示
  if (!condition) {
    return true;
  }

  // 誕生日月条件
  if (condition.requiresBirthday) {
    if (!birthdayMonth) {
      return false;
    }
    return currentMonth === birthdayMonth;
  }

  // 表示月条件
  if (condition.displayMonths && condition.displayMonths.length > 0) {
    if (!condition.displayMonths.includes(currentMonth)) {
      return false;
    }
  }

  // 曜日条件
  if (condition.dayOfWeek && condition.dayOfWeek.length > 0) {
    const currentDayOfWeek = context?.dayOfWeek ?? new Date().getDay();
    if (!condition.dayOfWeek.includes(currentDayOfWeek)) {
      return false;
    }
  }

  // ストリーク条件（contextなしの場合はスキップ）
  if (condition.streakRange !== undefined) {
    if (context?.streakDays === undefined) {
      return false; // ストリーク情報がなければ表示しない
    }
    const streak = context.streakDays;
    if (condition.streakRange.min !== undefined && streak < condition.streakRange.min) {
      return false;
    }
    if (condition.streakRange.max !== undefined && streak > condition.streakRange.max) {
      return false;
    }
  }

  // 日記記入状態条件（contextなしの場合はスキップ）
  if (condition.hasTodayEntry !== undefined) {
    if (context?.hasTodayEntry === undefined) {
      return false; // 記入状態が不明なら表示しない
    }
    if (condition.hasTodayEntry !== context.hasTodayEntry) {
      return false;
    }
  }

  return true;
};

/**
 * 表示可能なメッセージをフィルタリングし、カテゴリ別にグループ化
 */
const getDisplayableMessagesByCategory = (
  currentMonth: number,
  birthdayMonth?: number,
  context?: MessageContext
): Map<string, PerspectiveMessage[]> => {
  const categoryMap = new Map<string, PerspectiveMessage[]>();

  PERSPECTIVE_MESSAGES.forEach(msg => {
    if (isMessageDisplayable(msg, currentMonth, birthdayMonth, context)) {
      const existing = categoryMap.get(msg.category) || [];
      existing.push(msg);
      categoryMap.set(msg.category, existing);
    }
  });

  return categoryMap;
};

/**
 * 重み付きでカテゴリを選択
 */
const selectCategory = (
  availableCategories: string[],
  seed: number,
  previousCategory?: string
): string => {
  if (availableCategories.length === 0) {
    return 'countdown'; // フォールバック
  }

  if (availableCategories.length === 1) {
    return availableCategories[0];
  }

  // 重みの合計を計算
  let totalWeight = 0;
  for (const cat of availableCategories) {
    totalWeight += CATEGORY_WEIGHTS[cat] || 1;
  }

  // PRNGで選択
  const rand = seededRandomN(seed, 0);
  let cumulative = 0;
  let selectedCategory = availableCategories[0];

  for (const cat of availableCategories) {
    cumulative += (CATEGORY_WEIGHTS[cat] || 1) / totalWeight;
    if (rand < cumulative) {
      selectedCategory = cat;
      break;
    }
  }

  // 前日と同じカテゴリなら再選択を試みる
  if (selectedCategory === previousCategory && availableCategories.length > 1) {
    const otherCategories = availableCategories.filter(c => c !== previousCategory);
    if (otherCategories.length > 0) {
      const rand2 = seededRandomN(seed, 1);
      selectedCategory = otherCategories[Math.floor(rand2 * otherCategories.length)];
    }
  }

  return selectedCategory;
};

/**
 * 前日のカテゴリを計算（決定論的に同じ計算を再現）
 */
const getPreviousDayCategory = (
  currentMonth: number,
  birthdayMonth?: number,
  context?: MessageContext
): string | undefined => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdaySeed = getSeedForDate(yesterday);
  const yesterdayMonth = yesterday.getMonth() + 1;

  // 前日のコンテキストは不明なので、月と曜日だけで判定
  const yesterdayContext: MessageContext | undefined = context ? {
    dayOfWeek: yesterday.getDay(),
    // streakDaysとhasTodayEntryは前日の値が不明なので含めない
  } : undefined;

  const categoryMap = getDisplayableMessagesByCategory(yesterdayMonth, birthdayMonth, yesterdayContext);
  const availableCategories = Array.from(categoryMap.keys());

  if (availableCategories.length === 0) {
    return undefined;
  }

  // 前日のカテゴリ選択を再現（previousCategoryは渡さない = 再選択なし）
  let totalWeight = 0;
  for (const cat of availableCategories) {
    totalWeight += CATEGORY_WEIGHTS[cat] || 1;
  }

  const rand = seededRandomN(yesterdaySeed, 0);
  let cumulative = 0;

  for (const cat of availableCategories) {
    cumulative += (CATEGORY_WEIGHTS[cat] || 1) / totalWeight;
    if (rand < cumulative) {
      return cat;
    }
  }

  return availableCategories[0];
};

/**
 * 今日の視点メッセージを取得
 * 日付ベースで決定されるため、同じ日は同じメッセージが表示される
 * カテゴリバランスを保証し、前日と同じカテゴリの連続を回避する
 *
 * @param birthdayMonth ユーザーの誕生日月（1-12）
 * @param context メッセージ選択のコンテキスト情報
 */
export const getTodayPerspectiveMessage = (
  birthdayMonth?: number,
  context?: MessageContext
): PerspectiveMessage => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const seed = getDailySeed();

  // 曜日をcontextに自動設定（未指定の場合）
  const effectiveContext: MessageContext | undefined = context ? {
    ...context,
    dayOfWeek: context.dayOfWeek ?? today.getDay(),
  } : { dayOfWeek: today.getDay() };

  // カテゴリ別にグループ化
  const categoryMap = getDisplayableMessagesByCategory(currentMonth, birthdayMonth, effectiveContext);
  const availableCategories = Array.from(categoryMap.keys());

  // 表示可能なメッセージがない場合のフォールバック
  if (availableCategories.length === 0) {
    const index = Math.floor(seededRandom(seed) * PERSPECTIVE_MESSAGES.length);
    return PERSPECTIVE_MESSAGES[index];
  }

  // 前日のカテゴリを計算
  const previousCategory = getPreviousDayCategory(currentMonth, birthdayMonth, effectiveContext);

  // カテゴリを選択
  const selectedCategory = selectCategory(availableCategories, seed, previousCategory);

  // カテゴリ内でメッセージを選択
  const messagesInCategory = categoryMap.get(selectedCategory) || [];
  if (messagesInCategory.length === 0) {
    // フォールバック: 全カテゴリから選択
    const allMessages = Array.from(categoryMap.values()).flat();
    const index = Math.floor(seededRandomN(seed, 2) * allMessages.length);
    return allMessages[index];
  }

  const index = Math.floor(seededRandomN(seed, 2) * messagesInCategory.length);
  return messagesInCategory[index];
};

/**
 * プレースホルダーを実際の値で置換
 */
export interface PerspectiveValues {
  remainingYears: number;
  remainingDays: number;
  remainingWeeks: number;
  currentAge: number;
  progressPercent: number;
  streakDays?: number;
}

export const formatPerspectiveMessage = (
  message: PerspectiveMessage,
  values: PerspectiveValues
): { mainText: string; subtext?: string; emoji: string } => {
  const {
    remainingYears,
    remainingDays,
    remainingWeeks,
    currentAge,
    progressPercent,
    streakDays,
  } = values;

  // 派生値を計算
  const remainingWeekends = Math.floor(remainingWeeks);
  const remainingSprings = Math.floor(remainingYears);
  const remainingSummers = Math.floor(remainingYears);
  const remainingAutumns = Math.floor(remainingYears);
  const remainingWinters = Math.floor(remainingYears);
  const remainingMonths = Math.floor(remainingYears * 12);
  const remainingTravels = Math.floor(remainingYears * 2);
  const remainingSeasons = Math.floor(remainingYears * 4);

  // 3桁カンマ区切りフォーマッター
  const formatNumber = (n: number): string =>
    String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // プレースホルダーを置換
  const mainText = message.template
    .replace(/{remainingYears}/g, String(Math.floor(remainingYears)))
    .replace(/{remainingDays}/g, formatNumber(remainingDays))
    .replace(/{remainingWeeks}/g, formatNumber(remainingWeeks))
    .replace(/{remainingWeekends}/g, formatNumber(remainingWeekends))
    .replace(/{remainingSprings}/g, String(remainingSprings))
    .replace(/{remainingSummers}/g, String(remainingSummers))
    .replace(/{remainingAutumns}/g, String(remainingAutumns))
    .replace(/{remainingWinters}/g, String(remainingWinters))
    .replace(/{remainingMonths}/g, formatNumber(remainingMonths))
    .replace(/{remainingTravels}/g, formatNumber(remainingTravels))
    .replace(/{remainingSeasons}/g, formatNumber(remainingSeasons))
    .replace(/{currentAge}/g, String(Math.floor(currentAge)))
    .replace(/{progressPercent}/g, progressPercent.toFixed(1))
    .replace(/{streakDays}/g, String(streakDays ?? 0));

  return {
    mainText,
    subtext: message.subtext,
    emoji: message.emoji,
  };
};

/**
 * デバッグ用: 特定の日付のメッセージを取得
 */
export const getPerspectiveMessageForDate = (
  date: Date,
  birthdayMonth?: number,
  context?: MessageContext
): PerspectiveMessage => {
  const currentMonth = date.getMonth() + 1;
  const seed = getSeedForDate(date);

  const effectiveContext: MessageContext | undefined = context ? {
    ...context,
    dayOfWeek: context.dayOfWeek ?? date.getDay(),
  } : { dayOfWeek: date.getDay() };

  const categoryMap = getDisplayableMessagesByCategory(currentMonth, birthdayMonth, effectiveContext);
  const availableCategories = Array.from(categoryMap.keys());

  if (availableCategories.length === 0) {
    const index = Math.floor(seededRandom(seed) * PERSPECTIVE_MESSAGES.length);
    return PERSPECTIVE_MESSAGES[index];
  }

  // デバッグ用ではpreviousCategory回避は行わない（日付単体で結果を確認するため）
  const selectedCategory = selectCategory(availableCategories, seed);

  const messagesInCategory = categoryMap.get(selectedCategory) || [];
  if (messagesInCategory.length === 0) {
    const allMessages = Array.from(categoryMap.values()).flat();
    const index = Math.floor(seededRandomN(seed, 2) * allMessages.length);
    return allMessages[index];
  }

  const index = Math.floor(seededRandomN(seed, 2) * messagesInCategory.length);
  return messagesInCategory[index];
};
