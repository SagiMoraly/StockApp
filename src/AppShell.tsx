import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Linking, SafeAreaView, Share, StyleSheet, View } from 'react-native';

import { AddToListModal } from './components/AddToListModal';
import { BottomNav } from './components/BottomNav';
import { ImportPreviewModal } from './components/ImportPreviewModal';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeEditModal } from './components/RecipeEditModal';
import { ShareImportModal } from './components/ShareImportModal';
import { SuccessModal } from './components/SuccessModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import {
  categories,
  initialGroceryList,
  starterItemTypes,
  quickSelectItems as initialQuickSelectItems,
  recipes as initialRecipes,
} from './data/defaultData';
import { GroceryListScreen } from './screens/GroceryListScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PantryScreen } from './screens/PantryScreen';
import { RecipesScreen } from './screens/RecipesScreen';
import { useI18n } from './LocalizationProvider';
import { useTheme } from './ThemeProvider';
import { GrocerySectionId, QuickAddSelection, QuickSelectItem, Recipe, RecipeFilter, TabKey } from './types';
import {
  adjustGroceryItemQuantity,
  addCustomItemToList,
  addIngredientsToList,
  addQuickItemsToList,
  clearGroceryList,
  setGroceryItemQuantity,
  toggleGroceryItem,
} from './utils/grocery';
import {
  createGroceryListSharePayload,
  createShareDeepLink,
  createRecipeSharePayload,
  encodeSharePayload,
  getMissingCatalogItems,
  parseSharePayload,
  SharedCatalogItem,
  StockUpSharePayload,
} from './utils/sharePayload';

const ITEM_STORAGE_KEY = 'stockup.catalog.items';
const TYPE_STORAGE_KEY = 'stockup.catalog.types';
const RECIPE_STORAGE_KEY = 'stockup.recipes';
const FAVORITES_STORAGE_KEY = 'stockup.recipes.favorites';
const GROCERY_STORAGE_KEY = 'stockup.grocery.list';
const STORAGE_VERSION_KEY = 'stockup.storage.version';
const STORAGE_SCHEMA_VERSION = '2';

const initialItemTypes = [...starterItemTypes];

const slugifyLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const buildRecipeId = (title: string) => {
  const slug = slugifyLabel(title);
  const suffix = Date.now().toString(36);
  return slug ? `recipe-${slug}-${suffix}` : `recipe-${suffix}`;
};

const formatTypeTitle = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isQuickSelectItemArray = (value: unknown): value is QuickSelectItem[] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof entry.id === 'string' &&
      typeof entry.name === 'string' &&
      typeof entry.sectionId === 'string' &&
      (entry.unitLabel === undefined || typeof entry.unitLabel === 'string') &&
      Array.isArray(entry.colors) &&
        entry.colors.every((color: unknown) => typeof color === 'string'),
  );

const isRecipeArray = (value: unknown): value is Recipe[] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof entry.id === 'string' &&
      typeof entry.title === 'string' &&
      typeof entry.subtitle === 'string' &&
      typeof entry.description === 'string' &&
      typeof entry.time === 'string' &&
      typeof entry.difficulty === 'string' &&
      typeof entry.servings === 'string' &&
      typeof entry.image === 'string' &&
      typeof entry.category === 'string' &&
      Array.isArray(entry.ingredients),
  );

const isGroceryList = (value: unknown): value is typeof initialGroceryList => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as {
    id?: unknown;
    name?: unknown;
    store?: unknown;
    sections?: Array<{
      id?: unknown;
      title?: unknown;
      items?: Array<{
        id?: unknown;
        name?: unknown;
        quantity?: unknown;
        checked?: unknown;
      }>;
    }>;
  };

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.store === 'string' &&
    Array.isArray(candidate.sections) &&
    candidate.sections.every(
      (section) =>
        typeof section?.id === 'string' &&
        typeof section?.title === 'string' &&
        Array.isArray(section.items) &&
        section.items.every(
          (item) =>
            typeof item?.id === 'string' &&
            typeof item?.name === 'string' &&
            typeof item?.quantity === 'number' &&
            typeof item?.checked === 'boolean',
        ),
    )
  );
};

const createInitialGroceryList = () => ({
  ...initialGroceryList,
  sections: initialGroceryList.sections.map((section) => ({
    ...section,
    items: [...section.items],
  })),
});

