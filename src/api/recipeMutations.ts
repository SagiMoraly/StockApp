import { APIClient } from './client';
import { Recipe as APIRecipe } from './types';
import { Recipe } from '../types';
import { parseAmount } from '../utils/grocery';

export const syncRecipeIngredients = async (
  client: APIClient,
  token: string,
  recipeID: string,
  currentIngredients: APIRecipe['ingredients'],
  requestedIngredients: Recipe['ingredients'],
) => {
  const requestedByItemID = new Map(requestedIngredients
    .filter((ingredient) => ingredient.itemId)
    .map((ingredient) => [ingredient.itemId!, ingredient]));
  const currentByItemID = new Map(currentIngredients.map((ingredient) => [ingredient.itemId, ingredient]));

  for (const currentIngredient of currentIngredients) {
    const requested = requestedByItemID.get(currentIngredient.itemId);
    if (!requested) {
      await client.removeRecipeIngredient(token, recipeID, currentIngredient.id);
      continue;
    }

    const parsed = parseAmount(requested.amount);
    if (parsed.quantity !== (currentIngredient.quantity ?? 1) || (parsed.unitLabel ?? null) !== currentIngredient.unit) {
      await client.removeRecipeIngredient(token, recipeID, currentIngredient.id);
    }
  }

  for (const requested of requestedByItemID.values()) {
    const current = currentByItemID.get(requested.itemId!);
    const parsed = parseAmount(requested.amount);
    if (!current || parsed.quantity !== (current.quantity ?? 1) || (parsed.unitLabel ?? null) !== current.unit) {
      await client.addRecipeIngredient(token, recipeID, {
        itemId: requested.itemId!,
        quantity: parsed.quantity,
        unit: parsed.unitLabel ?? null,
      });
    }
  }
};