import { APIClient } from './client';
import { createPantryItem, deletePantryItem, updatePantryItem } from './pantryMutations';

describe('pantry mutation commands', () => {
  it('creates an item in its resolved category', async () => {
    const client = { createPantryItem: jest.fn().mockResolvedValue({ id: 'item-1' }) } as unknown as APIClient;
    const category = { id: 'category-1', name: 'Produce', version: 1, createdAt: '', updatedAt: '' };

    await createPantryItem(client, 'session', category, { name: 'Apple', unit: ' each ' });

    expect(client.createPantryItem).toHaveBeenCalledWith('session', {
      name: 'Apple',
      categoryId: 'category-1',
      unit: 'each',
    });
  });

  it('updates and deletes with the server version', async () => {
    const client = {
      updatePantryItem: jest.fn().mockResolvedValue({ id: 'item-1' }),
      deletePantryItem: jest.fn().mockResolvedValue(undefined),
    } as unknown as APIClient;
    const category = { id: 'category-2', name: 'Dairy', version: 3, createdAt: '', updatedAt: '' };

    await updatePantryItem(client, 'session', 'item-1', 7, category, { name: 'Milk' });
    await deletePantryItem(client, 'session', 'item-1', 8);

    expect(client.updatePantryItem).toHaveBeenCalledWith('session', 'item-1', {
      name: 'Milk',
      categoryId: 'category-2',
      unit: null,
      version: 7,
    });
    expect(client.deletePantryItem).toHaveBeenCalledWith('session', 'item-1', 8);
  });
});