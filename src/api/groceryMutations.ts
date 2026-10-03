import { APIClient } from './client';
import { GroceryItemCommand, GroceryList } from './types';

export type GrocerySelection = GroceryItemCommand & {
  quantity: number;
  name: string;
};

export const addGrocerySelection = (
  client: APIClient,
  token: string,
  listID: string,
  selection: GrocerySelection,
  existingItem?: { id: string; quantity: number },
  sectionID?: string,
): Promise<GroceryList> => existingItem
  ? client.updateGroceryItem(token, listID, existingItem.id, {
      quantity: existingItem.quantity + selection.quantity,
      unit: selection.unit,
    })
  : client.addGroceryItem(token, listID, {
      ...(selection.itemId ? { itemId: selection.itemId } : { name: selection.name }),
      quantity: selection.quantity,
      unit: selection.unit,
      sectionId: sectionID ?? null,
    });