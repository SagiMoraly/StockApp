import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Linking, SafeAreaView, Share, StyleSheet, View } from 'react-native';

import { AddToListModal } from './components/AddToListModal';
import { BottomNav } from './components/BottomNav';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeEditModal } from './components/RecipeEditModal';
import { SuccessModal } from './components/SuccessModal';
import { SharePreviewModal } from './components/SharePreviewModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { useAuth } from './auth/AuthProvider';
import { useI18n } from './LocalizationProvider';
import { parseIncomingAppLink } from './utils/household';
import { APIClient, APIClientError } from './api/client';
import { withAPIRetry } from './api/boot';
import { mapAPIDataToLocal, mapAPIGroceryListToLocal, mapAPIRecipeToLocal } from './api/localSync';
import { uploadRecipeImage } from './api/recipeAssets';
import { Category } from './api/types';
import { syncRecipeIngredients } from './api/recipeMutations';
import { addGrocerySelection } from './api/groceryMutations';
import { createPantryItem, deletePantryItem, updatePantryItem } from './api/pantryMutations';
import {
  categories,
  initialGroceryList,
  starterItemTypes,
  quickSelectItems as initialQuickSelectItems,
  recipes as initialRecipes,
} from './data/defaultData';
import { GroceryListScreen } from './screens/GroceryListScreen';
import { HouseholdScreen } from './screens/HouseholdScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PantryScreen } from './screens/PantryScreen';
import { RecipesScreen } from './screens/RecipesScreen';
import { useTheme } from './ThemeProvider';
import { GroceryList, GrocerySectionId, QuickAddSelection, QuickSelectItem, Recipe, RecipeFilter, TabKey } from './types';
import {
  adjustGroceryItemQuantity,
  addIngredientsToList,
  addQuickItemsToList,
  clearGroceryList,
  removeGroceryItem,
  parseAmount,
  resolveItemName,
  setGroceryItemQuantity,
  toggleGroceryItem,
} from './utils/grocery';

type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'failed';

const ITEM_STORAGE_KEY = 'stockapp.catalog.items';
const TYPE_STORAGE_KEY = 'stockapp.catalog.types';
const RECIPE_STORAGE_KEY = 'stockapp.recipes';
const FAVORITES_STORAGE_KEY = 'stockapp.recipes.favorites';
const GROCERY_STORAGE_KEY = 'stockapp.grocery.list';
const GROCERY_LISTS_STORAGE_KEY = 'stockapp.grocery.lists';
const ACTIVE_GROCERY_LIST_KEY = 'stockapp.grocery.active-list';
const STORAGE_VERSION_KEY = 'stockapp.storage.version';
const SYNC_REVISION_KEY = 'stockapp.sync.revision';
const LEGACY_STORAGE_KEYS = [
  'stockup.storage.version',
  'stockup.catalog.items',
  'stockup.catalog.types',
  'stockup.recipes',
  'stockup.recipes.favorites',
  'stockup.grocery.list',
];
const STORAGE_SCHEMA_VERSION = '3';

const initialItemTypes = [...starterItemTypes];

const slugifyLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
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

const isGroceryListArray = (value: unknown): value is typeof initialGroceryList[] =>
  Array.isArray(value) && value.every(isGroceryList);

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

