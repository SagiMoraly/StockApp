import { apiConfig } from './config';
import {
  APIProblem,
  AccountState,
  AssetUpload,
  AssetUploadCommand,
  Category,
  CreateCategoryInput,
  GroceryItemCommand,
  GroceryItemMoveCommand,
  GroceryList,
  GroceryListCommand,
  CreateHouseholdResult,
  HouseholdStatus,
  SyncStatus,
  PantryItem,
  PantryItemCommand,
  Recipe,
  RecipeCommand,
  RecipeIngredientCommand,
  RenameCategoryInput,
  AcceptedShare,
  CreatedShare,
  SharePreview,
  ShareResourceType,
} from './types';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

type FetchImplementation = typeof fetch;

export class APIClientError extends Error {
  readonly status: number;
  readonly problem: APIProblem | null;
  readonly retryable: boolean;

  constructor(message: string, status = 0, problem: APIProblem | null = null) {
    super(message);
    this.name = 'APIClientError';
    this.status = status;
    this.problem = problem;
    this.retryable = status === 0 || status === 429 || status >= 500;
  }
}

export class APIClient {
  constructor(
    private readonly baseURL = apiConfig.baseURL,
    private readonly fetchImplementation: FetchImplementation = fetch,
  ) {}

  async signInWithGoogle(idToken: string, signal?: AbortSignal): Promise<{ accessToken: string; expiresAt: string; account: AccountState }> {
    return this.request('/v1/auth/google', { method: 'POST', body: { idToken }, signal });
  }

  async getMe(token: string, signal?: AbortSignal): Promise<AccountState> {
    return this.request<AccountState>('/v1/me', { token, signal });
  }

  async getHouseholdStatus(token: string, signal?: AbortSignal): Promise<HouseholdStatus> {
    return this.request<HouseholdStatus>('/v1/households/status', { token, signal });
  }

  async getSyncStatus(token: string, signal?: AbortSignal): Promise<SyncStatus> {
    return this.request<SyncStatus>('/v1/sync/status', { token, signal });
  }

  async createHousehold(token: string, name: string): Promise<CreateHouseholdResult> {
    return this.request<CreateHouseholdResult>('/v1/households', { method: 'POST', token, body: { name } });
  }

  async applyToHousehold(token: string, inviteToken: string): Promise<HouseholdStatus> {
    return this.request<HouseholdStatus>('/v1/households/applications', {
      method: 'POST',
      token,
      body: { token: inviteToken },
    });
  }

  async acceptHouseholdApplication(token: string, applicationID: string, moveExistingData = true): Promise<HouseholdStatus> {
    return this.request<HouseholdStatus>(`/v1/households/applications/${encodeURIComponent(applicationID)}/accept`, {
      method: 'POST',
      token,
      body: { moveExistingData },
    });
  }

  async rejectHouseholdApplication(token: string, applicationID: string): Promise<HouseholdStatus> {
    return this.request<HouseholdStatus>(`/v1/households/applications/${encodeURIComponent(applicationID)}/reject`, {
      method: 'POST',
      token,
    });
  }

  async leaveHousehold(token: string): Promise<void> {
    await this.request<void>('/v1/households/leave', { method: 'POST', token });
  }

  async listCategories(token: string, signal?: AbortSignal): Promise<Category[]> {
    return this.request<Category[]>('/v1/categories', { token, signal });
  }

  async createCategory(token: string, input: CreateCategoryInput): Promise<Category> {
    return this.request<Category>('/v1/categories', { method: 'POST', token, body: input });
  }

  async renameCategory(token: string, categoryID: string, input: RenameCategoryInput): Promise<Category> {
    return this.request<Category>(`/v1/categories/${encodeURIComponent(categoryID)}`, { method: 'PATCH', token, body: input });
  }

