import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SearchField } from '../components/SearchField';
import { useI18n } from '../LocalizationProvider';
import { RecipeCard } from '../components/RecipeCard';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { GroceryList, QuickSelectItem, Recipe } from '../types';
import { getListCounts, resolveItemName } from '../utils/grocery';

type HomeScreenProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  recipes: Recipe[];
  groceryList: GroceryList;
  catalogItems: QuickSelectItem[];
  onRecipePress: (recipe: Recipe) => void;
  onBrowseRecipes: () => void;
  onOpenList: () => void;
  onOpenItems: () => void;
  onOpenThemeSettings: () => void;
};

export function HomeScreen({
  searchQuery,
  onSearchQueryChange,
  recipes,
  groceryList,
  catalogItems,
  onRecipePress,
  onBrowseRecipes,
  onOpenList,
  onOpenItems,
  onOpenThemeSettings,
}: HomeScreenProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);
  const recipeScrollRef = useRef<ScrollView>(null);
  const counts = getListCounts(groceryList);
  const previewItems = groceryList.sections.flatMap((section) => section.items).slice(0, 4);
  const recentRecipes = recipes.slice(0, 3);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('home.greetingMorning') : hour < 18 ? t('home.greetingAfternoon') : t('home.greetingEvening');

  useEffect(() => {
    if (!isRTL || !recentRecipes.length) {
      return;
    }

    requestAnimationFrame(() => {
      recipeScrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [isRTL, recentRecipes.length]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
          <Text style={styles.logo}>StockApp</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onOpenThemeSettings}
          accessibilityRole="button"
            accessibilityLabel={t('home.openAppearanceSettingsA11y')}
          activeOpacity={0.9}
        >
          <Ionicons name="settings-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.heading}>{t('home.heading')}</Text>

      <SearchField
        value={searchQuery}
        onChangeText={onSearchQueryChange}
        placeholder={t('home.searchPlaceholder')}
      />

      <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={[styles.quickCard, styles.quickBrowse]} onPress={onBrowseRecipes}>
          <MaterialCommunityIcons name="book-open-page-variant-outline" size={20} color={colors.accent} />
          <Text style={styles.quickText}>{t('home.browseRecipes')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.quickCard, styles.quickList]} onPress={onOpenList}>
          <MaterialCommunityIcons name="playlist-plus" size={20} color={colors.quickListIcon} />
          <Text style={styles.quickText}>{t('home.createGroceryList')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.startItemsCard} activeOpacity={0.92} onPress={onOpenItems}>
        <View style={styles.startItemsTextWrap}>
          <Text style={styles.startItemsTitle}>{t('home.startStaplesTitle')}</Text>
          <Text style={styles.startItemsText}>{t('home.startStaplesText')}</Text>
        </View>
        <View style={styles.startItemsIconWrap}>
          <MaterialCommunityIcons name="fridge-outline" size={24} color={colors.white} />
        </View>
      </TouchableOpacity>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t('home.recentRecipes')}</Text>
        <TouchableOpacity onPress={onBrowseRecipes}>
          <Text style={styles.link}>{t('home.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      {recentRecipes.length ? (
        <ScrollView
          ref={recipeScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.recipeScroll}
          contentContainerStyle={styles.recipeScrollContent}
        >
          {recentRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onPress={onRecipePress} compact />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptySectionCard}>
          <Text style={styles.emptySectionTitle}>{t('home.noRecipesTitle')}</Text>
          <Text style={styles.emptySectionText}>{t('home.noRecipesText')}</Text>
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t('home.yourUpcomingList')}</Text>
        <TouchableOpacity onPress={onOpenList}>
          <Text style={styles.link}>{t('home.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.listCard} activeOpacity={0.92} onPress={onOpenList}>
        <View style={styles.listCardTop}>
          <View style={styles.listIconWrap}>
            <Ionicons name="cart-outline" size={18} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.listName}>{groceryList.name}</Text>
            <Text style={styles.listMeta}>{t('home.listItemsCount', { count: counts.total })}</Text>
          </View>
        </View>

        <View style={styles.itemChipsWrap}>
          {previewItems.length ? (
            previewItems.map((item) => (
              <View key={item.id} style={styles.itemChip}>
                <Text style={styles.itemChipText}>{resolveItemName(catalogItems, item.itemId, item.name)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyInlineText}>{t('home.emptyListInline')}</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.addCard}>
        <View style={styles.addCardTextWrap}>
          <Text style={styles.addCardTitle}>{t('home.addRecipeCardTitle')}</Text>
          <Text style={styles.addCardText}>{t('home.addRecipeCardText')}</Text>
        </View>
        <Text style={styles.emoji}>🥬</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isRTL: boolean) =>
  StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 58,
    paddingBottom: 116,
  },
  headerRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logo: {
    fontSize: 38,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: 'Georgia',
  },
  greeting: {
    color: colors.textSoft,
    fontSize: 17,
    marginBottom: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  heading: {
    color: colors.heading,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.5,
    textAlign: isRTL ? 'right' : 'left',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.title,
    marginBottom: 10,
    marginTop: 20,
    textAlign: isRTL ? 'right' : 'left',
  },
  quickActionsRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 13,
    paddingVertical: 15,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickBrowse: {
    backgroundColor: colors.successSoft,
  },
  quickList: {
    backgroundColor: colors.warningSoft,
  },
  quickText: {
    color: colors.quickActionText,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: isRTL ? 'right' : 'left',
  },
  startItemsCard: {
    marginTop: 18,
    borderRadius: radius.md,
    backgroundColor: colors.startCard,
    padding: 16,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startItemsTextWrap: {
    flex: 1,
    paddingRight: isRTL ? 0 : 10,
    paddingLeft: isRTL ? 10 : 0,
  },
  startItemsTitle: {
    color: colors.startTitle,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  startItemsText: {
    color: colors.startText,
    fontSize: 13,
    lineHeight: 18,
    textAlign: isRTL ? 'right' : 'left',
  },
  startItemsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.startIconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    color: colors.link,
    fontWeight: '700',
    fontSize: 13,
  },
  recipeScroll: {
    marginBottom: 18,
  },
  recipeScrollContent: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
  },
  emptySectionCard: {
    borderRadius: radius.md,
    backgroundColor: colors.emptyCard,
    borderWidth: 1,
    borderColor: colors.emptyCardBorder,
    padding: 16,
    marginBottom: 18,
  },
  emptySectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  emptySectionText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: isRTL ? 'right' : 'left',
  },
  listCard: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  listCardTop: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  listIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.listIconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: isRTL ? 'right' : 'left',
  },
  listMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: isRTL ? 'right' : 'left',
  },
  itemChipsWrap: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyInlineText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: isRTL ? 'right' : 'left',
  },
  itemChip: {
    backgroundColor: colors.chip,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  itemChipText: {
    fontSize: 12,
    color: colors.chipText,
    fontWeight: '600',
  },
  addCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addCardTextWrap: {
    flex: 1,
    paddingRight: isRTL ? 0 : 8,
    paddingLeft: isRTL ? 8 : 0,
  },
  addCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.addCardTitle,
    marginBottom: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  addCardText: {
    fontSize: 13,
    color: colors.addCardText,
    lineHeight: 18,
    textAlign: isRTL ? 'right' : 'left',
  },
  emoji: {
    fontSize: 28,
  },
});
