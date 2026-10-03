import { APIClient } from './client';
import { syncRecipeIngredients } from './recipeMutations';

describe('syncRecipeIngredients', () => {
  it('removes deleted or changed ingredients and adds the requested version', async () => {
    const client = {
      removeRecipeIngredient: jest.fn().mockResolvedValue(undefined),
      addRecipeIngredient: jest.fn().mockResolvedValue(undefined),
    } as unknown as APIClient;
    const currentIngredients = [
      { id: 'ingredient-1', itemId: 'item-1', name: 'Apple', quantity: 1, unit: 'each', position: 0 },
      { id: 'ingredient-2', itemId: 'item-2', name: 'Milk', quantity: 1, unit: 'bottle', position: 1 },
    ];
    const requestedIngredients = [
      { id: 'ingredient-1', itemId: 'item-1', name: 'Apple', amount: '2 cups' },
      { id: 'new-ingredient', itemId: 'item-3', name: 'Rice', amount: '3 kg' },
    ];

    await syncRecipeIngredients(client, 'session', 'recipe-1', currentIngredients, requestedIngredients);

    expect(client.removeRecipeIngredient).toHaveBeenCalledTimes(2);
    expect(client.removeRecipeIngredient).toHaveBeenCalledWith('session', 'recipe-1', 'ingredient-1');
    expect(client.removeRecipeIngredient).toHaveBeenCalledWith('session', 'recipe-1', 'ingredient-2');
    expect(client.addRecipeIngredient).toHaveBeenNthCalledWith(1, 'session', 'recipe-1', {
      itemId: 'item-1',
      quantity: 2,
      unit: 'cups',
    });
    expect(client.addRecipeIngredient).toHaveBeenNthCalledWith(2, 'session', 'recipe-1', {
      itemId: 'item-3',
      quantity: 3,
      unit: 'kg',
    });
  });

  it('leaves unchanged ingredients alone', async () => {
    const client = {
      removeRecipeIngredient: jest.fn().mockResolvedValue(undefined),
      addRecipeIngredient: jest.fn().mockResolvedValue(undefined),
    } as unknown as APIClient;

    await syncRecipeIngredients(client, 'session', 'recipe-1', [
      { id: 'ingredient-1', itemId: 'item-1', name: 'Apple', quantity: 2, unit: 'each', position: 0 },
    ], [
      { id: 'ingredient-1', itemId: 'item-1', name: 'Apple', amount: '2 each' },
    ]);

    expect(client.removeRecipeIngredient).not.toHaveBeenCalled();
    expect(client.addRecipeIngredient).not.toHaveBeenCalled();
  });
});