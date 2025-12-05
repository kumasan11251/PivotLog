import React from 'react';
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fonts, spacing, textBase } from '../../theme';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onDateChange: (event: unknown, date?: Date) => void;
  onClose: () => void;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  onDateChange,
  onClose,
}) => {
  if (!visible) return null;

  if (Platform.OS === 'ios') {
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
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="inline"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    locale="ja-JP"
                    themeVariant="light"
                  />
                </View>
                <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                  <Text style={styles.doneButtonText}>完了</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  return (
    <DateTimePicker
      value={selectedDate}
      mode="date"
      display="default"
      onChange={(event, date) => {
        onClose();
        onDateChange(event, date);
      }}
      maximumDate={new Date()}
      locale="ja"
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: spacing.borderRadius.small,
    overflow: 'hidden',
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.medium,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  doneButtonText: {
    fontSize: fonts.size.body,
    color: '#FFFFFF',
    fontFamily: fonts.family.bold,
    ...textBase,
  },
});

export default DatePickerModal;
