import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { AddToListModal } from './components/AddToListModal';
import { BottomNav } from './components/BottomNav';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeEditModal } from './components/RecipeEditModal';
import { SuccessModal } from './components/SuccessModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { useAuth } from './auth/AuthProvider';
import { downloadUserData, uploadUserData } from './cloud/googleDrive';
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
import { useTheme } from './ThemeProvider';
import { GrocerySectionId, QuickAddSelection, QuickSelectItem, Recipe, RecipeFilter, StockUpData, TabKey } from './types';
import {
  adjustGroceryItemQuantity,
  addIngredientsToList,
  addQuickItemsToList,
  clearGroceryList,
  removeGroceryItem,
  setGroceryItemQuantity,
  toggleGroceryItem,
} from './utils/grocery';

type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'failed';

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
  const { mode, accessToken, logout, signInWithGoogle } = useAuth();
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
  const [lastAddedCount, setLastAddedCount] = useState(0);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [cloudSyncReady, setCloudSyncReady] = useState(mode !== 'google');
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [cloudSyncAttempt, setCloudSyncAttempt] = useState(0);

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
    if (!storageLoaded || mode !== 'google' || !accessToken) {
      setCloudSyncReady(mode !== 'google');
      setCloudSyncStatus(mode === 'google' ? 'idle' : 'synced');
      return;
    }

    let active = true;
    setCloudSyncReady(false);
    setCloudSyncStatus('syncing');

    const loadCloudData = async () => {
      try {
        const cloudData = await downloadUserData(accessToken);

        if (active && cloudData) {
          setItemTypes(cloudData.itemTypes);
          setQuickSelectItems(cloudData.quickSelectItems);
          setRecipeList(cloudData.recipeList);
          setFavoriteRecipeIds(cloudData.favoriteRecipeIds);
          setGroceryList(cloudData.groceryList);
        }
        if (active) {
          setCloudSyncReady(true);
          setCloudSyncStatus('synced');
        }
      } catch {
        if (active) {
          setCloudSyncReady(false);
          setCloudSyncStatus('failed');
        }
      }
    };

    void loadCloudData();

    return () => {
      active = false;
    };
  }, [accessToken, mode, storageLoaded, cloudSyncAttempt]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    const data: StockUpData = {
      version: Number(STORAGE_SCHEMA_VERSION),
      updatedAt: new Date().toISOString(),
      itemTypes,
      quickSelectItems,
      recipeList,
      favoriteRecipeIds,
      groceryList,
    };

    void AsyncStorage.multiSet([
      [STORAGE_VERSION_KEY, STORAGE_SCHEMA_VERSION],
      [ITEM_STORAGE_KEY, JSON.stringify(quickSelectItems)],
      [TYPE_STORAGE_KEY, JSON.stringify(itemTypes)],
      [RECIPE_STORAGE_KEY, JSON.stringify(recipeList)],
      [FAVORITES_STORAGE_KEY, JSON.stringify(favoriteRecipeIds)],
      [GROCERY_STORAGE_KEY, JSON.stringify(groceryList)],
    ]);

    if (cloudSyncReady && accessToken) {
      setCloudSyncStatus('syncing');
      void uploadUserData(accessToken, data)
        .then(() => setCloudSyncStatus('synced'))
        .catch(() => setCloudSyncStatus('failed'));
    }
  }, [accessToken, cloudSyncReady, favoriteRecipeIds, groceryList, itemTypes, quickSelectItems, recipeList, storageLoaded]);

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

  const deleteRecipe = (recipeId: string) => {
    setRecipeList((currentRecipes) => currentRecipes.filter((recipe) => recipe.id !== recipeId));
    setFavoriteRecipeIds((currentIds) => currentIds.filter((currentId) => currentId !== recipeId));
    setSelectedRecipeId(null);
    setShowRecipeEdit(false);
  };

  const deleteGroceryItem = (itemId: string) => {
    setGroceryList((currentList) => removeGroceryItem(currentList, itemId));
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
            onDeleteRecipe={deleteRecipe}
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
            onDeleteItem={deleteGroceryItem}
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
        onDelete={deleteRecipe}
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
        isGoogleConnected={mode === 'google'}
        syncStatus={cloudSyncStatus}
        onRetrySync={() => setCloudSyncAttempt((currentAttempt) => currentAttempt + 1)}
        onLogout={() => {
          setShowThemeSettings(false);
          void logout();
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