export function AppShell() {
  const { colors, themeName } = useTheme();
  const { t } = useI18n();
  const { mode, accessToken, logout, signInWithGoogle } = useAuth();
  const defaultState = createDefaultState();
  const [itemTypes, setItemTypes] = useState<string[]>(defaultState.itemTypes);
  const [apiCategories, setAPICategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RecipeFilter>('All');
  const [recipeList, setRecipeList] = useState(defaultState.recipeList);
  const [quickSelectItems, setQuickSelectItems] = useState(defaultState.quickSelectItems);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<string[]>(defaultState.favoriteRecipeIds);
  const [groceryLists, setGroceryLists] = useState([defaultState.groceryList]);
  const [activeGroceryListId, setActiveGroceryListId] = useState<string | null>(defaultState.groceryList.id);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [showAddToList, setShowAddToList] = useState(false);
  const [showRecipeEdit, setShowRecipeEdit] = useState(false);
  const [showRecipeCreate, setShowRecipeCreate] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [lastAddedCount, setLastAddedCount] = useState(0);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [cloudSyncAttempt, setCloudSyncAttempt] = useState(0);
  const [pendingShareToken, setPendingShareToken] = useState<string | null>(null);
  const [pendingHouseholdInviteToken, setPendingHouseholdInviteToken] = useState<string | null>(null);

  const groceryList = groceryLists.find((list) => list.id === activeGroceryListId) ?? groceryLists[0] ?? defaultState.groceryList;
  const setGroceryList = (update: typeof groceryList | ((currentList: typeof groceryList) => typeof groceryList)) => {
    setGroceryLists((currentLists) => {
      const currentList = currentLists.find((list) => list.id === activeGroceryListId) ?? currentLists[0] ?? defaultState.groceryList;
      const nextList = typeof update === 'function' ? update(currentList) : update;
      const existingIndex = currentLists.findIndex((list) => list.id === nextList.id);
      if (existingIndex < 0) {
        return [...currentLists, nextList];
      }
      return currentLists.map((list, index) => index === existingIndex ? nextList : list);
    });
  };

  useEffect(() => {
    const handleURL = (url: string) => {
      const target = parseIncomingAppLink(url);
      if (target?.type === 'household-invite') {
        setPendingHouseholdInviteToken(target.token);
        setActiveTab('household');
      } else if (target?.type === 'copy-share') {
        setPendingShareToken(target.token);
      }
    };
    const subscription = Linking.addEventListener('url', ({ url }) => handleURL(url));
    void Linking.getInitialURL().then((url) => {
      if (url) {
        handleURL(url);
      }
    });

    return () => subscription.remove();
  }, []);

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
          GROCERY_LISTS_STORAGE_KEY,
          ACTIVE_GROCERY_LIST_KEY,
          ...LEGACY_STORAGE_KEYS,
        ]);
        const readStoredValue = (key: string, legacyKey: string) =>
          values.find(([storedKey]) => storedKey === key)?.[1] ?? values.find(([storedKey]) => storedKey === legacyKey)?.[1];
        const storedVersion = readStoredValue(STORAGE_VERSION_KEY, LEGACY_STORAGE_KEYS[0]);
        const storedItems = readStoredValue(ITEM_STORAGE_KEY, LEGACY_STORAGE_KEYS[1]);
        const storedTypes = readStoredValue(TYPE_STORAGE_KEY, LEGACY_STORAGE_KEYS[2]);
        const storedRecipes = readStoredValue(RECIPE_STORAGE_KEY, LEGACY_STORAGE_KEYS[3]);
        const storedFavorites = readStoredValue(FAVORITES_STORAGE_KEY, LEGACY_STORAGE_KEYS[4]);
        const storedGroceryList = readStoredValue(GROCERY_STORAGE_KEY, LEGACY_STORAGE_KEYS[5]);
        const storedGroceryLists = values.find(([key]) => key === GROCERY_LISTS_STORAGE_KEY)?.[1];
        const storedActiveGroceryListId = values.find(([key]) => key === ACTIVE_GROCERY_LIST_KEY)?.[1];
        const hasLegacyStorage = values.some(([key, value]) => LEGACY_STORAGE_KEYS.includes(key) && value !== null);

        const nextItems = storedItems ? JSON.parse(storedItems) : null;
        const nextTypes = storedTypes ? JSON.parse(storedTypes) : null;
        const nextRecipes = storedRecipes ? JSON.parse(storedRecipes) : null;
        const nextFavorites = storedFavorites ? JSON.parse(storedFavorites) : null;
        const nextGroceryLists = storedGroceryLists
          ? JSON.parse(storedGroceryLists)
          : storedGroceryList ? JSON.parse(storedGroceryList) : null;

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
        const resolvedGroceryLists = isGroceryListArray(nextGroceryLists)
          ? nextGroceryLists
          : isGroceryList(nextGroceryLists) ? [nextGroceryLists] : [defaultState.groceryList];
        const resolvedActiveGroceryListId =
          typeof storedActiveGroceryListId === 'string' && resolvedGroceryLists.some((list) => list.id === storedActiveGroceryListId)
            ? storedActiveGroceryListId
            : resolvedGroceryLists[0]?.id ?? null;
        const nextState = {
          itemTypes: mergedTypes.length ? mergedTypes : defaultState.itemTypes,
          quickSelectItems: resolvedItems,
          recipeList: resolvedRecipes,
          favoriteRecipeIds: resolvedFavorites,
          groceryLists: resolvedGroceryLists,
          activeGroceryListId: resolvedActiveGroceryListId,
        };

        setQuickSelectItems(nextState.quickSelectItems);
        setItemTypes(nextState.itemTypes);
        setRecipeList(nextState.recipeList);
        setFavoriteRecipeIds(nextState.favoriteRecipeIds);
        setGroceryLists(nextState.groceryLists);
        setActiveGroceryListId(nextState.activeGroceryListId);

        if (storedVersion !== STORAGE_SCHEMA_VERSION || hasLegacyStorage) {
          await AsyncStorage.multiSet([
            [STORAGE_VERSION_KEY, STORAGE_SCHEMA_VERSION],
            [ITEM_STORAGE_KEY, JSON.stringify(nextState.quickSelectItems)],
            [TYPE_STORAGE_KEY, JSON.stringify(nextState.itemTypes)],
            [RECIPE_STORAGE_KEY, JSON.stringify(nextState.recipeList)],
            [FAVORITES_STORAGE_KEY, JSON.stringify(nextState.favoriteRecipeIds)],
            [GROCERY_STORAGE_KEY, JSON.stringify(nextState.groceryLists[0] ?? defaultState.groceryList)],
            [GROCERY_LISTS_STORAGE_KEY, JSON.stringify(nextState.groceryLists)],
            [ACTIVE_GROCERY_LIST_KEY, nextState.activeGroceryListId ?? ''],
          ]);
          await AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS);
        }
      } catch {
        await AsyncStorage.multiRemove([
          STORAGE_VERSION_KEY,
          ITEM_STORAGE_KEY,
          TYPE_STORAGE_KEY,
          RECIPE_STORAGE_KEY,
          FAVORITES_STORAGE_KEY,
          GROCERY_STORAGE_KEY,
          GROCERY_LISTS_STORAGE_KEY,
          ACTIVE_GROCERY_LIST_KEY,
          ...LEGACY_STORAGE_KEYS,
        ]);

        if (!active) {
          return;
        }

        setQuickSelectItems(defaultState.quickSelectItems);
        setItemTypes(defaultState.itemTypes);
        setRecipeList(defaultState.recipeList);
        setFavoriteRecipeIds(defaultState.favoriteRecipeIds);
        setGroceryLists([defaultState.groceryList]);
        setActiveGroceryListId(defaultState.groceryList.id);
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

    if (mode !== 'google') {
      setCloudSyncStatus('idle');
    }
  }, [mode, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded || mode !== 'google' || !accessToken) {
      return;
    }

    let active = true;
    const syncFromAPI = async () => {
      setCloudSyncStatus('syncing');
      try {
        const client = new APIClient();
        const syncStatus = await withAPIRetry(() => client.getSyncStatus(accessToken));
        const storedRevision = await AsyncStorage.getItem(SYNC_REVISION_KEY);
        const currentRevision = `${syncStatus.scopeId}:${syncStatus.revision}`;
        if (!active) {
          return;
        }
        if (storedRevision === currentRevision) {
          const [categoriesFromAPI, recipesFromAPI] = await Promise.all([
            withAPIRetry(() => client.listCategories(accessToken)),
            withAPIRetry(() => client.listRecipes(accessToken)),
          ]);
          if (!active) {
            return;
          }
          const refreshedRecipes = recipesFromAPI.map((recipe) => mapAPIRecipeToLocal(
            recipe,
            quickSelectItems,
            recipeList.find((localRecipe) => localRecipe.id === recipe.id),
          ));
          setAPICategories(categoriesFromAPI);
          setRecipeList(refreshedRecipes);
          setFavoriteRecipeIds(recipesFromAPI.filter((recipe) => recipe.favorite).map((recipe) => recipe.id));
          await AsyncStorage.multiSet([
            [RECIPE_STORAGE_KEY, JSON.stringify(refreshedRecipes)],
            [FAVORITES_STORAGE_KEY, JSON.stringify(recipesFromAPI.filter((recipe) => recipe.favorite).map((recipe) => recipe.id))],
          ]);
          setCloudSyncStatus('synced');
          return;
        }

        const [items, recipesFromAPI, lists, categoriesFromAPI] = await Promise.all([
          withAPIRetry(() => client.listPantryItems(accessToken)),
          withAPIRetry(() => client.listRecipes(accessToken)),
          withAPIRetry(() => client.listGroceryLists(accessToken)),
          withAPIRetry(() => client.listCategories(accessToken)),
        ]);
        if (!active) {
          return;
        }
        const synced = mapAPIDataToLocal(items, recipesFromAPI, lists, categoriesFromAPI);
        setAPICategories(synced.categories);
        setQuickSelectItems(synced.quickSelectItems);
        setItemTypes(synced.itemTypes);
        setRecipeList(synced.recipeList);
        setFavoriteRecipeIds(synced.favoriteRecipeIds);
        setGroceryLists(synced.groceryLists);
        setActiveGroceryListId((currentID) =>
          synced.groceryLists.some((list) => list.id === currentID) ? currentID : synced.groceryLists[0]?.id ?? null,
        );
        await AsyncStorage.multiSet([
          [SYNC_REVISION_KEY, currentRevision],
          [ITEM_STORAGE_KEY, JSON.stringify(synced.quickSelectItems)],
          [TYPE_STORAGE_KEY, JSON.stringify(synced.itemTypes)],
          [RECIPE_STORAGE_KEY, JSON.stringify(synced.recipeList)],
          [FAVORITES_STORAGE_KEY, JSON.stringify(synced.favoriteRecipeIds)],
          [GROCERY_LISTS_STORAGE_KEY, JSON.stringify(synced.groceryLists)],
          ...(synced.groceryLists[0] ? [[GROCERY_STORAGE_KEY, JSON.stringify(synced.groceryLists[0])] as [string, string]] : []),
        ]);
        setCloudSyncStatus('synced');
      } catch (error) {
        if (active) {
          if (error instanceof APIClientError && error.status === 401) {
            void logout();
          } else {
            setCloudSyncStatus('failed');
          }
        }
      }
    };

    void syncFromAPI();
    return () => {
      active = false;
    };
  }, [accessToken, cloudSyncAttempt, logout, mode, storageLoaded]);

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
      [GROCERY_LISTS_STORAGE_KEY, JSON.stringify(groceryLists)],
      [ACTIVE_GROCERY_LIST_KEY, activeGroceryListId ?? ''],
    ]);
  }, [activeGroceryListId, favoriteRecipeIds, groceryList, groceryLists, itemTypes, quickSelectItems, recipeList, storageLoaded]);

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
      recipe.ingredients.some((ingredient) =>
        resolveItemName(quickSelectItems, ingredient.itemId, ingredient.name).toLowerCase().includes(query),
      );

    return matchesFilter && matchesQuery;
  });

  const searchedRecipes = recipeList.filter((recipe) => {
    if (!query) {
      return true;
    }

    return (
      recipe.title.toLowerCase().includes(query) ||
      recipe.subtitle.toLowerCase().includes(query) ||
      recipe.ingredients.some((ingredient) =>
        resolveItemName(quickSelectItems, ingredient.itemId, ingredient.name).toLowerCase().includes(query),
      )
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

  const shareResource = async (resourceType: 'recipe' | 'grocery_list', resourceID: string) => {
    if (mode !== 'google' || !accessToken) {
      Alert.alert(t('settings.accountTitle'), t('share.signInRequired'));
      return;
    }

    try {
      const share = await new APIClient().createShare(accessToken, resourceType, resourceID);
      await Share.share({ message: share.url, url: share.url });
    } catch (error) {
      Alert.alert(t('share.createFailed'), error instanceof Error ? error.message : t('share.createFailed'));
    }
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

  const getOrCreateRemoteGroceryList = async (client: APIClient) => {
    if (!accessToken) {
      return groceryList;
    }
    if (groceryList.version !== undefined) {
      return groceryList;
    }

    const created = await client.createGroceryList(accessToken, { name: groceryList.name || 'Shopping' });
    const mapped = mapAPIGroceryListToLocal(created);
    setGroceryLists((currentLists) => currentLists.some((list) => list.id === mapped.id)
      ? currentLists.map((list) => list.id === mapped.id ? mapped : list)
      : [...currentLists, mapped]);
    setActiveGroceryListId(mapped.id);
    return mapped;
  };

  const addItemsToRemoteGroceryList = async (items: Array<{
    itemId?: string;
    name: string;
    quantity: number;
    unit?: string;
    sectionName?: string;
  }>) => {
    if (!accessToken) {
      return;
    }

    const client = new APIClient();
    let activeList = await getOrCreateRemoteGroceryList(client);
    for (const item of items) {
      const currentItem = activeList.sections.flatMap((section) => section.items)
        .find((candidate) => candidate.itemId === item.itemId || candidate.name.toLowerCase() === item.name.toLowerCase());
      const section = item.sectionName
        ? activeList.sections.find((candidate) => slugifyLabel(candidate.title) === slugifyLabel(item.sectionName!))
        : undefined;
      const result = await addGrocerySelection(client, accessToken, activeList.id, item, currentItem, section?.id);
      activeList = mapAPIGroceryListToLocal(result);
      setGroceryList(activeList);
    }
  };

  const confirmAddToList = () => {
    if (!selectedRecipe) {
      return;
    }

    const selectedIngredients = selectedRecipe.ingredients.filter((ingredient) =>
      selectedIngredientIds.includes(ingredient.id),
    );

    if (mode === 'google' && accessToken) {
      const remoteItems = selectedIngredients.map((ingredient) => {
        const item = quickSelectItems.find((candidate) => candidate.id === ingredient.itemId);
        const parsed = parseAmount(ingredient.amount);
        return {
          itemId: item?.version !== undefined ? item.id : undefined,
          name: item?.name ?? ingredient.name,
          quantity: parsed.quantity,
          unit: parsed.unitLabel ?? ingredient.unitLabel,
          sectionName: item?.sectionId,
        };
      });
      void addItemsToRemoteGroceryList(remoteItems)
        .then(() => {
          setLastAddedCount(selectedIngredients.length);
          setShowAddToList(false);
          setSelectedRecipeId(null);
          setShowSuccess(true);
        })
        .catch((error: unknown) => {
          Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        });
      return;
    }

    setGroceryList((currentList) => addIngredientsToList(currentList, selectedIngredients, quickSelectItems));
    setLastAddedCount(selectedIngredients.length);
    setShowAddToList(false);
    setSelectedRecipeId(null);
    setShowSuccess(true);
  };

  const toggleFavorite = (recipeId: string) => {
    if (mode === 'google' && accessToken) {
      void new APIClient().toggleRecipeFavorite(accessToken, recipeId)
        .then((recipe) => {
          setFavoriteRecipeIds((currentIds) => recipe.favorite
            ? Array.from(new Set([...currentIds, recipeId]))
            : currentIds.filter((currentId) => currentId !== recipeId));
        })
        .catch((error: unknown) => {
          Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        });
      return;
    }

    setFavoriteRecipeIds((currentIds) =>
      currentIds.includes(recipeId)
        ? currentIds.filter((currentId) => currentId !== recipeId)
        : [...currentIds, recipeId],
    );
  };

  const deleteRecipe = async (recipeId: string) => {
    const existingRecipe = recipeList.find((recipe) => recipe.id === recipeId);
    if (mode === 'google' && accessToken && existingRecipe?.version !== undefined) {
      try {
        await new APIClient().deleteRecipe(accessToken, recipeId, existingRecipe.version);
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        return;
      }
    }

    setRecipeList((currentRecipes) => currentRecipes.filter((recipe) => recipe.id !== recipeId));
    setFavoriteRecipeIds((currentIds) => currentIds.filter((currentId) => currentId !== recipeId));
    setSelectedRecipeId(null);
    setShowRecipeEdit(false);
  };

  const deleteGroceryItem = async (itemId: string) => {
    if (mode === 'google' && accessToken && groceryList.version !== undefined) {
      try {
        const updated = await new APIClient().removeGroceryItem(accessToken, groceryList.id, itemId);
        setGroceryList(mapAPIGroceryListToLocal(updated));
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
      }
      return;
    }

    setGroceryList((currentList) => removeGroceryItem(currentList, itemId));
  };

  const toggleGroceryItemChecked = (itemId: string) => {
    if (mode === 'google' && accessToken && groceryList.version !== undefined) {
      const item = groceryList.sections.flatMap((section) => section.items).find((candidate) => candidate.id === itemId);
      if (!item) {
        return;
      }
      void withAPIRetry(() => new APIClient().setGroceryItemChecked(accessToken, groceryList.id, itemId, !item.checked))
        .then((updated) => setGroceryList(mapAPIGroceryListToLocal(updated)))
        .catch((error: unknown) => Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError')));
      return;
    }

    setGroceryList((currentList) => toggleGroceryItem(currentList, itemId));
  };

  const setRemoteGroceryItemQuantity = (itemId: string, quantity: number) => {
    if (mode === 'google' && accessToken && groceryList.version !== undefined) {
      void withAPIRetry(() => new APIClient().updateGroceryItem(accessToken, groceryList.id, itemId, { quantity }))
        .then((updated) => setGroceryList(mapAPIGroceryListToLocal(updated)))
        .catch((error: unknown) => Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError')));
      return;
    }

    setGroceryList((currentList) => setGroceryItemQuantity(currentList, itemId, quantity));
  };

  const adjustGroceryQuantity = (itemId: string, delta: number) => {
    if (mode === 'google' && accessToken && groceryList.version !== undefined) {
      const item = groceryList.sections.flatMap((section) => section.items).find((candidate) => candidate.id === itemId);
      if (item) {
        setRemoteGroceryItemQuantity(itemId, Math.max(1, item.quantity + delta));
      }
      return;
    }

    setGroceryList((currentList) => adjustGroceryItemQuantity(currentList, itemId, delta));
  };

  const clearRemoteGroceryList = async () => {
    if (mode === 'google' && accessToken && groceryList.version !== undefined) {
      try {
        const itemIDs = groceryList.sections.flatMap((section) => section.items.map((item) => item.id));
        let updated: Awaited<ReturnType<APIClient['removeGroceryItem']>> | null = null;
        for (const itemID of itemIDs) {
          updated = await new APIClient().removeGroceryItem(accessToken, groceryList.id, itemID);
        }
        if (updated) {
          setGroceryList(mapAPIGroceryListToLocal(updated));
        }
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
      }
      return;
    }

    setGroceryList((currentList) => clearGroceryList(currentList));
  };

  const toggleIngredientSelection = (ingredientId: string) => {
    setSelectedIngredientIds((currentIds) =>
      currentIds.includes(ingredientId)
        ? currentIds.filter((currentId) => currentId !== ingredientId)
        : [...currentIds, ingredientId],
    );
  };

  const saveRecipe = async (
    recipeId: string,
    updates: Pick<Recipe, 'title' | 'subtitle' | 'description' | 'time' | 'difficulty' | 'servings' | 'category' | 'image' | 'ingredients'>,
  ): Promise<void> => {
    const existingRecipe = recipeList.find((recipe) => recipe.id === recipeId);
    if (mode === 'google' && accessToken && existingRecipe?.version !== undefined) {
      try {
        const client = new APIClient();
        const uploadedAsset = updates.image && updates.image !== existingRecipe.image && !/^https?:\/\//i.test(updates.image)
          ? await uploadRecipeImage(client, accessToken, updates.image)
          : null;
        const updated = await client.updateRecipe(accessToken, recipeId, {
          title: updates.title,
          description: updates.subtitle,
          instructions: updates.description,
          version: existingRecipe.version,
          ...(uploadedAsset ? { assetId: uploadedAsset.assetId } : {}),
        });
        await syncRecipeIngredients(client, accessToken, recipeId, updated.ingredients, updates.ingredients);
        const refreshed = await withAPIRetry(() => client.getRecipe(accessToken, recipeId));
        const mapped = mapAPIRecipeToLocal(refreshed, quickSelectItems, { ...existingRecipe, ...updates });
        setRecipeList((currentRecipes) => currentRecipes.map((recipe) => recipe.id === recipeId ? mapped : recipe));
        return;
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        throw error;
      }
    }

    setRecipeList((currentRecipes) =>
      currentRecipes.map((recipe) => (recipe.id === recipeId ? { ...recipe, ...updates } : recipe)),
    );
  };

  const createRecipe = async (
    recipeDraft: Pick<Recipe, 'title' | 'subtitle' | 'description' | 'time' | 'difficulty' | 'servings' | 'category' | 'image' | 'ingredients'>,
  ): Promise<void> => {
    if (mode === 'google' && accessToken) {
      try {
        const client = new APIClient();
        const uploadedAsset = recipeDraft.image
          ? await uploadRecipeImage(client, accessToken, recipeDraft.image)
          : null;
        let recipe = await client.createRecipe(accessToken, {
          title: recipeDraft.title,
          description: recipeDraft.subtitle,
          instructions: recipeDraft.description,
          ...(uploadedAsset ? { assetId: uploadedAsset.assetId } : {}),
        });
        await syncRecipeIngredients(client, accessToken, recipe.id, recipe.ingredients, recipeDraft.ingredients);
        recipe = await withAPIRetry(() => client.getRecipe(accessToken, recipe.id));
        const mapped = mapAPIRecipeToLocal(recipe, quickSelectItems, recipeDraft);
        setRecipeList((currentRecipes) => [mapped, ...currentRecipes]);
        setShowRecipeCreate(false);
        setSelectedRecipeId(mapped.id);
        return;
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        return;
      }
    }

    const nextRecipe: Recipe = {
      id: buildRecipeId(recipeDraft.title),
      ...recipeDraft,
    };

    setRecipeList((currentRecipes) => [nextRecipe, ...currentRecipes]);
    setShowRecipeCreate(false);
    setSelectedRecipeId(nextRecipe.id);
  };

  const addQuickListItems = (selections: QuickAddSelection[]) => {
    if (mode === 'google' && accessToken) {
      const remoteItems = selections.flatMap((selection) => {
        const item = quickSelectItems.find((candidate) => candidate.id === selection.itemId);
        return item ? [{
          itemId: item.version !== undefined ? item.id : undefined,
          name: item.name,
          quantity: selection.quantity,
          unit: item.unitLabel,
          sectionName: item.sectionId,
        }] : [];
      });
      void addItemsToRemoteGroceryList(remoteItems)
        .catch((error: unknown) => Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError')));
      return;
    }

    setGroceryList((currentList) => addQuickItemsToList(currentList, quickSelectItems, selections));
  };

  const ensureRemoteCategory = async (typeId: string): Promise<Category> => {
    if (!accessToken) {
      throw new Error('Sign in to manage pantry categories.');
    }

    const findCategory = (categoriesFromAPI: Category[]) =>
      categoriesFromAPI.find((category) => slugifyLabel(category.name) === typeId);
    const currentCategory = findCategory(apiCategories);
    if (currentCategory) {
      return currentCategory;
    }

    const client = new APIClient();
    const categoriesFromAPI = await withAPIRetry(() => client.listCategories(accessToken));
    setAPICategories(categoriesFromAPI);
    const refreshedCategory = findCategory(categoriesFromAPI);
    if (refreshedCategory) {
      return refreshedCategory;
    }

    try {
      const createdCategory = await client.createCategory(accessToken, { name: formatTypeTitle(typeId) });
      setAPICategories((currentCategories) => [...currentCategories, createdCategory]);
      return createdCategory;
    } catch (error) {
      const latestCategories = await withAPIRetry(() => client.listCategories(accessToken));
      setAPICategories(latestCategories);
      const categoryCreatedElsewhere = findCategory(latestCategories);
      if (categoryCreatedElsewhere) {
        return categoryCreatedElsewhere;
      }
      throw error;
    }
  };

  const addAvailableItem = async (item: Omit<QuickSelectItem, 'id'>) => {
    const trimmedName = item.name.trim();

    if (!trimmedName || quickSelectItems.some((currentItem) => currentItem.name.toLowerCase() === trimmedName.toLowerCase())) {
      return false;
    }

    if (mode === 'google' && accessToken) {
      try {
        const category = await ensureRemoteCategory(item.sectionId);
        const created = await createPantryItem(new APIClient(), accessToken, category, {
          name: trimmedName,
          unit: item.unitLabel,
        });
        setItemTypes((currentTypes) => currentTypes.includes(item.sectionId)
          ? currentTypes
          : [...currentTypes, item.sectionId]);
        setQuickSelectItems((currentItems) => [...currentItems, {
          id: created.id,
          version: created.version,
          categoryId: created.categoryId ?? category.id,
          name: created.name,
          sectionId: item.sectionId,
          unitLabel: created.unit ?? undefined,
          colors: Array.from(new Set(item.colors)),
        }]);
        return true;
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        return false;
      }
    }

    setItemTypes((currentTypes) => currentTypes.includes(item.sectionId)
      ? currentTypes
      : [...currentTypes, item.sectionId]);
    setQuickSelectItems((currentItems) => [...currentItems, {
      id: `quick-${slugifyLabel(trimmedName)}`,
      ...item,
      name: trimmedName,
      colors: Array.from(new Set(item.colors)),
    }]);

    return true;
  };

  const addItemType = async (label: string) => {
    const nextTypeId = slugifyLabel(label);

    if (!nextTypeId || itemTypes.includes(nextTypeId)) {
      return null;
    }

    if (mode === 'google' && accessToken) {
      try {
        const category = await ensureRemoteCategory(nextTypeId);
        const resolvedTypeId = slugifyLabel(category.name);
        setItemTypes((currentTypes) => currentTypes.includes(resolvedTypeId)
          ? currentTypes
          : [...currentTypes, resolvedTypeId]);
        return resolvedTypeId;
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        return null;
      }
    }

    setItemTypes((currentTypes) => [...currentTypes, nextTypeId]);
    return nextTypeId;
  };

  const renameItemType = async (typeId: GrocerySectionId, label: string) => {
    const nextTypeId = slugifyLabel(label);

    if (!nextTypeId || (nextTypeId !== typeId && itemTypes.includes(nextTypeId))) {
      return null;
    }

    if (mode === 'google' && accessToken) {
      const category = apiCategories.find((currentCategory) => slugifyLabel(currentCategory.name) === typeId);
      if (!category) {
        return null;
      }
      try {
        const renamed = await new APIClient().renameCategory(accessToken, category.id, {
          name: formatTypeTitle(nextTypeId),
          version: category.version,
        });
        setAPICategories((currentCategories) => currentCategories.map((currentCategory) =>
          currentCategory.id === renamed.id ? renamed : currentCategory,
        ));
        setItemTypes((currentTypes) => currentTypes.map((currentType) => currentType === typeId ? nextTypeId : currentType));
        setQuickSelectItems((currentItems) => currentItems.map((item) => item.sectionId === typeId
          ? { ...item, sectionId: nextTypeId }
          : item));
        setRecipeList((currentRecipes) => currentRecipes.map((recipe) => ({
          ...recipe,
          ingredients: recipe.ingredients.map((ingredient) => ingredient.itemId
            ? ingredient
            : ingredient.sectionId === typeId ? { ...ingredient, sectionId: nextTypeId } : ingredient),
        })));
        return nextTypeId;
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        return null;
      }
    }

    setItemTypes((currentTypes) => currentTypes.map((currentType) => (currentType === typeId ? nextTypeId : currentType)));
    setQuickSelectItems((currentItems) =>
      currentItems.map((item) => (item.sectionId === typeId ? { ...item, sectionId: nextTypeId } : item)),
    );
    setRecipeList((currentRecipes) =>
      currentRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) =>
          ingredient.itemId
            ? ingredient
            : ingredient.sectionId === typeId
              ? { ...ingredient, sectionId: nextTypeId }
              : ingredient,
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

  const deleteItemType = async (typeId: GrocerySectionId) => {
    if (itemTypes.length <= 1) {
      return false;
    }

    if (mode === 'google' && accessToken) {
      const category = apiCategories.find((currentCategory) => slugifyLabel(currentCategory.name) === typeId);
      if (!category) {
        return false;
      }
      try {
        const client = new APIClient();
        for (const item of quickSelectItems.filter((currentItem) => currentItem.sectionId === typeId)) {
          if (item.version !== undefined) {
            await deletePantryItem(client, accessToken, item.id, item.version);
          }
        }
        await client.deleteCategory(accessToken, category.id, category.version);
        setAPICategories((currentCategories) => currentCategories.filter((currentCategory) => currentCategory.id !== category.id));
        setItemTypes((currentTypes) => currentTypes.filter((currentType) => currentType !== typeId));
        setQuickSelectItems((currentItems) => currentItems.filter((item) => item.sectionId !== typeId));
        setRecipeList((currentRecipes) => currentRecipes.map((recipe) => ({
          ...recipe,
          ingredients: recipe.ingredients.filter((ingredient) => ingredient.sectionId !== typeId),
        })));
        return true;
      } catch (error) {
        setCloudSyncAttempt((currentAttempt) => currentAttempt + 1);
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        return false;
      }
    }

    setItemTypes((currentTypes) => currentTypes.filter((currentType) => currentType !== typeId));
    setQuickSelectItems((currentItems) => currentItems.filter((item) => item.sectionId !== typeId));
    setRecipeList((currentRecipes) =>
      currentRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) =>
          ingredient.itemId
            ? ingredient
            : ingredient.sectionId === typeId
              ? { ...ingredient, sectionId: undefined }
              : ingredient,
        ),
      })),
    );
    setGroceryList((currentList) => ({
      ...currentList,
      sections: currentList.sections.filter((section) => section.id !== typeId),
    }));

    return true;
  };

  const updateAvailableItem = async (
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

    let resolvedSectionId = updates.sectionId;
    let updatedCategoryId = existingItem.categoryId;
    let updatedVersion = existingItem.version;
    if (mode === 'google' && accessToken) {
      if (existingItem.version === undefined) {
        return false;
      }
      try {
        const category = await ensureRemoteCategory(updates.sectionId);
        const updated = await updatePantryItem(new APIClient(), accessToken, itemId, existingItem.version, category, {
          name: nextName,
          unit: updates.unitLabel,
        });
        resolvedSectionId = slugifyLabel(category.name);
        updatedCategoryId = updated.categoryId ?? undefined;
        updatedVersion = updated.version;
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        return false;
      }
    }

    setItemTypes((currentTypes) =>
      currentTypes.includes(resolvedSectionId) ? currentTypes : [...currentTypes, resolvedSectionId],
    );
    setQuickSelectItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              name: nextName,
              sectionId: resolvedSectionId,
              categoryId: updatedCategoryId,
              version: updatedVersion,
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
          ingredient.itemId === itemId ||
          (!ingredient.itemId && ingredient.name.toLowerCase() === existingItem.name.toLowerCase())
            ? {
                ...ingredient,
                name: nextName,
                sectionId: resolvedSectionId,
                itemId,
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
          item.itemId === itemId ||
          (!item.itemId && item.name.toLowerCase() === existingItem.name.toLowerCase())
            ? { ...item, name: nextName, itemId: item.itemId ?? itemId }
            : item,
        ),
      })),
    }));

    return true;
  };

  const deleteAvailableItem = async (itemId: string) => {
    const existingItem = quickSelectItems.find((item) => item.id === itemId);

    if (!existingItem) {
      return false;
    }

    if (mode === 'google' && accessToken) {
      if (existingItem.version === undefined) {
        return false;
      }
      try {
        await deletePantryItem(new APIClient(), accessToken, itemId, existingItem.version);
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        return false;
      }
    }

    setQuickSelectItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    setRecipeList((currentRecipes) =>
      currentRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.filter(
          (ingredient) =>
            ingredient.itemId !== itemId &&
            ingredient.name.toLowerCase() !== existingItem.name.toLowerCase(),
        ),
      })),
    );
    setGroceryList((currentList) => ({
      ...currentList,
      sections: currentList.sections.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.itemId !== itemId && item.name.toLowerCase() !== existingItem.name.toLowerCase(),
        ),
      })),
    }));

    return true;
  };

  const createGroceryList = async (name: string): Promise<boolean> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return false;
    }

    if (mode === 'google' && accessToken) {
      try {
        const created = await new APIClient().createGroceryList(accessToken, { name: trimmedName });
        const mapped = mapAPIGroceryListToLocal(created);
        setGroceryLists((currentLists) => [...currentLists, mapped]);
        setActiveGroceryListId(mapped.id);
        return true;
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        return false;
      }
    }

    const nextList: GroceryList = {
      ...groceryList,
      id: `grocery-${slugifyLabel(trimmedName)}-${Date.now().toString(36)}`,
      name: trimmedName,
      sections: groceryList.sections.map((section) => ({ ...section, items: [] })),
    };
    setGroceryLists((currentLists) => [...currentLists, nextList]);
    setActiveGroceryListId(nextList.id);
    return true;
  };

  const deleteActiveGroceryList = async () => {
    if (groceryLists.length <= 1) {
      return false;
    }

    if (mode === 'google' && accessToken && groceryList.version !== undefined) {
      try {
        await new APIClient().deleteGroceryList(accessToken, groceryList.id, groceryList.version);
      } catch (error) {
        Alert.alert(t('settings.accountTitle'), error instanceof Error ? error.message : t('share.previewError'));
        setCloudSyncAttempt((currentAttempt) => currentAttempt + 1);
        return false;
      }
    }

    const remainingLists = groceryLists.filter((list) => list.id !== groceryList.id);
    setGroceryLists(remainingLists);
    setActiveGroceryListId(remainingLists[0]?.id ?? null);
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
            onDeleteRecipe={deleteRecipe}
          />
        );
      case 'list':
        return (
          <GroceryListScreen
            groceryList={groceryList}
            groceryLists={groceryLists}
            selectedListId={groceryList.id}
            quickSelectItems={quickSelectItems}
            onSelectList={setActiveGroceryListId}
            onCreateList={createGroceryList}
            onDeleteList={deleteActiveGroceryList}
            onToggleItem={toggleGroceryItemChecked}
            onAddQuickItems={addQuickListItems}
            onSetItemQuantity={setRemoteGroceryItemQuantity}
            onAdjustItemQuantity={adjustGroceryQuantity}
            onClearList={() => void clearRemoteGroceryList()}
            onShareList={() => void shareResource('grocery_list', groceryList.id)}
            onDeleteItem={deleteGroceryItem}
          />
        );
      case 'items':
        return (
          <PantryScreen
            items={quickSelectItems}
            itemTypes={itemTypes}
            recipes={recipeList}
            groceryList={groceryList}
            onAddItem={addAvailableItem}
            onAddType={addItemType}
            onRenameType={renameItemType}
            onDeleteType={deleteItemType}
            onUpdateItem={updateAvailableItem}
            onDeleteItem={deleteAvailableItem}
          />
        );
      case 'household':
        return (
          <HouseholdScreen
            accessToken={accessToken}
            onHouseholdChanged={() => setCloudSyncAttempt((currentAttempt) => currentAttempt + 1)}
            pendingInviteToken={pendingHouseholdInviteToken}
            onInviteTokenConsumed={() => setPendingHouseholdInviteToken(null)}
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
            catalogItems={quickSelectItems}
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
        catalogItems={quickSelectItems}
        favorite={selectedRecipe ? favoriteRecipeIds.includes(selectedRecipe.id) : false}
        visible={selectedRecipe !== null}
        onClose={closeRecipe}
        onAddToList={openAddToList}
        onShare={(recipe) => void shareResource('recipe', recipe.id)}
        onToggleFavorite={toggleFavorite}
        onEdit={() => setShowRecipeEdit(true)}
        onDelete={deleteRecipe}
      />

      <AddToListModal
        recipe={selectedRecipe}
        catalogItems={quickSelectItems}
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
        isGoogleConnected={mode === 'google'}
        syncStatus={cloudSyncStatus}
        onRetrySync={() => setCloudSyncAttempt((currentAttempt) => currentAttempt + 1)}
        onLogout={() => {
          setShowThemeSettings(false);
          void logout();
        }}
        onSignIn={signInWithGoogle}
      />

      <SharePreviewModal
        token={pendingShareToken}
        accessToken={accessToken}
        onClose={() => setPendingShareToken(null)}
        onAccepted={() => {
          setPendingShareToken(null);
          setCloudSyncAttempt((currentAttempt) => currentAttempt + 1);
        }}
        onSignIn={signInWithGoogle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
