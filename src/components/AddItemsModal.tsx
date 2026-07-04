import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { QuickAddSelection, QuickSelectItem } from '../types';

type AddItemsModalProps = {
  visible: boolean;
  items: QuickSelectItem[];
  onClose: () => void;
  onConfirm: (selections: QuickAddSelection[]) => void;
};

const formatTypeLabel = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const parsePositiveQuantity = (value: string) => {
  const parsed = Number(value.trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.round(parsed);
};

export function AddItemsModal({ visible, items, onClose, onConfirm }: AddItemsModalProps) {
  const { colors, themeName } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, themeName === 'dark', isRTL), [colors, themeName, isRTL]);
  const typeFilterScrollRef = useRef<ScrollView>(null);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    if (!visible) {
      setDraftQuantities({});
      setSearchQuery('');
      setSelectedType('all');
    }
  }, [visible]);

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.name.localeCompare(right.name)),
    [items],
  );

  const availableTypes = useMemo(
    () => Array.from(new Set(sortedItems.map((item) => item.sectionId))),
    [sortedItems],
  );

  useEffect(() => {
    if (!visible || !isRTL) {
      return;
    }

    requestAnimationFrame(() => {
      typeFilterScrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [availableTypes.length, isRTL, visible]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedItems.filter((item) => {
      const matchesType = selectedType === 'all' || item.sectionId === selectedType;
      const matchesQuery =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.sectionId.toLowerCase().includes(normalizedQuery) ||
        (item.unitLabel ?? '').toLowerCase().includes(normalizedQuery);

      return matchesType && matchesQuery;
    });
  }, [searchQuery, selectedType, sortedItems]);

  const selectedItems = useMemo(
    () =>
      Object.entries(draftQuantities)
        .map(([itemId, quantityText]) => ({
          itemId,
          quantity: parsePositiveQuantity(quantityText),
        }))
        .filter((entry) => entry.quantity > 0),
    [draftQuantities],
  );

  const selectedCount = selectedItems.length;

  const updateQuantity = (itemId: string, nextValue: number) => {
    setDraftQuantities((current) => {
      if (nextValue <= 0) {
        const { [itemId]: _, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [itemId]: String(Math.round(nextValue)),
      };
    });
  };

  const submit = () => {
    if (!selectedItems.length) {
      return;
    }

    onConfirm(selectedItems);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('addItems.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('addItems.searchPlaceholder')}
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.searchInput}
              />
            </View>

            <ScrollView
              ref={typeFilterScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeFilterScroll}
              contentContainerStyle={styles.typeFilterRow}
            >
              <TouchableOpacity
                style={[styles.typeChip, selectedType === 'all' && styles.typeChipActive]}
                onPress={() => setSelectedType('all')}
              >
                <Text style={[styles.typeChipText, selectedType === 'all' && styles.typeChipTextActive]}>{t('common.all')}</Text>
              </TouchableOpacity>
              {availableTypes.map((typeId) => {
                const selected = selectedType === typeId;

                return (
                  <TouchableOpacity
                    key={typeId}
                    style={[styles.typeChip, selected && styles.typeChipActive]}
                    onPress={() => setSelectedType(typeId)}
                  >
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextActive]}>
                      {formatTypeLabel(typeId)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filteredItems.map((item) => {
              const currentText = draftQuantities[item.id] ?? '';
              const currentQuantity = parsePositiveQuantity(currentText);

              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemTopRow}>
                    <View style={styles.itemInfoRow}>
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
                    </View>
                    <View style={styles.controlRow}>
                      <TouchableOpacity
                        style={styles.stepButton}
                        onPress={() => updateQuantity(item.id, Math.max(0, currentQuantity - 1))}
                      >
                        <Ionicons name="remove" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <TextInput
                        value={currentText}
                        onChangeText={(text) => {
                          const digitsOnly = text.replace(/[^0-9]/g, '');
                          setDraftQuantities((current) => ({
                            ...current,
                            [item.id]: digitsOnly,
                          }));
                        }}
                        onBlur={() => {
                          const normalized = parsePositiveQuantity(currentText);

                          setDraftQuantities((current) => {
                            if (!normalized) {
                              const { [item.id]: _, ...rest } = current;
                              return rest;
                            }

                            return {
                              ...current,
                              [item.id]: String(normalized),
                            };
                          });
                        }}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        style={styles.quantityInput}
                        textAlign="center"
                      />
                      <TouchableOpacity style={styles.stepButton} onPress={() => updateQuantity(item.id, currentQuantity + 1)}>
                        <Ionicons name="add" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {!filteredItems.length ? <Text style={styles.emptyText}>{t('addItems.noneFound')}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryButton, !selectedCount && styles.primaryButtonDisabled]}
              onPress={submit}
              disabled={!selectedCount}
            >
              <Text style={styles.primaryButtonText}>{t('addItems.submit', { count: selectedCount })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean, isRTL: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    height: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: isRTL ? 'right' : 'left',
  },
  closeText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 0,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 14,
    textAlign: isRTL ? 'right' : 'left',
  },
  typeFilterRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingHorizontal: 0,
    paddingBottom: 10,
  },
  typeFilterScroll: {
    minHeight: 44,
    marginBottom: 4,
  },
  typeChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
    flexShrink: 0,
    alignSelf: 'center',
  },
  typeChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  typeChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  typeChipTextActive: {
    color: colors.accent,
  },
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 24,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  itemTopRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemInfoRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  itemColors: {
    width: 42,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginRight: isRTL ? 0 : 10,
    marginLeft: isRTL ? 10 : 0,
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(38, 48, 38, 0.12)',
  },
  itemMain: {
    flex: 1,
    paddingRight: isRTL ? 0 : 8,
    paddingLeft: isRTL ? 8 : 0,
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
    textAlign: isRTL ? 'right' : 'left',
  },
  controlRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 52,
    height: 36,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: isDark ? '#4E5A4E' : '#A4B0A6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    height: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});