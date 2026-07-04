import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { GroceryList, Recipe } from '../types';

type AddToListModalProps = {
  recipe: Recipe | null;
  groceryList: GroceryList;
  selectedIngredientIds: string[];
  visible: boolean;
  onClose: () => void;
  onToggleIngredient: (ingredientId: string) => void;
  onConfirm: () => void;
};

export function AddToListModal({
  recipe,
  groceryList,
  selectedIngredientIds,
  visible,
  onClose,
  onToggleIngredient,
  onConfirm,
}: AddToListModalProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);

  if (!recipe) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('addToList.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>{t('addToList.helper', { count: recipe.ingredients.length })}</Text>
          <View style={styles.storeSelect}>
            <Ionicons name="cart-outline" size={14} color={colors.text} />
            <Text style={styles.storeText}>{groceryList.name}</Text>
          </View>

          <ScrollView style={styles.listWrap} showsVerticalScrollIndicator={false}>
            {recipe.ingredients.map((ingredient) => {
              const selected = selectedIngredientIds.includes(ingredient.id);

              return (
                <TouchableOpacity
                  key={ingredient.id}
                  style={styles.row}
                  onPress={() => onToggleIngredient(ingredient.id)}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                    {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                  </View>
                  <Text style={styles.rowText}>{ingredient.name} ({ingredient.amount})</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={onConfirm}>
            <Text style={styles.buttonText}>{t('addToList.submit', { count: selectedIngredientIds.length })}</Text>
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
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
  },
  headerRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: isRTL ? 'right' : 'left',
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  helperText: {
    color: colors.textSoft,
    fontSize: 13,
    marginBottom: 10,
    textAlign: isRTL ? 'right' : 'left',
  },
  storeSelect: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  storeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: isRTL ? 'right' : 'left',
  },
  listWrap: {
    maxHeight: 280,
  },
  row: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingVertical: 8,
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
  rowText: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
    textAlign: isRTL ? 'right' : 'left',
  },
  button: {
    marginTop: 16,
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