  async deleteCategory(token: string, categoryID: string, version: number): Promise<void> {
    await this.request<void>(`/v1/categories/${encodeURIComponent(categoryID)}`, {
      method: 'DELETE',
      token,
      body: { version },
    });
  }

  async listPantryItems(token: string, signal?: AbortSignal): Promise<PantryItem[]> {
    return this.request<PantryItem[]>('/v1/pantry/items', { token, signal });
  }

  async createPantryItem(token: string, input: PantryItemCommand): Promise<PantryItem> {
    return this.request<PantryItem>('/v1/pantry/items', { method: 'POST', token, body: input });
  }

  async updatePantryItem(token: string, itemID: string, input: PantryItemCommand): Promise<PantryItem> {
    return this.request<PantryItem>(`/v1/pantry/items/${encodeURIComponent(itemID)}`, { method: 'PATCH', token, body: input });
  }

  async deletePantryItem(token: string, itemID: string, version: number): Promise<void> {
    await this.request<void>(`/v1/pantry/items/${encodeURIComponent(itemID)}`, {
      method: 'DELETE',
      token,
      body: { version },
    });
  }

  async listRecipes(token: string, signal?: AbortSignal): Promise<Recipe[]> {
    return this.request<Recipe[]>('/v1/recipes', { token, signal });
  }

  async getRecipe(token: string, recipeID: string, signal?: AbortSignal): Promise<Recipe> {
    return this.request<Recipe>(`/v1/recipes/${encodeURIComponent(recipeID)}`, { token, signal });
  }

  async createRecipe(token: string, input: RecipeCommand): Promise<Recipe> {
    return this.request<Recipe>('/v1/recipes', { method: 'POST', token, body: input });
  }

  async updateRecipe(token: string, recipeID: string, input: RecipeCommand): Promise<Recipe> {
    return this.request<Recipe>(`/v1/recipes/${encodeURIComponent(recipeID)}`, { method: 'PATCH', token, body: input });
  }

  async deleteRecipe(token: string, recipeID: string, version: number): Promise<void> {
    await this.request<void>(`/v1/recipes/${encodeURIComponent(recipeID)}`, {
      method: 'DELETE',
      token,
      body: { version },
    });
  }

  async toggleRecipeFavorite(token: string, recipeID: string): Promise<Recipe> {
    return this.request<Recipe>(`/v1/recipes/${encodeURIComponent(recipeID)}/favorite`, { method: 'POST', token });
  }

  async addRecipeIngredient(token: string, recipeID: string, input: RecipeIngredientCommand): Promise<Recipe> {
    return this.request<Recipe>(`/v1/recipes/${encodeURIComponent(recipeID)}/ingredients`, { method: 'POST', token, body: input });
  }

  async removeRecipeIngredient(token: string, recipeID: string, ingredientID: string): Promise<Recipe> {
    return this.request<Recipe>(
      `/v1/recipes/${encodeURIComponent(recipeID)}/ingredients/${encodeURIComponent(ingredientID)}`,
      { method: 'DELETE', token },
    );
  }

  async listGroceryLists(token: string, signal?: AbortSignal): Promise<GroceryList[]> {
    return this.request<GroceryList[]>('/v1/grocery-lists', { token, signal });
  }

  async createGroceryList(token: string, input: GroceryListCommand): Promise<GroceryList> {
    return this.request<GroceryList>('/v1/grocery-lists', { method: 'POST', token, body: input });
  }

  async updateGroceryList(token: string, listID: string, input: GroceryListCommand): Promise<GroceryList> {
    return this.request<GroceryList>(`/v1/grocery-lists/${encodeURIComponent(listID)}`, { method: 'PATCH', token, body: input });
  }

  async deleteGroceryList(token: string, listID: string, version: number): Promise<void> {
    await this.request<void>(`/v1/grocery-lists/${encodeURIComponent(listID)}`, {
      method: 'DELETE',
      token,
      body: { version },
    });
  }

