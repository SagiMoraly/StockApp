import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
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

import { ItemPickerModal } from './ItemPickerModal';
import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { GroceryList, GrocerySectionId, QuickSelectItem } from '../types';

type GroceryListEditModalProps = {
  visible: boolean;
  groceryList: GroceryList;
  quickSelectItems: QuickSelectItem[];
  onClose: () => void;
  onAddCustomItem: (name: string, quantity: string, sectionId: GrocerySectionId) => void;
  onRemoveItem: (itemId: string) => void;
};

export function GroceryListEditModal({
  visible,
  groceryList,
  quickSelectItems,
  onClose,
  onAddCustomItem,
  onRemoveItem,
}: GroceryListEditModalProps) {
  const { colors, themeName } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, themeName === 'dark', isRTL), [colors, themeName, isRTL]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedSection, setSelectedSection] = useState<GrocerySectionId>('produce');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showItemPicker, setShowItemPicker] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName('');
    setQuantity('1');
    setSelectedSection(groceryList.sections[0]?.id ?? 'produce');
    setSelectedItemId(null);
  }, [groceryList.sections, visible]);

  const submit = () => {
    if (!name.trim()) {
      return;
    }

    onAddCustomItem(name, quantity, selectedSection);
    setName('');
    setQuantity('1');
    setSelectedItemId(null);
  };

  const selectedItem = quickSelectItems.find((item) => item.id === selectedItemId) ?? null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('listEdit.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.doneText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>{t('listEdit.newItemSection')}</Text>
            <TouchableOpacity style={styles.pickerField} onPress={() => setShowItemPicker(true)}>
              <View>
                <Text style={styles.pickerLabel}>{t('listEdit.availableItemsLabel')}</Text>
                <Text style={selectedItem ? styles.pickerValue : styles.pickerPlaceholder}>
                  {selectedItem ? selectedItem.name : t('listEdit.chooseSharedItems')}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.accent} />
            </TouchableOpacity>
            <Text style={styles.helperText}>{t('listEdit.helper')}</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder={t('common.quantity')}
              placeholderTextColor={colors.inputPlaceholder}
              style={styles.input}
            />

            <View style={styles.sectionChips}>
              {groceryList.sections.map((section) => {
                const selected = section.id === selectedSection;

                return (
                  <TouchableOpacity
                    key={section.id}
                    style={[styles.sectionChip, selected && styles.sectionChipSelected]}
                    onPress={() => setSelectedSection(section.id)}
                  >
                    <Text style={[styles.sectionChipText, selected && styles.sectionChipTextSelected]}>
                      {section.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.addButton} onPress={submit}>
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={styles.addButtonText}>{t('pantry.addItem')}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>{t('listEdit.currentItems')}</Text>
            {groceryList.sections.map((section) => (
              <View key={section.id} style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>{section.title}</Text>
                {section.items.length ? (
                  section.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemTextWrap}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQuantity}>{item.quantity}</Text>
                      </View>
                      <TouchableOpacity style={styles.removeButton} onPress={() => onRemoveItem(item.id)}>
                        <Ionicons name="remove" size={16} color={themeName === 'dark' ? '#D67A6D' : '#9F3C2F'} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>{t('listEdit.emptySection')}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      <ItemPickerModal
        visible={showItemPicker}
        title={t('itemPicker.chooseItem')}
        items={quickSelectItems}
        selectedItemId={selectedItemId}
        onClose={() => setShowItemPicker(false)}
        onSelect={(item) => {
          setSelectedItemId(item.id);
          setName(item.name);
          setQuantity(item.unitLabel ? `1 ${item.unitLabel}` : '');
          setSelectedSection(item.sectionId);
          setShowItemPicker(false);
        }}
      />
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
    maxHeight: '82%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: isRTL ? 'right' : 'left',
  },
  doneText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    padding: 18,
    paddingBottom: 30,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: isRTL ? 'right' : 'left',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
    textAlign: isRTL ? 'right' : 'left',
  },
  pickerField: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    textAlign: isRTL ? 'right' : 'left',
  },
  pickerValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  pickerPlaceholder: {
    color: colors.inputPlaceholder,
    fontSize: 15,
    fontWeight: '600',
    textAlign: isRTL ? 'right' : 'left',
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
    textAlign: isRTL ? 'right' : 'left',
  },
  sectionChips: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  sectionChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: isRTL ? 'right' : 'left',
  },
  sectionChipTextSelected: {
    color: '#FFFFFF',
  },
  addButton: {
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
    marginBottom: 20,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
    textAlign: isRTL ? 'right' : 'left',
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  sectionLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
  itemRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemTextWrap: {
    flex: 1,
    paddingRight: isRTL ? 0 : 12,
    paddingLeft: isRTL ? 12 : 0,
  },
  itemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: isRTL ? 'right' : 'left',
  },
  itemQuantity: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
    textAlign: isRTL ? 'right' : 'left',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: isDark ? '#4A2A26' : '#F9E8E4',
    borderWidth: 1,
    borderColor: isDark ? '#7A4A44' : '#E6C2BB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: isRTL ? 'right' : 'left',
  },
});