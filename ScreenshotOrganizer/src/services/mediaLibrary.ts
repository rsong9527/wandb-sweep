// ---------------------------------------------------------------------------
// Media Library Service - read screenshots from photo library
// NOTE: This service ONLY reads photos. It NEVER deletes, moves, or modifies.
// ---------------------------------------------------------------------------

import * as MediaLibrary from 'expo-media-library';

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function requestPermissions(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

// ---------------------------------------------------------------------------
// Fetch screenshots from camera roll
// ---------------------------------------------------------------------------

export interface ScreenshotAsset {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  creationTime: number;
}

export async function fetchScreenshots(
  limit: number = 100,
): Promise<ScreenshotAsset[]> {
  const media = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [MediaLibrary.SortBy.creationTime],
    first: limit,
  });

  const assets: ScreenshotAsset[] = [];

  for (const asset of media.assets) {
    const info = await MediaLibrary.getAssetInfoAsync(asset);
    assets.push({
      id: asset.id,
      uri: info.localUri ?? asset.uri,
      filename: asset.filename,
      width: asset.width,
      height: asset.height,
      creationTime: asset.creationTime,
    });
  }

  return assets;
}
