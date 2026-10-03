import { mapAPIDataToLocal, mapAPIGroceryListToLocal } from './localSync';

describe('mapAPIDataToLocal', () => {
  it('maps API pantry, recipes, favorites, and grocery data into local UI data', () => {
    const result = mapAPIDataToLocal(
      [{ id: 'item-1', categoryId: 'produce', name: 'Apple', unit: 'each', version: 1, createdAt: '', updatedAt: '' }],
      [{
        id: 'recipe-1',
        title: 'Apple bowl',
        description: 'Fresh',
        instructions: 'Mix',
        favorite: true,
        version: 1,
        ingredients: [{ id: 'ingredient-1', itemId: 'item-1', name: 'Apple', quantity: 1, unit: 'each', position: 0 }],
        assets: [],
        createdAt: '',
        updatedAt: '',
      }],
      [{
        id: 'list-1',
        name: 'Shopping',
        version: 1,
        sections: [{ id: 'section-1', name: 'Produce', position: 0, items: [] }],
        items: [{ id: 'list-item-1', itemId: 'item-1', name: 'Apple', quantity: 2, unit: 'each', checked: false, sectionId: 'section-1', position: 0 }],
        createdAt: '',
        updatedAt: '',
      }],
    );

    expect(result.itemTypes).toEqual(['produce']);
    expect(result.quickSelectItems[0].name).toBe('Apple');
    expect(result.favoriteRecipeIds).toEqual(['recipe-1']);
    expect(result.groceryList?.sections[0].items[0].quantity).toBe(2);
    expect(result.groceryLists).toHaveLength(1);
  });

  it('maps items nested in sections and preserves unsectioned grocery items', () => {
    const mapped = mapAPIGroceryListToLocal({
      id: 'list-1',
      name: 'Shopping',
      version: 4,
      sections: [{
        id: 'section-1',
        name: 'Produce',
        position: 0,
        items: [{
          id: 'section-item',
          itemId: 'item-1',
          name: 'Apple',
          quantity: 2,
          unit: 'each',
          checked: false,
          sectionId: 'section-1',
          position: 0,
        }],
      }],
      items: [{
        id: 'loose-item',
        itemId: 'item-2',
        name: 'Milk',
        quantity: 1,
        unit: 'bottle',
        checked: false,
        sectionId: null,
        position: 1,
      }],
      createdAt: '',
      updatedAt: '',
    });

    expect(mapped.version).toBe(4);
    expect(mapped.sections.map((section) => section.items.map((item) => item.id))).toEqual([
      ['section-item'],
      ['loose-item'],
    ]);
  });

  it('maps every grocery list returned by the API', () => {
    const lists = ['list-1', 'list-2'].map((id) => ({
      id,
      name: id,
      version: 1,
      sections: [],
      items: [],
      createdAt: '',
      updatedAt: '',
    }));

    expect(mapAPIDataToLocal([], [], lists).groceryLists.map((list) => list.id)).toEqual(['list-1', 'list-2']);
  });
});
