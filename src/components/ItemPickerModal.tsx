import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { QuickSelectItem } from '../types';

const formatTypeLabel = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

type ItemPickerModalProps = {
  visible: boolean;
  title: string;
  items: QuickSelectItem[];
  selectedItemId?: string | null;
  onClose: () => void;
  onSelect: (item: QuickSelectItem) => void;
};

export function ItemPickerModal({
  visible,
  title,
  items,
  selectedItemId,
  onClose,
  onSelect,
}: ItemPickerModalProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sortedItems = [...items].sort((left, right) => left.name.localeCompare(right.name));

    if (!normalizedQuery) {
      return sortedItems;
    }

    return sortedItems.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [items, query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('itemPicker.searchPlaceholder')}
              placeholderTextColor={colors.inputPlaceholder}
              style={styles.searchInput}
            />
          </View>

          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {filteredItems.map((item) => {
              const selected = item.id === selectedItemId;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, selected && styles.itemRowSelected]}
                  onPress={() => onSelect(item)}
                >
                  <View style={styles.itemColors}>
                    {item.colors.slice(0, 4).map((color) => (
                      <View key={`${item.id}-${color}`} style={[styles.colorDot, { backgroundColor: color }]} />
                    ))}
                  </View>
                  <View style={styles.itemMain}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {formatTypeLabel(item.sectionId)}
                      {item.unitLabel ? `  •  ${item.unitLabel}` : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'chevron-forward'}
                    size={18}
                    color={selected ? colors.accent : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}

            {!filteredItems.length ? <Text style={styles.emptyText}>{t('itemPicker.empty')}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isRTL: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
  },
  headerRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: isRTL ? 'right' : 'left',
  },
  closeText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  searchWrap: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    textAlign: isRTL ? 'right' : 'left',
  },
  listContent: {
    paddingBottom: 12,
    gap: 10,
  },
  itemRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemRowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  itemColors: {
    width: 46,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginRight: isRTL ? 0 : 10,
    marginLeft: isRTL ? 10 : 0,
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(38, 48, 38, 0.12)',
  },
  itemMain: {
    flex: 1,
    paddingRight: isRTL ? 0 : 12,
    paddingLeft: isRTL ? 12 : 0,
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'capitalize',
    textAlign: isRTL ? 'right' : 'left',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
});