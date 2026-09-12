import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Keyboard, Animated, Easing } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { HabitItem } from '../../types/habit';
import { MAX_HABIT_TITLE_LENGTH } from '../../types/habit';
import HabitCheckIcon from './HabitCheckIcon';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { fonts, spacing, textBase, getColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

export interface HabitListHandle {
  /** 入力中・編集中の内容を確定して閉じる（日付切り替え前などに呼ぶ） */
  commitPending: () => void;
}

interface HabitListProps {
  items: HabitItem[];
  canAdd: boolean;
  maxCount: number;
  /** 完了チェックできるか（未来の日・週では false） */
  canToggle: boolean;
  /** 追加入力欄のプレースホルダーの元になる語（例: やりとげたいこと） */
  itemNoun: string;
  /** 削除確認ダイアログで「〜から削除します」に入る語（例: 今日のやりとげたいこと） */
  removeContextLabel: string;
  /** 引き継ぎ候補 */
  suggestions: HabitItem[];
  /** 引き継ぎ候補の見出し（例: 前日の項目から） */
  suggestionLabel: string;
  onAdd: (title: string) => boolean;
  onAddMany: (titles: string[]) => number;
  onToggle: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => boolean;
  onRemove: (id: string) => void;
  /** ユーザーのチェック操作で全項目が完了した瞬間に呼ばれる（親側の演出用） */
  onAllCompleted?: () => void;
  /** カード上部に置く見出し（親が日付ラベルや達成数を組み立てて渡す） */
  header?: React.ReactNode;
  /** 追加・編集の入力欄がフォーカスされたとき、その行の View を渡す（親がキーボードを避けてスクロールする用） */
  onInputFocus?: (rowRef: React.RefObject<View | null>) => void;
  /** 入力欄のフォーカスが外れたとき */
  onInputBlur?: () => void;
}

/**
 * 習慣項目のリスト（チェック・その場で編集・＋で追加・引き継ぎ候補）
 * 見出し・項目・追加行を1枚の白いカードにまとめ、項目は枠なしの行を細線で区切る（記録一覧のカードと同じ文法）。
 * 引き継ぎ候補は補助情報なのでカードの外に置く
 */
const HabitList = forwardRef<HabitListHandle, HabitListProps>(
  (
    {
      items,
      canAdd,
      maxCount,
      canToggle,
      itemNoun,
      removeContextLabel,
      suggestions,
      suggestionLabel,
      onAdd,
      onAddMany,
      onToggle,
      onUpdateTitle,
      onRemove,
      onAllCompleted,
      header,
      onInputFocus,
      onInputBlur,
    },
    ref
  ) => {
    const { isDark } = useTheme();
    const themeColors = useMemo(() => getColors(isDark), [isDark]);
    const reduceMotion = useReduceMotion();

    // 直前にユーザーがチェックした項目ID（その項目のチェックマークだけ弾ませる）
    // アイコン側は「未完了→完了」の遷移時にしか動かないので、初回表示や日付切り替えでは弾まない
    const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);
    // 全項目完了時にリスト全体へ広がる淡い光
    const glowAnim = useMemo(() => new Animated.Value(0), []);

    const runCompletionGlow = () => {
      if (reduceMotion) return;
      glowAnim.setValue(0);
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    };

    // チェック操作: 完了にするときだけ軽い手触りを返し、全項目が揃った瞬間は少し大きめに喜ぶ
    const handleToggle = (item: HabitItem) => {
      Keyboard.dismiss();
      if (item.completed) {
        onToggle(item.id);
        return;
      }
      const willCompleteAll = items.every((other) => other.completed || other.id === item.id);
      setLastCheckedId(item.id);
      if (willCompleteAll) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        runCompletionGlow();
        onAllCompleted?.();
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onToggle(item.id);
    };

    // 新規追加の状態（＋を押したときだけ入力行を表示する）
    const [isAdding, setIsAdding] = useState(false);
    const [draft, setDraft] = useState('');
    const addInputRef = useRef<TextInput>(null);
    // 入力行の View（親がキーボードに隠れない位置までスクロールするために測る）
    const addRowRef = useRef<View>(null);
    // blur と完了キーが連続で発火しても二重追加しないよう、最新値を同期的に保持する
    const draftRef = useRef('');
    const updateDraft = (text: string) => {
      draftRef.current = text;
      setDraft(text);
    };

    // インライン編集の状態
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState('');
    const editInputRef = useRef<TextInput>(null);
    const editRowRef = useRef<View>(null);

    // 編集対象が一覧に存在する場合のみ編集中とみなす（切り替え後の取り残しを防ぐ）
    const isEditing = editingId !== null && items.some((item) => item.id === editingId);

    useEffect(() => {
      if (editingId) {
        const timer = setTimeout(() => editInputRef.current?.focus(), 50);
        return () => clearTimeout(timer);
      }
    }, [editingId]);

    useEffect(() => {
      if (isAdding) {
        const timer = setTimeout(() => addInputRef.current?.focus(), 50);
        return () => clearTimeout(timer);
      }
    }, [isAdding]);

    const startAdding = () => {
      setEditingId(null);
      updateDraft('');
      setIsAdding(true);
    };

    // 入力内容を項目として確定（空なら何もしない）
    const commitDraft = (): boolean => {
      const text = draftRef.current;
      if (!text.trim()) return false;
      const added = onAdd(text);
      if (added) updateDraft('');
      return added;
    };

    // 完了キー: 追加して、まだ枠が残っていれば続けて入力できる状態を保つ
    const handleAddSubmit = () => {
      commitDraft();
      if (items.length + 1 >= maxCount) {
        setIsAdding(false);
      }
    };

    // 入力エリア外のタップ（blur）: 追加して入力行を閉じる
    const handleAddBlur = () => {
      onInputBlur?.();
      commitDraft();
      setIsAdding(false);
    };

    const startEditing = (item: HabitItem) => {
      if (isAdding) {
        commitDraft();
        setIsAdding(false);
      }
      setEditingId(item.id);
      setEditDraft(item.title);
    };

    const closeEditing = () => {
      setEditingId(null);
      setEditDraft('');
    };

    // 編集開始時は全選択ではなく文末にカーソルを置く（語尾の修正や追記が多いので、うっかり全文を消さないように）
    // ネイティブ側の初期カーソル配置に上書きされないよう、フォーカス直後に一拍おいて設定する
    const handleEditFocus = () => {
      onInputFocus?.(editRowRef);
      const end = editDraft.length;
      setTimeout(() => editInputRef.current?.setSelection(end, end), 0);
    };

    // 完了キー: 文字があれば保存、すべて消していれば意図的な操作とみなして削除
    const handleEditSubmit = () => {
      if (editingId) {
        if (editDraft.trim()) {
          onUpdateTitle(editingId, editDraft);
        } else {
          onRemove(editingId);
        }
      }
      closeEditing();
    };

    // 入力エリア外のタップ（blur）: 文字があれば保存、空なら元の文言のまま戻す
    const handleEditBlur = () => {
      onInputBlur?.();
      if (editingId && editDraft.trim()) {
        onUpdateTitle(editingId, editDraft);
      }
      closeEditing();
    };

    useImperativeHandle(ref, () => ({
      commitPending: () => {
        if (draftRef.current.trim()) {
          onAdd(draftRef.current);
        }
        updateDraft('');
        setIsAdding(false);
        if (editingId && editDraft.trim()) {
          onUpdateTitle(editingId, editDraft);
        }
        closeEditing();
      },
    }));

    const confirmRemove = (item: HabitItem) => {
      // ダイアログの裏でキーボードが閉じたり戻ったりして背面が上下に動かないよう、
      // 先に編集を確定して（blur で保存・編集終了）キーボードを閉じてから確認を出す
      editInputRef.current?.blur();
      Keyboard.dismiss();
      Alert.alert('削除しますか？', `「${item.title}」を${removeContextLabel}から削除します。`, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            closeEditing();
            onRemove(item.id);
          },
        },
      ]);
    };

    const handleAddSuggestion = (title: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAdd(title);
    };

    const handleAddAllSuggestions = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAddMany(suggestions.map((item) => item.title));
    };

    // 編集中・入力中の行はうすい下地で示す（枠線だとカード内の細線とぶつかる）
    const editingRowStyle = { backgroundColor: `${themeColors.primary}1A` };
    const separatorStyle = { borderTopColor: themeColors.border };

    const renderEditingItem = (item: HabitItem, withSeparator: boolean) => (
      <View
        key={item.id}
        ref={editRowRef}
        style={[
          styles.itemRow,
          withSeparator && [styles.separator, separatorStyle],
          styles.itemRowEditing,
          !withSeparator && styles.itemRowEditingFirst,
          editingRowStyle,
        ]}
      >
        <Feather name="edit-3" size={20} color={themeColors.primary} />
        <TextInput
          ref={editInputRef}
          style={[styles.editInput, { color: themeColors.text.primary }]}
          value={editDraft}
          onChangeText={setEditDraft}
          placeholder={item.title}
          placeholderTextColor={themeColors.text.placeholder}
          maxLength={MAX_HABIT_TITLE_LENGTH}
          returnKeyType="done"
          onSubmitEditing={handleEditSubmit}
          onFocus={handleEditFocus}
          onBlur={handleEditBlur}
        />
        <Pressable
          onPress={() => confirmRemove(item)}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="削除"
        >
          <Ionicons name="trash-outline" size={20} color={themeColors.text.secondary} />
        </Pressable>
      </View>
    );

    const renderItem = (item: HabitItem, index: number) => {
      const withSeparator = index > 0;
      if (item.id === editingId) return renderEditingItem(item, withSeparator);
      return (
        <Pressable
          key={item.id}
          onPress={() => handleToggle(item)}
          disabled={!canToggle}
          style={({ pressed }) => [
            styles.itemRow,
            withSeparator && [styles.separator, separatorStyle],
            pressed && styles.pressed,
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.completed }}
          accessibilityLabel={item.title}
        >
          <HabitCheckIcon
            completed={item.completed}
            color={item.completed ? themeColors.primary : themeColors.text.secondary}
            shouldAnimate={lastCheckedId === item.id}
            reduceMotion={reduceMotion}
          />
          <Text
            style={[
              styles.itemTitle,
              { color: item.completed ? themeColors.text.secondary : themeColors.text.primary },
              item.completed && styles.itemTitleCompleted,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Pressable
            onPress={() => startEditing(item)}
            hitSlop={12}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="編集"
          >
            <Feather name="edit-3" size={20} color={themeColors.text.secondary} />
          </Pressable>
        </Pressable>
      );
    };

    const showControls = canAdd && !isAdding && !isEditing;
    const hasItems = items.length > 0;
    // 見出しの下に何か行が続くときだけ、見出しとの間に細線を引く
    const hasBody = hasItems || isAdding || showControls;

    return (
      <View>
        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          {header && (
            <View
              style={[styles.header, hasBody && [styles.headerWithBody, { borderBottomColor: themeColors.border }]]}
            >
              {header}
            </View>
          )}

          {items.map(renderItem)}

          {canAdd && isAdding && (
            <View
              ref={addRowRef}
              style={[
                styles.itemRow,
                hasItems && [styles.separator, separatorStyle],
                styles.itemRowEditing,
                !hasItems && styles.itemRowEditingFirst,
                editingRowStyle,
              ]}
            >
              <Ionicons name="ellipse-outline" size={26} color={themeColors.text.placeholder} />
              <TextInput
                ref={addInputRef}
                style={[styles.editInput, { color: themeColors.text.primary }]}
                value={draft}
                onChangeText={updateDraft}
                placeholder={`${itemNoun}（${items.length + 1}/${maxCount}）`}
                placeholderTextColor={themeColors.text.placeholder}
                maxLength={MAX_HABIT_TITLE_LENGTH}
                returnKeyType="done"
                onSubmitEditing={handleAddSubmit}
                onFocus={() => onInputFocus?.(addRowRef)}
                onBlur={handleAddBlur}
                submitBehavior="submit"
              />
            </View>
          )}

          {showControls && (
            <Pressable
              onPress={startAdding}
              hitSlop={8}
              style={({ pressed }) => [
                styles.addRow,
                hasItems && [styles.separator, separatorStyle],
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${itemNoun}を追加`}
            >
              {/* チェックアイコン（26pt）と左端を揃える */}
              <View style={styles.addIconBox}>
                <Ionicons name="add" size={22} color={themeColors.primary} />
              </View>
              <Text style={[styles.addRowLabel, { color: themeColors.primary }]}>追加する</Text>
            </Pressable>
          )}

          {/* 全項目完了時にカード全体へ広がる淡い光 */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.completionGlow,
              {
                backgroundColor: themeColors.primary,
                opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] }),
              },
            ]}
          />
        </View>

        {showControls && suggestions.length > 0 && (
          <View style={styles.suggestionSection}>
            <View style={styles.suggestionHeader}>
              <Text style={[styles.suggestionTitle, { color: themeColors.text.secondary }]}>{suggestionLabel}</Text>
              {suggestions.length > 1 && (
                <Pressable
                  onPress={handleAddAllSuggestions}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="すべて追加"
                >
                  <Text style={[styles.suggestionAddAll, { color: themeColors.primary }]}>すべて追加</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.suggestionChips}>
              {suggestions.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleAddSuggestion(item.title)}
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}を追加`}
                >
                  <Ionicons name="add" size={16} color={themeColors.primary} />
                  <Text style={[styles.suggestionChipText, { color: themeColors.text.primary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }
);

HabitList.displayName = 'HabitList';

const styles = StyleSheet.create({
  card: {
    borderRadius: spacing.borderRadius.medium,
    borderWidth: spacing.borderWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    // 入力行の下地（左右 sm 分だけ外へ出る）とカード端の余白を上下左右で揃える
    paddingBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {},
  headerWithBody: {
    borderBottomWidth: spacing.borderWidth,
  },
  completionGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  separator: {
    borderTopWidth: spacing.borderWidth,
  },
  itemRowEditing: {
    borderRadius: spacing.borderRadius.small,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
  },
  // 見出しの区切り線の直下に来るときは、線との間にも左右と同じ余白をとる
  itemRowEditingFirst: {
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  itemTitle: {
    flex: 1,
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    marginLeft: spacing.md,
    ...textBase,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  editInput: {
    flex: 1,
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    lineHeight: 22,
    paddingVertical: 0,
    marginLeft: spacing.md,
    ...textBase,
  },
  iconButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  addIconBox: {
    width: 26,
    alignItems: 'center',
  },
  addRowLabel: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.regular,
    marginLeft: spacing.md,
    ...textBase,
  },
  suggestionSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  suggestionTitle: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.regular,
    ...textBase,
  },
  suggestionAddAll: {
    fontSize: fonts.size.labelSmall,
    fontFamily: fonts.family.bold,
    ...textBase,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: spacing.borderWidth,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    maxWidth: '100%',
  },
  suggestionChipText: {
    fontSize: fonts.size.label,
    fontFamily: fonts.family.regular,
    marginLeft: spacing.xs,
    flexShrink: 1,
    ...textBase,
  },
});

export default HabitList;
