import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveUserSettingsToFirestore,
  saveHomeDisplaySettingsToFirestore,
  saveDiaryEntryToFirestore,
  deleteDiaryEntryFromFirestore,
} from '../services/firebase/firestore';

const SYNC_QUEUE_KEY = '@pivot_log_sync_queue';
const MAX_QUEUE_SIZE = 100;

type SyncOperationType = 'saveSettings' | 'saveDisplaySettings' | 'saveDiary' | 'deleteDiary';

interface SyncOperation {
  id: string;
  type: SyncOperationType;
  targetId?: string;
  data: unknown;
  timestamp: string;
}

let isProcessing = false;

/**
 * 同期キューに操作を追加
 */
export const addToSyncQueue = async (
  op: Omit<SyncOperation, 'id' | 'timestamp'>
): Promise<void> => {
  try {
    const queue = await loadQueue();
    const newOp: SyncOperation = {
      ...op,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    queue.push(newOp);

    // キューサイズ上限を超えた場合、古い操作から破棄
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.splice(0, queue.length - MAX_QUEUE_SIZE);
    }

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[SyncQueue] キューへの追加に失敗:', error);
  }
};

/**
 * キュー内の全操作をFirestoreに同期
 */
export const processSyncQueue = async (): Promise<void> => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const queue = await loadQueue();
    if (queue.length === 0) return;

    // 処理対象のスナップショットを取得（処理中に追加された操作は次回処理）
    const snapshot = [...queue];

    // 重複排除: type + targetId でグループ化し、最新のみ残す
    const deduped = deduplicateQueue(snapshot);

    // 相殺ルール適用
    const operations = applyCancellationRules(deduped);

    const processedIds = new Set<string>();

    for (const op of operations) {
      try {
        await executeOperation(op);
        // 成功: このoperationに対応する元のスナップショット内のIDを全て記録
        for (const original of snapshot) {
          if (getDedupeKey(original) === getDedupeKey(op)) {
            processedIds.add(original.id);
          }
        }
      } catch (error) {
        console.warn(`[SyncQueue] 操作 ${op.type} の同期に失敗:`, error);
        // 失敗した操作は残す
      }
    }

    // 相殺で破棄された操作のIDも記録
    for (const original of snapshot) {
      const key = getDedupeKey(original);
      const stillExists = operations.some((op) => getDedupeKey(op) === key);
      if (!stillExists) {
        processedIds.add(original.id);
      }
    }

    // 処理済み操作をキューから除去
    if (processedIds.size > 0) {
      const currentQueue = await loadQueue();
      const remaining = currentQueue.filter((op) => !processedIds.has(op.id));
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
    }
  } catch (error) {
    console.error('[SyncQueue] 同期処理中にエラー:', error);
  } finally {
    isProcessing = false;
  }
};

/**
 * 同期キューを全削除
 */
export const clearSyncQueue = async (): Promise<void> => {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
};

// --- 内部ヘルパー ---

const loadQueue = async (): Promise<SyncOperation[]> => {
  const json = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  return json ? JSON.parse(json) : [];
};

const getDedupeKey = (op: SyncOperation): string => {
  return `${op.type}_${op.targetId ?? ''}`;
};

/**
 * type + targetId でグループ化し、最新の操作のみ残す
 */
const deduplicateQueue = (queue: SyncOperation[]): SyncOperation[] => {
  const map = new Map<string, SyncOperation>();
  for (const op of queue) {
    const key = getDedupeKey(op);
    map.set(key, op); // 後勝ち（最新が残る）
  }
  return Array.from(map.values());
};

/**
 * 相殺ルール: 同じtargetIdに対してsaveDiary→deleteDiaryが両方ある場合、両方破棄
 */
const applyCancellationRules = (queue: SyncOperation[]): SyncOperation[] => {
  const saveTargets = new Set<string>();
  const deleteTargets = new Set<string>();

  for (const op of queue) {
    if (op.type === 'saveDiary' && op.targetId) {
      saveTargets.add(op.targetId);
    }
    if (op.type === 'deleteDiary' && op.targetId) {
      deleteTargets.add(op.targetId);
    }
  }

  // 両方に存在するtargetIdを特定
  const cancelledTargets = new Set<string>();
  for (const targetId of deleteTargets) {
    if (saveTargets.has(targetId)) {
      cancelledTargets.add(targetId);
    }
  }

  if (cancelledTargets.size === 0) return queue;

  return queue.filter((op) => {
    if (!op.targetId) return true;
    if ((op.type === 'saveDiary' || op.type === 'deleteDiary') && cancelledTargets.has(op.targetId)) {
      return false;
    }
    return true;
  });
};

const executeOperation = async (op: SyncOperation): Promise<void> => {
  switch (op.type) {
    case 'saveSettings':
      await saveUserSettingsToFirestore(op.data as Parameters<typeof saveUserSettingsToFirestore>[0]);
      break;
    case 'saveDisplaySettings':
      await saveHomeDisplaySettingsToFirestore(op.data as Parameters<typeof saveHomeDisplaySettingsToFirestore>[0]);
      break;
    case 'saveDiary':
      await saveDiaryEntryToFirestore(op.data as Parameters<typeof saveDiaryEntryToFirestore>[0]);
      break;
    case 'deleteDiary':
      await deleteDiaryEntryFromFirestore(op.targetId!);
      break;
  }
};
