import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { GroceryList, GrocerySectionId, QuickSelectItem, Recipe } from '../types';

type PantryScreenProps = {
  items: QuickSelectItem[];
  itemTypes: GrocerySectionId[];
  recipes: Recipe[];
  groceryList: GroceryList;
  onAddItem: (item: Omit<QuickSelectItem, 'id'>) => boolean | Promise<boolean>;
  onAddType: (label: string) => GrocerySectionId | null | Promise<GrocerySectionId | null>;
  onRenameType: (typeId: GrocerySectionId, label: string) => GrocerySectionId | null | Promise<GrocerySectionId | null>;
  onDeleteType: (typeId: GrocerySectionId) => boolean | Promise<boolean>;
  onUpdateItem: (itemId: string, updates: Pick<QuickSelectItem, 'name' | 'sectionId' | 'unitLabel' | 'colors'>) => boolean | Promise<boolean>;
  onDeleteItem: (itemId: string) => boolean | Promise<boolean>;
};

type PendingItemDelete = { id: string; name: string } | null;
type PendingTypeDelete = { id: string; label: string; count: number } | null;

const colorPresets = ['#4F8B3D', '#B8D86D', '#D84E3D', '#F0BC42', '#3F73C7', '#A15CC5', '#E88C3D', '#5E6B77'];

const formatTypeLabel = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const usesCatalogItem = (itemId: string, name: string, candidateId?: string, candidateName?: string) =>
  candidateId === itemId || (!candidateId && (candidateName ?? '').toLowerCase() === name.toLowerCase());

const formatUsageList = (names: string[]) => names.join(', ');

