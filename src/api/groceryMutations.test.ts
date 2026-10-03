import { APIClient } from './client';
import { addGrocerySelection } from './groceryMutations';

describe('grocery mutation commands', () => {
  it('adds a pantry-backed item to a list section', async () => {
    const client = { addGroceryItem: jest.fn().mockResolvedValue({ id: 'list-1' }) } as unknown as APIClient;

    await addGrocerySelection(client, 'session', 'list-1', {
      itemId: 'item-1',
      name: 'Apple',
      quantity: 2,
      unit: 'each',
    }, undefined, 'section-1');

    expect(client.addGroceryItem).toHaveBeenCalledWith('session', 'list-1', {
      itemId: 'item-1',
      quantity: 2,
      unit: 'each',
      sectionId: 'section-1',
    });
  });

  it('increases the quantity of an item already on the list', async () => {
    const client = { updateGroceryItem: jest.fn().mockResolvedValue({ id: 'list-1' }) } as unknown as APIClient;

    await addGrocerySelection(client, 'session', 'list-1', {
      name: 'Apple',
      quantity: 2,
      unit: 'each',
    }, { id: 'grocery-item-1', quantity: 3 });

    expect(client.updateGroceryItem).toHaveBeenCalledWith('session', 'list-1', 'grocery-item-1', {
      quantity: 5,
      unit: 'each',
    });
  });
});