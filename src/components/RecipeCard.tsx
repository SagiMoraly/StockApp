import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '../LocalizationProvider';
import { useTheme } from '../ThemeProvider';
import { radius } from '../theme';
import { Recipe } from '../types';

type RecipeCardProps = {
  recipe: Recipe;
  onPress: (recipe: Recipe) => void;
  compact?: boolean;
  favorite?: boolean;
  onToggleFavorite?: (recipeId: string) => void;
};

export function RecipeCard({
  recipe,
  onPress,
  compact = false,
  favorite = false,
  onToggleFavorite,
}: RecipeCardProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);
  const hasImage = recipe.image.trim().length > 0;

  return (
    <TouchableOpacity
      style={[styles.card, compact ? styles.compactCard : styles.fullCard]}
      onPress={() => onPress(recipe)}
      activeOpacity={0.92}
    >
      {hasImage ? (
        <Image source={{ uri: recipe.image }} style={[styles.image, compact ? styles.compactImage : styles.fullImage]} />
      ) : (
        <View style={[styles.imagePlaceholder, compact ? styles.compactImage : styles.fullImage]}>
          <Ionicons name="image-outline" size={compact ? 22 : 28} color={colors.imagePlaceholderText} />
          <Text style={styles.imagePlaceholderText}>{t('recipeCard.addPhoto')}</Text>
        </View>
      )}
      {onToggleFavorite ? (
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite(recipe.id)}
          hitSlop={10}
        >
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={colors.white} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title}>{recipe.title}</Text>
        {!compact ? <Text style={styles.subtitle}>{recipe.subtitle}</Text> : null}
        <Text style={styles.meta}>{recipe.time}  •  {recipe.difficulty}</Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], isRTL: boolean) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  compactCard: {
    width: 146,
    marginRight: isRTL ? 0 : 10,
    marginLeft: isRTL ? 10 : 0,
  },
  fullCard: {
    marginBottom: 14,
  },
  image: {
    width: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    backgroundColor: colors.imagePlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePlaceholderText: {
    color: colors.imagePlaceholderText,
    fontSize: 12,
    fontWeight: '700',
  },
  compactImage: {
    height: 96,
  },
  fullImage: {
    height: 160,
  },
  favoriteButton: {
    position: 'absolute',
    right: isRTL ? undefined : 12,
    left: isRTL ? 12 : undefined,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.favoriteOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSoft,
    marginTop: 4,
  },
  meta: {
    fontSize: 12,
    color: colors.metaText,
    marginTop: 6,
  },
});