const createDefaultState = () => ({
  itemTypes: [...initialItemTypes],
  recipeList: [...initialRecipes],
  quickSelectItems: [...initialQuickSelectItems],
  favoriteRecipeIds: [] as string[],
  groceryList: createInitialGroceryList(),
});

type PendingImport = {
  payload: StockUpSharePayload;
  missingCatalogItems: SharedCatalogItem[];
};

export function AppShell() {
  const { colors, themeName } = useTheme();
  const { t } = useI18n();
  const defaultState = createDefaultState();
  const [itemTypes, setItemTypes] = useState<string[]>(defaultState.itemTypes);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RecipeFilter>('All');
  const [recipeList, setRecipeList] = useState(defaultState.recipeList);
  const [quickSelectItems, setQuickSelectItems] = useState(defaultState.quickSelectItems);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<string[]>(defaultState.favoriteRecipeIds);
  const [groceryList, setGroceryList] = useState(defaultState.groceryList);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [showAddToList, setShowAddToList] = useState(false);
  const [showRecipeEdit, setShowRecipeEdit] = useState(false);
  const [showRecipeCreate, setShowRecipeCreate] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [queuedDeepLinkInput, setQueuedDeepLinkInput] = useState<string | null>(null);
  const [lastAddedCount, setLastAddedCount] = useState(0);
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      try {
        const values = await AsyncStorage.multiGet([
          STORAGE_VERSION_KEY,
          ITEM_STORAGE_KEY,
          TYPE_STORAGE_KEY,
          RECIPE_STORAGE_KEY,
          FAVORITES_STORAGE_KEY,
          GROCERY_STORAGE_KEY,
        ]);
        const storedVersion = values.find(([key]) => key === STORAGE_VERSION_KEY)?.[1];
        const storedItems = values.find(([key]) => key === ITEM_STORAGE_KEY)?.[1];
        const storedTypes = values.find(([key]) => key === TYPE_STORAGE_KEY)?.[1];
        const storedRecipes = values.find(([key]) => key === RECIPE_STORAGE_KEY)?.[1];
        const storedFavorites = values.find(([key]) => key === FAVORITES_STORAGE_KEY)?.[1];
        const storedGroceryList = values.find(([key]) => key === GROCERY_STORAGE_KEY)?.[1];

        const nextItems = storedItems ? JSON.parse(storedItems) : null;
        const nextTypes = storedTypes ? JSON.parse(storedTypes) : null;
        const nextRecipes = storedRecipes ? JSON.parse(storedRecipes) : null;
        const nextFavorites = storedFavorites ? JSON.parse(storedFavorites) : null;
        const nextGroceryList = storedGroceryList ? JSON.parse(storedGroceryList) : null;

        if (!active) {
          return;
        }

        const resolvedItems = isQuickSelectItemArray(nextItems) ? nextItems : defaultState.quickSelectItems;
        const resolvedTypes = isStringArray(nextTypes) ? nextTypes.filter(Boolean) : defaultState.itemTypes;
        const mergedTypes = Array.from(new Set([...resolvedTypes, ...resolvedItems.map((item) => item.sectionId)]));
        const resolvedRecipes = isRecipeArray(nextRecipes) ? nextRecipes : defaultState.recipeList;
        const resolvedFavorites = isStringArray(nextFavorites)
          ? nextFavorites.filter(
              (favoriteId, index, currentIds) =>
                currentIds.indexOf(favoriteId) === index && resolvedRecipes.some((recipe) => recipe.id === favoriteId),
            )
          : defaultState.favoriteRecipeIds;
        const resolvedGroceryList = isGroceryList(nextGroceryList) ? nextGroceryList : defaultState.groceryList;
        const nextState = {
          itemTypes: mergedTypes.length ? mergedTypes : defaultState.itemTypes,
          quickSelectItems: resolvedItems,
          recipeList: resolvedRecipes,
          favoriteRecipeIds: resolvedFavorites,
          groceryList: resolvedGroceryList,
        };

        setQuickSelectItems(nextState.quickSelectItems);
        setItemTypes(nextState.itemTypes);
        setRecipeList(nextState.recipeList);
        setFavoriteRecipeIds(nextState.favoriteRecipeIds);
        setGroceryList(nextState.groceryList);

        if (storedVersion !== STORAGE_SCHEMA_VERSION) {
          await AsyncStorage.multiSet([
            [STORAGE_VERSION_KEY, STORAGE_SCHEMA_VERSION],
            [ITEM_STORAGE_KEY, JSON.stringify(nextState.quickSelectItems)],
            [TYPE_STORAGE_KEY, JSON.stringify(nextState.itemTypes)],
            [RECIPE_STORAGE_KEY, JSON.stringify(nextState.recipeList)],
            [FAVORITES_STORAGE_KEY, JSON.stringify(nextState.favoriteRecipeIds)],
            [GROCERY_STORAGE_KEY, JSON.stringify(nextState.groceryList)],
          ]);
        }
      } catch {
        await AsyncStorage.multiRemove([
          STORAGE_VERSION_KEY,
          ITEM_STORAGE_KEY,
          TYPE_STORAGE_KEY,
          RECIPE_STORAGE_KEY,
          FAVORITES_STORAGE_KEY,
          GROCERY_STORAGE_KEY,
        ]);

        if (!active) {
          return;
        }

        setQuickSelectItems(defaultState.quickSelectItems);
        setItemTypes(defaultState.itemTypes);
        setRecipeList(defaultState.recipeList);
        setFavoriteRecipeIds(defaultState.favoriteRecipeIds);
        setGroceryList(defaultState.groceryList);
      } finally {
        if (active) {
          setStorageLoaded(true);
        }
      }
    };

    void loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    void AsyncStorage.multiSet([
      [STORAGE_VERSION_KEY, STORAGE_SCHEMA_VERSION],
      [ITEM_STORAGE_KEY, JSON.stringify(quickSelectItems)],
      [TYPE_STORAGE_KEY, JSON.stringify(itemTypes)],
      [RECIPE_STORAGE_KEY, JSON.stringify(recipeList)],
      [FAVORITES_STORAGE_KEY, JSON.stringify(favoriteRecipeIds)],
      [GROCERY_STORAGE_KEY, JSON.stringify(groceryList)],
    ]);
  }, [storageLoaded, itemTypes, quickSelectItems, recipeList, favoriteRecipeIds, groceryList]);

  const queueImportFromInput = (rawInput: string) => {
    const parsedPayload = parseSharePayload(rawInput);

    if (!parsedPayload) {
      return false;
    }

    setImportError(null);
    setShowImportDialog(false);
    setPendingImport({
      payload: parsedPayload,
      missingCatalogItems: getMissingCatalogItems(parsedPayload, quickSelectItems),
    });

    return true;
  };

  useEffect(() => {
    const handleIncomingUrl = (url: string) => {
      if (!url) {
        return;
      }

      if (!storageLoaded) {
        setQueuedDeepLinkInput(url);
        return;
      }

      queueImportFromInput(url);
    };

    void Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleIncomingUrl(initialUrl);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [storageLoaded, quickSelectItems]);

  useEffect(() => {
    if (!storageLoaded || !queuedDeepLinkInput) {
      return;
    }

    queueImportFromInput(queuedDeepLinkInput);
    setQueuedDeepLinkInput(null);
  }, [storageLoaded, queuedDeepLinkInput, quickSelectItems]);

  const query = searchQuery.trim().toLowerCase();
  const selectedRecipe = recipeList.find((recipe) => recipe.id === selectedRecipeId) ?? null;

  const filteredRecipes = recipeList.filter((recipe) => {
    const matchesFilter =
      selectedFilter === 'All' ||
      (selectedFilter === 'Favorites'
        ? favoriteRecipeIds.includes(recipe.id)
        : recipe.category === selectedFilter);
    const matchesQuery =
      !query ||
      recipe.title.toLowerCase().includes(query) ||
      recipe.subtitle.toLowerCase().includes(query) ||
      recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(query));

    return matchesFilter && matchesQuery;
  });

  const searchedRecipes = recipeList.filter((recipe) => {
    if (!query) {
      return true;
    }

    return (
      recipe.title.toLowerCase().includes(query) ||
      recipe.subtitle.toLowerCase().includes(query) ||
      recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(query))
    );
  });

  const openRecipe = (recipe: Recipe) => {
    setSelectedRecipeId(recipe.id);
    setShowRecipeCreate(false);
  };

  const closeRecipe = () => {
    setSelectedRecipeId(null);
    setShowRecipeEdit(false);
  };

  const openCreateRecipe = () => {
    setSelectedRecipeId(null);
    setShowRecipeEdit(false);
    setShowRecipeCreate(true);
  };

  const openAddToList = (recipe: Recipe) => {
    setSelectedRecipeId(recipe.id);
    setSelectedIngredientIds(recipe.ingredients.map((ingredient) => ingredient.id));
    setShowAddToList(true);
  };

  const confirmAddToList = () => {
    if (!selectedRecipe) {
      return;
    }

    const selectedIngredients = selectedRecipe.ingredients.filter((ingredient) =>
      selectedIngredientIds.includes(ingredient.id),
    );

    setGroceryList((currentList) => addIngredientsToList(currentList, selectedIngredients, quickSelectItems));
    setLastAddedCount(selectedIngredients.length);
    setShowAddToList(false);
    setSelectedRecipeId(null);
    setShowSuccess(true);
  };

  const toggleFavorite = (recipeId: string) => {
    setFavoriteRecipeIds((currentIds) =>
      currentIds.includes(recipeId)
        ? currentIds.filter((currentId) => currentId !== recipeId)
        : [...currentIds, recipeId],
    );
  };

  const toggleIngredientSelection = (ingredientId: string) => {
    setSelectedIngredientIds((currentIds) =>
      currentIds.includes(ingredientId)
        ? currentIds.filter((currentId) => currentId !== ingredientId)
        : [...currentIds, ingredientId],
    );
  };

  const saveRecipe = (
    recipeId: string,
    updates: Pick<Recipe, 'title' | 'subtitle' | 'description' | 'time' | 'difficulty' | 'servings' | 'category' | 'image' | 'ingredients'>,
  ) => {
    setRecipeList((currentRecipes) =>
      currentRecipes.map((recipe) => (recipe.id === recipeId ? { ...recipe, ...updates } : recipe)),
    );
  };

  const createRecipe = (
    recipeDraft: Pick<Recipe, 'title' | 'subtitle' | 'description' | 'time' | 'difficulty' | 'servings' | 'category' | 'image' | 'ingredients'>,
  ) => {
    const nextRecipe: Recipe = {
      id: buildRecipeId(recipeDraft.title),
      ...recipeDraft,
    };

    setRecipeList((currentRecipes) => [nextRecipe, ...currentRecipes]);
    setShowRecipeCreate(false);
    setSelectedRecipeId(nextRecipe.id);
  };

  const addQuickListItems = (selections: QuickAddSelection[]) => {
    setGroceryList((currentList) => addQuickItemsToList(currentList, quickSelectItems, selections));
  };

  const buildUniqueQuickItemId = (name: string, takenIds: Set<string>) => {
    const baseSlug = slugifyLabel(name) || 'item';
    let candidate = `quick-${baseSlug}`;
    let suffix = 2;

    while (takenIds.has(candidate)) {
      candidate = `quick-${baseSlug}-${suffix}`;
      suffix += 1;
    }

    takenIds.add(candidate);
    return candidate;
  };

  const importMissingCatalogItems = (missingItems: SharedCatalogItem[]) => {
    if (!missingItems.length) {
      return new Map<string, QuickSelectItem>();
    }

    const createdItems = new Map<string, QuickSelectItem>();
    const currentIds = new Set(quickSelectItems.map((item) => item.id));
    const nextItems = missingItems.map((item) => {
      const nextItem: QuickSelectItem = {
        id: buildUniqueQuickItemId(item.name, currentIds),
        name: item.name,
        sectionId: item.sectionId,
        unitLabel: item.unitLabel,
        colors: item.colors,
      };

      createdItems.set(item.name.toLowerCase(), nextItem);
      return nextItem;
    });

    setItemTypes((currentTypes) =>
      Array.from(new Set([...currentTypes, ...nextItems.map((item) => item.sectionId)])),
    );
    setQuickSelectItems((currentItems) => [...currentItems, ...nextItems]);

    return createdItems;
  };

  const importSharedPayload = () => {
    if (!pendingImport) {
      return;
    }

    const payload = pendingImport.payload;
    const createdQuickItemsByName = importMissingCatalogItems(pendingImport.missingCatalogItems);
    const knownQuickItemsByName = new Map(
      quickSelectItems.map((item) => [item.name.toLowerCase(), item]),
    );

    createdQuickItemsByName.forEach((value, key) => {
      knownQuickItemsByName.set(key, value);
    });

    if (payload.kind === 'recipe' && payload.recipe) {
      const importedRecipeCategory = categories.includes(payload.recipe.category)
        ? payload.recipe.category
        : 'Dinner';
      const importedRecipe: Recipe = {
        id: buildRecipeId(payload.recipe.title),
        title: payload.recipe.title,
        subtitle: payload.recipe.subtitle,
        description: payload.recipe.description,
        time: payload.recipe.time,
        difficulty: payload.recipe.difficulty,
        servings: payload.recipe.servings,
        image: payload.recipe.image,
        category: importedRecipeCategory,
        ingredients: payload.recipe.ingredients.map((ingredient, index) => {
          const knownItem = knownQuickItemsByName.get(ingredient.name.toLowerCase());
          const catalogFallback = payload.catalogItems.find(
            (catalogItem) => catalogItem.name.toLowerCase() === ingredient.name.toLowerCase(),
          );

          return {
            id: `ingredient-${buildRecipeId(ingredient.name)}-${index + 1}`,
            name: ingredient.name,
            amount: ingredient.amount,
            sectionId: ingredient.sectionId ?? knownItem?.sectionId ?? catalogFallback?.sectionId,
            quickItemId: knownItem?.id,
            unitLabel: ingredient.unitLabel ?? knownItem?.unitLabel ?? catalogFallback?.unitLabel,
          };
        }),
      };

      setRecipeList((currentRecipes) => [importedRecipe, ...currentRecipes]);
      setActiveTab('recipes');
      setSelectedRecipeId(importedRecipe.id);
      setShowRecipeCreate(false);
      setShowRecipeEdit(false);
    }

    if (payload.kind === 'grocery-list' && payload.groceryList) {
      const importedItems = payload.groceryList.items;

      setGroceryList((currentList) =>
        importedItems.reduce(
          (nextList, item) =>
            addCustomItemToList(nextList, {
              name: item.name,
              quantity: item.quantity,
              sectionId: item.sectionId,
              unitLabel: item.unitLabel,
              quickItemId: knownQuickItemsByName.get(item.name.toLowerCase())?.id,
            }),
          currentList,
        ),
      );

      setLastAddedCount(importedItems.length);
      setShowSuccess(true);
      setActiveTab('list');
    }

    setPendingImport(null);
  };

  const shareRecipe = async (recipe: Recipe) => {
    const payload = createRecipeSharePayload(recipe, quickSelectItems);
    const shareLink = createShareDeepLink(payload);

    try {
      await Share.share({
        message: `Open in StockUp: ${shareLink}`,
        url: shareLink,
      });
    } catch {
    }
  };

  const shareGroceryList = async () => {
    const payload = createGroceryListSharePayload(groceryList, quickSelectItems);
    const shareLink = createShareDeepLink(payload);

    try {
      await Share.share({
        message: `Open in StockUp: ${shareLink}`,
        url: shareLink,
      });
    } catch {
    }
  };

  const openImportDialog = () => {
    setImportError(null);
    setShowImportDialog(true);
  };

  const submitImportDialog = (rawInput: string) => {
    if (!queueImportFromInput(rawInput)) {
      setImportError(t('shareImport.invalid'));
      return false;
    }

    return true;
  };

  const addAvailableItem = (item: Omit<QuickSelectItem, 'id'>) => {
    let added = false;
    const trimmedName = item.name.trim();

    if (!trimmedName) {
      return false;
    }

    setItemTypes((currentTypes) =>
      currentTypes.includes(item.sectionId) ? currentTypes : [...currentTypes, item.sectionId],
    );

    setQuickSelectItems((currentItems) => {
      if (currentItems.some((currentItem) => currentItem.name.toLowerCase() === trimmedName.toLowerCase())) {
        return currentItems;
      }

      added = true;

      return [
        ...currentItems,
        {
          id: `quick-${slugifyLabel(trimmedName)}`,
          ...item,
          name: trimmedName,
          colors: Array.from(new Set(item.colors)),
        },
      ];
    });

    return added;
  };

  const addItemType = (label: string) => {
    const nextTypeId = slugifyLabel(label);

    if (!nextTypeId || itemTypes.includes(nextTypeId)) {
      return null;
    }

    setItemTypes((currentTypes) => [...currentTypes, nextTypeId]);
    return nextTypeId;
  };

  const renameItemType = (typeId: GrocerySectionId, label: string) => {
    const nextTypeId = slugifyLabel(label);

    if (!nextTypeId || (nextTypeId !== typeId && itemTypes.includes(nextTypeId))) {
      return null;
    }

    setItemTypes((currentTypes) => currentTypes.map((currentType) => (currentType === typeId ? nextTypeId : currentType)));
    setQuickSelectItems((currentItems) =>
      currentItems.map((item) => (item.sectionId === typeId ? { ...item, sectionId: nextTypeId } : item)),
    );
    setRecipeList((currentRecipes) =>
      currentRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) =>
          ingredient.sectionId === typeId ? { ...ingredient, sectionId: nextTypeId } : ingredient,
        ),
      })),
    );
    setGroceryList((currentList) => ({
      ...currentList,
      sections: currentList.sections.map((section) =>
        section.id === typeId ? { ...section, id: nextTypeId, title: formatTypeTitle(nextTypeId) } : section,
      ),
    }));

    return nextTypeId;
  };

  const deleteItemType = (typeId: GrocerySectionId) => {
    if (itemTypes.length <= 1) {
      return false;
    }

    setItemTypes((currentTypes) => currentTypes.filter((currentType) => currentType !== typeId));
    setQuickSelectItems((currentItems) => currentItems.filter((item) => item.sectionId !== typeId));
    setRecipeList((currentRecipes) =>
      currentRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) =>
          ingredient.sectionId === typeId ? { ...ingredient, sectionId: undefined } : ingredient,
        ),
      })),
    );
    setGroceryList((currentList) => ({
      ...currentList,
      sections: currentList.sections.filter((section) => section.id !== typeId),
    }));

    return true;
  };

  const updateAvailableItem = (
    itemId: string,
    updates: Pick<QuickSelectItem, 'name' | 'sectionId' | 'unitLabel' | 'colors'>,
  ) => {
    const existingItem = quickSelectItems.find((item) => item.id === itemId);

    if (!existingItem) {
      return false;
    }

    const nextColors = Array.from(new Set(updates.colors)).filter(Boolean);
    const nextName = updates.name.trim();

    if (!nextColors.length || !nextName) {
      return false;
    }

    if (
      quickSelectItems.some(
        (item) => item.id !== itemId && item.name.toLowerCase() === nextName.toLowerCase(),
      )
    ) {
      return false;
    }

    setItemTypes((currentTypes) =>
      currentTypes.includes(updates.sectionId) ? currentTypes : [...currentTypes, updates.sectionId],
    );
    setQuickSelectItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              name: nextName,
              sectionId: updates.sectionId,
              unitLabel: updates.unitLabel?.trim() || undefined,
              colors: nextColors,
            }
          : item,
      ),
    );
    setRecipeList((currentRecipes) =>
      currentRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) =>
          ingredient.quickItemId === itemId || ingredient.name.toLowerCase() === existingItem.name.toLowerCase()
            ? {
                ...ingredient,
                name: nextName,
                sectionId: updates.sectionId,
                quickItemId: itemId,
                unitLabel: updates.unitLabel?.trim() || undefined,
              }
            : ingredient,
        ),
      })),
    );
    setGroceryList((currentList) => ({
      ...currentList,
      sections: currentList.sections.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          item.name.toLowerCase() === existingItem.name.toLowerCase()
            ? { ...item, name: nextName }
            : item,
        ),
      })),
    }));

    return true;
  };

  const deleteAvailableItem = (itemId: string) => {
    const existingItem = quickSelectItems.find((item) => item.id === itemId);

    if (!existingItem) {
      return false;
    }

    setQuickSelectItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    setRecipeList((currentRecipes) =>
      currentRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) =>
          ingredient.quickItemId === itemId || ingredient.name.toLowerCase() === existingItem.name.toLowerCase()
            ? { ...ingredient, sectionId: undefined, quickItemId: undefined }
            : ingredient,
        ),
      })),
    );

    return true;
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'recipes':
        return (
          <RecipesScreen
            searchQuery={searchQuery}
            selectedFilter={selectedFilter}
            categories={categories}
            recipes={filteredRecipes}
            favoriteRecipeIds={favoriteRecipeIds}
            onSearchQueryChange={setSearchQuery}
            onFilterChange={setSelectedFilter}
            onRecipePress={openRecipe}
            onToggleFavorite={toggleFavorite}
            onAddRecipePress={openCreateRecipe}
            onImportRecipePress={openImportDialog}
          />
        );
      case 'list':
        return (
          <GroceryListScreen
            groceryList={groceryList}
            quickSelectItems={quickSelectItems}
            onToggleItem={(itemId) => setGroceryList((currentList) => toggleGroceryItem(currentList, itemId))}
            onAddQuickItems={addQuickListItems}
            onSetItemQuantity={(itemId, quantity) =>
              setGroceryList((currentList) => setGroceryItemQuantity(currentList, itemId, quantity))
            }
            onAdjustItemQuantity={(itemId, delta) =>
              setGroceryList((currentList) => adjustGroceryItemQuantity(currentList, itemId, delta))
            }
            onClearList={() => setGroceryList((currentList) => clearGroceryList(currentList))}
            onShareList={shareGroceryList}
            onImportList={openImportDialog}
          />
        );
      case 'items':
        return (
          <PantryScreen
            items={quickSelectItems}
            itemTypes={itemTypes}
            onAddItem={addAvailableItem}
            onAddType={addItemType}
            onRenameType={renameItemType}
            onDeleteType={deleteItemType}
            onUpdateItem={updateAvailableItem}
            onDeleteItem={deleteAvailableItem}
          />
        );
      case 'home':
      default:
        return (
          <HomeScreen
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            recipes={searchedRecipes}
            groceryList={groceryList}
            onRecipePress={openRecipe}
            onBrowseRecipes={() => setActiveTab('recipes')}
            onOpenList={() => setActiveTab('list')}
            onOpenItems={() => setActiveTab('items')}
            onOpenThemeSettings={() => setShowThemeSettings(true)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      {renderActiveScreen()}

      <BottomNav
        activeTab={activeTab}
        onTabPress={setActiveTab}
      />

      <RecipeDetailModal
        recipe={selectedRecipe}
        favorite={selectedRecipe ? favoriteRecipeIds.includes(selectedRecipe.id) : false}
        visible={selectedRecipe !== null}
        onClose={closeRecipe}
        onAddToList={openAddToList}
        onToggleFavorite={toggleFavorite}
        onEdit={() => setShowRecipeEdit(true)}
        onShare={shareRecipe}
      />

      <ShareImportModal
        visible={showImportDialog}
        errorMessage={importError}
        onClose={() => {
          setShowImportDialog(false);
          setImportError(null);
        }}
        onSubmit={submitImportDialog}
      />

      <ImportPreviewModal
        visible={pendingImport !== null}
        title={t('importPreview.title')}
        message={
          pendingImport?.payload.kind === 'recipe' && pendingImport.payload.recipe
            ? t('importPreview.recipeMessage', {
                name: pendingImport.payload.recipe.title,
                count: pendingImport.payload.recipe.ingredients.length,
              })
            : t('importPreview.listMessage', {
                name: groceryList.name,
                count: pendingImport?.payload.groceryList?.items.length ?? 0,
              })
        }
        missingItems={pendingImport?.missingCatalogItems ?? []}
        confirmLabel={
          pendingImport?.payload.kind === 'recipe'
            ? t('importPreview.confirmRecipe')
            : t('importPreview.confirmList')
        }
        onCancel={() => setPendingImport(null)}
        onConfirm={importSharedPayload}
      />

      <AddToListModal
        recipe={selectedRecipe}
        groceryList={groceryList}
        selectedIngredientIds={selectedIngredientIds}
        visible={showAddToList}
        onClose={() => setShowAddToList(false)}
        onToggleIngredient={toggleIngredientSelection}
        onConfirm={confirmAddToList}
      />

      <RecipeEditModal
        visible={showRecipeEdit && selectedRecipe !== null}
        recipe={selectedRecipe}
        mode="edit"
        categories={categories}
        quickSelectItems={quickSelectItems}
        onClose={() => setShowRecipeEdit(false)}
        onSave={saveRecipe}
        onCreate={createRecipe}
      />

      <RecipeEditModal
        visible={showRecipeCreate}
        recipe={null}
        mode="create"
        categories={categories}
        quickSelectItems={quickSelectItems}
        onClose={() => setShowRecipeCreate(false)}
        onSave={saveRecipe}
        onCreate={createRecipe}
      />

      <SuccessModal
        visible={showSuccess}
        itemCount={lastAddedCount}
        listName={groceryList.name}
        onClose={() => setShowSuccess(false)}
        onViewList={() => {
          setShowSuccess(false);
          setActiveTab('list');
        }}
      />

      <ThemeSettingsModal
        visible={showThemeSettings}
        onClose={() => setShowThemeSettings(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
