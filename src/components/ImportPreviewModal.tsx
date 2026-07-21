import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { SharedCatalogItem } from '../utils/sharePayload';

type ImportPreviewModalProps = {
  visible: boolean;
  title: string;
  message: string;
  missingItems: SharedCatalogItem[];
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const formatTypeTitle = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function ImportPreviewModal({
  visible,
  title,
  message,
  missingItems,
  confirmLabel,
  onCancel,
  onConfirm,
}: ImportPreviewModalProps) {
  const { colors, themeName } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, themeName === 'dark', isRTL), [colors, themeName, isRTL]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Text style={styles.listTitle}>{t('importPreview.missingItemsTitle')}</Text>

          {missingItems.length ? (
            <ScrollView style={styles.itemsWrap} contentContainerStyle={styles.itemsContent}>
              {missingItems.map((item) => (
                <View key={item.name.toLowerCase()} style={styles.itemRow}>
                  <View>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {formatTypeTitle(item.sectionId)}
                      {item.unitLabel ? `  •  ${item.unitLabel}` : ''}
                    </Text>
                  </View>
                  <View style={styles.colorsRow}>
                    {item.colors.slice(0, 4).map((color) => (
                      <View key={`${item.name}-${color}`} style={[styles.colorDot, { backgroundColor: color }]} />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noneText}>{t('importPreview.noMissingItems')}</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean, isRTL: boolean) =>
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
      maxHeight: '82%',
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      textAlign: isRTL ? 'right' : 'left',
    },
    message: {
      marginTop: 8,
      color: colors.textSoft,
      fontSize: 14,
      lineHeight: 20,
      textAlign: isRTL ? 'right' : 'left',
    },
    listTitle: {
      marginTop: 14,
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      textAlign: isRTL ? 'right' : 'left',
    },
    itemsWrap: {
      marginTop: 10,
      maxHeight: 240,
    },
    itemsContent: {
      gap: 8,
      paddingBottom: 2,
    },
    itemRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    itemName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      textAlign: isRTL ? 'right' : 'left',
    },
    itemMeta: {
      marginTop: 3,
      color: colors.textMuted,
      fontSize: 12,
      textAlign: isRTL ? 'right' : 'left',
    },
    colorsRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 4,
    },
    colorDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: isDark ? colors.borderSoft : '#D8D3C9',
    },
    noneText: {
      marginTop: 10,
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
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
    confirmButton: {
      flex: 1,
      borderRadius: radius.sm,
      backgroundColor: isDark ? '#3A7A52' : '#2D5F3E',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
    },
    confirmText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
