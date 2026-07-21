import { GroceryList, QuickSelectItem, Recipe, RecipeCategory } from '../types';

export const SHARE_PAYLOAD_PREFIX = 'STOCKUP_SHARE:';
export const SHARE_DEEP_LINK_SCHEME = 'stockup';
export const SHARE_DEEP_LINK_PATH = 'import';
export const SHARE_DEEP_LINK_DATA_PARAM = 'data';

export type SharedCatalogItem = {
  name: string;
  sectionId: string;
  unitLabel?: string;
  colors: string[];
};

type SharedGroceryItem = {
  name: string;
  quantity: number;
  sectionId: string;
  unitLabel?: string;
};

type SharedRecipeIngredient = {
  name: string;
  amount: string;
  sectionId?: string;
  unitLabel?: string;
};

type SharedRecipe = {
  title: string;
  subtitle: string;
  description: string;
  time: string;
  difficulty: string;
  servings: string;
  image: string;
  category: RecipeCategory;
  ingredients: SharedRecipeIngredient[];
};

type SharedGroceryList = {
  name: string;
  store: string;
  items: SharedGroceryItem[];
};

export type StockUpSharePayload = {
  version: 1;
  kind: 'recipe' | 'grocery-list';
  catalogItems: SharedCatalogItem[];
  recipe?: SharedRecipe;
  groceryList?: SharedGroceryList;
};

const validRecipeCategories: RecipeCategory[] = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeSectionId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeName = (value: string) => value.trim();

const normalizeQuantity = (value: number) => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.round(value));
};

const normalizeColors = (colors: string[]) => {
  const cleaned = colors.filter((color) => typeof color === 'string' && color.trim().length > 0);
  const deduped = Array.from(new Set(cleaned));

  return deduped.length ? deduped : ['#98A28E'];
};

const buildCatalogItem = (
  name: string,
  sectionId: string,
  unitLabel?: string,
  colors: string[] = ['#98A28E'],
): SharedCatalogItem => ({
  name: normalizeName(name),
  sectionId: normalizeSectionId(sectionId) || 'pantry',
  unitLabel: unitLabel?.trim() || undefined,
  colors: normalizeColors(colors),
});

const dedupeCatalogItems = (items: SharedCatalogItem[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.name.toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const createRecipeSharePayload = (recipe: Recipe, quickItems: QuickSelectItem[]): StockUpSharePayload => {
  const catalogItems = dedupeCatalogItems(
    recipe.ingredients.map((ingredient) => {
      const matchedQuickItem = quickItems.find(
        (quickItem) =>
          quickItem.id === ingredient.quickItemId ||
          quickItem.name.toLowerCase() === ingredient.name.toLowerCase(),
      );

      return buildCatalogItem(
        ingredient.name,
        ingredient.sectionId ?? matchedQuickItem?.sectionId ?? 'pantry',
        ingredient.unitLabel ?? matchedQuickItem?.unitLabel,
        matchedQuickItem?.colors,
      );
    }),
  );

  return {
    version: 1,
    kind: 'recipe',
    catalogItems,
    recipe: {
      title: recipe.title,
      subtitle: recipe.subtitle,
      description: recipe.description,
      time: recipe.time,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      image: recipe.image,
      category: recipe.category,
      ingredients: recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        amount: ingredient.amount,
        sectionId: ingredient.sectionId,
        unitLabel: ingredient.unitLabel,
      })),
    },
  };
};

export const createGroceryListSharePayload = (
  groceryList: GroceryList,
  quickItems: QuickSelectItem[],
): StockUpSharePayload => {
  const flattenedItems = groceryList.sections.flatMap((section) =>
    section.items.map((item) => ({
      name: item.name,
      quantity: normalizeQuantity(item.quantity),
      sectionId: section.id,
      unitLabel: item.unitLabel,
    })),
  );

  const catalogItems = dedupeCatalogItems(
    flattenedItems.map((item) => {
      const matchedQuickItem = quickItems.find(
        (quickItem) =>
          quickItem.name.toLowerCase() === item.name.toLowerCase(),
      );

      return buildCatalogItem(
        item.name,
        matchedQuickItem?.sectionId ?? item.sectionId,
        item.unitLabel ?? matchedQuickItem?.unitLabel,
        matchedQuickItem?.colors,
      );
    }),
  );

  return {
    version: 1,
    kind: 'grocery-list',
    catalogItems,
    groceryList: {
      name: groceryList.name,
      store: groceryList.store,
      items: flattenedItems,
    },
  };
};

export const encodeSharePayload = (payload: StockUpSharePayload) =>
  `${SHARE_PAYLOAD_PREFIX}${JSON.stringify(payload)}`;

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const extractPayloadFromDeepLink = (value: string) => {
  const candidates = [value.trim()];
  const matchedUrls = value.match(/(?:https?:\/\/|stockup:\/\/)\S+/gi);

  if (matchedUrls?.length) {
    candidates.push(...matchedUrls);
  }

  for (const candidate of candidates) {
    try {
      const parsedUrl = new URL(candidate);
      const deepLinkData = parsedUrl.searchParams.get(SHARE_DEEP_LINK_DATA_PARAM) ?? parsedUrl.searchParams.get('payload');

      if (!deepLinkData) {
        continue;
      }

      return safeDecodeURIComponent(deepLinkData);
    } catch {
      continue;
    }
  }

  return null;
};

