import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AddItemsModal } from '../components/AddItemsModal';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { GroceryItem, GroceryList, QuickAddSelection, QuickSelectItem } from '../types';
import { getListCounts } from '../utils/grocery';

const findQuickItemByName = (items: QuickSelectItem[], name: string) =>
  items.find((item) => item.name.toLowerCase() === name.toLowerCase());

type GroceryListScreenProps = {
  groceryList: GroceryList;
  quickSelectItems: QuickSelectItem[];
  onToggleItem: (itemId: string) => void;
  onAddQuickItems: (selections: QuickAddSelection[]) => void;
  onSetItemQuantity: (itemId: string, quantity: number) => void;
  onAdjustItemQuantity: (itemId: string, delta: number) => void;
  onClearList: () => void;
  onDeleteItem: (itemId: string) => void;
};

type ListFilter = 'all' | 'remaining' | 'bought';

export function GroceryListScreen({
  groceryList,
  quickSelectItems,
  onToggleItem,
  onAddQuickItems,
  onSetItemQuantity,
  onAdjustItemQuantity,
  onClearList,
  onDeleteItem,
}: GroceryListScreenProps) {
  const { colors, themeName } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, themeName === 'dark', isRTL), [colors, themeName, isRTL]);
  const counts = getListCounts(groceryList);
  const [selectedFilter, setSelectedFilter] = useState<ListFilter>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);
  const [itemQuantityDrafts, setItemQuantityDrafts] = useState<Record<string, string>>({});
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [pendingItemDelete, setPendingItemDelete] = useState<GroceryItem | null>(null);

  useEffect(() => {
    setCollapsedSections((currentState) => {
      const nextState = { ...currentState };

      groceryList.sections.forEach((section) => {
        if (!(section.id in nextState)) {
          nextState[section.id] = false;
        }
      });

      return nextState;
    });
  }, [groceryList.sections]);

  const visibleSections = groceryList.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (selectedFilter === 'remaining') {
          return !item.checked;
        }

        if (selectedFilter === 'bought') {
          return item.checked;
        }

        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const formatItemMeta = (item: GroceryItem, sectionTitle: string) => {
    const quantityLabel = item.unitLabel ? `${item.quantity} ${item.unitLabel}` : `${item.quantity}`;
    return `${quantityLabel}  •  ${sectionTitle}`;
  };

  const commitItemQuantity = (itemId: string, fallbackQuantity: number) => {
    const draftValue = itemQuantityDrafts[itemId];
    const parsedDraft = Number(draftValue);
    const nextQuantity = Number.isFinite(parsedDraft) && parsedDraft > 0 ? Math.round(parsedDraft) : fallbackQuantity;

    onSetItemQuantity(itemId, nextQuantity);
    setItemQuantityDrafts((currentDrafts) => ({
      ...currentDrafts,
      [itemId]: String(nextQuantity),
    }));
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{t('list.title')}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.topAction} onPress={() => setShowClearModal(true)}>
              <Text style={styles.topActionText}>{t('common.clear')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.topAction, styles.topActionPrimary, editMode && styles.topActionEditActive]}
              onPress={() => {
                setEditMode((currentMode) => !currentMode);
                setItemQuantityDrafts({});
              }}
            >
              <Ionicons name="create-outline" size={16} color={colors.white} />
              <Text style={styles.topActionPrimaryText}>{editMode ? t('list.done') : t('list.edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.storePill}>
          <Ionicons name="cart-outline" size={14} color={colors.text} />
          <Text style={styles.storeLabel}>{groceryList.store}</Text>
        </View>

        <View style={styles.segmentRow}>
          <TouchableOpacity style={[styles.segmentChip, selectedFilter === 'all' && styles.segmentChipActive]} onPress={() => setSelectedFilter('all')}>
            <Text style={[styles.segmentText, selectedFilter === 'all' && styles.segmentTextActive]}>
              {t('list.filterAll', { count: counts.total })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentChip, selectedFilter === 'remaining' && styles.segmentChipActive]} onPress={() => setSelectedFilter('remaining')}>
            <Text style={[styles.segmentText, selectedFilter === 'remaining' && styles.segmentTextActive]}>
              {t('list.filterRemaining', { count: counts.remaining })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentChip, selectedFilter === 'bought' && styles.segmentChipActive]} onPress={() => setSelectedFilter('bought')}>
            <Text style={[styles.segmentText, selectedFilter === 'bought' && styles.segmentTextActive]}>
              {t('list.filterBought', { count: counts.bought })}
            </Text>
          </TouchableOpacity>
        </View>

        {visibleSections.length ? (
          visibleSections.map((section) => {
            const collapsed = collapsedSections[section.id];

            return (
              <View key={section.id} style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() =>
                    setCollapsedSections((currentState) => ({
                      ...currentState,
                      [section.id]: !currentState[section.id],
                    }))
                  }
                >
                  <View>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionMeta}>{t('list.sectionItemsCount', { count: section.items.length })}</Text>
                  </View>
                  <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.text} />
                </TouchableOpacity>

                {!collapsed
                  ? section.items.map((item) => {
                      const matchedQuickItem = findQuickItemByName(quickSelectItems, item.name);

                      const quantityDraft = itemQuantityDrafts[item.id] ?? String(item.quantity);

                      if (editMode) {
                        return (
                          <View key={item.id} style={[styles.itemRow, styles.itemRowEdit]}>
                            <View style={styles.itemTextWrap}>
                              <View style={styles.itemNameRow}>
                                {matchedQuickItem ? (
                                  <View style={styles.itemColorStack}>
                                    {matchedQuickItem.colors.slice(0, 4).map((color) => (
                                      <View key={`${item.id}-${color}`} style={[styles.itemColorDot, { backgroundColor: color }]} />
                                    ))}
                                  </View>
                                ) : null}
                                <Text style={styles.itemName}>{item.name}</Text>
                              </View>
                              <Text style={styles.itemMeta}>{formatItemMeta(item, section.title)}</Text>
                            </View>

                            <View style={styles.quantityControlRow}>
                              <TouchableOpacity style={styles.quantityStepButton} onPress={() => onAdjustItemQuantity(item.id, -1)}>
                                <Ionicons name="remove" size={14} color={colors.text} />
                              </TouchableOpacity>
                              <TextInput
                                value={quantityDraft}
                                onChangeText={(value) => {
                                  const digitsOnly = value.replace(/[^0-9]/g, '');
                                  setItemQuantityDrafts((currentDrafts) => ({
                                    ...currentDrafts,
                                    [item.id]: digitsOnly,
                                  }));
                                }}
                                onBlur={() => commitItemQuantity(item.id, item.quantity)}
                                keyboardType="number-pad"
                                style={styles.quantityInput}
                                textAlign="center"
                              />
                              <TouchableOpacity style={styles.quantityStepButton} onPress={() => onAdjustItemQuantity(item.id, 1)}>
                                <Ionicons name="add" size={14} color={colors.text} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      }

                      return (
                        <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => onToggleItem(item.id)} onLongPress={() => setPendingItemDelete(item)}>
                          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                            {item.checked ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                          </View>
                          <View style={styles.itemTextWrap}>
                            <View style={styles.itemNameRow}>
                              {matchedQuickItem ? (
                                <View style={styles.itemColorStack}>
                                  {matchedQuickItem.colors.slice(0, 4).map((color) => (
                                    <View key={`${item.id}-${color}`} style={[styles.itemColorDot, { backgroundColor: color }]} />
                                  ))}
                                </View>
                              ) : null}
                              <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>{item.name}</Text>
                            </View>
                            <Text style={styles.itemMeta}>{formatItemMeta(item, section.title)}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  : null}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('list.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('list.emptyText')}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addItemsButton} onPress={() => setShowAddItemsModal(true)}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.addItemsButtonText}>{t('list.addItemsButton')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddItemsModal
        visible={showAddItemsModal}
        items={quickSelectItems}
        onClose={() => setShowAddItemsModal(false)}
        onConfirm={onAddQuickItems}
      />

      <ConfirmActionModal
        visible={showClearModal}
        title={t('list.clearTitle')}
        message={t('list.clearMessage')}
        confirmLabel={t('common.clear')}
        onCancel={() => setShowClearModal(false)}
        onConfirm={() => {
          onClearList();
          setShowClearModal(false);
        }}
      />

      <ConfirmActionModal
        visible={pendingItemDelete !== null}
        title={t('list.deleteItemTitle')}
        message={pendingItemDelete ? t('list.deleteItemMessage', { name: pendingItemDelete.name }) : ''}
        confirmLabel={t('common.delete')}
        onCancel={() => setPendingItemDelete(null)}
        onConfirm={() => {
          if (pendingItemDelete) {
            onDeleteItem(pendingItemDelete.id);
          }
          setPendingItemDelete(null);
        }}
      />
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean, isRTL: boolean) => StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 58,
    paddingBottom: 116,
  },
  topRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
  },
  title: {
    color: colors.title,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: isRTL ? 'right' : 'left',
  },
  topAction: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? colors.surfaceMuted : '#EFE8DA',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 6,
  },
  topActionPrimary: {
    backgroundColor: colors.accent,
  },
  topActionEditActive: {
    backgroundColor: colors.accent,
  },
  topActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  topActionPrimaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  storePill: {
    alignSelf: 'flex-start',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  storeLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 10,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  segmentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentChipActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.white,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sectionMeta: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },
  itemRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemRowEdit: {
    justifyContent: 'space-between',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isRTL ? 0 : 12,
    marginLeft: isRTL ? 12 : 0,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
  },
  itemColorStack: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 4,
    width: 38,
    marginRight: isRTL ? 0 : 8,
    marginLeft: isRTL ? 8 : 0,
  },
  itemColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(38, 48, 38, 0.1)',
  },
  itemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  itemNameChecked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  quantityControlRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityStepButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 52,
    height: 34,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  emptyCard: {
    borderRadius: radius.md,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyText: {
    color: colors.textSoft,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  addItemsButton: {
    marginTop: 6,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
  },
  addItemsButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  quickSelectCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 4,
  },
  quickSelectHeader: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickSelectTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  quickAddButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickAddButtonDisabled: {
    backgroundColor: isDark ? '#4E5A4E' : '#A4B0A6',
  },
  quickAddButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  quickSelectRow: {
    gap: 8,
    paddingRight: isRTL ? 0 : 10,
    paddingLeft: isRTL ? 10 : 0,
  },
  quickChip: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipColors: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 4,
    alignItems: 'center',
  },
  quickChipColorDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(38, 48, 38, 0.1)',
  },
  quickChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  quickChipText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  quickChipTextSelected: {
    color: colors.white,
  },
});