  async addGroceryItem(token: string, listID: string, input: GroceryItemCommand): Promise<GroceryList> {
    return this.request<GroceryList>(`/v1/grocery-lists/${encodeURIComponent(listID)}/items`, {
      method: 'POST',
      token,
      body: input,
    });
  }

  async updateGroceryItem(token: string, listID: string, itemID: string, input: GroceryItemCommand): Promise<GroceryList> {
    return this.request<GroceryList>(`/v1/grocery-lists/${encodeURIComponent(listID)}/items/${encodeURIComponent(itemID)}`, {
      method: 'PATCH',
      token,
      body: input,
    });
  }

  async setGroceryItemChecked(token: string, listID: string, itemID: string, checked: boolean): Promise<GroceryList> {
    return this.request<GroceryList>(`/v1/grocery-lists/${encodeURIComponent(listID)}/items/${encodeURIComponent(itemID)}/checked`, {
      method: 'POST',
      token,
      body: { checked },
    });
  }

  async moveGroceryItem(token: string, listID: string, itemID: string, input: GroceryItemMoveCommand): Promise<GroceryList> {
    return this.request<GroceryList>(`/v1/grocery-lists/${encodeURIComponent(listID)}/items/${encodeURIComponent(itemID)}/move`, {
      method: 'POST',
      token,
      body: input,
    });
  }

  async removeGroceryItem(token: string, listID: string, itemID: string): Promise<GroceryList> {
    return this.request<GroceryList>(`/v1/grocery-lists/${encodeURIComponent(listID)}/items/${encodeURIComponent(itemID)}`, {
      method: 'DELETE',
      token,
    });
  }

  async createAssetUpload(token: string, input: AssetUploadCommand): Promise<AssetUpload> {
    return this.request<AssetUpload>('/v1/assets/upload', { method: 'POST', token, body: input });
  }

  async confirmAsset(token: string, assetID: string): Promise<AssetUpload> {
    return this.request<AssetUpload>(`/v1/assets/${encodeURIComponent(assetID)}/confirm`, { method: 'POST', token });
  }

  async deleteAsset(token: string, assetID: string): Promise<void> {
    await this.request<void>(`/v1/assets/${encodeURIComponent(assetID)}`, { method: 'DELETE', token });
  }

  async createShare(token: string, resourceType: ShareResourceType, resourceID: string): Promise<CreatedShare> {
    return this.request<CreatedShare>('/v1/shares', {
      method: 'POST',
      token,
      body: { resourceType, resourceId: resourceID },
    });
  }

  async previewShare(token: string, shareToken: string): Promise<SharePreview> {
    return this.request<SharePreview>('/v1/shares/preview', {
      method: 'POST',
      token,
      body: { token: shareToken },
    });
  }

  async acceptShare(token: string, shareToken: string): Promise<AcceptedShare> {
    return this.request<AcceptedShare>('/v1/shares/accept', {
      method: 'POST',
      token,
      body: { token: shareToken },
    });
  }

  private async request<Response>(path: string, options: RequestOptions = {}): Promise<Response> {
    if (!this.baseURL) {
      throw new APIClientError('The API URL is not configured. Set EXPO_PUBLIC_API_URL.', 0);
    }

    try {
      const response = await this.fetchImplementation(`${this.baseURL}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal: options.signal,
      });

      if (response.status === 204) {
        return undefined as Response;
      }

      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const problem = isAPIProblem(payload) ? payload : null;
        throw new APIClientError(problem?.message ?? `Server request failed with status ${response.status}.`, response.status, problem);
      }
      return payload as Response;
    } catch (error) {
      if (error instanceof APIClientError) {
        throw error;
      }
      throw new APIClientError(error instanceof Error ? error.message : 'Unable to reach the server.');
    }
  }
}

const isAPIProblem = (value: unknown): value is APIProblem =>
  typeof value === 'object' && value !== null && 'code' in value && 'message' in value;