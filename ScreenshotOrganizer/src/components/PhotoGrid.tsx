// ---------------------------------------------------------------------------
// Photo Grid - displays selectable screenshot thumbnails
// ---------------------------------------------------------------------------

import React from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenshotAsset } from '../services/mediaLibrary';
import { borderRadius, colors, spacing } from '../utils/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const ITEM_GAP = 3;
const ITEM_SIZE = (SCREEN_WIDTH - spacing.md * 2 - ITEM_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface Props {
  assets: ScreenshotAsset[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

function PhotoGridItem({
  asset,
  isSelected,
  onToggle,
}: {
  asset: ScreenshotAsset;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.item}>
      <Image source={{ uri: asset.uri }} style={styles.image} />
      {isSelected && (
        <View style={styles.selectedOverlay}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function PhotoGrid({
  assets,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: Props) {
  const allSelected = assets.length > 0 && selectedIds.size === assets.length;

  return (
    <View style={styles.container}>
      {/* Select bar */}
      <View style={styles.selectBar}>
        <Text style={styles.selectText}>
          {selectedIds.size} / {assets.length} selected
        </Text>
        <Pressable
          onPress={allSelected ? onDeselectAll : onSelectAll}
          style={styles.selectButton}
        >
          <Text style={styles.selectButtonText}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </Pressable>
      </View>

      {/* Grid */}
      <FlatList
        data={assets}
        numColumns={NUM_COLUMNS}
        keyExtractor={item => item.id}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <PhotoGridItem
            asset={item}
            isSelected={selectedIds.has(item.id)}
            onToggle={() => onToggleSelect(item.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  selectButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  row: {
    gap: ITEM_GAP,
    marginBottom: ITEM_GAP,
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(108, 92, 231, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
