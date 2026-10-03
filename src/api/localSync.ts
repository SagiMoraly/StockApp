import { Category, GroceryList as APIList, PantryItem as APIItem, Recipe as APIRecipe } from './types';
import { GroceryList, QuickSelectItem, Recipe } from '../types';

export type LocalSyncData = {
  itemTypes: string[];
  quickSelectItems: QuickSelectItem[];
  recipeList: Recipe[];
  favoriteRecipeIds: string[];
  groceryList: GroceryList | null;
  groceryLists: GroceryList[];
  categories: Category[];
};

const categorySlug = (name: string) => name
  .trim()
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '-')
  .replace(/^-|-$/g, '');

export const mapAPIRecipeToLocal = (
  recipe: APIRecipe,
  catalogItems: QuickSelectItem[],
  localDetails?: Pick<Recipe, 'subtitle' | 'time' | 'difficulty' | 'servings' | 'category'>,
): Recipe => ({
  id: recipe.id,
  version: recipe.version,
  assetId: recipe.assets[0]?.id,
  title: recipe.title,
  subtitle: recipe.description ?? localDetails?.subtitle ?? '',
  description: recipe.instructions ?? recipe.description ?? '',
  time: localDetails?.time ?? '',
  difficulty: localDetails?.difficulty ?? '',
  servings: localDetails?.servings ?? '',
  image: recipe.assets[0]?.readUrl ?? '',
  category: localDetails?.category ?? 'All',
  ingredients: recipe.ingredients.map((ingredient) => {
    const item = catalogItems.find((candidate) => candidate.id === ingredient.itemId);

    return {
      id: ingredient.id,
      name: ingredient.name,
      amount: ingredient.quantity === null ? '' : String(ingredient.quantity),
      itemId: ingredient.itemId,
      sectionId: item?.sectionId,
      unitLabel: ingredient.unit ?? item?.unitLabel,
    };
  }),
});

export const mapAPIGroceryListToLocal = (list: APIList): GroceryList => {
  const allItems = new Map<string, APIList['items'][number]>();
  for (const item of [...list.items, ...list.sections.flatMap((section) => section.items)]) {
    allItems.set(item.id, item);
  }

  const sections = list.sections.map((section) => ({
    id: section.id,
    title: section.name,
    items: Array.from(allItems.values())
      .filter((item) => item.sectionId === section.id)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? 1,
        unitLabel: item.unit ?? undefined,
        itemId: item.itemId,
        checked: item.checked,
      })),
  }));
  const unsectionedItems = Array.from(allItems.values())
    .filter((item) => !item.sectionId)
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? 1,
      unitLabel: item.unit ?? undefined,
      itemId: item.itemId,
      checked: item.checked,
    }));

  if (unsectionedItems.length) {
    sections.push({ id: 'uncategorized', title: 'Uncategorized', items: unsectionedItems });
  }

  return {
    id: list.id,
    version: list.version,
    name: list.name,
    store: '',
    sections,
  };
};

export const mapAPIDataToLocal = (
  items: APIItem[],
  recipes: APIRecipe[],
  lists: APIList[],
  categories: Category[] = [],
): LocalSyncData => {
  const categoriesByID = new Map(categories.map((category) => [category.id, category]));
  const quickSelectItems = items.map((item) => ({
    id: item.id,
    version: item.version,
    categoryId: item.categoryId ?? undefined,
    name: item.name,
    sectionId: item.categoryId
      ? categorySlug(categoriesByID.get(item.categoryId)?.name ?? item.categoryId)
      : 'pantry',
    unitLabel: item.unit ?? undefined,
    colors: ['#4F8B3D'],
  }));
  const itemTypes = categories.length
    ? categories.map((category) => categorySlug(category.name))
    : Array.from(new Set(quickSelectItems.map((item) => item.sectionId)));
  const recipeList = recipes.map((recipe) => mapAPIRecipeToLocal(recipe, quickSelectItems));
  const groceryLists = lists.map(mapAPIGroceryListToLocal);

  return {
    itemTypes: itemTypes.length ? itemTypes : ['pantry'],
    quickSelectItems,
    recipeList,
    favoriteRecipeIds: recipes.filter((recipe) => recipe.favorite).map((recipe) => recipe.id),
    groceryList: groceryLists[0] ?? null,
    groceryLists,
    categories,
  };
};
