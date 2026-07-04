import {
  GroceryItem,
  GroceryList,
  GrocerySectionId,
  QuickAddSelection,
  QuickSelectItem,
  RecipeIngredient,
} from '../types';

const formatSectionTitle = (sectionId: GrocerySectionId) =>
  sectionId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const sectionByName = (name: string): GrocerySectionId => {
  const lowerName = name.toLowerCase();

  if (/(broccoli|spinach|garlic|onion|pepper|squash|cilantro|lime|tomato|pea)/.test(lowerName)) {
    return 'produce';
  }

  if (/(milk|cream|cheese|yogurt|egg|parmesan)/.test(lowerName)) {
    return 'dairy';
  }

  return 'pantry';
};

const buildItemId = (sectionId: GrocerySectionId, name: string) =>
  `${sectionId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

export const normalizeQuantity = (value: number) => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.round(value));
};

const parseFraction = (value: string) => {
  const [numerator, denominator] = value.split('/').map((part) => Number(part));

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }

  return numerator / denominator;
};

const parseMixedOrSingleNumber = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.includes(' ')) {
    const [wholePart, fractionPart] = trimmedValue.split(/\s+/, 2);
    const whole = Number(wholePart);
    const fraction = parseFraction(fractionPart);

    if (!Number.isFinite(whole) || fraction === null) {
      return null;
    }

    return whole + fraction;
  }

  if (trimmedValue.includes('/')) {
    return parseFraction(trimmedValue);
  }

  const parsed = Number(trimmedValue);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseAmount = (amount: string): { quantity: number; unitLabel?: string } => {
  const trimmed = amount.trim();

  if (!trimmed) {
    return { quantity: 1 };
  }

  const match = trimmed.match(/^(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?)(?:\s+(.*))?$/);

  if (!match) {
    return { quantity: 1, unitLabel: trimmed };
  }

  const parsedAmount = parseMixedOrSingleNumber(match[1]);

  if (parsedAmount === null) {
    return { quantity: 1, unitLabel: match[2]?.trim() || undefined };
  }

  return {
    quantity: normalizeQuantity(parsedAmount),
    unitLabel: match[2]?.trim() || undefined,
  };
};

const mergeOrAppendItem = (items: GroceryItem[], nextItem: GroceryItem) => {
  const existingItem = items.find(
    (item) => item.name.toLowerCase() === nextItem.name.toLowerCase(),
  );

  if (!existingItem) {
    return [...items, nextItem];
  }

  return items.map((item) =>
    item.id === existingItem.id
      ? {
          ...item,
          quantity: normalizeQuantity(item.quantity + nextItem.quantity),
          unitLabel: item.unitLabel ?? nextItem.unitLabel,
          quickItemId: item.quickItemId ?? nextItem.quickItemId,
        }
      : item,
  );
};

export const getListCounts = (list: GroceryList) => {
  const allItems = list.sections.flatMap((section) => section.items);
  const total = allItems.length;
  const bought = allItems.filter((item) => item.checked).length;
  const remaining = total - bought;

  return { total, bought, remaining };
};

export const toggleGroceryItem = (list: GroceryList, itemId: string) => ({
  ...list,
  sections: list.sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    ),
  })),
});

export const addIngredientsToList = (
  list: GroceryList,
  ingredients: RecipeIngredient[],
  quickItems: QuickSelectItem[] = [],
) => {
  const sectionItems = new Map<string, GroceryItem[]>();
  const nextSections = [...list.sections];

  list.sections.forEach((section) => {
    sectionItems.set(section.id, [...section.items]);
  });

  ingredients.forEach((ingredient) => {
    const matchedQuickItem = quickItems.find(
      (item) => item.name.toLowerCase() === ingredient.name.toLowerCase(),
    );
    const targetSection = ingredient.sectionId ?? matchedQuickItem?.sectionId ?? sectionByName(ingredient.name);
    const parsedAmount = parseAmount(ingredient.amount);
    const quantity = parsedAmount.quantity;
    const unitLabel = matchedQuickItem?.unitLabel ?? parsedAmount.unitLabel;

    if (!sectionItems.has(targetSection)) {
      sectionItems.set(targetSection, []);
      nextSections.push({
        id: targetSection,
        title: formatSectionTitle(targetSection),
        items: [],
      });
    }

    const items = sectionItems.get(targetSection) ?? [];
    const nextItem: GroceryItem = {
      id: `${targetSection}-${ingredient.id}`,
      name: ingredient.name,
      quantity,
      unitLabel,
      quickItemId: matchedQuickItem?.id,
      checked: false,
    };

    sectionItems.set(targetSection, mergeOrAppendItem(items, nextItem));
  });

  return {
    ...list,
    sections: nextSections.map((section) => ({
      ...section,
      items: sectionItems.get(section.id) ?? section.items,
    })),
  };
};

export const addCustomItemToList = (
  list: GroceryList,
  item: {
    name: string;
    quantity: number;
    sectionId: GrocerySectionId;
    unitLabel?: string;
    quickItemId?: string;
  },
) => {
  const name = item.name.trim();
  const quantity = normalizeQuantity(item.quantity);

  if (!name) {
    return list;
  }

  const hasSection = list.sections.some((section) => section.id === item.sectionId);
  const nextSections = hasSection
    ? list.sections
    : [
        ...list.sections,
        {
          id: item.sectionId,
          title: formatSectionTitle(item.sectionId),
          items: [],
        },
      ];

  return {
    ...list,
    sections: nextSections.map((section) => {
      if (section.id !== item.sectionId) {
        return section;
      }

      return {
        ...section,
        items: mergeOrAppendItem(section.items, {
          id: buildItemId(item.sectionId, name),
          name,
          quantity,
          unitLabel: item.unitLabel,
          quickItemId: item.quickItemId,
          checked: false,
        }),
      };
    }),
  };
};

export const addQuickItemsToList = (
  list: GroceryList,
  quickItems: QuickSelectItem[],
  selections: QuickAddSelection[],
) => {
  const selectedItems = selections
    .map((selection) => {
      const matchedItem = quickItems.find((item) => item.id === selection.itemId);

      if (!matchedItem || selection.quantity <= 0) {
        return null;
      }

      return {
        quickItem: matchedItem,
        quantity: selection.quantity,
      };
    })
    .filter((value): value is { quickItem: QuickSelectItem; quantity: number } => value !== null);

  return selectedItems.reduce(
    (currentList, item) =>
      addCustomItemToList(currentList, {
        name: item.quickItem.name,
        quantity: normalizeQuantity(item.quantity),
        sectionId: item.quickItem.sectionId,
        unitLabel: item.quickItem.unitLabel,
        quickItemId: item.quickItem.id,
      }),
    list,
  );
};

export const setGroceryItemQuantity = (list: GroceryList, itemId: string, quantity: number) => ({
  ...list,
  sections: list.sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.id === itemId ? { ...item, quantity: normalizeQuantity(quantity) } : item,
    ),
  })),
});

export const adjustGroceryItemQuantity = (list: GroceryList, itemId: string, delta: number) => ({
  ...list,
  sections: list.sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.id === itemId
        ? { ...item, quantity: normalizeQuantity(item.quantity + delta) }
        : item,
    ),
  })),
});

export const removeGroceryItem = (list: GroceryList, itemId: string) => ({
  ...list,
  sections: list.sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.id !== itemId),
  })),
});

export const clearGroceryList = (list: GroceryList) => ({
  ...list,
  sections: list.sections.map((section) => ({
    ...section,
    items: [],
  })),
});
