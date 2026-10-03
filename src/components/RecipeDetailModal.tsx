import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ConfirmActionModal } from './ConfirmActionModal';
import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { QuickSelectItem, Recipe } from '../types';
import { resolveItemName } from '../utils/grocery';

type RecipeDetailModalProps = {
  recipe: Recipe | null;
  catalogItems: QuickSelectItem[];
  favorite: boolean;
  visible: boolean;
  onClose: () => void;
  onAddToList: (recipe: Recipe) => void;
  onShare: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onEdit: () => void;
  onDelete: (recipeId: string) => void | Promise<void>;
};

export function RecipeDetailModal({
  recipe,
  catalogItems,
  favorite,
  visible,
  onClose,
  onAddToList,
  onShare,
  onToggleFavorite,
  onEdit,
  onDelete,
}: RecipeDetailModalProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  if (!recipe) {
    return null;
  }

  const close = () => {
    setShowDeleteConfirmation(false);
    onClose();
  };
  const hasImage = recipe.image.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.sheet}>
          {hasImage ? (
            <Image source={{ uri: recipe.image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.imagePlaceholderText} />
              <Text style={styles.imagePlaceholderText}>{t('recipeDetail.addPhoto')}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={close}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <View style={styles.titleWrap}>
                <Text style={styles.title}>{recipe.title}</Text>
                <Text style={styles.subtitle}>{recipe.subtitle}</Text>
                <Text style={styles.meta}>{recipe.time}  •  {recipe.difficulty}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.deleteCircleButton} onPress={() => onShare(recipe)}>
                  <Ionicons name="share-outline" size={17} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteCircleButton} onPress={() => setShowDeleteConfirmation(true)}>
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.heartButton, favorite && styles.heartButtonActive]} onPress={() => onToggleFavorite(recipe.id)}>
                  <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? colors.white : colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.description}>{recipe.description}</Text>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('recipeDetail.ingredients')}</Text>
              <Text style={styles.servings}>{recipe.servings}</Text>
            </View>

            {recipe.ingredients.map((ingredient) => (
              <View key={ingredient.id} style={styles.ingredientRow}>
                <Text style={styles.ingredientText}>
                  {ingredient.amount} {resolveItemName(catalogItems, ingredient.itemId, ingredient.name)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color={colors.accent} />
              <Text style={styles.secondaryButtonText}>{t('common.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => onAddToList(recipe)}>
              <Ionicons name="cart-outline" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>{t('recipeDetail.addToList')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <ConfirmActionModal
        visible={showDeleteConfirmation}
        title={t('recipeDetail.deleteTitle')}
        message={t('recipeDetail.deleteMessage', { name: recipe.title })}
        confirmLabel={t('common.delete')}
        onCancel={() => setShowDeleteConfirmation(false)}
        onConfirm={async () => {
          try {
            await onDelete(recipe.id);
            close();
          } catch {
            return;
          }
        }}
      />
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isRTL: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '84%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: colors.imagePlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: colors.imagePlaceholderText,
    fontSize: 14,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: isRTL ? undefined : 14,
    left: isRTL ? 14 : undefined,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.startIconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 18,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
    paddingRight: isRTL ? 0 : 12,
    paddingLeft: isRTL ? 12 : 0,
  },
  title: {
    color: colors.title,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: isRTL ? 'right' : 'left',
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 14,
    marginTop: 6,
    textAlign: isRTL ? 'right' : 'left',
  },
  meta: {
    color: colors.textSoft,
    fontSize: 13,
    marginTop: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
  heartButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  description: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    textAlign: isRTL ? 'right' : 'left',
  },
  sectionHeader: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    textAlign: isRTL ? 'right' : 'left',
  },
  servings: {
    color: colors.textSoft,
    fontSize: 13,
    textAlign: isRTL ? 'right' : 'left',
  },
  ingredientRow: {
    paddingVertical: 8,
  },
  ingredientText: {
    color: colors.text,
    fontSize: 14,
    textAlign: isRTL ? 'right' : 'left',
  },
  footerRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 10,
    marginHorizontal: 18,
    marginBottom: 18,
  },
  secondaryButton: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  headerActions: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
  },
  deleteCircleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  actionButton: {
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 8,
    flex: 1,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
