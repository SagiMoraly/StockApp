import { APIClient } from './client';
import { Category, PantryItem } from './types';

export type PantryItemDraft = {
  name: string;
  unit?: string;
};

export const createPantryItem = (
  client: APIClient,
  token: string,
  category: Category,
  draft: PantryItemDraft,
): Promise<PantryItem> => client.createPantryItem(token, {
  name: draft.name,
  categoryId: category.id,
  unit: draft.unit?.trim() || null,
});

export const updatePantryItem = (
  client: APIClient,
  token: string,
  itemID: string,
  version: number,
  category: Category,
  draft: PantryItemDraft,
): Promise<PantryItem> => client.updatePantryItem(token, itemID, {
  name: draft.name,
  categoryId: category.id,
  unit: draft.unit?.trim() || null,
  version,
});

export const deletePantryItem = (
  client: APIClient,
  token: string,
  itemID: string,
  version: number,
): Promise<void> => client.deletePantryItem(token, itemID, version);