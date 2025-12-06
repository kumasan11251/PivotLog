import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, textBase } from '../../theme';

interface YearMonthPickerModalProps {
  visible: boolean;
  initialYear: number;
  initialMonth: number;
  onClose: () => void;
  onConfirm: (year: number, month: number) => void;
}

const MIN_YEAR = 1900;

const YearMonthPickerModal: React.FC<YearMonthPickerModalProps> = ({
  visible,
  initialYear,
  initialMonth,
  onClose,
  onConfirm,
}) => {
  const [{ year, month }, setSelection] = useState({ year: initialYear, month: initialMonth });
  const { currentYear, currentMonth } = useMemo(() => {
    const now = new Date();
    return { currentYear: now.getFullYear(), currentMonth: now.getMonth() + 1 };
  }, []);

  useEffect(() => {
    if (visible) {
      setSelection({ year: initialYear, month: initialMonth });
    }
  }, [visible, initialYear, initialMonth]);

  const isFutureMonth = useCallback(
    (targetYear: number, targetMonth: number) => {
      if (targetYear > currentYear) return true;
      if (targetYear === currentYear && targetMonth > currentMonth) return true;
      return false;
    },
    [currentYear, currentMonth]
  );

  const clampToPast = useCallback(
    (nextYear: number, nextMonth: number) => {
      let safeYear = Math.max(MIN_YEAR, nextYear);
      let safeMonth = nextMonth;

      if (isFutureMonth(safeYear, safeMonth)) {
        safeYear = currentYear;
        safeMonth = Math.min(safeMonth, currentMonth);
      }

      return { safeYear, safeMonth };
    },
    [currentMonth, currentYear, isFutureMonth]
  );

  const handleYearChange = useCallback(
    (delta: number) => {
      const { safeYear, safeMonth } = clampToPast(year + delta, month);
      setSelection({ year: safeYear, month: safeMonth });
    },
    [clampToPast, month, year]
  );

  const handleSelectMonth = useCallback(
    (selectedMonth: number) => {
      if (isFutureMonth(year, selectedMonth)) {
        if (year === currentYear) {
          setSelection({ year, month: currentMonth });
        }
        return;
      }

      setSelection({ year, month: selectedMonth });
    },
    [currentMonth, currentYear, isFutureMonth, year]
  );

  const handleConfirm = useCallback(() => {
    const { safeYear, safeMonth } = clampToPast(year, month);
    onConfirm(safeYear, safeMonth);
    onClose();
  }, [clampToPast, month, onClose, onConfirm, year]);

  const nextYearDisabled = isFutureMonth(year + 1, month);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>年月を選択</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.yearRow}>
                <TouchableOpacity onPress={() => handleYearChange(-1)} style={styles.yearButton}>
                  <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.yearText}>{year}年</Text>
                <TouchableOpacity
                  onPress={() => handleYearChange(1)}
                  style={styles.yearButton}
                  disabled={nextYearDisabled}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={nextYearDisabled ? colors.text.secondary : colors.text.primary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.monthGrid}>
                {Array.from({ length: 12 }).map((_, index) => {
                  const monthNumber = index + 1;
                  const isDisabled = isFutureMonth(year, monthNumber);
                  const isSelected = monthNumber === month;

                  return (
                    <TouchableOpacity
                      key={`month-${monthNumber}`}
                      style={[styles.monthCell, isSelected && styles.monthCellSelected, isDisabled && styles.monthCellDisabled]}
                      onPress={() => handleSelectMonth(monthNumber)}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.monthText,
                          isSelected && styles.monthTextSelected,
                          isDisabled && styles.monthTextDisabled,
                        ]}
                      >
                        {monthNumber}月
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmText}>決定</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fonts.size.title,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    ...textBase,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  yearButton: {
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.small,
    backgroundColor: colors.background,
  },
  yearText: {
    fontSize: fonts.size.headline,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginHorizontal: spacing.lg,
    ...textBase,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  monthCell: {
    width: '22%',
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  monthCellSelected: {
    backgroundColor: colors.primary,
  },
  monthCellDisabled: {
    backgroundColor: colors.surface,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
  },
  monthText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    ...textBase,
  },
  monthTextSelected: {
    color: colors.text.inverse,
  },
  monthTextDisabled: {
    color: colors.text.secondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    backgroundColor: colors.background,
    borderWidth: spacing.borderWidth,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    ...textBase,
  },
  confirmButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    backgroundColor: colors.primary,
    marginLeft: spacing.md,
  },
  confirmText: {
    fontSize: fonts.size.body,
    fontFamily: fonts.family.bold,
    color: colors.text.inverse,
    ...textBase,
  },
});

export default YearMonthPickerModal;
