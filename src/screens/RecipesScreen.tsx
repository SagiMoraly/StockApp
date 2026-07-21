import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RecipeCard } from '../components/RecipeCard';
import { useI18n } from '../LocalizationProvider';
import { SearchField } from '../components/SearchField';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { Recipe, RecipeCategory, RecipeFilter } from '../types';

type RecipesScreenProps = {
  searchQuery: string;
  selectedFilter: RecipeFilter;
  categories: readonly RecipeCategory[];
  recipes: Recipe[];
  favoriteRecipeIds: string[];
  onSearchQueryChange: (value: string) => void;
  onFilterChange: (filter: RecipeFilter) => void;
  onRecipePress: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onAddRecipePress: () => void;
  onImportRecipePress: () => void;
};

export function RecipesScreen({
  searchQuery,
  selectedFilter,
  categories,
  recipes,
  favoriteRecipeIds,
  onSearchQueryChange,
  onFilterChange,
  onRecipePress,
  onToggleFavorite,
  onAddRecipePress,
  onImportRecipePress,
}: RecipesScreenProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);
  const categoriesScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isRTL) {
      return;
    }

    requestAnimationFrame(() => {
      categoriesScrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [isRTL, categories.length]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('recipes.title')}</Text>
        <View style={styles.titleActions}>
          <TouchableOpacity
            style={styles.iconActionButton}
            onPress={onImportRecipePress}
            accessibilityRole="button"
            accessibilityLabel={t('common.import')}
          >
            <Ionicons name="download-outline" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconActionButton, styles.primaryIconActionButton]}
            onPress={onAddRecipePress}
            accessibilityRole="button"
            accessibilityLabel={t('recipes.addButton')}
          >
            <Ionicons name="add" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <SearchField
        value={searchQuery}
        onChangeText={onSearchQueryChange}
        placeholder={t('recipes.searchPlaceholder')}
      />

      <ScrollView
        ref={categoriesScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesRow}
        contentContainerStyle={styles.categoriesRowContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, selectedFilter === 'Favorites' && styles.activeCategoryChip]}
          onPress={() => onFilterChange('Favorites')}
        >
          <Ionicons
            name={selectedFilter === 'Favorites' ? 'heart' : 'heart-outline'}
            size={14}
            color={selectedFilter === 'Favorites' ? '#FFFFFF' : colors.accent}
          />
          <Text style={[styles.categoryLabel, selectedFilter === 'Favorites' && styles.activeCategoryLabel]}>
            {t('recipes.favorites')} ({favoriteRecipeIds.length})
          </Text>
        </TouchableOpacity>

        {categories.map((category) => {
          const isActive = category === selectedFilter;

          return (
            <TouchableOpacity
              key={category}
              style={[styles.categoryChip, isActive && styles.activeCategoryChip]}
              onPress={() => onFilterChange(category)}
            >
              <Text style={[styles.categoryLabel, isActive && styles.activeCategoryLabel]}>{t(`category.${category}`)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.listWrap}>
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onPress={onRecipePress}
            favorite={favoriteRecipeIds.includes(recipe.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}

        {!recipes.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('recipes.noRecipesTitle')}</Text>
            <Text style={styles.emptyState}>{t('recipes.noRecipesText')}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isRTL: boolean) => StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 58,
    paddingBottom: 116,
  },
  titleRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  titleActions: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryIconActionButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  title: {
    color: colors.title,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    textAlign: isRTL ? 'right' : 'left',
  },
  categoriesRow: {
    marginTop: 16,
    marginBottom: 18,
  },
  categoriesRowContent: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
  },
  categoryChip: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: isRTL ? 0 : 8,
    marginLeft: isRTL ? 8 : 0,
  },
  activeCategoryChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryLabel: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  activeCategoryLabel: {
    color: colors.white,
  },
  listWrap: {
    paddingBottom: 6,
  },
  emptyCard: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyState: {
    textAlign: 'center',
    color: colors.textMuted,
    lineHeight: 20,
  },
});
