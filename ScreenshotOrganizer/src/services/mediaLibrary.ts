// ---------------------------------------------------------------------------
// Media Library Service - read screenshots, create albums, tag photos
// NOTE: This service NEVER deletes or moves original photos.
// It only adds photos to albums (tags). Originals stay untouched.
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
    // Get asset info to access the local URI
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

// ---------------------------------------------------------------------------
// Create album and add assets
// ---------------------------------------------------------------------------

export async function getOrCreateAlbum(
  albumName: string,
): Promise<MediaLibrary.Album | null> {
  // Check if album already exists
  const existing = await MediaLibrary.getAlbumAsync(albumName);
  if (existing) return existing;

  // We need at least one asset to create an album, so return null for now
  // The album will be created when the first asset is added
  return null;
}

export async function addAssetToAlbum(
  assetId: string,
  albumName: string,
): Promise<boolean> {
  try {
    const asset = await MediaLibrary.getAssetInfoAsync(assetId);
    if (!asset) return false;

    let album = await MediaLibrary.getAlbumAsync(albumName);

    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([assetId], album, false);
    } else {
      // Create album with this asset
      await MediaLibrary.createAlbumAsync(albumName, assetId, false);
    }

    return true;
  } catch (e) {
    console.warn(`Failed to add asset to album "${albumName}":`, e);
    return false;
  }
}

export async function organizeAssetIntoAlbum(
  assetId: string,
  categoryKey: string,
  prefix: string = 'SS',
): Promise<boolean> {
  const albumName = `${prefix} - ${categoryKey}`;
  return addAssetToAlbum(assetId, albumName);
}
