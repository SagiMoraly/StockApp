import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import { QuickSelectItem, Recipe, RecipeCategory, RecipeIngredient } from '../types';
import { normalizeQuantity, parseAmount } from '../utils/grocery';

type RecipePayload = Pick<
  Recipe,
  'title' | 'subtitle' | 'description' | 'time' | 'difficulty' | 'servings' | 'category' | 'image' | 'ingredients'
>;

type DraftIngredient = {
  id: string;
  name: string;
  quantity: number;
  quantityDraft: string;
  sectionId?: string;
  quickItemId?: string;
  unitLabel?: string;
};

const difficultyOptions = ['Easy', 'Medium', 'Hard'] as const;

const fallbackImage = '';

const composeAmount = (quantity: number, unitLabel?: string) =>
  unitLabel ? `${quantity} ${unitLabel}` : `${quantity}`;

const extractLeadingNumber = (value: string, fallback: number) => {
  const match = value.match(/\d+/);

  if (!match) {
    return String(fallback);
  }

  return String(normalizeQuantity(Number(match[0])));
};

const normalizeNumberDraft = (value: string, fallback: string) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return String(normalizeQuantity(parsed));
};

const toDraftIngredient = (ingredient: RecipeIngredient, quickItems: QuickSelectItem[]): DraftIngredient => {
  const matchedQuickItem =
    quickItems.find((item) => ingredient.quickItemId && item.id === ingredient.quickItemId) ??
    quickItems.find((item) => item.name.toLowerCase() === ingredient.name.toLowerCase());
  const parsedAmount = parseAmount(ingredient.amount);
  const quantity = normalizeQuantity(parsedAmount.quantity);

  return {
    id: ingredient.id,
    name: ingredient.name,
    quantity,
    quantityDraft: String(quantity),
    sectionId: ingredient.sectionId ?? matchedQuickItem?.sectionId,
    quickItemId: ingredient.quickItemId ?? matchedQuickItem?.id,
    unitLabel: ingredient.unitLabel ?? matchedQuickItem?.unitLabel ?? parsedAmount.unitLabel,
  };
};

type RecipeEditModalProps = {
  visible: boolean;
  recipe: Recipe | null;
  mode: 'create' | 'edit';
  categories: readonly RecipeCategory[];
  quickSelectItems: QuickSelectItem[];
  onClose: () => void;
  onSave: (recipeId: string, updates: RecipePayload) => void;
  onCreate: (recipeDraft: RecipePayload) => void;
};

