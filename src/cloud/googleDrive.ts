import { StockUpData } from '../types';

const FILE_NAME = 'stockup-data.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

type DriveFile = { id: string; modifiedTime?: string };
const CURRENT_DATA_VERSION = 2;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isRecipe = (value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.subtitle === 'string' &&
    typeof value.description === 'string' &&
    typeof value.time === 'string' &&
    typeof value.difficulty === 'string' &&
    typeof value.servings === 'string' &&
    typeof value.image === 'string' &&
    typeof value.category === 'string' &&
    Array.isArray(value.ingredients) &&
    value.ingredients.every((ingredient) => {
      if (!isRecord(ingredient)) {
        return false;
      }

      return (
        typeof ingredient.id === 'string' &&
        typeof ingredient.name === 'string' &&
        typeof ingredient.amount === 'string'
      );
    })
  );
};

const isQuickSelectItem = (value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.sectionId === 'string' &&
    isStringArray(value.colors) &&
    (value.unitLabel === undefined || typeof value.unitLabel === 'string')
  );
};

const isGroceryList = (value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.store === 'string' &&
    Array.isArray(value.sections) &&
    value.sections.every((section) => {
      if (!isRecord(section)) {
        return false;
      }

      return (
        typeof section.id === 'string' &&
        typeof section.title === 'string' &&
        Array.isArray(section.items) &&
        section.items.every((item) => {
          if (!isRecord(item)) {
            return false;
          }

          return (
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.quantity === 'number' &&
            Number.isFinite(item.quantity) &&
            typeof item.checked === 'boolean'
          );
        })
      );
    })
  );
};

export function isValidStockUpData(value: unknown): value is StockUpData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.version === 'number' &&
    value.version >= 1 &&
    value.version <= CURRENT_DATA_VERSION &&
    typeof value.updatedAt === 'string' &&
    isStringArray(value.itemTypes) &&
    Array.isArray(value.quickSelectItems) &&
    value.quickSelectItems.every(isQuickSelectItem) &&
    Array.isArray(value.recipeList) &&
    value.recipeList.every(isRecipe) &&
    isStringArray(value.favoriteRecipeIds) &&
    isGroceryList(value.groceryList)
  );
}

async function driveRequest(token: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    throw new Error(`Google Drive request failed: ${response.status}`);
  }

  return response;
}

async function findDataFile(token: string): Promise<DriveFile | null> {
  const query = encodeURIComponent(`name = '${FILE_NAME}' and 'appDataFolder' in parents and trashed = false`);
  const response = await driveRequest(token, `${DRIVE_API}/files?q=${query}&spaces=appDataFolder&fields=files(id,modifiedTime)`);
  const result = (await response.json()) as { files?: DriveFile[] };
  return result.files?.[0] ?? null;
}

export async function downloadUserData(token: string): Promise<StockUpData | null> {
  const file = await findDataFile(token);

  if (!file) {
    return null;
  }

  const response = await driveRequest(token, `${DRIVE_API}/files/${file.id}?alt=media`);
  const data: unknown = await response.json();

  if (!isValidStockUpData(data)) {
    throw new Error('Google Drive returned invalid StockUp data');
  }

  return data;
}

export async function uploadUserData(token: string, data: StockUpData) {
  const file = await findDataFile(token);
  const metadata = JSON.stringify(file ? {} : { name: FILE_NAME, parents: ['appDataFolder'] });
  const boundary = `stockup-${Date.now()}`;
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(data),
    `--${boundary}--`,
  ].join('\r\n');

  await driveRequest(
    token,
    file ? `${UPLOAD_API}/${file.id}?uploadType=multipart` : `${UPLOAD_API}?uploadType=multipart`,
    {
      method: file ? 'PATCH' : 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  );
}