export function PantryScreen({
  items,
  itemTypes,
  recipes,
  groceryList,
  onAddItem,
  onAddType,
  onRenameType,
  onDeleteType,
  onUpdateItem,
  onDeleteItem,
}: PantryScreenProps) {
  const { colors, themeName } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, themeName === 'dark', isRTL), [colors, themeName, isRTL]);
  const filterScrollRef = useRef<ScrollView>(null);
  const [name, setName] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<GrocerySectionId>(itemTypes[0] ?? 'produce');
  const [selectedColors, setSelectedColors] = useState<string[]>(['#4F8B3D']);
  const [activeFilter, setActiveFilter] = useState<GrocerySectionId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<GrocerySectionId | null>(null);
  const [typeDraft, setTypeDraft] = useState('');
  const [showTypeEditor, setShowTypeEditor] = useState(false);

  const [pendingItemDelete, setPendingItemDelete] = useState<PendingItemDelete>(null);
  const [pendingTypeDelete, setPendingTypeDelete] = useState<PendingTypeDelete>(null);

  const itemUsage = useMemo(() => {
    if (!pendingItemDelete) {
      return { recipes: [] as string[], lists: [] as string[] };
    }

    const usedRecipes = recipes
      .filter((recipe) =>
        recipe.ingredients.some((ingredient) =>
          usesCatalogItem(pendingItemDelete.id, pendingItemDelete.name, ingredient.itemId, ingredient.name),
        ),
      )
      .map((recipe) => recipe.title);
    const usedInGroceryList = groceryList.sections.some((section) =>
      section.items.some((item) => usesCatalogItem(pendingItemDelete.id, pendingItemDelete.name, item.itemId, item.name)),
    );

    return {
      recipes: usedRecipes,
      lists: usedInGroceryList ? [groceryList.name] : [],
    };
  }, [groceryList, pendingItemDelete, recipes]);

  const deleteItemMessage = useMemo(() => {
    if (!pendingItemDelete) {
      return '';
    }

    const places = [
      ...itemUsage.recipes.map((name) => t('pantry.deleteItemRecipePlace', { name })),
      ...itemUsage.lists.map((name) => t('pantry.deleteItemListPlace', { name })),
    ];

    if (!places.length) {
      return t('pantry.deleteItemMessage', { name: pendingItemDelete.name });
    }

    return t('pantry.deleteItemUsedMessage', {
      name: pendingItemDelete.name,
      places: formatUsageList(places),
    });
  }, [itemUsage, pendingItemDelete, t]);

  useEffect(() => {
    if (!itemTypes.length) {
      return;
    }

    if (!itemTypes.includes(selectedTypeId)) {
      setSelectedTypeId(itemTypes[0]);
    }

    if (activeFilter !== 'all' && !itemTypes.includes(activeFilter)) {
      setActiveFilter('all');
    }
  }, [activeFilter, itemTypes, selectedTypeId]);

  const typeCounts = useMemo(
    () =>
      itemTypes.reduce<Record<string, number>>((counts, typeId) => {
        counts[typeId] = items.filter((item) => item.sectionId === typeId).length;
        return counts;
      }, {}),
    [itemTypes, items],
  );

  useEffect(() => {
    if (!isRTL) {
      return;
    }

    requestAnimationFrame(() => {
      filterScrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [isRTL, itemTypes.length]);

  const visibleItems = useMemo(() => {
    const scoped = activeFilter === 'all' ? items : items.filter((item) => item.sectionId === activeFilter);
    const query = searchQuery.trim().toLowerCase();

    const filtered = !query
      ? scoped
      : scoped.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.sectionId.toLowerCase().includes(query) ||
            (item.unitLabel ?? '').toLowerCase().includes(query),
        );

    return filtered.sort((left, right) => left.name.localeCompare(right.name));
  }, [activeFilter, items, searchQuery]);

  const resetItemEditor = () => {
    setEditingItemId(null);
    setName('');
    setUnitLabel('');
    setSelectedColors(['#4F8B3D']);
    setStatusMessage(null);
  };

  const toggleColor = (color: string) => {
    setSelectedColors((currentColors) => {
      if (currentColors.includes(color)) {
        if (currentColors.length === 1) {
          setStatusMessage(t('pantry.status.needsOneColor'));
          return currentColors;
        }

        return currentColors.filter((entry) => entry !== color);
      }

      return [...currentColors, color];
    });
  };

  const startItemEdit = (item: QuickSelectItem) => {
    setEditingItemId(item.id);
    setName(item.name);
    setUnitLabel(item.unitLabel ?? '');
    setSelectedTypeId(item.sectionId);
    setSelectedColors(item.colors.length ? item.colors : ['#4F8B3D']);
    setStatusMessage(t('pantry.status.editingItem', { name: item.name }));
  };

  const submitItem = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setStatusMessage(t('pantry.status.itemNameRequired'));
      return;
    }

    if (!selectedColors.length) {
      setStatusMessage(t('pantry.status.pickOneColor'));
      return;
    }

    if (editingItemId) {
      const updated = await onUpdateItem(editingItemId, {
        name: trimmedName,
        sectionId: selectedTypeId,
        unitLabel: unitLabel.trim() || undefined,
        colors: selectedColors,
      });

      if (!updated) {
        setStatusMessage(t('pantry.status.itemSaveFailed'));
        return;
      }

      setStatusMessage(t('pantry.status.itemSaved', { name: trimmedName }));
      resetItemEditor();
      return;
    }

    const added = await onAddItem({
      name: trimmedName,
      sectionId: selectedTypeId,
      unitLabel: unitLabel.trim() || undefined,
      colors: selectedColors,
    });

    if (!added) {
      setStatusMessage(t('pantry.status.itemExists'));
      return;
    }

    setStatusMessage(t('pantry.status.itemAdded', { name: trimmedName }));
    resetItemEditor();
  };

  const openCreateType = () => {
    setEditingTypeId(null);
    setTypeDraft('');
    setShowTypeEditor(true);
    setStatusMessage(null);
  };

  const startTypeEdit = (typeId: GrocerySectionId) => {
    setEditingTypeId(typeId);
    setTypeDraft(formatTypeLabel(typeId));
    setShowTypeEditor(true);
    setStatusMessage(t('pantry.status.editingType', { name: formatTypeLabel(typeId) }));
  };

  const cancelTypeEdit = () => {
    setEditingTypeId(null);
    setTypeDraft('');
    setShowTypeEditor(false);
  };

  const submitType = async () => {
    if (editingTypeId) {
      const nextTypeId = await onRenameType(editingTypeId, typeDraft);

      if (!nextTypeId) {
        setStatusMessage(t('pantry.status.renameTypeFailed'));
        return;
      }

      if (selectedTypeId === editingTypeId) {
        setSelectedTypeId(nextTypeId);
      }

      if (activeFilter === editingTypeId) {
        setActiveFilter(nextTypeId);
      }

      setStatusMessage(t('pantry.status.typeRenamed', { name: formatTypeLabel(nextTypeId) }));
      cancelTypeEdit();
      return;
    }

    const nextTypeId = await onAddType(typeDraft);

    if (!nextTypeId) {
      setStatusMessage(t('pantry.status.addTypeFailed'));
      return;
    }

    setSelectedTypeId(nextTypeId);
    setActiveFilter(nextTypeId);
    setStatusMessage(t('pantry.status.typeAdded', { name: formatTypeLabel(nextTypeId) }));
    cancelTypeEdit();
  };

  const confirmDeleteItem = async () => {
    if (!pendingItemDelete) {
      return;
    }

    const deleted = await onDeleteItem(pendingItemDelete.id);

    if (deleted) {
      if (editingItemId === pendingItemDelete.id) {
        resetItemEditor();
      }

      setStatusMessage(t('pantry.status.itemDeleted', { name: pendingItemDelete.name }));
    } else {
      setStatusMessage(t('pantry.status.deleteItemFailed'));
    }

    setPendingItemDelete(null);
  };

  const confirmDeleteType = async () => {
    if (!pendingTypeDelete) {
      return;
    }

    const deleted = await onDeleteType(pendingTypeDelete.id);

    if (!deleted) {
      setStatusMessage(t('pantry.status.keepOneType'));
      setPendingTypeDelete(null);
      return;
    }

    const fallback = itemTypes.find((typeId) => typeId !== pendingTypeDelete.id) ?? null;

    if (fallback && selectedTypeId === pendingTypeDelete.id) {
      setSelectedTypeId(fallback);
    }

    if (activeFilter === pendingTypeDelete.id) {
      setActiveFilter('all');
    }

    if (editingTypeId === pendingTypeDelete.id) {
      cancelTypeEdit();
    }

    setStatusMessage(t('pantry.status.typeDeleted', { name: pendingTypeDelete.label }));
    setPendingTypeDelete(null);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('pantry.title')}</Text>
        <Text style={styles.subtitle}>{t('pantry.subtitle')}</Text>

        {statusMessage ? <Text style={styles.statusBanner}>{statusMessage}</Text> : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{editingItemId ? t('pantry.editItem') : t('pantry.addItem')}</Text>
            {editingItemId ? <Text style={styles.sectionMeta}>{t('pantry.editingItemHint')}</Text> : null}
          </View>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('pantry.itemNamePlaceholder')}
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.input}
          />

          <TextInput
            value={unitLabel}
            onChangeText={setUnitLabel}
            placeholder={t('pantry.itemUnitPlaceholder')}
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.input}
          />

          <Text style={styles.label}>{t('common.type')}</Text>
          <View style={styles.chipRow}>
            {itemTypes.map((typeId) => {
              const selected = typeId === selectedTypeId;

              return (
                <TouchableOpacity
                  key={typeId}
                  style={[styles.typeChip, selected && styles.typeChipSelected]}
                  onPress={() => setSelectedTypeId(typeId)}
                >
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                    {formatTypeLabel(typeId)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>{t('common.colors')}</Text>
          <View style={styles.paletteRow}>
            {colorPresets.map((color) => {
              const selected = selectedColors.includes(color);

              return (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorDot, { backgroundColor: color }, selected && styles.colorDotSelected]}
                  onPress={() => toggleColor(color)}
                >
                  {selected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={submitItem}>
              <Text style={styles.primaryButtonText}>{editingItemId ? t('common.save') : t('pantry.addItem')}</Text>
            </TouchableOpacity>
            {editingItemId ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={resetItemEditor}>
                <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>{t('pantry.manageTypesTitle')}</Text>
              <Text style={styles.sectionHelp}>{t('pantry.manageTypesHelp')}</Text>
            </View>
            <TouchableOpacity style={styles.ghostButton} onPress={openCreateType}>
              <Ionicons name="add" size={16} color={colors.accent} />
              <Text style={styles.ghostButtonText}>{t('pantry.addType')}</Text>
            </TouchableOpacity>
          </View>

          {showTypeEditor ? (
            <View style={styles.typeEditorCard}>
              <Text style={styles.typeEditorLabel}>{editingTypeId ? t('pantry.editingType') : t('pantry.newType')}</Text>
              <TextInput
                value={typeDraft}
                onChangeText={setTypeDraft}
                placeholder={t('pantry.typeNamePlaceholder')}
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.inputCompact}
              />
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.primaryButton} onPress={submitType}>
                  <Text style={styles.primaryButtonText}>{t('pantry.saveType')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={cancelTypeEdit}>
                  <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {itemTypes.map((typeId) => (
            <View key={typeId} style={styles.typeRow}>
              <View>
                <Text style={styles.typeName}>{formatTypeLabel(typeId)}</Text>
                <Text style={styles.typeCount}>{t('pantry.typeItemsCount', { count: typeCounts[typeId] ?? 0 })}</Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.rowActionButton} onPress={() => startTypeEdit(typeId)}>
                  <Ionicons name="create-outline" size={14} color={colors.accent} />
                  <Text style={styles.rowActionText}>{t('common.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rowDeleteButton}
                  onPress={() =>
                    setPendingTypeDelete({
                      id: typeId,
                      label: formatTypeLabel(typeId),
                      count: typeCounts[typeId] ?? 0,
                    })
                  }
                >
                  <Ionicons name="trash-outline" size={14} color="#9F3C2F" />
                  <Text style={styles.rowDeleteText}>{t('common.delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>{t('pantry.allItemsTitle')}</Text>
              <Text style={styles.sectionHelp}>{t('pantry.allItemsHelp')}</Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('pantry.searchItemsPlaceholder')}
              placeholderTextColor={colors.inputPlaceholder}
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            ref={filterScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>{t('common.all')}</Text>
            </TouchableOpacity>

            {itemTypes.map((typeId) => {
              const selected = activeFilter === typeId;

              return (
                <TouchableOpacity
                  key={typeId}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => setActiveFilter(typeId)}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                    {formatTypeLabel(typeId)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.itemListWrap}>
            {visibleItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemIdentity}>
                  <View style={styles.itemColorStack}>
                    {item.colors.slice(0, 3).map((color) => (
                      <View key={`${item.id}-${color}`} style={[styles.itemColorMini, { backgroundColor: color }]} />
                    ))}
                  </View>

                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemInfo}>
                      {formatTypeLabel(item.sectionId)}
                      {item.unitLabel ? `  •  ${item.unitLabel}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.rowActionButton} onPress={() => startItemEdit(item)}>
                    <Ionicons name="create-outline" size={14} color={colors.accent} />
                    <Text style={styles.rowActionText}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rowDeleteButton}
                    onPress={() => setPendingItemDelete({ id: item.id, name: item.name })}
                  >
                    <Ionicons name="trash-outline" size={14} color={themeName === 'dark' ? '#D67A6D' : '#9F3C2F'} />
                    <Text style={styles.rowDeleteText}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {!visibleItems.length ? <Text style={styles.emptyText}>{t('pantry.noItemsFiltered')}</Text> : null}
          </View>
        </View>
      </ScrollView>

      <ConfirmActionModal
        visible={pendingItemDelete !== null}
        title={t('pantry.deleteItemTitle')}
        message={deleteItemMessage}
        confirmLabel={t('common.delete')}
        onCancel={() => setPendingItemDelete(null)}
        onConfirm={confirmDeleteItem}
      />

      <ConfirmActionModal
        visible={pendingTypeDelete !== null}
        title={t('pantry.deleteTypeTitle')}
        message={
          pendingTypeDelete
            ? t('pantry.deleteTypeMessage', { label: pendingTypeDelete.label, count: pendingTypeDelete.count })
            : ''
        }
        confirmLabel={t('common.delete')}
        onCancel={() => setPendingTypeDelete(null)}
        onConfirm={confirmDeleteType}
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
  title: {
    color: colors.title,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: isRTL ? 'right' : 'left',
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 14,
    textAlign: isRTL ? 'right' : 'left',
  },
  statusBanner: {
    borderRadius: radius.sm,
    backgroundColor: isDark ? colors.accentSoft : '#EAF1E7',
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
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
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: isRTL ? 'right' : 'left',
  },
  sectionMeta: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 3,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  sectionHelp: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
    textAlign: isRTL ? 'right' : 'left',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
  inputCompact: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
  chipRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  typeChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  typeChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  typeChipTextSelected: {
    color: colors.white,
  },
  paletteRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  colorDotSelected: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  actionRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
    textAlign: isRTL ? 'right' : 'left',
  },
  secondaryButton: {
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    textAlign: isRTL ? 'right' : 'left',
  },
  ghostButton: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 5,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ghostButtonText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 12,
    textAlign: isRTL ? 'right' : 'left',
  },
  typeEditorCard: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 8,
  },
  typeEditorLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: isRTL ? 'right' : 'left',
  },
  typeRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
  },
  typeName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  typeCount: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    textAlign: isRTL ? 'right' : 'left',
  },
  rowActions: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 6,
  },
  rowActionButton: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActionText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  rowDeleteButton: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: isDark ? '#4A2A26' : '#F9E8E4',
    borderWidth: 1,
    borderColor: isDark ? '#7A4A44' : '#E6C2BB',
  },
  rowDeleteText: {
    color: '#9F3C2F',
    fontSize: 11,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  searchWrap: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 10,
    textAlign: isRTL ? 'right' : 'left',
  },
  filterRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    paddingBottom: 10,
    alignItems: 'center',
  },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: isRTL ? 0 : 8,
    marginLeft: isRTL ? 8 : 0,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    textAlign: isRTL ? 'right' : 'left',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  itemListWrap: {
    gap: 6,
  },
  itemRow: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemIdentity: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: isRTL ? 0 : 8,
    paddingLeft: isRTL ? 8 : 0,
  },
  itemColorStack: {
    width: 34,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginRight: isRTL ? 0 : 8,
    marginLeft: isRTL ? 8 : 0,
  },
  itemColorMini: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(38, 48, 38, 0.12)',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  itemInfo: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    textAlign: isRTL ? 'right' : 'left',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 18,
  },
});