import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';

type ShareImportModalProps = {
  visible: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: string) => boolean;
};

export function ShareImportModal({ visible, errorMessage, onClose, onSubmit }: ShareImportModalProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);
  const [rawInput, setRawInput] = useState('');

  useEffect(() => {
    if (!visible) {
      setRawInput('');
    }
  }, [visible]);

  const submit = () => {
    if (!rawInput.trim()) {
      return;
    }

    const success = onSubmit(rawInput);

    if (success) {
      setRawInput('');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{t('shareImport.title')}</Text>
          <Text style={styles.helper}>{t('shareImport.helper')}</Text>

          <TextInput
            value={rawInput}
            onChangeText={setRawInput}
            placeholder={t('shareImport.placeholder')}
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.input}
            multiline
            textAlignVertical="top"
          />

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, !rawInput.trim() && styles.submitButtonDisabled]} onPress={submit} disabled={!rawInput.trim()}>
              <Text style={styles.submitText}>{t('shareImport.submit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isRTL: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colors.overlay,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
      textAlign: isRTL ? 'right' : 'left',
    },
    helper: {
      marginTop: 8,
      color: colors.textSoft,
      fontSize: 14,
      lineHeight: 20,
      textAlign: isRTL ? 'right' : 'left',
    },
    input: {
      marginTop: 14,
      minHeight: 150,
      maxHeight: 220,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
      textAlign: isRTL ? 'right' : 'left',
    },
    error: {
      marginTop: 10,
      color: '#B85A4A',
      fontSize: 13,
      textAlign: isRTL ? 'right' : 'left',
    },
    actions: {
      marginTop: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 10,
    },
    cancelButton: {
      flex: 1,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
    },
    cancelText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    submitButton: {
      flex: 1,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '700',
    },
  });
