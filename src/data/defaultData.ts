import { GroceryList, QuickSelectItem, Recipe } from '../types';

export const categories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'] as const;

export const starterItemTypes = ['produce', 'dairy', 'pantry'] as const;

const formatTypeTitle = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const recipes: Recipe[] = [];

export const quickSelectItems: QuickSelectItem[] = [];

export const initialGroceryList: GroceryList = {
  id: 'list-primary',
  name: 'My Grocery List',
  store: 'Any Store',
  sections: starterItemTypes.map((typeId) => ({
    id: typeId,
    title: formatTypeTitle(typeId),
    items: [],
  })),
};

export const pantryHighlights = ['Olive oil', 'Sea salt', 'Rice'];