import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';

type SuccessModalProps = {
  visible: boolean;
  itemCount: number;
  listName: string;
  onClose: () => void;
  onViewList: () => void;
};

export function SuccessModal({ visible, itemCount, listName, onClose, onViewList }: SuccessModalProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark" size={40} color={colors.white} />
          </View>
          <Text style={styles.title}>{t('success.itemsAdded', { count: itemCount })}</Text>
          <Text style={styles.subtitle}>{t('success.addedToList', { name: listName })}</Text>
          <TouchableOpacity style={styles.button} onPress={onViewList}>
            <Text style={styles.buttonText}>{t('success.viewList')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isRTL: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    alignSelf: 'stretch',
    textAlign: isRTL ? 'right' : 'left',
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    alignSelf: 'stretch',
    textAlign: isRTL ? 'right' : 'left',
    marginTop: 10,
    marginBottom: 18,
  },
  button: {
    alignSelf: 'stretch',
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
