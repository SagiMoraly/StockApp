export type APIProblem = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type ScopeType = 'personal' | 'household';

export type AccountState = {
  profile: {
    id: string;
    displayName: string | null;
  };
  scope: {
    id: string;
    type: ScopeType;
  };
  household: {
    id: string;
    name: string;
  } | null;
};

export type Category = {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoryInput = {
  name: string;
};

export type RenameCategoryInput = CreateCategoryInput & {
  version: number;
};

export type GroceryItemCommand = {
  itemId?: string;
  name?: string;
  quantity?: number;
  unit?: string;
  checked?: boolean;
  sectionId?: string | null;
  position?: number;
  version?: number;
};

export type PantryItem = {
  id: string;
  categoryId: string | null;
  name: string;
  unit: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PantryItemCommand = {
  name: string;
  categoryId?: string | null;
  unit?: string | null;
  version?: number;
};

export type RecipeIngredient = {
  id: string;
  itemId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  position: number;
};

export type RecipeAsset = {
  id: string;
  readUrl: string;
  contentType: string;
};

export type Recipe = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  favorite: boolean;
  version: number;
  ingredients: RecipeIngredient[];
  assets: RecipeAsset[];
  createdAt: string;
  updatedAt: string;
};

export type RecipeCommand = {
  title: string;
  description?: string | null;
  instructions?: string | null;
  assetId?: string;
  version?: number;
};

export type RecipeIngredientCommand = {
  itemId: string;
  quantity?: number;
  unit?: string | null;
};

export type GroceryItem = {
  id: string;
  itemId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  sectionId: string | null;
  position: number;
};

export type GrocerySection = {
  id: string;
  name: string;
  position: number;
  items: GroceryItem[];
};

export type GroceryList = {
  id: string;
  name: string;
  version: number;
  sections: GrocerySection[];
  items: GroceryItem[];
  createdAt: string;
  updatedAt: string;
};

export type GroceryListCommand = {
  name: string;
  version?: number;
};

export type GroceryItemMoveCommand = {
  sectionId?: string | null;
  position: number;
};

export type AssetUploadCommand = {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  byteSize: number;
};

export type AssetUpload = {
  assetId: string;
  uploadUrl: string;
  readUrl?: string;
};

export type ShareResourceType = 'recipe' | 'grocery_list';

export type CreatedShare = {
  url: string;
  expiresAt: string;
};

export type SharePreview = {
  resourceType: ShareResourceType;
  title: string;
  expired: boolean;
};

export type AcceptedShare = {
  resourceType: ShareResourceType;
  id: string;
};

export type HouseholdMember = {
  id: string;
  displayName: string | null;
};

export type Household = {
  id: string;
  name: string;
  members: HouseholdMember[];
};

export type HouseholdStatus = {
  household: Household | null;
  applications: HouseholdApplication[];
};

export type HouseholdApplication = {
  id: string;
  householdId: string;
  householdName: string;
  applicantId: string;
  applicantName: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
};

export type CreateHouseholdResult = {
  householdId: string;
  name: string;
  inviteToken: string;
};

export type SyncStatus = {
  scopeId: string;
  revision: string;
};