export function RecipeEditModal({
  visible,
  recipe,
  mode,
  categories,
  quickSelectItems,
  onClose,
  onSave,
  onCreate,
}: RecipeEditModalProps) {
  const { colors, themeName } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, themeName === 'dark', isRTL), [colors, themeName, isRTL]);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeMinutes, setTimeMinutes] = useState('30');
  const [difficulty, setDifficulty] = useState('');
  const [servingsCount, setServingsCount] = useState('2');
  const [image, setImage] = useState(fallbackImage);
  const [category, setCategory] = useState<RecipeCategory>('Dinner');
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showDifficultyOptions, setShowDifficultyOptions] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>();

  useEffect(() => {
    if (!visible) {
      return;
    }

    const defaultCategory = categories.find((item) => item !== 'All') ?? 'Dinner';

    if (mode === 'create') {
      setTitle('');
      setSubtitle('');
      setDescription('');
      setTimeMinutes('30');
      setDifficulty('Easy');
      setServingsCount('2');
      setImage(fallbackImage);
      setCategory(defaultCategory);
      setIngredients([]);
      setShowDifficultyOptions(false);
      setSelectedItemId(undefined);
      return;
    }

    if (!recipe) {
      return;
    }

    setTitle(recipe.title);
    setSubtitle(recipe.subtitle);
    setDescription(recipe.description);
    setTimeMinutes(extractLeadingNumber(recipe.time, 30));
    setDifficulty(recipe.difficulty);
    setServingsCount(extractLeadingNumber(recipe.servings, 2));
    setImage(recipe.image || fallbackImage);
    setCategory(recipe.category);
    setIngredients(recipe.ingredients.map((ingredient) => toDraftIngredient(ingredient, quickSelectItems)));
    setShowDifficultyOptions(false);
    setSelectedItemId(undefined);
  }, [categories, mode, quickSelectItems, recipe, visible]);

  if (!visible) {
    return null;
  }

  const hasImage = image.trim().length > 0;

  const addQuickIngredient = (item: QuickSelectItem) => {
    setIngredients((currentIngredients) =>
      currentIngredients.some(
        (ingredient) =>
          ingredient.quickItemId === item.id || ingredient.name.toLowerCase() === item.name.toLowerCase(),
      )
        ? currentIngredients
        : [
            ...currentIngredients,
            {
              id: `${mode}-${item.id}-${currentIngredients.length + 1}`,
              name: item.name,
              quantity: 1,
              quantityDraft: '1',
              sectionId: item.sectionId,
              quickItemId: item.id,
              unitLabel: item.unitLabel,
            },
          ],
    );
    setSelectedItemId(item.id);
  };

  const adjustIngredientQuantity = (ingredientId: string, delta: number) => {
    setIngredients((currentIngredients) => [
      ...currentIngredients.map((ingredient) =>
        ingredient.id === ingredientId
          ? {
              ...ingredient,
              quantity: normalizeQuantity(ingredient.quantity + delta),
              quantityDraft: String(normalizeQuantity(ingredient.quantity + delta)),
            }
          : ingredient,
      ),
    ]);
  };

  const updateIngredientQuantityDraft = (ingredientId: string, value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '');

    setIngredients((currentIngredients) => {
      return currentIngredients.map((ingredient) =>
        ingredient.id === ingredientId ? { ...ingredient, quantityDraft: digitsOnly } : ingredient,
      );
    });
  };

  const commitIngredientQuantity = (ingredientId: string) => {
    setIngredients((currentIngredients) =>
      currentIngredients.map((ingredient) => {
        if (ingredient.id !== ingredientId) {
          return ingredient;
        }

        const parsedDraft = Number(ingredient.quantityDraft);
        const nextQuantity =
          Number.isFinite(parsedDraft) && parsedDraft > 0
            ? normalizeQuantity(parsedDraft)
            : normalizeQuantity(ingredient.quantity);

        return {
          ...ingredient,
          quantity: nextQuantity,
          quantityDraft: String(nextQuantity),
        };
      }),
    );
  };

  const removeIngredient = (ingredientId: string) => {
    setIngredients((currentIngredients) =>
      currentIngredients.filter((ingredient) => ingredient.id !== ingredientId),
    );
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(t('recipeEdit.permissionTitle'), t('recipeEdit.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length) {
      setImage(result.assets[0].uri);
    }
  };

  const submit = () => {
    const nextIngredients = ingredients
      .map((ingredient) => ({
        name: ingredient.name.trim(),
        amount: composeAmount(ingredient.quantity, ingredient.unitLabel),
        sectionId: ingredient.sectionId,
        quickItemId: ingredient.quickItemId,
        unitLabel: ingredient.unitLabel,
        id: ingredient.id,
      }))
      .filter((ingredient) => ingredient.name);

    const fallbackTitle = mode === 'edit' && recipe ? recipe.title : t('recipeEdit.untitled');
    const payload: RecipePayload = {
      title: title.trim() || fallbackTitle,
      subtitle: subtitle.trim() || (mode === 'edit' && recipe ? recipe.subtitle : ''),
      description: description.trim() || (mode === 'edit' && recipe ? recipe.description : ''),
      time: `${normalizeNumberDraft(timeMinutes, mode === 'edit' && recipe ? extractLeadingNumber(recipe.time, 30) : '30')} min`,
      difficulty: difficulty.trim() || (mode === 'edit' && recipe ? recipe.difficulty : 'Easy'),
      servings: `${normalizeNumberDraft(servingsCount, mode === 'edit' && recipe ? extractLeadingNumber(recipe.servings, 2) : '2')} servings`,
      category,
      image: image.trim(),
      ingredients: nextIngredients,
    };

    if (mode === 'create') {
      onCreate(payload);
      return;
    }

    if (!recipe) {
      return;
    }

    onSave(recipe.id, payload);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{mode === 'create' ? t('recipeEdit.addRecipe') : t('recipeEdit.editRecipe')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.doneText}>{mode === 'create' ? t('common.cancel') : t('common.close')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.imageWrap}>
              {hasImage ? (
                <Image source={{ uri: image }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={30} color="#6E746E" />
                  <Text style={styles.imagePlaceholderText}>{t('recipeDetail.addPhoto')}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.pickImageButton} onPress={() => void pickImage()}>
                <Ionicons name="image-outline" size={16} color={colors.accent} />
                <Text style={styles.pickImageText}>{t('recipeEdit.pickImage')}</Text>
              </TouchableOpacity>
            </View>

            <TextInput value={title} onChangeText={setTitle} placeholder={t('recipeEdit.titlePlaceholder')} placeholderTextColor={colors.inputPlaceholder} style={styles.input} />
            <TextInput value={subtitle} onChangeText={setSubtitle} placeholder={t('recipeEdit.subtitlePlaceholder')} placeholderTextColor={colors.inputPlaceholder} style={styles.input} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('recipeEdit.descriptionPlaceholder')}
              placeholderTextColor={colors.inputPlaceholder}
              style={[styles.input, styles.textArea]}
              multiline
            />

            <View style={styles.metaRow}>
              <View style={styles.metaField}>
                <Text style={styles.metaLabel}>{t('recipeEdit.time')}</Text>
                <View style={styles.metaInputRow}>
                  <TextInput
                    value={timeMinutes}
                    onChangeText={(value) => setTimeMinutes(value.replace(/[^0-9]/g, ''))}
                    onBlur={() =>
                      setTimeMinutes((currentValue) =>
                        normalizeNumberDraft(currentValue, mode === 'edit' && recipe ? extractLeadingNumber(recipe.time, 30) : '30'),
                      )
                    }
                    placeholder="30"
                    placeholderTextColor={colors.inputPlaceholder}
                    style={[styles.input, styles.metaInput, styles.metaNumberInput]}
                    keyboardType="number-pad"
                  />
                  <View style={styles.metaSuffixPill}>
                    <Text style={styles.metaSuffixText}>{t('recipeEdit.mins')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.metaField}>
                <Text style={styles.metaLabel}>{t('recipeEdit.difficulty')}</Text>
                <View style={styles.dropdownWrap}>
                  <TouchableOpacity
                    style={[styles.input, styles.metaInput, styles.dropdownInput]}
                    onPress={() => setShowDifficultyOptions((currentValue) => !currentValue)}
                  >
                    <Text style={styles.dropdownText}>{difficulty ? t(`difficulty.${difficulty}`) : t('recipeEdit.chooseDifficulty')}</Text>
                    <Ionicons
                      name={showDifficultyOptions ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textSoft}
                    />
                  </TouchableOpacity>
                  {showDifficultyOptions ? (
                    <View style={styles.dropdownMenu}>
                      {difficultyOptions.map((option) => {
                        const selected = option === difficulty;

                        return (
                          <TouchableOpacity
                            key={option}
                            style={[styles.dropdownOption, selected && styles.dropdownOptionSelected]}
                            onPress={() => {
                              setDifficulty(option);
                              setShowDifficultyOptions(false);
                            }}
                          >
                            <Text style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextSelected]}>{t(`difficulty.${option}`)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaField}>
                <Text style={styles.metaLabel}>{t('recipeEdit.servings')}</Text>
                <View style={styles.metaInputRow}>
                  <TextInput
                    value={servingsCount}
                    onChangeText={(value) => setServingsCount(value.replace(/[^0-9]/g, ''))}
                    onBlur={() =>
                      setServingsCount((currentValue) =>
                        normalizeNumberDraft(currentValue, mode === 'edit' && recipe ? extractLeadingNumber(recipe.servings, 2) : '2'),
                      )
                    }
                    placeholder="2"
                    placeholderTextColor={colors.inputPlaceholder}
                    style={[styles.input, styles.metaInput, styles.metaNumberInput]}
                    keyboardType="number-pad"
                  />
                  <View style={styles.metaSuffixPill}>
                    <Text style={styles.metaSuffixText}>{t('recipeEdit.servingsSuffix')}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('recipeEdit.category')}</Text>
            <View style={styles.categoryRow}>
              {categories.filter((item) => item !== 'All').map((item) => {
                const selected = item === category;

                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    onPress={() => setCategory(item)}
                  >
                    <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{t(`category.${item}`)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.ingredientHeader}>
              <Text style={styles.sectionTitle}>{t('recipeEdit.ingredients')}</Text>
              <View style={styles.ingredientActions}>
                <TouchableOpacity style={styles.inlineAddButton} onPress={() => setShowItemPicker(true)}>
                  <Ionicons name="chevron-down-circle-outline" size={16} color={colors.accent} />
                  <Text style={styles.inlineAddText}>{t('recipeEdit.chooseItem')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {ingredients.map((ingredient) => (
              <View key={ingredient.id} style={styles.ingredientCard}>
                <View style={styles.ingredientInfoRow}>
                  <View style={styles.ingredientTextWrap}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientUnit}>{ingredient.unitLabel ? ingredient.unitLabel : t('recipeEdit.countUnit')}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeIngredient(ingredient.id)}>
                    <Ionicons name="trash-outline" size={16} color="#9F3C2F" />
                  </TouchableOpacity>
                </View>

                <View style={styles.quantityControlRow}>
                  <TouchableOpacity style={styles.quantityStepButton} onPress={() => adjustIngredientQuantity(ingredient.id, -1)}>
                    <Ionicons name="remove" size={14} color={colors.text} />
                  </TouchableOpacity>
                  <TextInput
                    value={ingredient.quantityDraft}
                    onChangeText={(value) => updateIngredientQuantityDraft(ingredient.id, value)}
                    onBlur={() => commitIngredientQuantity(ingredient.id)}
                    keyboardType="number-pad"
                    style={styles.quantityInput}
                    textAlign="center"
                  />
                  <TouchableOpacity style={styles.quantityStepButton} onPress={() => adjustIngredientQuantity(ingredient.id, 1)}>
                    <Ionicons name="add" size={14} color={colors.text} />
                  </TouchableOpacity>
                  <View style={styles.unitPill}>
                    <Text style={styles.unitPillText}>{ingredient.unitLabel ? ingredient.unitLabel : t('recipeEdit.itemUnit')}</Text>
                  </View>
                </View>
              </View>
            ))}

            {!ingredients.length ? <Text style={styles.emptyIngredients}>{t('recipeEdit.emptyIngredients')}</Text> : null}
          </ScrollView>

          <TouchableOpacity style={styles.saveButton} onPress={submit}>
            <Text style={styles.saveButtonText}>{mode === 'create' ? t('recipeEdit.createRecipe') : t('recipeEdit.saveRecipe')}</Text>
          </TouchableOpacity>
        </View>

        <ItemPickerModal
          visible={showItemPicker}
          title={t('itemPicker.chooseItem')}
          items={quickSelectItems}
          selectedItemId={selectedItemId}
          onClose={() => setShowItemPicker(false)}
          onSelect={(item) => {
            addQuickIngredient(item);
            setShowItemPicker(false);
          }}
        />
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
    maxHeight: '90%',
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
  imageWrap: {
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 10,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: colors.imagePlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: colors.imagePlaceholderText,
    fontSize: 14,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  pickImageButton: {
    alignSelf: isRTL ? 'flex-end' : 'flex-start',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  pickImageText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
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
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  metaRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 10,
  },
  metaField: {
    flex: 1,
  },
  dropdownWrap: {
    position: 'relative',
    zIndex: 20,
  },
  metaLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: isRTL ? 'right' : 'left',
  },
  metaInputRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaInput: {
    flex: 1,
  },
  metaNumberInput: {
    marginBottom: 0,
  },
  metaSuffixPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaSuffixText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownInput: {
    marginBottom: 0,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    color: colors.text,
    fontSize: 14,
    textAlign: isRTL ? 'right' : 'left',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 52,
    left: isRTL ? undefined : 0,
    right: isRTL ? 0 : undefined,
    minWidth: '100%',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    zIndex: 30,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.accentSoft,
  },
  dropdownOptionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: isRTL ? 'right' : 'left',
  },
  dropdownOptionTextSelected: {
    color: colors.accent,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
    textAlign: isRTL ? 'right' : 'left',
  },
  categoryRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: isRTL ? 'right' : 'left',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  ingredientHeader: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientActions: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
  },
  inlineAddButton: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineAddText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
    textAlign: isRTL ? 'right' : 'left',
  },
  ingredientCard: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  ingredientInfoRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientTextWrap: {
    flex: 1,
  },
  ingredientName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: isRTL ? 'right' : 'left',
  },
  ingredientUnit: {
    color: colors.textSoft,
    fontSize: 12,
    marginTop: 2,
    textAlign: isRTL ? 'right' : 'left',
  },
  quantityControlRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityStepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  quantityInput: {
    width: 62,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  unitPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unitPillText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: isDark ? '#4A2A26' : '#F9E8E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIngredients: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    paddingBottom: 18,
    textAlign: isRTL ? 'right' : 'left',
  },
  saveButton: {
    margin: 18,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});