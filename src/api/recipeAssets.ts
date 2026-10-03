import * as FileSystem from 'expo-file-system/legacy';

import { withAPIRetry } from './boot';
import { APIClient } from './client';

const contentTypes = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export const uploadRecipeImage = async (client: APIClient, token: string, uri: string) => {
  const file = await FileSystem.getInfoAsync(uri);
  if (!file.exists || !file.size || file.size > 5 * 1024 * 1024) {
    throw new Error('Recipe images must be between 1 byte and 5 MB.');
  }

  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const contentType = contentTypes[extension as keyof typeof contentTypes];
  if (!contentType) {
    throw new Error('Recipe images must be JPEG, PNG, or WebP.');
  }

  const asset = await client.createAssetUpload(token, {
    contentType,
    byteSize: file.size,
  });
  const uploadResult = await FileSystem.uploadAsync(asset.uploadUrl, uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': contentType,
      'x-ms-blob-type': 'BlockBlob',
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error('The recipe image could not be uploaded.');
  }

  const confirmed = await withAPIRetry(() => client.confirmAsset(token, asset.assetId));
  return { assetId: confirmed.assetId, readUrl: confirmed.readUrl };
};