export const createShareDeepLink = (payload: StockUpSharePayload) => {
  const encodedPayload = encodeURIComponent(encodeSharePayload(payload));
  return `${SHARE_DEEP_LINK_SCHEME}://${SHARE_DEEP_LINK_PATH}?${SHARE_DEEP_LINK_DATA_PARAM}=${encodedPayload}`;
};

const parsePayloadJson = (text: string) => {
  const directCandidate = text.trim();

  try {
    return JSON.parse(directCandidate) as unknown;
  } catch {
    const firstBrace = directCandidate.indexOf('{');
    const lastBrace = directCandidate.lastIndexOf('}');

    if (firstBrace < 0 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(directCandidate.slice(firstBrace, lastBrace + 1)) as unknown;
    } catch {
      return null;
    }
  }
};

const isSharedCatalogItem = (value: unknown): value is SharedCatalogItem => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    typeof value.sectionId === 'string' &&
    (value.unitLabel === undefined || typeof value.unitLabel === 'string') &&
    Array.isArray(value.colors) &&
    value.colors.every((color) => typeof color === 'string')
  );
};

const isSharedRecipeIngredient = (value: unknown): value is SharedRecipeIngredient => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    typeof value.amount === 'string' &&
    (value.sectionId === undefined || typeof value.sectionId === 'string') &&
    (value.unitLabel === undefined || typeof value.unitLabel === 'string')
  );
};

const isSharedRecipe = (value: unknown): value is SharedRecipe => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.title === 'string' &&
    typeof value.subtitle === 'string' &&
    typeof value.description === 'string' &&
    typeof value.time === 'string' &&
    typeof value.difficulty === 'string' &&
    typeof value.servings === 'string' &&
    typeof value.image === 'string' &&
    typeof value.category === 'string' &&
    validRecipeCategories.includes(value.category as RecipeCategory) &&
    Array.isArray(value.ingredients) &&
    value.ingredients.every(isSharedRecipeIngredient)
  );
};

const isSharedGroceryItem = (value: unknown): value is SharedGroceryItem => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    typeof value.quantity === 'number' &&
    typeof value.sectionId === 'string' &&
    (value.unitLabel === undefined || typeof value.unitLabel === 'string')
  );
};

const isSharedGroceryList = (value: unknown): value is SharedGroceryList => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    typeof value.store === 'string' &&
    Array.isArray(value.items) &&
    value.items.every(isSharedGroceryItem)
  );
};

const isStockUpSharePayload = (value: unknown): value is StockUpSharePayload => {
  if (!isObject(value) || value.version !== 1 || (value.kind !== 'recipe' && value.kind !== 'grocery-list')) {
    return false;
  }

  if (!Array.isArray(value.catalogItems) || !value.catalogItems.every(isSharedCatalogItem)) {
    return false;
  }

  if (value.kind === 'recipe') {
    return isSharedRecipe(value.recipe);
  }

  return isSharedGroceryList(value.groceryList);
};

export const parseSharePayload = (value: string): StockUpSharePayload | null => {
  const markerIndex = value.indexOf(SHARE_PAYLOAD_PREFIX);
  const payloadSource =
    markerIndex >= 0
      ? value.slice(markerIndex + SHARE_PAYLOAD_PREFIX.length)
      : extractPayloadFromDeepLink(value);

  if (!payloadSource) {
    return null;
  }

  const payloadMarkerIndex = payloadSource.indexOf(SHARE_PAYLOAD_PREFIX);
  const rawPayload =
    payloadMarkerIndex >= 0
      ? payloadSource.slice(payloadMarkerIndex + SHARE_PAYLOAD_PREFIX.length)
      : payloadSource;
  const parsedPayload = parsePayloadJson(rawPayload);

  if (!isStockUpSharePayload(parsedPayload)) {
    return null;
  }

  return {
    ...parsedPayload,
    catalogItems: dedupeCatalogItems(parsedPayload.catalogItems.map((item) => buildCatalogItem(item.name, item.sectionId, item.unitLabel, item.colors))),
    groceryList:
      parsedPayload.kind === 'grocery-list' && parsedPayload.groceryList
        ? {
            ...parsedPayload.groceryList,
            items: parsedPayload.groceryList.items
              .map((item) => ({
                name: normalizeName(item.name),
                quantity: normalizeQuantity(item.quantity),
                sectionId: normalizeSectionId(item.sectionId) || 'pantry',
                unitLabel: item.unitLabel?.trim() || undefined,
              }))
              .filter((item) => item.name.length > 0),
          }
        : undefined,
    recipe:
      parsedPayload.kind === 'recipe' && parsedPayload.recipe
        ? {
            ...parsedPayload.recipe,
            ingredients: parsedPayload.recipe.ingredients
              .map((ingredient) => ({
                name: normalizeName(ingredient.name),
                amount: ingredient.amount.trim() || '1',
                sectionId: ingredient.sectionId ? normalizeSectionId(ingredient.sectionId) : undefined,
                unitLabel: ingredient.unitLabel?.trim() || undefined,
              }))
              .filter((ingredient) => ingredient.name.length > 0),
          }
        : undefined,
  };
};

export const getMissingCatalogItems = (
  payload: StockUpSharePayload,
  existingItems: QuickSelectItem[],
): SharedCatalogItem[] => {
  const existingByName = new Set(existingItems.map((item) => item.name.toLowerCase()));

  return payload.catalogItems.filter((item) => !existingByName.has(item.name.toLowerCase()));
};
