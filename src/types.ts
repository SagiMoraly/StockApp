export type TabKey = 'home' | 'recipes' | 'list' | 'items';

export type RecipeCategory = 'All' | 'Breakfast' | 'Lunch' | 'Dinner' | 'Dessert';

export type RecipeFilter = RecipeCategory | 'Favorites';

export type RecipeIngredient = {
  id: string;
  name: string;
  amount: string;
  sectionId?: GrocerySectionId;
  quickItemId?: string;
  unitLabel?: string;
};

export type Recipe = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  time: string;
  difficulty: string;
  servings: string;
  image: string;
  category: RecipeCategory;
  ingredients: RecipeIngredient[];
};

export type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  unitLabel?: string;
  quickItemId?: string;
  checked: boolean;
};

export type QuickAddSelection = {
  itemId: string;
  quantity: number;
};

export type GrocerySectionId = string;

export type GrocerySection = {
  id: GrocerySectionId;
  title: string;
  items: GroceryItem[];
};

export type GroceryList = {
  id: string;
  name: string;
  store: string;
  sections: GrocerySection[];
};

export type QuickSelectItem = {
  id: string;
  name: string;
  sectionId: GrocerySectionId;
  unitLabel?: string;
  colors: string[];
};

export type StockUpData = {
  version: number;
  updatedAt: string;
  itemTypes: string[];
  quickSelectItems: QuickSelectItem[];
  recipeList: Recipe[];
  favoriteRecipeIds: string[];
  groceryList: GroceryList;
};
